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
/// Authorizer account information path (component token).
pub const AUTHORIZER_INFO_PATH: &str = "/cgi-bin/component/api_get_authorizer_info";
/// Official-account custom menu create path (authorizer token).
pub const OFFICIAL_ACCOUNT_MENU_CREATE_PATH: &str = "/cgi-bin/menu/create";
/// Official-account custom menu read path (authorizer token).
pub const OFFICIAL_ACCOUNT_MENU_GET_PATH: &str = "/cgi-bin/menu/get";
/// Official-account custom menu delete path (authorizer token).
pub const OFFICIAL_ACCOUNT_MENU_DELETE_PATH: &str = "/cgi-bin/menu/delete";
/// Mini-program code upload path (authorizer token).
pub const MINI_PROGRAM_COMMIT_PATH: &str = "/wxa/commit";
/// Mini-program review submission path (authorizer token).
pub const MINI_PROGRAM_SUBMIT_AUDIT_PATH: &str = "/wxa/submit_audit";
/// Mini-program review status path (authorizer token).
pub const MINI_PROGRAM_AUDIT_STATUS_PATH: &str = "/wxa/get_auditstatus";
/// Mini-program release path (authorizer token).
pub const MINI_PROGRAM_RELEASE_PATH: &str = "/wxa/release";
/// Mini-program version rollback path (authorizer token).
pub const MINI_PROGRAM_REVERT_PATH: &str = "/wxa/revertcoderelease";
/// Mini-program gray release path (authorizer token).
pub const MINI_PROGRAM_GRAY_RELEASE_PATH: &str = "/wxa/grayrelease";
/// Mini-program server-domain path (authorizer token).
pub const MINI_PROGRAM_MODIFY_DOMAIN_PATH: &str = "/wxa/modify_domain";
/// Mini-program privacy declaration path (authorizer token).
pub const MINI_PROGRAM_PRIVACY_PATH: &str = "/cgi-bin/component/setprivacysetting";

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

