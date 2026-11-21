//! WeChat Open Platform third-party-platform (component) API client.
//!
//! The component runtime needs exactly six provider calls before an authorized
//! mini program or official account can be operated:
//!
//! 1. `POST /cgi-bin/component/api_component_token` — component access token.
//! 2. `POST /cgi-bin/component/api_start_push_ticket` — recover a stopped
//!    verification-ticket push.
//! 3. `POST /cgi-bin/component/api_create_preauthcode` — authorization entry
//!    code.
//! 4. `POST /cgi-bin/component/api_query_auth` — exchange `auth_code` for the
//!    authorizer identity, tokens, and granted permission set.
//! 5. `POST /cgi-bin/component/api_authorizer_token` — refresh an authorizer
//!    token (the reply carries a new refresh token that must replace the old
//!    one).
//!
//! Every call is a JSON POST with a provider-level `errcode` convention: HTTP
//! status is not the verdict, and a 200 body can still be a failure. The client
//! keeps the transport behind [`WechatComponentTransport`] so unit tests and
//! future gateways never need a live WeChat endpoint, and it never logs, stores,
//! or returns credentials beyond the typed response.
use async_trait::async_trait;
use serde_json::{json, Value};
use std::time::Duration;

use crate::wechat_mp::wechat_mp_api_base;

/// Component access token path.
pub const COMPONENT_TOKEN_PATH: &str = "/cgi-bin/component/api_component_token";
/// Restart a stopped verification-ticket push path.
pub const START_PUSH_TICKET_PATH: &str = "/cgi-bin/component/api_start_push_ticket";
/// Pre-authorization code path.
pub const PRE_AUTH_CODE_PATH: &str = "/cgi-bin/component/api_create_preauthcode";
/// Authorization-code exchange path.
pub const QUERY_AUTH_PATH: &str = "/cgi-bin/component/api_query_auth";
/// Authorizer token refresh path.
pub const AUTHORIZER_TOKEN_PATH: &str = "/cgi-bin/component/api_authorizer_token";
/// Customer-service text message path (authorizer token, not a component token).
pub const CUSTOM_TEXT_MESSAGE_PATH: &str = "/cgi-bin/message/custom/send";

/// PC authorization entry page.
pub const COMPONENT_PC_AUTHORIZATION_PAGE: &str =
    "https://mp.weixin.qq.com/cgi-bin/componentloginpage";
/// Mobile authorization entry page.
pub const COMPONENT_H5_AUTHORIZATION_PAGE: &str =
    "https://open.weixin.qq.com/wxaopen/safe/bindcomponent";

/// Refresh a component token this many seconds before it actually expires.
pub const COMPONENT_TOKEN_REFRESH_LEAD_SECONDS: i64 = 600;

/// A component token stops being usable this many seconds before expiry so a
/// request never races the provider's own clock.
pub const COMPONENT_TOKEN_SAFETY_MARGIN_SECONDS: i64 = 60;

const DEFAULT_TIMEOUT_SECONDS: u64 = 10;

/// A provider-level failure code that means "get a fresh token and retry once".
const TOKEN_INVALID_CODES: [i64; 3] = [40001, 40014, 42001];

/// A provider-level failure code that means "daily quota is exhausted".
const QUOTA_EXHAUSTED_CODES: [i64; 2] = [45009, 45011];

/// A component access token and its lifetime.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ComponentAccessToken {
    /// Token used for platform-level calls.
    pub access_token: String,
    /// Provider-declared lifetime in seconds (documented as 7200).
    pub expires_in: i64,
}

/// A pre-authorization code and its lifetime.
///
/// WeChat's documentation text and its own response example disagree on the
/// lifetime, so callers must use this value instead of a hard-coded constant.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PreAuthCode {
    /// One-time authorization entry code.
    pub pre_auth_code: String,
    /// Provider-declared lifetime in seconds.
    pub expires_in: i64,
}

/// One granted permission-set category.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AuthorizationFuncScope {
    /// WeChat permission-set category id (for example 18 or 30).
    pub category_id: i64,
}

