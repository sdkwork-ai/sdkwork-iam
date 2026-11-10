//! Public application access token resolution.
//!
//! `APP_ACCESS_TOKEN_SPEC.md` section 5 defines the server contract for the
//! committed public application access token: it is isolation-only input, a
//! resolver `MUST NOT` require a persisted user session row for it, and it
//! `MUST` resolve tenant, organization, application, environment, and deployment
//! profile from the token claims, rejecting the token when those claims do not
//! resolve to an enabled tenant application.
//!
//! The token is non-expiring in normal operation: `exp` is a rotation ceiling,
//! not a session lifetime, so an absent claim and the explicit sentinel `0` both
//! mean "never expires". A concrete past `exp` is still rejected.

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use sdkwork_iam_context_service::{
    AuthLevel, DeploymentMode, Environment, IamAppContext, IamPrincipalKind,
};
use serde_json::Value;
use sqlx::PgPool;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::application_registry::resolve_tenant_application;

const PUBLIC_APPLICATION_ACCESS_TOKEN_KID: &str = "public-app-token";
const PUBLIC_APPLICATION_ACCESS_TOKEN_SIGNATURE: &str = "public";
const PUBLIC_APPLICATION_ACCESS_TOKEN_CLASS: &str = "application";
const PUBLIC_APPLICATION_ACCESS_TOKEN_TYPE: &str = "access";

/// The explicit "no expiry" value carried by application access tokens.
pub const APPLICATION_ACCESS_TOKEN_NO_EXPIRY: i64 = 0;

/// Identity envelope of one parsed public application access token.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PublicApplicationAccessTokenClaims {
    pub tenant_id: String,
    pub organization_id: String,
    pub login_scope_is_organization: bool,
    pub app_id: String,
    pub environment: Environment,
    pub deployment_mode: DeploymentMode,
    pub session_id: String,
}

fn decode_segment(segment: &str) -> Option<Value> {
    let bytes = URL_SAFE_NO_PAD.decode(segment).ok()?;
    serde_json::from_slice(&bytes).ok()
}

fn claim_text(payload: &Value, key: &str) -> Option<String> {
    payload
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

fn normalize_environment(value: &str) -> Environment {
    match value.trim().to_ascii_lowercase().as_str() {
        "dev" | "development" => Environment::Dev,
        "test" | "testing" => Environment::Test,
        _ => Environment::Prod,
    }
}

fn normalize_deployment_mode(value: &str) -> DeploymentMode {
    match value.trim().to_ascii_lowercase().as_str() {
        "local" => DeploymentMode::Local,
        "private" => DeploymentMode::Private,
        _ => DeploymentMode::Saas,
    }
}

fn current_unix_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or_default()
}

/// Parse and validate one public application access token.
///
/// Returns `None` for every non-application credential (including private
/// signed session tokens) so the caller keeps its existing verified-session
/// path for those.
#[must_use]
pub fn parse_public_application_access_token(
    token: &str,
) -> Option<PublicApplicationAccessTokenClaims> {
    let token = token.trim();
    let token = token
        .strip_prefix("Bearer ")
        .or_else(|| token.strip_prefix("bearer "))
        .unwrap_or(token)
        .trim();
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return None;
    }
    let header = decode_segment(parts[0])?;
    if header.get("alg").and_then(Value::as_str) != Some("none")
        || header.get("kid").and_then(Value::as_str) != Some(PUBLIC_APPLICATION_ACCESS_TOKEN_KID)
        || parts[2] != PUBLIC_APPLICATION_ACCESS_TOKEN_SIGNATURE
    {
        return None;
    }
    let payload = decode_segment(parts[1])?;
    if payload.get("token_class").and_then(Value::as_str)
        != Some(PUBLIC_APPLICATION_ACCESS_TOKEN_CLASS)
        || payload.get("token_type").and_then(Value::as_str)
            != Some(PUBLIC_APPLICATION_ACCESS_TOKEN_TYPE)
    {
        return None;
    }
    let tenant_id = claim_text(&payload, "tenant_id")?;
    let app_id = claim_text(&payload, "app_id")?;
    let audience = claim_text(&payload, "aud").unwrap_or_else(|| app_id.clone());
    if audience != app_id {
        return None;
    }
    let organization_id = claim_text(&payload, "organization_id").unwrap_or_else(|| "0".to_owned());
    let login_scope_is_organization = organization_id != "0";
    if let Some(login_scope) = claim_text(&payload, "login_scope") {
        let expected = if login_scope_is_organization {
            "ORGANIZATION"
        } else {
            "TENANT"
        };
        if !login_scope.eq_ignore_ascii_case(expected) {
            return None;
        }
    }
    let environment = normalize_environment(&claim_text(&payload, "environment")?);
    let deployment_mode = normalize_deployment_mode(
        &claim_text(&payload, "deployment_mode").unwrap_or_else(|| "saas".to_owned()),
    );
    let session_id =
        claim_text(&payload, "session_id").unwrap_or_else(|| format!("bootstrap-public-{app_id}"));
    if let Some(exp) = payload.get("exp").and_then(Value::as_i64) {
        if exp != APPLICATION_ACCESS_TOKEN_NO_EXPIRY && exp < current_unix_seconds() {
            return None;
        }
    }
    Some(PublicApplicationAccessTokenClaims {
        tenant_id,
        organization_id,
        login_scope_is_organization,
        app_id,
        environment,
        deployment_mode,
        session_id,
    })
}

