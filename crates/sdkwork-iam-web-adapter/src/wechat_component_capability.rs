//! Authorizer capability gateway: one place that turns an authorization id into
//! a provider call with a fresh authorizer token.
//!
//! Callers (admin commands, Deploy's publish worker, future internal RPC) must
//! never hold or cache an `authorizer_access_token`. They name the authorization
//! and the capability; this service resolves a token through the refresh service
//! and then performs exactly one provider call.
//!
//! The capability set covers what "quick onboarding" needs for both surfaces:
//! official-account menus and mini-program code management (commit, review,
//! release, rollback, gray), domain edits, and the privacy declaration.
use async_trait::async_trait;
use serde_json::Value;

use crate::wechat_component_api::{
    AuthorizerInfo, WechatComponentApi, WechatComponentApiError, WechatComponentTransport,
};
use crate::wechat_component_authorizer::{
    AuthorizerTokenLease, PgAuthorizerTokenService, WechatComponentAuthorizerError,
};

/// Official-account menu publish capability id.
pub const CAPABILITY_OA_MENU_PUBLISH: &str = "official_account.menu.publish";
/// Official-account menu read capability id.
pub const CAPABILITY_OA_MENU_RETRIEVE: &str = "official_account.menu.retrieve";
/// Mini-program code upload capability id.
pub const CAPABILITY_MP_CODE_COMMIT: &str = "mini_program.code.commit";
/// Mini-program review submission capability id.
pub const CAPABILITY_MP_AUDIT_SUBMIT: &str = "mini_program.audit.submit";
/// Mini-program review status capability id.
pub const CAPABILITY_MP_AUDIT_STATUS: &str = "mini_program.audit.status";
/// Mini-program release capability id.
pub const CAPABILITY_MP_RELEASE: &str = "mini_program.release";
/// Mini-program rollback capability id.
pub const CAPABILITY_MP_ROLLBACK: &str = "mini_program.rollback";
/// Mini-program gray release capability id.
pub const CAPABILITY_MP_GRAY_RELEASE: &str = "mini_program.gray_release";
/// Mini-program domain edit capability id.
pub const CAPABILITY_MP_DOMAINS_MODIFY: &str = "mini_program.domains.modify";
/// Mini-program privacy declaration capability id.
pub const CAPABILITY_MP_PRIVACY_SET: &str = "mini_program.privacy.set";

/// True when a string names a capability this build can execute.
pub fn is_supported_capability(value: &str) -> bool {
    matches!(
        value.trim(),
        CAPABILITY_OA_MENU_PUBLISH
            | CAPABILITY_OA_MENU_RETRIEVE
            | CAPABILITY_MP_CODE_COMMIT
            | CAPABILITY_MP_AUDIT_SUBMIT
            | CAPABILITY_MP_AUDIT_STATUS
            | CAPABILITY_MP_RELEASE
            | CAPABILITY_MP_ROLLBACK
            | CAPABILITY_MP_GRAY_RELEASE
            | CAPABILITY_MP_DOMAINS_MODIFY
            | CAPABILITY_MP_PRIVACY_SET
    )
}

/// The token-provider boundary, so capability tests do not need a database.
#[async_trait]
pub trait AuthorizerTokenProvider: Send + Sync {
    /// Returns a usable access token for one resource authorization.
    async fn access_token(
        &self,
        authorization_id: &str,
        now: i64,
    ) -> Result<AuthorizerTokenLease, WechatComponentAuthorizerError>;
}

#[async_trait]
impl<T: WechatComponentTransport> AuthorizerTokenProvider for PgAuthorizerTokenService<T> {
    async fn access_token(
        &self,
        authorization_id: &str,
        now: i64,
    ) -> Result<AuthorizerTokenLease, WechatComponentAuthorizerError> {
        self.resolve(authorization_id, now).await
    }
}

/// A capability failure.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum WechatCapabilityError {
    /// The caller's capability payload is incomplete.
    InvalidRequest(String),
    /// The authorization or token refresh failed.
    Token(WechatComponentAuthorizerError),
    /// The provider call failed.
    Api(WechatComponentApiError),
}

impl std::fmt::Display for WechatCapabilityError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidRequest(detail) => write!(f, "capability payload is invalid: {detail}"),
            Self::Token(error) => write!(f, "authorizer token unavailable: {error}"),
            Self::Api(error) => write!(f, "provider capability failed: {error}"),
        }
    }
}