/// The authorization facts returned by `api_query_auth`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AuthorizerAuthorization {
    /// Authorizer AppID, which is also the receive id of its message callbacks.
    pub authorizer_app_id: String,
    /// Two-hour authorizer token.
    pub authorizer_access_token: String,
    /// Provider-declared lifetime in seconds.
    pub expires_in: i64,
    /// Long-lived refresh token. The provider can return an empty value, which
    /// means the customer must re-authorize; never treat that as success.
    pub authorizer_refresh_token: Option<String>,
    /// Permission sets actually granted, which may be narrower than requested.
    pub func_scopes: Vec<AuthorizationFuncScope>,
}

/// The token pair returned by `api_authorizer_token`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AuthorizerAccessToken {
    /// Fresh two-hour authorizer token.
    pub authorizer_access_token: String,
    /// Provider-declared lifetime in seconds.
    pub expires_in: i64,
    /// Replacement refresh token; absent replies keep the stored value.
    pub authorizer_refresh_token: Option<String>,
}

/// A component API failure.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum WechatComponentApiError {
    /// The provider answered with a non-zero `errcode`.
    Provider {
        /// Provider error code.
        errcode: i64,
        /// Provider error message, already safe to log.
        errmsg: String,
    },
    /// The HTTP call failed at the transport layer.
    Transport(String),
    /// The provider answered with a body this client cannot model.
    InvalidResponse(String),
    /// The caller supplied an incomplete or malformed input.
    InvalidRequest(String),
}

impl WechatComponentApiError {
    /// True when a single token refresh and retry is the correct response.
    pub fn is_token_invalid(&self) -> bool {
        matches!(self, Self::Provider { errcode, .. } if TOKEN_INVALID_CODES.contains(errcode))
    }

    /// True when the daily interface quota is exhausted.
    pub fn is_quota_exhausted(&self) -> bool {
        matches!(self, Self::Provider { errcode, .. } if QUOTA_EXHAUSTED_CODES.contains(errcode))
    }

    /// The provider error code, when the failure came from WeChat.
    pub fn provider_code(&self) -> Option<i64> {
        match self {
            Self::Provider { errcode, .. } => Some(*errcode),
            _ => None,
        }
    }
}

impl std::fmt::Display for WechatComponentApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Provider { errcode, errmsg } => {
                write!(f, "wechat component api failed: {errcode} {errmsg}")
            }
            Self::Transport(detail) => {
                write!(f, "wechat component api transport failed: {detail}")
            }
            Self::InvalidResponse(detail) => {
                write!(f, "wechat component api response is invalid: {detail}")
            }
            Self::InvalidRequest(detail) => {
                write!(f, "wechat component api request is invalid: {detail}")
            }
        }
    }
}

impl std::error::Error for WechatComponentApiError {}

/// The HTTP boundary for provider calls.
///
/// Implementations never retry: token refresh, backoff, and idempotency belong
/// to the caller so one failure surface owns the retry budget.
#[async_trait]
pub trait WechatComponentTransport: Send + Sync {
    /// POSTs a JSON body and returns the raw response text.
    ///
    /// @param url - absolute provider endpoint.
    /// @param body - JSON request document.
    /// @returns the response body, even for provider-level failures.
    async fn post_json(&self, url: &str, body: &Value) -> Result<String, WechatComponentApiError>;
}

/// Production transport backed by `reqwest`.
pub struct ReqwestWechatComponentTransport {
    client: reqwest::Client,
}

impl ReqwestWechatComponentTransport {
    /// Builds a transport with the component API timeout.
    ///
    /// @returns the transport, or a transport-layer error when the client
    /// cannot be constructed.
    pub fn new() -> Result<Self, WechatComponentApiError> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(DEFAULT_TIMEOUT_SECONDS))
            .build()
            .map_err(|error| WechatComponentApiError::Transport(error.to_string()))?;
        Ok(Self { client })
    }
}

#[async_trait]
impl WechatComponentTransport for ReqwestWechatComponentTransport {
    async fn post_json(&self, url: &str, body: &Value) -> Result<String, WechatComponentApiError> {
        let response = self
            .client
            .post(url)
            .json(body)
            .send()
            .await
            .map_err(|error| WechatComponentApiError::Transport(error.to_string()))?;
        response
            .text()
            .await
            .map_err(|error| WechatComponentApiError::Transport(error.to_string()))
    }
}

/// A component API client over a pluggable transport.
pub struct WechatComponentApi<T: WechatComponentTransport> {
    transport: T,
    base_url: String,
}

