use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use sqlx::PgPool;

use crate::{state::LocalIamConfig, utils::*};

/// Records an IAM audit event through the shared adapter.
///
/// Keep this a thin wrapper over `sdkwork_iam_web_adapter::record_audit_event`.
/// `sqlx` caches a prepared statement per connection keyed by the SQL text alone
/// and sends every parameter as binary, so the second, local copy of this INSERT
/// that used to live here — identical text, but `created_at` bound as
/// `chrono::DateTime<Utc>` instead of an RFC 3339 `String` — made both writers fail
/// with `incorrect binary data format in bind parameter 13` (or, in the other
/// order, `invalid byte sequence for encoding "UTF8"`) on any shared pooled
/// connection. Audit writes are best-effort, so those failures silently dropped
/// audit events instead of failing the request that produced them.
pub(crate) async fn record_audit_event(
    pg: &PgPool,
    tenant_id: &str,
    organization_id: Option<&str>,
    actor_user_id: Option<&str>,
    action: &str,
    resource_type: &str,
    resource_id: Option<&str>,
    request_id: Option<&str>,
    config: &LocalIamConfig,
    detail: Value,
) {
    let environment = environment_to_string(&environment_from_config(&config.environment));
    if let Err(error) = sdkwork_iam_web_adapter::record_audit_event(
        pg,
        tenant_id,
        organization_id,
        actor_user_id,
        action,
        resource_type,
        resource_id,
        request_id,
        environment,
        detail,
    )
    .await
    {
        tracing::warn!(error = %error, action, "iam audit event write failed");
    }
}

pub(crate) async fn record_session_created(
    pg: &PgPool,
    config: &LocalIamConfig,
    tenant_id: &str,
    organization_id: Option<&str>,
    user_id: &str,
    session_id: &str,
    auth_level: &str,
    data_scope: &[String],
    permission_scope: &[String],
) {
    let session_id_hash = hash_session_id(session_id);
    record_audit_event(
        pg,
        tenant_id,
        organization_id,
        Some(user_id),
        "sessions.create",
        "iam_session",
        Some(session_id),
        None,
        config,
        json!({
            "authLevel": auth_level,
            "dataScope": data_scope,
            "permissionScope": permission_scope,
            "sessionIdHash": session_id_hash,
        }),
    )
    .await;
}

pub(crate) async fn record_session_revoked(
    pg: &PgPool,
    config: &LocalIamConfig,
    tenant_id: &str,
    organization_id: Option<&str>,
    user_id: &str,
    session_id: &str,
) {
    record_audit_event(
        pg,
        tenant_id,
        organization_id,
        Some(user_id),
        "sessions.revoke",
        "iam_session",
        Some(session_id),
        None,
        config,
        json!({
            "sessionIdHash": hash_session_id(session_id),
            "result": "success",
        }),
    )
    .await;
}

pub(crate) async fn record_login_success(
    pg: &PgPool,
    config: &LocalIamConfig,
    tenant_id: &str,
    user_id: &str,
    account: &str,
    method: &str,
) {
    record_audit_event(
        pg,
        tenant_id,
        None,
        Some(user_id),
        "auth.login",
        "iam_user",
        Some(user_id),
        None,
        config,
        json!({
            "account": account,
            "method": method,
            "result": "success",
        }),
    )
    .await;
}

pub(crate) async fn record_registration(
    pg: &PgPool,
    config: &LocalIamConfig,
    tenant_id: &str,
    user_id: &str,
    username: &str,
    email: Option<&str>,
    phone: Option<&str>,
) {
    record_audit_event(
        pg,
        tenant_id,
        None,
        Some(user_id),
        "registrations.create",
        "iam_user",
        Some(user_id),
        None,
        config,
        json!({
            "username": username,
            "email": email,
            "phone": phone,
            "result": "success",
        }),
    )
    .await;
}

pub(crate) async fn record_session_updated(
    pg: &PgPool,
    config: &LocalIamConfig,
    tenant_id: &str,
    organization_id: Option<&str>,
    user_id: &str,
    session_id: &str,
    data_scope: &[String],
    permission_scope: &[String],
    detail: Value,
) {
    let session_id_hash = hash_session_id(session_id);
    let mut audit_detail = detail;
    if let Some(object) = audit_detail.as_object_mut() {
        object.insert("dataScope".to_string(), json!(data_scope));
        object.insert("permissionScope".to_string(), json!(permission_scope));
        object.insert("sessionIdHash".to_string(), json!(session_id_hash));
    }
    record_audit_event(
        pg,
        tenant_id,
        organization_id,
        Some(user_id),
        "sessions.update",
        "iam_session",
        Some(session_id),
        None,
        config,
        audit_detail,
    )
    .await;
}

fn hash_session_id(session_id: &str) -> String {
    let digest = Sha256::digest(session_id.as_bytes());
    format!("{:x}", digest)
}
