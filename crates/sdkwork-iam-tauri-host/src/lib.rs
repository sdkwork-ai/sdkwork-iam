mod desktop_login;

pub use desktop_login::{
    assert_desktop_session_route_registered, iam_desktop_browser_login_contract,
    normalize_deep_link_scheme, IamDesktopBrowserLoginContract, BRIDGE_DEEP_LINKS_GET_INITIAL_URL,
    BRIDGE_DEEP_LINKS_OPEN_EVENT, BRIDGE_SHELL_OPEN, DESKTOP_AUTH_CALLBACK_PATH,
    DESKTOP_SESSION_EXCHANGE_PATH, DESKTOP_SESSION_OPERATION_ID, HOSTED_DESKTOP_LAUNCH_PATH,
    HOSTED_LOGIN_PATH, OAUTH_AUTHORIZE_PATH,
};

use sdkwork_routes_iam_app_api::app_routes;
use sdkwork_routes_iam_backend_api::backend_routes;
use sdkwork_web_contract::HttpRoute as IamHttpRoute;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IamTauriAdapterManifest {
    pub app_routes: Vec<IamHttpRoute>,
    pub backend_routes: Vec<IamHttpRoute>,
    pub plugin_name: &'static str,
}

pub fn iam_tauri_adapter_manifest() -> IamTauriAdapterManifest {
    IamTauriAdapterManifest {
        app_routes: app_routes(),
        backend_routes: backend_routes(),
        plugin_name: "sdkwork-iam",
    }
}