impl<T: WechatComponentTransport> WechatComponentApi<T> {
    /// Builds a client against the configured WeChat base URL.
    pub fn new(transport: T) -> Self {
        Self {
            transport,
            base_url: wechat_mp_api_base(),
        }
    }

    /// Builds a client against an explicit base URL (gateway or test double).
    pub fn with_base_url(transport: T, base_url: impl Into<String>) -> Self {
        Self {
            transport,
            base_url: base_url.into(),
        }
    }

    /// Borrows the underlying transport, mainly for request assertions in tests.
    pub fn transport(&self) -> &T {
        &self.transport
    }

    /// Exchanges the current verification ticket for a component token.
    pub async fn fetch_component_token(
        &self,
        component_app_id: &str,
        component_app_secret: &str,
        component_verify_ticket: &str,
    ) -> Result<ComponentAccessToken, WechatComponentApiError> {
        require_non_empty(component_app_id, "component_app_id")?;
        require_non_empty(component_app_secret, "component_app_secret")?;
        require_non_empty(component_verify_ticket, "component_verify_ticket")?;
        let value = self
            .post(
                COMPONENT_TOKEN_PATH,
                json!({
                    "component_appid": component_app_id,
                    "component_appsecret": component_app_secret,
                    "component_verify_ticket": component_verify_ticket,
                }),
            )
            .await?;
        Ok(ComponentAccessToken {
            access_token: required_str(&value, "component_access_token")?,
            expires_in: required_i64(&value, "expires_in")?,
        })
    }

    /// Asks WeChat to restart the verification-ticket push.
    pub async fn start_push_ticket(
        &self,
        component_app_id: &str,
        component_app_secret: &str,
    ) -> Result<(), WechatComponentApiError> {
        require_non_empty(component_app_id, "component_app_id")?;
        require_non_empty(component_app_secret, "component_app_secret")?;
        self.post(
            START_PUSH_TICKET_PATH,
            json!({
                "component_appid": component_app_id,
                "component_appsecret": component_app_secret,
            }),
        )
        .await?;
        Ok(())
    }

    /// Creates a one-time authorization entry code.
    pub async fn create_pre_auth_code(
        &self,
        component_access_token: &str,
        component_app_id: &str,
    ) -> Result<PreAuthCode, WechatComponentApiError> {
        let value = self
            .post_with_token(
                PRE_AUTH_CODE_PATH,
                component_access_token,
                json!({ "component_appid": component_app_id }),
            )
            .await?;
        Ok(PreAuthCode {
            pre_auth_code: required_str(&value, "pre_auth_code")?,
            expires_in: required_i64(&value, "expires_in")?,
        })
    }

    /// Exchanges an authorization code for authorizer facts.
    pub async fn query_authorization(
        &self,
        component_access_token: &str,
        component_app_id: &str,
        authorization_code: &str,
    ) -> Result<AuthorizerAuthorization, WechatComponentApiError> {
        require_non_empty(authorization_code, "authorization_code")?;
        let value = self
            .post_with_token(
                QUERY_AUTH_PATH,
                component_access_token,
                json!({
                    "component_appid": component_app_id,
                    "authorization_code": authorization_code,
                }),
            )
            .await?;
        let info = value.get("authorization_info").ok_or_else(|| {
            WechatComponentApiError::InvalidResponse("authorization_info is missing".to_string())
        })?;
        Ok(AuthorizerAuthorization {
            authorizer_app_id: required_str(info, "authorizer_appid")?,
            authorizer_access_token: required_str(info, "authorizer_access_token")?,
            expires_in: required_i64(info, "expires_in")?,
            authorizer_refresh_token: optional_str(info, "authorizer_refresh_token"),
            func_scopes: parse_func_scopes(info)?,
        })
    }

    /// Refreshes one authorizer token.
    pub async fn refresh_authorizer_token(
        &self,
        component_access_token: &str,
        component_app_id: &str,
        authorizer_app_id: &str,
        authorizer_refresh_token: &str,
    ) -> Result<AuthorizerAccessToken, WechatComponentApiError> {
        require_non_empty(authorizer_app_id, "authorizer_app_id")?;
        require_non_empty(authorizer_refresh_token, "authorizer_refresh_token")?;
        let value = self
            .post_with_token(
                AUTHORIZER_TOKEN_PATH,
                component_access_token,
                json!({
                    "component_appid": component_app_id,
                    "authorizer_appid": authorizer_app_id,
                    "authorizer_refresh_token": authorizer_refresh_token,
                }),
            )
            .await?;
        Ok(AuthorizerAccessToken {
            authorizer_access_token: required_str(&value, "authorizer_access_token")?,
            expires_in: required_i64(&value, "expires_in")?,
            authorizer_refresh_token: optional_str(&value, "authorizer_refresh_token"),
        })
    }