impl std::error::Error for WechatCapabilityError {}

impl From<WechatComponentAuthorizerError> for WechatCapabilityError {
    fn from(error: WechatComponentAuthorizerError) -> Self {
        Self::Token(error)
    }
}

impl From<WechatComponentApiError> for WechatCapabilityError {
    fn from(error: WechatComponentApiError) -> Self {
        Self::Api(error)
    }
}

/// Runs provider capabilities for one authorization.
pub struct WechatAuthorizerCapabilityService<
    P: AuthorizerTokenProvider,
    T: WechatComponentTransport,
> {
    provider: P,
    api: WechatComponentApi<T>,
}

impl<P: AuthorizerTokenProvider, T: WechatComponentTransport>
    WechatAuthorizerCapabilityService<P, T>
{
    /// Builds the service.
    pub fn new(provider: P, api: WechatComponentApi<T>) -> Self {
        Self { provider, api }
    }

    async fn token(
        &self,
        authorization_id: &str,
        now: i64,
    ) -> Result<String, WechatCapabilityError> {
        Ok(self
            .provider
            .access_token(authorization_id, now)
            .await?
            .access_token)
    }

    /// Fetches provider-side account information for one authorization.
    pub async fn authorizer_info(
        &self,
        component_access_token: &str,
        component_app_id: &str,
        authorizer_app_id: &str,
    ) -> Result<AuthorizerInfo, WechatCapabilityError> {
        Ok(self
            .api
            .get_authorizer_info(component_access_token, component_app_id, authorizer_app_id)
            .await?)
    }

    /// Creates the official account custom menu.
    pub async fn publish_official_account_menu(
        &self,
        authorization_id: &str,
        menu: Value,
        now: i64,
    ) -> Result<(), WechatCapabilityError> {
        let token = self.token(authorization_id, now).await?;
        self.api.create_official_account_menu(&token, menu).await?;
        Ok(())
    }

    /// Reads the official account custom menu.
    pub async fn official_account_menu(
        &self,
        authorization_id: &str,
        now: i64,
    ) -> Result<Value, WechatCapabilityError> {
        let token = self.token(authorization_id, now).await?;
        Ok(self.api.retrieve_official_account_menu(&token).await?)
    }

    /// Uploads mini-program code.
    pub async fn commit_mini_program_code(
        &self,
        authorization_id: &str,
        template_id: &str,
        ext_json: Option<&str>,
        user_version: &str,
        user_desc: &str,
        now: i64,
    ) -> Result<(), WechatCapabilityError> {
        let token = self.token(authorization_id, now).await?;
        self.api
            .commit_mini_program_code(&token, template_id, ext_json, user_version, user_desc)
            .await?;
        Ok(())
    }

    /// Submits a mini-program review and returns the audit id.
    pub async fn submit_mini_program_audit(
        &self,
        authorization_id: &str,
        items: Vec<Value>,
        feedback: Option<&str>,
        now: i64,
    ) -> Result<String, WechatCapabilityError> {
        let token = self.token(authorization_id, now).await?;
        Ok(self
            .api
            .submit_mini_program_audit(&token, items, feedback)
            .await?)
    }

    /// Reads the mini-program audit status.
    pub async fn mini_program_audit_status(
        &self,
        authorization_id: &str,
        audit_id: &str,
        now: i64,
    ) -> Result<i64, WechatCapabilityError> {
        let token = self.token(authorization_id, now).await?;
        Ok(self
            .api
            .get_mini_program_audit_status(&token, audit_id)
            .await?)
    }

    /// Releases the approved mini-program version.
    pub async fn release_mini_program_code(
        &self,
        authorization_id: &str,
        now: i64,
    ) -> Result<(), WechatCapabilityError> {
        let token = self.token(authorization_id, now).await?;
        self.api.release_mini_program_code(&token).await?;
        Ok(())
    }

    /// Lists rollback candidates or rolls back to one version.
    pub async fn revert_mini_program_code(
        &self,
        authorization_id: &str,
        app_version: Option<&str>,
        now: i64,
    ) -> Result<Value, WechatCapabilityError> {
        let token = self.token(authorization_id, now).await?;
        Ok(self
            .api
            .revert_mini_program_code(&token, app_version)
            .await?)
    }

    /// Starts or adjusts a gray release.
    pub async fn gray_release_mini_program_code(
        &self,
        authorization_id: &str,
        gray_percentage: u16,
        support_debuger_first: bool,
        support_experiencer_first: bool,
        now: i64,
    ) -> Result<(), WechatCapabilityError> {
        let token = self.token(authorization_id, now).await?;
        self.api
            .gray_release_mini_program_code(
                &token,
                gray_percentage,
                support_debuger_first,
                support_experiencer_first,
            )
            .await?;
        Ok(())
    }

    /// Adds, sets, or deletes mini-program request domains.
    pub async fn modify_request_domains(
        &self,
        authorization_id: &str,
        action: &str,
        request_domains: &[String],
        now: i64,
    ) -> Result<(), WechatCapabilityError> {
        let token = self.token(authorization_id, now).await?;
        self.api
            .modify_mini_program_request_domains(&token, action, request_domains)
            .await?;
        Ok(())
    }

    /// Sets the mini-program privacy declaration.
    pub async fn set_mini_program_privacy(
        &self,
        authorization_id: &str,
        privacy: Value,
        now: i64,
    ) -> Result<(), WechatCapabilityError> {
        let token = self.token(authorization_id, now).await?;
        self.api.set_mini_program_privacy(&token, privacy).await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::wechat_component_api::{WechatComponentApi, WechatComponentApiError};
    use serde_json::Value;
    use std::collections::VecDeque;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::{Arc, Mutex};

    #[derive(Clone)]
    struct FakeTokenProvider {
        token: Result<String, WechatComponentAuthorizerError>,
    }

    #[async_trait]
    impl AuthorizerTokenProvider for FakeTokenProvider {
        async fn access_token(
            &self,
            _authorization_id: &str,
            _now: i64,
        ) -> Result<AuthorizerTokenLease, WechatComponentAuthorizerError> {
            self.token.clone().map(|token| AuthorizerTokenLease {
                authorization_id: "auth-1".to_string(),
                authorizer_app_id: "wxauthorizer".to_string(),
                access_token: token,
                expires_at: i64::MAX,
            })
        }
    }

    #[derive(Clone)]
    struct QueueTransport {
        calls: Arc<AtomicUsize>,
        urls: Arc<Mutex<Vec<String>>>,
        responses: Arc<Mutex<VecDeque<String>>>,
    }

    impl QueueTransport {
        fn new(responses: &[&str]) -> (Self, Arc<AtomicUsize>, Arc<Mutex<Vec<String>>>) {
            let calls = Arc::new(AtomicUsize::new(0));
            let urls = Arc::new(Mutex::new(Vec::new()));
            (
                Self {
                    calls: calls.clone(),
                    urls: urls.clone(),
                    responses: Arc::new(Mutex::new(
                        responses.iter().map(|value| value.to_string()).collect(),
                    )),
                },
                calls,
                urls,
            )
        }
    }

    #[async_trait]
    impl WechatComponentTransport for QueueTransport {
        async fn post_json(
            &self,
            url: &str,
            _body: &Value,
        ) -> Result<String, WechatComponentApiError> {
            self.calls.fetch_add(1, Ordering::SeqCst);
            self.urls.lock().expect("urls").push(url.to_string());
            self.responses
                .lock()
                .expect("responses")
                .pop_front()
                .ok_or_else(|| WechatComponentApiError::Transport("no response".to_string()))
        }

        async fn get_json(&self, url: &str) -> Result<String, WechatComponentApiError> {
            self.calls.fetch_add(1, Ordering::SeqCst);
            self.urls.lock().expect("urls").push(url.to_string());
            self.responses
                .lock()
                .expect("responses")
                .pop_front()
                .ok_or_else(|| WechatComponentApiError::Transport("no response".to_string()))
        }
    }

    #[allow(clippy::type_complexity)]
    fn service(
        token: Result<String, WechatComponentAuthorizerError>,
        responses: &[&str],
    ) -> (
        WechatAuthorizerCapabilityService<FakeTokenProvider, QueueTransport>,
        Arc<AtomicUsize>,
        Arc<Mutex<Vec<String>>>,
    ) {
        let (transport, calls, urls) = QueueTransport::new(responses);
        (
            WechatAuthorizerCapabilityService::new(
                FakeTokenProvider { token },
                WechatComponentApi::with_base_url(transport, "https://api.weixin.qq.com"),
            ),
            calls,
            urls,
        )
    }

    #[tokio::test]
    async fn publishes_and_reads_the_official_account_menu() {
        let (service, calls, urls) = service(
            Ok("authorizer-token".to_string()),
            &[r#"{"errcode":0}"#, r#"{"menu":{"button":[]}}"#],
        );
        service
            .publish_official_account_menu("auth-1", serde_json::json!({"button":[]}), 1)
            .await
            .expect("publish");
        let menu = service
            .official_account_menu("auth-1", 2)
            .await
            .expect("read");
        assert!(menu["menu"].is_object());
        assert_eq!(calls.load(Ordering::SeqCst), 2);
        let urls = urls.lock().expect("urls");
        assert!(urls[0].contains("/cgi-bin/menu/create"));
        assert!(urls[0].contains("access_token=authorizer-token"));
        assert!(urls[1].contains("/cgi-bin/menu/get"));
    }

    #[tokio::test]
    async fn runs_the_mini_program_code_lifecycle() {
        let (service, calls, urls) = service(
            Ok("authorizer-token".to_string()),
            &[
                r#"{"errcode":0}"#,
                r#"{"auditid":"audit-1"}"#,
                r#"{"status":2}"#,
                r#"{"errcode":0}"#,
                r#"{"version_list":[]}"#,
                r#"{"errcode":0}"#,
            ],
        );
        service
            .commit_mini_program_code("auth-1", "tpl-1", None, "1.0.0", "build", 1)
            .await
            .expect("commit");
        let audit_id = service
            .submit_mini_program_audit("auth-1", vec![serde_json::json!({"address":"p"})], None, 2)
            .await
            .expect("submit");
        assert_eq!(audit_id, "audit-1");
        assert_eq!(
            service
                .mini_program_audit_status("auth-1", "audit-1", 3)
                .await
                .expect("status"),
            2
        );
        service
            .release_mini_program_code("auth-1", 4)
            .await
            .expect("release");
        service
            .revert_mini_program_code("auth-1", Some("v0"), 5)
            .await
            .expect("revert");
        service
            .gray_release_mini_program_code("auth-1", 10, false, false, 6)
            .await
            .expect("gray");
        assert_eq!(calls.load(Ordering::SeqCst), 6);
        let urls = urls.lock().expect("urls");
        assert!(urls[0].contains("/wxa/commit"));
        assert!(urls[1].contains("/wxa/submit_audit"));
        assert!(urls[2].contains("/wxa/get_auditstatus"));
        assert!(urls[3].contains("/wxa/release"));
        assert!(urls[4].contains("/wxa/revertcoderelease"));
        assert!(urls[4].contains("app_version=v0"));
        assert!(urls[5].contains("/wxa/grayrelease"));
    }

    #[tokio::test]
    async fn token_failure_short_circuits_without_a_provider_call() {
        let (service, calls, _urls) = service(
            Err(WechatComponentAuthorizerError::MissingRefreshToken(
                "auth-1".to_string(),
            )),
            &[],
        );
        let error = service
            .release_mini_program_code("auth-1", 1)
            .await
            .expect_err("must fail");
        assert!(matches!(error, WechatCapabilityError::Token(_)));
        assert_eq!(calls.load(Ordering::SeqCst), 0);
    }

    #[tokio::test]
    async fn sets_domains_and_privacy() {
        let (service, calls, urls) = service(
            Ok("authorizer-token".to_string()),
            &[r#"{"errcode":0}"#, r#"{"errcode":0}"#],
        );
        service
            .modify_request_domains("auth-1", "add", &["https://api.example.com".to_string()], 1)
            .await
            .expect("domains");
        service
            .set_mini_program_privacy("auth-1", serde_json::json!({"privacy_ver":1}), 2)
            .await
            .expect("privacy");
        assert_eq!(calls.load(Ordering::SeqCst), 2);
        let urls = urls.lock().expect("urls");
        assert!(urls[0].contains("/wxa/modify_domain"));
        assert!(urls[1].contains("/cgi-bin/component/setprivacysetting"));
    }
}
