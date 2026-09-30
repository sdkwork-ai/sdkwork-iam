//! Desktop browser-login deep-link contract for native hosts (Tauri, Electron).
//!
//! The desktop app never renders the IAM login itself: it opens the system
//! browser at the OAuth authorize endpoint (public client + PKCE S256), the
//! user completes login/registration/password reset on the hosted web surface,
//! the browser lands on the hosted login-success page, and the deeplink hands
//! `code` + `state` back to this app. The app redeems the code through
//! `POST /app/v3/api/oauth/desktop_sessions` for a standard dual-token session.
//!
//! This module is the typed contract every native host adapter implements; it
//! owns only names and shapes, never tokens or business authorization.

use sdkwork_routes_iam_app_api::app_routes;
use sdkwork_web_contract::RouteAuth;

/// Default callback path appended to the app deep-link scheme.
pub const DESKTOP_AUTH_CALLBACK_PATH: &str = "/auth/callback";

/// Path of the hosted login surface the authorize endpoint redirects to.
pub const HOSTED_LOGIN_PATH: &str = "/auth/login";

/// Path of the hosted login-success surface the browser lands on before the
/// deeplink hand-off.
pub const HOSTED_DESKTOP_LAUNCH_PATH: &str = "/auth/desktop/launch";

/// Open-api authorization endpoint path (IAM as OAuth authorization server).
pub const OAUTH_AUTHORIZE_PATH: &str = "/iam/v3/oauth/authorize";

/// App-api endpoint that redeems the PKCE-bound authorization code for a
/// standard dual-token IAM session.
pub const DESKTOP_SESSION_EXCHANGE_PATH: &str = "/app/v3/api/oauth/desktop_sessions";

/// Operation id of the desktop session exchange in the app-api manifest.
pub const DESKTOP_SESSION_OPERATION_ID: &str = "desktopSessions.create";

/// Bridge method names from the desktop bridge protocol
/// (`DESKTOP_APP_ARCHITECTURE_SPEC.md` section 5.6). Host adapters implement
/// exactly these; renderer feature code consumes them through the typed host
/// port only.
pub const BRIDGE_DEEP_LINKS_GET_INITIAL_URL: &str = "sdkwork:deepLinks:getInitialUrl";
pub const BRIDGE_DEEP_LINKS_OPEN_EVENT: &str = "sdkwork:deepLinks:open";
pub const BRIDGE_SHELL_OPEN: &str = "sdkwork:shellOpen:open";

/// Upper bound for a deep-link scheme name; keeps OS registrations sane.
const MAX_SCHEME_LENGTH: usize = 64;

/// Typed deep-link contract for one application's desktop browser login.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IamDesktopBrowserLoginContract {
    /// Application key (also the OAuth `client_id` of the desktop relying
    /// party).
    pub app_key: String,
    /// Deep-link scheme derived from the app key, e.g. `sdkwork-iam`.
    pub scheme: String,
    /// Callback path inside the scheme, e.g. `/auth/callback`.
    pub callback_path: String,
    /// Full registered redirect URI, e.g. `sdkwork-iam://auth/callback`.
    pub redirect_uri: String,
    /// Scope set requested at the authorize endpoint.
    pub scopes: Vec<String>,
}

impl IamDesktopBrowserLoginContract {
    /// Authorization redirect target for the system browser:
    /// `{authorize_base}{OAUTH_AUTHORIZE_PATH}` query parameters are appended
    /// by the desktop login controller.
    pub fn authorize_endpoint(&self, authorize_base_url: &str) -> String {
        format!(
            "{}/{}",
            authorize_base_url.trim_end_matches('/'),
            OAUTH_AUTHORIZE_PATH.trim_start_matches('/')
        )
    }

    /// Hosted login URL the browser ultimately renders (used by hosts that
    /// deep-link straight into the web login surface in development).
    pub fn hosted_login_url(&self, login_base_url: &str) -> String {
        format!(
            "{}/{}",
            login_base_url.trim_end_matches('/'),
            HOSTED_LOGIN_PATH.trim_start_matches('/')
        )
    }

    /// Hosted login-success page the browser lands on after completion.
    pub fn hosted_desktop_launch_url(&self, login_base_url: &str) -> String {
        format!(
            "{}/{}",
            login_base_url.trim_end_matches('/'),
            HOSTED_DESKTOP_LAUNCH_PATH.trim_start_matches('/')
        )
    }

    /// App-api session exchange endpoint for the redeem leg.
    pub fn desktop_session_endpoint(&self, app_api_base_url: &str) -> String {
        format!(
            "{}/{}",
            app_api_base_url.trim_end_matches('/'),
            DESKTOP_SESSION_EXCHANGE_PATH.trim_start_matches('/')
        )
    }
}