    /// Sends a customer-service text message with an authorizer access token.
    ///
    /// This is the second half of the `QUERY_AUTH_CODE` full-release probe: the
    /// callback returns an empty body, then sends `$code_from_api` this way.
    pub async fn send_custom_text(
        &self,
        authorizer_access_token: &str,
        to_user: &str,
        content: &str,
    ) -> Result<(), WechatComponentApiError> {
        require_non_empty(authorizer_access_token, "authorizer_access_token")?;
        require_non_empty(to_user, "to_user")?;
        self.post(
            &format!(
                "{CUSTOM_TEXT_MESSAGE_PATH}?access_token={}",
                urlencoding::encode(authorizer_access_token)
            ),
            json!({
                "touser": to_user,
                "msgtype": "text",
                "text": { "content": content },
            }),
        )
        .await?;
        Ok(())
    }

    async fn post_with_token(
        &self,
        path: &str,
        component_access_token: &str,
        body: Value,
    ) -> Result<Value, WechatComponentApiError> {
        require_non_empty(component_access_token, "component_access_token")?;
        self.post(
            &format!(
                "{path}?component_access_token={}",
                urlencoding::encode(component_access_token)
            ),
            body,
        )
        .await
    }

    async fn post(&self, path: &str, body: Value) -> Result<Value, WechatComponentApiError> {
        let url = format!("{}{}", self.base_url.trim_end_matches('/'), path);
        let raw = self.transport.post_json(&url, &body).await?;
        let value: Value = serde_json::from_str(&raw).map_err(|_| {
            WechatComponentApiError::InvalidResponse("body is not valid json".to_string())
        })?;
        reject_provider_error(&value)?;
        Ok(value)
    }
}

/// Where the customer authorizes the component.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WechatComponentAuthorizationSurface {
    /// Desktop browser: WeChat renders a QR page.
    PcScan,
    /// Mobile browser: WeChat binds without scanning.
    H5,
}

/// Which provider resource the authorization entry accepts.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(i64)]
pub enum WechatComponentAuthorizationScope {
    /// Official accounts only.
    OfficialAccount = 1,
    /// Mini programs only.
    MiniProgram = 2,
    /// Both official accounts and mini programs.
    Both = 3,
}

impl WechatComponentAuthorizationScope {
    /// The `auth_type` query value.
    pub fn as_i64(self) -> i64 {
        self as i64
    }
}

/// Builds the provider authorization entry URL.
///
/// @param surface - PC scan page or mobile bind page.
/// @param component_app_id - the component's AppID.
/// @param pre_auth_code - code from [`WechatComponentApi::create_pre_auth_code`].
/// @param redirect_uri - absolute callback that receives `auth_code`.
/// @param scope - accepted resource kinds.
/// @returns the URL to open or encode as a QR code.
pub fn authorization_entry_url(
    surface: WechatComponentAuthorizationSurface,
    component_app_id: &str,
    pre_auth_code: &str,
    redirect_uri: &str,
    scope: WechatComponentAuthorizationScope,
) -> Result<String, WechatComponentApiError> {
    require_non_empty(component_app_id, "component_app_id")?;
    require_non_empty(pre_auth_code, "pre_auth_code")?;
    require_non_empty(redirect_uri, "redirect_uri")?;
    if !redirect_uri.starts_with("https://") && !redirect_uri.starts_with("http://") {
        return Err(WechatComponentApiError::InvalidRequest(
            "redirect_uri must be an absolute http(s) url".to_string(),
        ));
    }
    let redirect = urlencoding::encode(redirect_uri);
    let url = match surface {
        WechatComponentAuthorizationSurface::PcScan => format!(
            "{COMPONENT_PC_AUTHORIZATION_PAGE}?component_appid={component_app_id}\
             &pre_auth_code={pre_auth_code}&redirect_uri={redirect}&auth_type={}",
            scope.as_i64()
        ),
        WechatComponentAuthorizationSurface::H5 => format!(
            "{COMPONENT_H5_AUTHORIZATION_PAGE}?action=bindcomponent&no_scan=1\
             &component_appid={component_app_id}&pre_auth_code={pre_auth_code}\
             &redirect_uri={redirect}&auth_type={}",
            scope.as_i64()
        ),
    };
    Ok(url)
}