/// Resolve the isolation context of one public application access token.
///
/// The context is bound to the enabled tenant application registry row; no
/// `iam_session` row is required and no user permissions are granted (the token
/// only enables credential-entry bootstrap).
#[must_use]
pub async fn resolve_application_access_token_context(
    pg: &PgPool,
    token: &str,
) -> Option<IamAppContext> {
    let claims = parse_public_application_access_token(token)?;
    let application =
        resolve_tenant_application(pg, &claims.tenant_id, None, Some(&claims.app_id), None)
            .await
            .ok()??;
    if application.status != "enabled" {
        return None;
    }
    if application.organization_id != claims.organization_id {
        return None;
    }
    if !application.environment.trim().is_empty()
        && normalize_environment(&application.environment) != claims.environment
    {
        return None;
    }
    let mut context = IamAppContext::new(
        claims.tenant_id.as_str(),
        Some(claims.organization_id.as_str()),
        "system",
        claims.session_id.as_str(),
        claims.app_id.as_str(),
        claims.environment,
        claims.deployment_mode,
        AuthLevel::System,
        vec![format!("tenant:{}", claims.tenant_id)],
        Vec::new(),
    );
    if context.login_scope
        != if claims.login_scope_is_organization {
            sdkwork_iam_context_service::LoginScope::Organization
        } else {
            sdkwork_iam_context_service::LoginScope::Tenant
        }
    {
        return None;
    }
    context.principal_kind = IamPrincipalKind::ServiceAccount;
    context.principal_id = claims.app_id;
    Some(context)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn encode(value: &Value) -> String {
        URL_SAFE_NO_PAD.encode(serde_json::to_vec(value).expect("json"))
    }

    fn token(header: Value, payload: Value, signature: &str) -> String {
        format!("{}.{}.{}", encode(&header), encode(&payload), signature)
    }

    fn public_header() -> Value {
        serde_json::json!({ "alg": "none", "kid": "public-app-token", "typ": "JWT" })
    }

    fn public_payload() -> Value {
        serde_json::json!({
            "app_id": "sdkwork-cloudrouter",
            "aud": "sdkwork-cloudrouter",
            "deployment_mode": "private",
            "deployment_profile": "standalone",
            "environment": "production",
            "exp": 4102444800_i64,
            "iss": "sdkwork-iam-public",
            "login_scope": "TENANT",
            "organization_id": "0",
            "session_id": "bootstrap-public-sdkwork-cloudrouter-standalone.production",
            "tenant_id": "100001",
            "token_class": "application",
            "token_type": "access",
            "token_version": 1,
            "user_id": "0"
        })
    }

    #[test]
    fn parses_the_committed_public_application_token() {
        let claims = parse_public_application_access_token(&token(
            public_header(),
            public_payload(),
            "public",
        ))
        .expect("valid application token");
        assert_eq!(claims.tenant_id, "100001");
        assert_eq!(claims.app_id, "sdkwork-cloudrouter");
        assert_eq!(claims.organization_id, "0");
        assert!(!claims.login_scope_is_organization);
        assert_eq!(claims.environment, Environment::Prod);
        assert_eq!(claims.deployment_mode, DeploymentMode::Private);
    }

    #[test]
    fn accepts_exp_zero_and_absent_as_never_expiring() {
        let mut zero = public_payload();
        zero["exp"] = serde_json::json!(APPLICATION_ACCESS_TOKEN_NO_EXPIRY);
        assert!(
            parse_public_application_access_token(&token(public_header(), zero, "public",))
                .is_some()
        );

        let mut absent = public_payload();
        absent.as_object_mut().expect("object").remove("exp");
        assert!(
            parse_public_application_access_token(&token(public_header(), absent, "public",))
                .is_some()
        );
    }

    #[test]
    fn rejects_an_expired_application_token() {
        let mut expired = public_payload();
        expired["exp"] = serde_json::json!(1_i64);
        assert!(
            parse_public_application_access_token(&token(public_header(), expired, "public",))
                .is_none()
        );
    }

    #[test]
    fn rejects_a_private_or_malformed_credential() {
        let mut session = public_payload();
        session["token_class"] = serde_json::json!("session");
        assert!(
            parse_public_application_access_token(&token(public_header(), session, "public",))
                .is_none()
        );

        let mut signed_header = public_header();
        signed_header["alg"] = serde_json::json!("HS256");
        assert!(parse_public_application_access_token(&token(
            signed_header,
            public_payload(),
            "signature",
        ))
        .is_none());

        assert!(parse_public_application_access_token("not-a-jwt").is_none());
    }

    #[test]
    fn rejects_inconsistent_audience_and_scope() {
        let mut wrong_audience = public_payload();
        wrong_audience["aud"] = serde_json::json!("another-app");
        assert!(parse_public_application_access_token(&token(
            public_header(),
            wrong_audience,
            "public",
        ))
        .is_none());

        let mut wrong_scope = public_payload();
        wrong_scope["login_scope"] = serde_json::json!("ORGANIZATION");
        assert!(parse_public_application_access_token(&token(
            public_header(),
            wrong_scope,
            "public",
        ))
        .is_none());
    }
}
