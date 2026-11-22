//! Public read of the tenant's login-success follow QR.
//!
//! The hosted desktop login-success page (`/auth/desktop/launch`) shows the
//! official-account follow QR the operator pinned in the OAuth admin surface.
//! The backend generated that QR once and stored its image URL on the tenant's
//! scan-login configuration row, so this read never touches WeChat and never
//! needs the account AppSecret.

use sqlx::{PgPool, Row};

/// The follow QR the login-success page renders.
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct LoginFollowQr {
    pub(crate) account_name: String,
    pub(crate) image_url: String,
    pub(crate) scene: String,
}

/// Loads the configured follow QR, or `None` when the page must not show one.
///
/// A row that is disabled, unset, or missing its generated image reports
/// `None`: the success page then renders without a QR instead of an empty box.
pub(crate) async fn load_login_follow_qr(
    pg: &PgPool,
    tenant_id: &str,
) -> Result<Option<LoginFollowQr>, String> {
    let row = sqlx::query(
        "SELECT login_follow_qr_enabled, login_follow_qr_account_name, \
                login_follow_qr_image_url, login_follow_qr_scene \
         FROM iam_oauth_scan_login_config WHERE tenant_id = $1",
    )
    .bind(tenant_id)
    .fetch_optional(pg)
    .await
    .map_err(|error| format!("load login follow QR failed: {error}"))?;
    let Some(row) = row else {
        return Ok(None);
    };
    let enabled: i32 = row.get(0);
    let account_name: String = row.get(1);
    let image_url: String = row.get(2);
    let scene: String = row.get(3);
    if enabled == 0 || image_url.trim().is_empty() {
        return Ok(None);
    }
    Ok(Some(LoginFollowQr {
        account_name,
        image_url,
        scene,
    }))
}