/// True when a cached component token is close enough to expiry to refresh.
///
/// @param expires_at - Unix second when the provider token expires.
/// @param now - current Unix second.
pub fn component_token_needs_refresh(expires_at: i64, now: i64) -> bool {
    now + COMPONENT_TOKEN_REFRESH_LEAD_SECONDS >= expires_at
}

/// True when a cached component token is still safe to use.
///
/// @param expires_at - Unix second when the provider token expires.
/// @param now - current Unix second.
pub fn component_token_is_usable(expires_at: i64, now: i64) -> bool {
    now + COMPONENT_TOKEN_SAFETY_MARGIN_SECONDS < expires_at
}

fn reject_provider_error(value: &Value) -> Result<(), WechatComponentApiError> {
    let code = match value.get("errcode") {
        None => return Ok(()),
        Some(code) => match code.as_i64() {
            Some(code) => code,
            None => {
                return Err(WechatComponentApiError::InvalidResponse(
                    "errcode is not an integer".to_string(),
                ))
            }
        },
    };
    if code == 0 {
        return Ok(());
    }
    let errmsg = value
        .get("errmsg")
        .and_then(Value::as_str)
        .unwrap_or("unknown provider error")
        .to_string();
    Err(WechatComponentApiError::Provider {
        errcode: code,
        errmsg,
    })
}

fn parse_func_scopes(info: &Value) -> Result<Vec<AuthorizationFuncScope>, WechatComponentApiError> {
    let Some(entries) = info.get("func_info") else {
        return Ok(Vec::new());
    };
    let entries = entries.as_array().ok_or_else(|| {
        WechatComponentApiError::InvalidResponse("func_info is not an array".to_string())
    })?;
    let mut scopes = Vec::with_capacity(entries.len());
    for entry in entries {
        let category = entry
            .get("funcscope_category")
            .and_then(|category| category.get("id"))
            .and_then(Value::as_i64)
            .ok_or_else(|| {
                WechatComponentApiError::InvalidResponse(
                    "funcscope_category.id is missing".to_string(),
                )
            })?;
        scopes.push(AuthorizationFuncScope {
            category_id: category,
        });
    }
    Ok(scopes)
}

fn required_str(value: &Value, field: &str) -> Result<String, WechatComponentApiError> {
    value
        .get(field)
        .and_then(Value::as_str)
        .filter(|item| !item.trim().is_empty())
        .map(str::to_string)
        .ok_or_else(|| WechatComponentApiError::InvalidResponse(format!("{field} is missing")))
}

fn optional_str(value: &Value, field: &str) -> Option<String> {
    value
        .get(field)
        .and_then(Value::as_str)
        .filter(|item| !item.trim().is_empty())
        .map(str::to_string)
}

fn required_i64(value: &Value, field: &str) -> Result<i64, WechatComponentApiError> {
    value.get(field).and_then(Value::as_i64).ok_or_else(|| {
        WechatComponentApiError::InvalidResponse(format!("{field} is missing or not an integer"))
    })
}