/// Authorizer account information returned by `api_get_authorizer_info`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AuthorizerInfo {
    /// Display name shown to users.
    pub nick_name: Option<String>,
    /// Avatar URL.
    pub head_img: Option<String>,
    /// Account service type.
    pub service_type: Option<i64>,
    /// Verification type.
    pub verify_type: Option<i64>,
    /// WeChat original id (`gh_` / `wx` base id).
    pub original_id: Option<String>,
    /// Principal (company or person) name.
    pub principal_name: Option<String>,
    /// QR code image URL.
    pub qrcode_url: Option<String>,
    /// Granted permission-set category ids.
    pub func_category_ids: Vec<i64>,
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

    /// GETs a URL and returns the raw response text.
    ///
    /// The default refuses the call so an existing transport that only supports
    /// POST keeps compiling and fails loudly rather than silently issuing a POST
    /// against a GET-only endpoint.
    async fn get_json(&self, _url: &str) -> Result<String, WechatComponentApiError> {
        Err(WechatComponentApiError::Transport(
            "transport does not support GET".to_string(),
        ))
    }
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

    async fn get_json(&self, url: &str) -> Result<String, WechatComponentApiError> {
        let response = self
            .client
            .get(url)
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

    /// Fetches provider-side account information for one authorizer.
    pub async fn get_authorizer_info(
        &self,
        component_access_token: &str,
        component_app_id: &str,
        authorizer_app_id: &str,
    ) -> Result<AuthorizerInfo, WechatComponentApiError> {
        require_non_empty(authorizer_app_id, "authorizer_app_id")?;
        let value = self
            .post_with_token(
                AUTHORIZER_INFO_PATH,
                component_access_token,
                json!({
                    "component_appid": component_app_id,
                    "authorizer_appid": authorizer_app_id,
                }),
            )
            .await?;
        let info = value.get("authorizer_info").ok_or_else(|| {
            WechatComponentApiError::InvalidResponse("authorizer_info is missing".to_string())
        })?;
        Ok(AuthorizerInfo {
            nick_name: optional_str(info, "nick_name"),
            head_img: optional_str(info, "head_img"),
            service_type: info
                .get("service_type_info")
                .and_then(|value| value.get("id"))
                .and_then(Value::as_i64),
            verify_type: info
                .get("verify_type_info")
                .and_then(|value| value.get("id"))
                .and_then(Value::as_i64),
            original_id: optional_str(info, "user_name"),
            principal_name: optional_str(info, "principal_name"),
            qrcode_url: optional_str(info, "qrcode_url"),
            func_category_ids: parse_func_scopes(info)?
                .into_iter()
                .map(|scope| scope.category_id)
                .collect(),
        })
    }

    /// Creates the official account's default custom menu.
    pub async fn create_official_account_menu(
        &self,
        authorizer_access_token: &str,
        menu: Value,
    ) -> Result<(), WechatComponentApiError> {
        self.post_authorizer(
            OFFICIAL_ACCOUNT_MENU_CREATE_PATH,
            authorizer_access_token,
            menu,
        )
        .await?;
        Ok(())
    }

    /// Reads the official account's default custom menu.
    pub async fn retrieve_official_account_menu(
        &self,
        authorizer_access_token: &str,
    ) -> Result<Value, WechatComponentApiError> {
        self.get_authorizer(OFFICIAL_ACCOUNT_MENU_GET_PATH, authorizer_access_token)
            .await
    }

    /// Deletes the official account's default custom menu.
    pub async fn delete_official_account_menu(
        &self,
        authorizer_access_token: &str,
    ) -> Result<(), WechatComponentApiError> {
        self.get_authorizer(OFFICIAL_ACCOUNT_MENU_DELETE_PATH, authorizer_access_token)
            .await?;
        Ok(())
    }

    /// Uploads mini-program code from a template and creates a development version.
    pub async fn commit_mini_program_code(
        &self,
        authorizer_access_token: &str,
        template_id: &str,
        ext_json: Option<&str>,
        user_version: &str,
        user_desc: &str,
    ) -> Result<(), WechatComponentApiError> {
        require_non_empty(template_id, "template_id")?;
        require_non_empty(user_version, "user_version")?;
        let mut body = json!({
            "template_id": template_id,
            "user_version": user_version,
            "user_desc": user_desc,
        });
        if let Some(ext_json) = ext_json {
            body["ext_json"] = json!(ext_json);
        }
        self.post_authorizer(MINI_PROGRAM_COMMIT_PATH, authorizer_access_token, body)
            .await?;
        Ok(())
    }

    /// Submits a mini-program review package.
    pub async fn submit_mini_program_audit(
        &self,
        authorizer_access_token: &str,
        items: Vec<Value>,
        feedback: Option<&str>,
    ) -> Result<String, WechatComponentApiError> {
        if items.is_empty() {
            return Err(WechatComponentApiError::InvalidRequest(
                "item_list is empty".to_string(),
            ));
        }
        let mut body = json!({ "item_list": items });
        if let Some(feedback) = feedback {
            body["feedback_info"] = json!(feedback);
        }
        let value = self
            .post_authorizer(
                MINI_PROGRAM_SUBMIT_AUDIT_PATH,
                authorizer_access_token,
                body,
            )
            .await?;
        required_str(&value, "auditid")
    }

    /// Returns the documented audit status code (`0..=4`).
    pub async fn get_mini_program_audit_status(
        &self,
        authorizer_access_token: &str,
        audit_id: &str,
    ) -> Result<i64, WechatComponentApiError> {
        require_non_empty(audit_id, "audit_id")?;
        let value = self
            .post_authorizer(
                MINI_PROGRAM_AUDIT_STATUS_PATH,
                authorizer_access_token,
                json!({ "auditid": audit_id }),
            )
            .await?;
        required_i64(&value, "status")
    }

    /// Releases the approved version.
    pub async fn release_mini_program_code(
        &self,
        authorizer_access_token: &str,
    ) -> Result<(), WechatComponentApiError> {
        // WeChat rejects an empty request without a JSON body (`44002`), so the
        // body is explicitly `{}` rather than omitted.
        self.post_authorizer(
            MINI_PROGRAM_RELEASE_PATH,
            authorizer_access_token,
            json!({}),
        )
        .await?;
        Ok(())
    }

    /// Lists rollback candidates or rolls back to `app_version`.
    pub async fn revert_mini_program_code(
        &self,
        authorizer_access_token: &str,
        app_version: Option<&str>,
    ) -> Result<Value, WechatComponentApiError> {
        let path = match app_version {
            Some(version) => format!(
                "{MINI_PROGRAM_REVERT_PATH}?app_version={}",
                urlencoding::encode(version)
            ),
            None => format!("{MINI_PROGRAM_REVERT_PATH}?action=get_history_version"),
        };
        self.get_authorizer(&path, authorizer_access_token).await
    }

    /// Starts or adjusts a gray release.
    pub async fn gray_release_mini_program_code(
        &self,
        authorizer_access_token: &str,
        gray_percentage: u16,
        support_debuger_first: bool,
        support_experiencer_first: bool,
    ) -> Result<(), WechatComponentApiError> {
        if gray_percentage > 100 {
            return Err(WechatComponentApiError::InvalidRequest(
                "gray_percentage must be between 0 and 100".to_string(),
            ));
        }
        self.post_authorizer(
            MINI_PROGRAM_GRAY_RELEASE_PATH,
            authorizer_access_token,
            json!({
                "gray_percentage": gray_percentage,
                "support_debuger_first": support_debuger_first,
                "support_experiencer_first": support_experiencer_first,
            }),
        )
        .await?;
        Ok(())
    }

    /// Adds, sets, or deletes the mini-program request domains.
    pub async fn modify_mini_program_request_domains(
        &self,
        authorizer_access_token: &str,
        action: &str,
        request_domains: &[String],
    ) -> Result<(), WechatComponentApiError> {
        require_non_empty(action, "action")?;
        self.post_authorizer(
            MINI_PROGRAM_MODIFY_DOMAIN_PATH,
            authorizer_access_token,
            json!({
                "action": action,
                "requestdomain": request_domains,
                "wsrequestdomain": [],
                "uploaddomain": [],
                "downloaddomain": [],
                "udpdomain": [],
                "tcpdomain": [],
            }),
        )
        .await?;
        Ok(())
    }

    /// Sets the mini-program privacy declaration.
    pub async fn set_mini_program_privacy(
        &self,
        authorizer_access_token: &str,
        privacy: Value,
    ) -> Result<(), WechatComponentApiError> {
        self.post_authorizer(MINI_PROGRAM_PRIVACY_PATH, authorizer_access_token, privacy)
            .await?;
        Ok(())
    }

    async fn post_authorizer(
        &self,
        path: &str,
        authorizer_access_token: &str,
        body: Value,
    ) -> Result<Value, WechatComponentApiError> {
        require_non_empty(authorizer_access_token, "authorizer_access_token")?;
        self.post(&with_access_token(path, authorizer_access_token), body)
            .await
    }

    async fn get_authorizer(
        &self,
        path: &str,
        authorizer_access_token: &str,
    ) -> Result<Value, WechatComponentApiError> {
        require_non_empty(authorizer_access_token, "authorizer_access_token")?;
        self.get(&with_access_token(path, authorizer_access_token))
            .await
    }

    async fn get(&self, path: &str) -> Result<Value, WechatComponentApiError> {
        let url = format!("{}{}", self.base_url.trim_end_matches('/'), path);
        let raw = self.transport.get_json(&url).await?;
        let value: Value = serde_json::from_str(&raw).map_err(|_| {
            WechatComponentApiError::InvalidResponse("body is not valid json".to_string())
        })?;
        reject_provider_error(&value)?;
        Ok(value)
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

fn with_access_token(path: &str, access_token: &str) -> String {
    let separator = if path.contains('?') { '&' } else { '?' };
    format!(
        "{path}{separator}access_token={}",
        urlencoding::encode(access_token)
    )
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

        async fn get_json(&self, url: &str) -> Result<String, WechatComponentApiError> {
            self.calls
                .lock()
                .expect("calls")
                .push((url.to_string(), Value::Null));
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
    async fn fetches_authorizer_info() {
        let transport = FakeTransport::replies(
            r#"{"authorizer_info":{"nick_name":"Acct","head_img":"https://img","service_type_info":{"id":2},"verify_type_info":{"id":0},"user_name":"gh_1","principal_name":"Co","qrcode_url":"https://qr","func_info":[{"funcscope_category":{"id":18}}]}}"#,
        );
        let client = api(transport);
        let info = client
            .get_authorizer_info("component-token", "wxcomponent", "wxauthorizer")
            .await
            .expect("authorizer info");
        assert_eq!(info.nick_name.as_deref(), Some("Acct"));
        assert_eq!(info.original_id.as_deref(), Some("gh_1"));
        assert_eq!(info.service_type, Some(2));
        assert_eq!(info.func_category_ids, vec![18]);
        let (url, body) = client.transport().last_call();
        assert!(url.contains(AUTHORIZER_INFO_PATH));
        assert_eq!(body["authorizer_appid"], "wxauthorizer");
    }

    #[tokio::test]
    async fn creates_and_reads_the_official_account_menu() {
        let transport = FakeTransport::replies(r#"{"errcode":0,"errmsg":"ok"}"#);
        let client = api(transport);
        client
            .create_official_account_menu("authorizer-token", serde_json::json!({"button":[]}))
            .await
            .expect("create menu");
        let (url, body) = client.transport().last_call();
        assert!(url.contains(OFFICIAL_ACCOUNT_MENU_CREATE_PATH));
        assert!(url.contains("access_token=authorizer-token"));
        assert!(body["button"].is_array());

        let transport = FakeTransport::replies(r#"{"menu":{"button":[]}}"#);
        let client = api(transport);
        let menu = client
            .retrieve_official_account_menu("authorizer-token")
            .await
            .expect("read menu");
        assert!(menu["menu"].is_object());
        let (url, body) = client.transport().last_call();
        assert!(url.contains(OFFICIAL_ACCOUNT_MENU_GET_PATH));
        assert_eq!(body, Value::Null);
    }

    #[tokio::test]
    async fn commits_mini_program_code_and_submits_audit() {
        let transport = FakeTransport::replies(r#"{"errcode":0}"#);
        let client = api(transport);
        client
            .commit_mini_program_code(
                "authorizer-token",
                "tpl-1",
                Some(r#"{"extAppid":"wx1"}"#),
                "1.0.0",
                "build 1",
            )
            .await
            .expect("commit");
        let (url, body) = client.transport().last_call();
        assert!(url.contains(MINI_PROGRAM_COMMIT_PATH));
        assert_eq!(body["template_id"], "tpl-1");
        assert_eq!(body["user_version"], "1.0.0");
        assert_eq!(body["ext_json"], r#"{"extAppid":"wx1"}"#);

        let transport = FakeTransport::replies(r#"{"auditid":"audit-1"}"#);
        let client = api(transport);
        let audit_id = client
            .submit_mini_program_audit(
                "authorizer-token",
                vec![serde_json::json!({"address":"pages/index"})],
                Some("first release"),
            )
            .await
            .expect("submit audit");
        assert_eq!(audit_id, "audit-1");
        let (_, body) = client.transport().last_call();
        assert_eq!(body["feedback_info"], "first release");
        assert!(body["item_list"].is_array());
    }

    #[tokio::test]
    async fn reads_audit_status_and_releases() {
        let transport = FakeTransport::replies(r#"{"status":2}"#);
        let client = api(transport);
        assert_eq!(
            client
                .get_mini_program_audit_status("authorizer-token", "audit-1")
                .await
                .expect("status"),
            2
        );
        let (url, body) = client.transport().last_call();
        assert!(url.contains(MINI_PROGRAM_AUDIT_STATUS_PATH));
        assert_eq!(body["auditid"], "audit-1");

        let transport = FakeTransport::replies(r#"{"errcode":0}"#);
        let client = api(transport);
        client
            .release_mini_program_code("authorizer-token")
            .await
            .expect("release");
        let (url, body) = client.transport().last_call();
        assert!(url.contains(MINI_PROGRAM_RELEASE_PATH));
        assert_eq!(body, serde_json::json!({}));
    }

    #[tokio::test]
    async fn rolls_back_and_adjusts_gray_release_and_domains_and_privacy() {
        let transport = FakeTransport::replies(r#"{"version_list":[]}"#);
        let client = api(transport);
        client
            .revert_mini_program_code("authorizer-token", Some("v1"))
            .await
            .expect("revert");
        let (url, _) = client.transport().last_call();
        assert!(url.contains(MINI_PROGRAM_REVERT_PATH));
        assert!(url.contains("app_version=v1"));

        let transport = FakeTransport::replies(r#"{"errcode":0}"#);
        let client = api(transport);
        client
            .gray_release_mini_program_code("authorizer-token", 30, true, false)
            .await
            .expect("gray");
        let (_, body) = client.transport().last_call();
        assert_eq!(body["gray_percentage"], 30);
        assert_eq!(body["support_debuger_first"], true);

        let transport = FakeTransport::replies(r#"{"errcode":0}"#);
        let client = api(transport);
        client
            .modify_mini_program_request_domains(
                "authorizer-token",
                "add",
                &["https://api.example.com".to_string()],
            )
            .await
            .expect("domains");
        let (_, body) = client.transport().last_call();
        assert_eq!(body["requestdomain"][0], "https://api.example.com");

        let transport = FakeTransport::replies(r#"{"errcode":0}"#);
        let client = api(transport);
        client
            .set_mini_program_privacy("authorizer-token", serde_json::json!({"privacy_ver":1}))
            .await
            .expect("privacy");
        let (_, body) = client.transport().last_call();
        assert_eq!(body["privacy_ver"], 1);
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