/// Builds the desktop browser-login contract for an application key and
/// validates the derived deep-link scheme.
pub fn iam_desktop_browser_login_contract(
    app_key: &str,
    scopes: &[String],
) -> Result<IamDesktopBrowserLoginContract, String> {
    let app_key = app_key.trim();
    let scheme = normalize_deep_link_scheme(app_key)?;
    let callback_path = DESKTOP_AUTH_CALLBACK_PATH.to_string();
    let redirect_uri = format!("{scheme}://{}", callback_path.trim_start_matches('/'));
    Ok(IamDesktopBrowserLoginContract {
        app_key: app_key.to_string(),
        scheme,
        callback_path,
        redirect_uri,
        scopes: scopes.to_vec(),
    })
}

/// Deep-link schemes follow the OS private-use scheme rules: lowercase
/// alphanumeric plus `-`, starting with a letter. This rejects scheme
/// injection through application keys before anything reaches the OS.
pub fn normalize_deep_link_scheme(app_key: &str) -> Result<String, String> {
    let trimmed = app_key.trim();
    if trimmed.is_empty() {
        return Err("deep-link scheme requires a non-empty application key".to_string());
    }
    if trimmed.len() > MAX_SCHEME_LENGTH {
        return Err("application key is too long for a deep-link scheme".to_string());
    }
    let mut chars = trimmed.chars();
    let first = chars.next().unwrap_or_default();
    if !first.is_ascii_lowercase() {
        return Err(format!(
            "deep-link scheme must start with a lowercase letter: {trimmed}"
        ));
    }
    if !chars.all(|character| {
        character.is_ascii_lowercase() || character.is_ascii_digit() || character == '-'
    }) {
        return Err(format!(
            "deep-link scheme allows lowercase letters, digits, and '-' only: {trimmed}"
        ));
    }
    Ok(trimmed.to_string())
}

/// Asserts the app-api manifest still exposes the anonymous desktop session
/// exchange the native redeem leg depends on. A host built against a manifest
/// without this route would fail at login time instead of build time.
pub fn assert_desktop_session_route_registered() -> Result<(), String> {
    let registered = app_routes().iter().any(|route| {
        route.operation_id == DESKTOP_SESSION_OPERATION_ID
            && route.path == DESKTOP_SESSION_EXCHANGE_PATH
            && route.auth.is_anonymous()
    });
    if registered {
        Ok(())
    } else {
        Err(format!(
            "app-api manifest must register anonymous {DESKTOP_SESSION_OPERATION_ID} at {DESKTOP_SESSION_EXCHANGE_PATH}"
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn contract_derives_scheme_and_redirect_uri_from_app_key() {
        let contract = iam_desktop_browser_login_contract("sdkwork-iam", &["openid".to_string()])
            .expect("contract");
        assert_eq!(contract.scheme, "sdkwork-iam");
        assert_eq!(contract.callback_path, "/auth/callback");
        assert_eq!(contract.redirect_uri, "sdkwork-iam://auth/callback");
        assert_eq!(contract.scopes, vec!["openid".to_string()]);
    }

    #[test]
    fn contract_rejects_invalid_scheme_sources() {
        assert!(iam_desktop_browser_login_contract("", &[]).is_err());
        assert!(iam_desktop_browser_login_contract("Sdkwork IAM", &[]).is_err());
        assert!(iam_desktop_browser_login_contract("1iam", &[]).is_err());
        assert!(iam_desktop_browser_login_contract("iam_app", &[]).is_err());
    }

    #[test]
    fn endpoints_compose_without_double_slashes() {
        let contract = iam_desktop_browser_login_contract("sdkwork-iam", &[]).expect("contract");
        assert_eq!(
            contract.authorize_endpoint("https://iam.sdkwork.local"),
            "https://iam.sdkwork.local/iam/v3/oauth/authorize",
        );
        assert_eq!(
            contract.authorize_endpoint("https://iam.sdkwork.local/"),
            "https://iam.sdkwork.local/iam/v3/oauth/authorize",
        );
        assert_eq!(
            contract.hosted_login_url("https://web.example.com"),
            "https://web.example.com/auth/login",
        );
        assert_eq!(
            contract.hosted_desktop_launch_url("https://web.example.com"),
            "https://web.example.com/auth/desktop/launch",
        );
        assert_eq!(
            contract.desktop_session_endpoint("https://iam.sdkwork.local"),
            "https://iam.sdkwork.local/app/v3/api/oauth/desktop_sessions",
        );
    }

    #[test]
    fn app_api_manifest_registers_anonymous_desktop_session_exchange() {
        assert_eq!(assert_desktop_session_route_registered(), Ok(()));
    }
}