fn require_non_empty(value: &str, field: &str) -> Result<(), WechatComponentApiError> {
    if value.trim().is_empty() {
        return Err(WechatComponentApiError::InvalidRequest(format!(
            "{field} is empty"
        )));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    #[derive(Default)]
    struct FakeTransport {
        response: Mutex<Option<Result<String, WechatComponentApiError>>>,
        calls: Mutex<Vec<(String, Value)>>,
    }

    impl FakeTransport {
        fn replies(body: &str) -> Self {
            Self {
                response: Mutex::new(Some(Ok(body.to_string()))),
                calls: Mutex::new(Vec::new()),
            }
        }

        fn fails(error: WechatComponentApiError) -> Self {
            Self {
                response: Mutex::new(Some(Err(error))),
                calls: Mutex::new(Vec::new()),
            }
        }

        fn last_call(&self) -> (String, Value) {
            let calls = self.calls.lock().expect("calls");
            calls.last().cloned().expect("one call")
        }
    }

    #[async_trait]
    impl WechatComponentTransport for FakeTransport {
        async fn post_json(
            &self,
            url: &str,
            body: &Value,
        ) -> Result<String, WechatComponentApiError> {
            self.calls
                .lock()
                .expect("calls")
                .push((url.to_string(), body.clone()));
            let response = self.response.lock().expect("response");
            response.as_ref().expect("configured response").clone()
        }
    }

    fn api(transport: FakeTransport) -> WechatComponentApi<FakeTransport> {
        WechatComponentApi::with_base_url(transport, "https://api.weixin.qq.com/")
    }

    #[tokio::test]
    async fn fetches_component_token() {
        let transport = FakeTransport::replies(
            r#"{"component_access_token":"component-token","expires_in":7200}"#,
        );
        let token = api(transport)
            .fetch_component_token("wxcomponent", "secret", "ticket")
            .await
            .expect("token");
        assert_eq!(token.access_token, "component-token");
        assert_eq!(token.expires_in, 7200);
    }

    #[tokio::test]
    async fn posts_component_token_body_to_the_documented_path() {
        let transport = FakeTransport::replies(r#"{"component_access_token":"t","expires_in":1}"#);
        let client = api(transport);
        client
            .fetch_component_token("wxcomponent", "secret", "ticket")
            .await
            .expect("token");
        let (url, body) = client.transport().last_call();
        assert!(url.ends_with(COMPONENT_TOKEN_PATH));
        assert_eq!(body["component_appid"], "wxcomponent");
        assert_eq!(body["component_appsecret"], "secret");
        assert_eq!(body["component_verify_ticket"], "ticket");
    }

    #[tokio::test]
    async fn maps_provider_error_and_token_invalidity() {
        let transport =
            FakeTransport::replies(r#"{"errcode":40001,"errmsg":"invalid credential"}"#);
        let error = api(transport)
            .fetch_component_token("wxcomponent", "secret", "ticket")
            .await
            .expect_err("provider error");
        assert_eq!(error.provider_code(), Some(40001));
        assert!(error.is_token_invalid());
        assert!(!error.is_quota_exhausted());
    }

    #[tokio::test]
    async fn maps_quota_exhaustion() {
        let transport = FakeTransport::replies(
            r#"{"errcode":45009,"errmsg":"reach max api daily quota limit"}"#,
        );
        let error = api(transport)
            .create_pre_auth_code("component-token", "wxcomponent")
            .await
            .expect_err("provider error");
        assert!(error.is_quota_exhausted());
    }

    #[tokio::test]
    async fn creates_pre_auth_code_with_token_in_query() {
        let transport = FakeTransport::replies(r#"{"pre_auth_code":"pre-auth","expires_in":600}"#);
        let code = api(transport)
            .create_pre_auth_code("component-token", "wxcomponent")
            .await
            .expect("pre auth code");
        assert_eq!(code.pre_auth_code, "pre-auth");
        assert_eq!(code.expires_in, 600);
    }

    #[tokio::test]
    async fn parses_authorization_info_and_permission_sets() {
        let transport = FakeTransport::replies(
            r#"{"authorization_info":{
                "authorizer_appid":"wxauthorizer",
                "authorizer_access_token":"authorizer-token",
                "expires_in":7200,
                "authorizer_refresh_token":"refresh-token",
                "func_info":[{"funcscope_category":{"id":18}},{"funcscope_category":{"id":30}}]
            }}"#,
        );
        let info = api(transport)
            .query_authorization("component-token", "wxcomponent", "auth-code")
            .await
            .expect("authorization");
        assert_eq!(info.authorizer_app_id, "wxauthorizer");
        assert_eq!(
            info.authorizer_refresh_token.as_deref(),
            Some("refresh-token")
        );
        assert_eq!(
            info.func_scopes,
            vec![
                AuthorizationFuncScope { category_id: 18 },
                AuthorizationFuncScope { category_id: 30 }
            ]
        );
    }

    #[tokio::test]
    async fn tolerates_missing_refresh_token_on_first_authorization() {
        let transport = FakeTransport::replies(
            r#"{"authorization_info":{
                "authorizer_appid":"wxauthorizer",
                "authorizer_access_token":"authorizer-token",
                "expires_in":7200,
                "authorizer_refresh_token":""
            }}"#,
        );
        let info = api(transport)
            .query_authorization("component-token", "wxcomponent", "auth-code")
            .await
            .expect("authorization");
        assert_eq!(info.authorizer_refresh_token, None);
        assert!(info.func_scopes.is_empty());
    }

    #[tokio::test]
    async fn refreshes_authorizer_token_and_keeps_replacement() {
        let transport = FakeTransport::replies(
            r#"{"authorizer_access_token":"new-token","expires_in":7200,
                "authorizer_refresh_token":"new-refresh"}"#,
        );
        let token = api(transport)
            .refresh_authorizer_token(
                "component-token",
                "wxcomponent",
                "wxauthorizer",
                "old-refresh",
            )
            .await
            .expect("authorizer token");
        assert_eq!(token.authorizer_access_token, "new-token");
        assert_eq!(
            token.authorizer_refresh_token.as_deref(),
            Some("new-refresh")
        );
    }

    #[tokio::test]
    async fn sends_custom_text_with_the_authorizer_token() {
        let transport = FakeTransport::replies(r#"{"errcode":0,"errmsg":"ok"}"#);
        let client = api(transport);
        client
            .send_custom_text("authorizer-token", "openid-1", "hello")
            .await
            .expect("send custom text");
        let (url, body) = client.transport().last_call();
        assert!(url.contains(CUSTOM_TEXT_MESSAGE_PATH));
        assert!(url.contains("access_token=authorizer-token"));
        assert_eq!(body["touser"], "openid-1");
        assert_eq!(body["msgtype"], "text");
        assert_eq!(body["text"]["content"], "hello");
    }

    #[tokio::test]
    async fn rejects_malformed_provider_body() {
        let transport = FakeTransport::replies("not-json");
        let error = api(transport)
            .fetch_component_token("wxcomponent", "secret", "ticket")
            .await
            .expect_err("malformed body");
        assert!(matches!(error, WechatComponentApiError::InvalidResponse(_)));
    }

    #[tokio::test]
    async fn propagates_transport_failure() {
        let transport = FakeTransport::fails(WechatComponentApiError::Transport(
            "connection reset".to_string(),
        ));
        let error = api(transport)
            .fetch_component_token("wxcomponent", "secret", "ticket")
            .await
            .expect_err("transport failure");
        assert_eq!(
            error,
            WechatComponentApiError::Transport("connection reset".to_string())
        );
    }

    #[test]
    fn builds_pc_and_h5_authorization_urls() {
        let pc = authorization_entry_url(
            WechatComponentAuthorizationSurface::PcScan,
            "wxcomponent",
            "pre-auth",
            "https://example.com/callback?source=wechat",
            WechatComponentAuthorizationScope::Both,
        )
        .expect("pc url");
        assert!(pc.starts_with(COMPONENT_PC_AUTHORIZATION_PAGE));
        assert!(pc.contains("auth_type=3"));
        assert!(pc.contains("redirect_uri=https%3A%2F%2Fexample.com%2Fcallback%3Fsource%3Dwechat"));

        let h5 = authorization_entry_url(
            WechatComponentAuthorizationSurface::H5,
            "wxcomponent",
            "pre-auth",
            "https://example.com/callback",
            WechatComponentAuthorizationScope::MiniProgram,
        )
        .expect("h5 url");
        assert!(h5.contains("action=bindcomponent"));
        assert!(h5.contains("no_scan=1"));
        assert!(h5.contains("auth_type=2"));
    }

    #[test]
    fn rejects_non_absolute_redirect_uri() {
        let error = authorization_entry_url(
            WechatComponentAuthorizationSurface::PcScan,
            "wxcomponent",
            "pre-auth",
            "/callback",
            WechatComponentAuthorizationScope::Both,
        )
        .expect_err("relative redirect must fail");
        assert!(matches!(error, WechatComponentApiError::InvalidRequest(_)));
    }

    #[test]
    fn token_freshness_uses_documented_margins() {
        let expires_at = 10_000;
        assert!(component_token_needs_refresh(expires_at, 9_500));
        assert!(!component_token_needs_refresh(expires_at, 9_000));
        assert!(component_token_is_usable(expires_at, 9_800));
        assert!(!component_token_is_usable(expires_at, 9_990));
    }
}
