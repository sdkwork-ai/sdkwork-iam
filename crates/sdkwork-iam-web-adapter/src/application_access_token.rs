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
//!
//! The release scope decides whether the credential names a subject at all
//! (`APPLICATION_IDENTITY_SPEC.md` §4.1 rules 7, 8, and 10):
//!
//! * `TENANT`/`ORGANIZATION` credentials stay isolation-only and project the
//!   historical `system` subject, unchanged.
//! * A `USER` credential names its installation's single owner in `user_id`, and
//!   the resolver rejects it unless that claim is present, legal, and equal to
//!   `iam_application_installation.owner_user_id`. The owner is projected as the
//!   credential subject so a data plane can filter by
//!   `(tenant_id, app_id, user_id)`.

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use sdkwork_iam_context_service::{
    AuthLevel, DeploymentMode, Environment, IamAppContext, IamPrincipalKind,
};
use serde_json::Value;
use sqlx::PgPool;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::application_registry::resolve_tenant_application_by_deploy_application_id;
use crate::application_scope::{
    ensure_public_token_subject_is_installation_owner, is_valid_user_id_claim,
    ApplicationOwnershipScope,
};
use crate::installation_lifecycle::{
    load_installation_environments, INSTALLATION_ENVIRONMENT_STATUS_ACTIVE,
};

const PUBLIC_APPLICATION_ACCESS_TOKEN_KID: &str = "public-app-token";
const PUBLIC_APPLICATION_ACCESS_TOKEN_SIGNATURE: &str = "public";
const PUBLIC_APPLICATION_ACCESS_TOKEN_CLASS: &str = "application";
const PUBLIC_APPLICATION_ACCESS_TOKEN_TYPE: &str = "access";

/// Subject projected for a `TENANT`/`ORGANIZATION` release.
///
/// Those levels have no owner, so the credential stays the historical
/// isolation-only `system` principal. A `USER` release replaces it with the
/// installation owner.
const PUBLIC_APPLICATION_SYSTEM_SUBJECT: &str = "system";

/// The explicit "no expiry" value carried by application access tokens.
pub const APPLICATION_ACCESS_TOKEN_NO_EXPIRY: i64 = 0;

/// Identity envelope of one parsed public application access token.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PublicApplicationAccessTokenClaims {
    pub tenant_id: String,
    pub organization_id: String,
    pub login_scope_is_organization: bool,
    pub app_id: String,
    /// Release scope the token declares, or the legacy derivation from its
    /// organization scope when it declares none (`APPLICATION_IDENTITY_SPEC.md`
    /// §4.1 rule 6). A personal release `MUST` declare it: the derivation can
    /// never produce `USER`, so an undeclared personal token resolves to
    /// `TENANT` and is rejected by the installation check.
    pub ownership_scope: ApplicationOwnershipScope,
    /// Subject claim the credential carries, when present and non-blank.
    ///
    /// A `USER` release `MUST` name its single owner here; `TENANT` and
    /// `ORGANIZATION` tokens carry the sentinel `0` and the claim is read but
    /// never projected (the release has no owner to bind). See
    /// [`ensure_public_token_subject_is_installation_owner`].
    pub user_id: Option<String>,
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

/// Decides whether an installation's registered lifecycles accept one token claim.
///
/// `registered` is every live `(env_key, env_status)` row of the installation.
///
/// * An installation **with** rows is gated exactly like issuance and session
///   creation (`decide_installation_environment_access`): the claimed
///   environment needs an `active` row. The claim is the coarse session-plane
///   value (`Dev`/`Test`/`Prod`) while the rows are exact lifecycle keys, so
///   `staging` and `demo` satisfy a `Prod` claim
///   (`APP_ACCESS_TOKEN_SPEC.md` §8.4).
/// * An installation **without** rows predates lifecycle registration and keeps
///   the historical single-column comparison, including its "blank column means
///   no constraint" behaviour.
fn installation_environment_accepts(
    registered: &[(String, String)],
    installation_environment: &str,
    claimed: &Environment,
) -> bool {
    if registered.is_empty() {
        return installation_environment.trim().is_empty()
            || normalize_environment(installation_environment) == *claimed;
    }
    registered.iter().any(|(env_key, env_status)| {
        env_status == INSTALLATION_ENVIRONMENT_STATUS_ACTIVE
            && normalize_environment(env_key) == *claimed
    })
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

/// Validate one public application access token, reporting why it was rejected.
///
/// `Ok(None)` means the credential is not a public application access token at
/// all (a private signed session token, an OAuth bearer, an API key, …): the
/// caller keeps its existing verified-session path for those. `Err` means the
/// credential carries the public application envelope and is rejected; the
/// message names the claim or binding that failed, never the credential itself
/// (`API_SPEC.md` §15.1 forbids echoing token material in diagnostics).
///
/// # Errors
///
/// Returns the rejection reason for a malformed or contradictory public
/// application token, including a `USER`-scoped token whose `user_id` claim is
/// absent or not a positive decimal IAM user id.
pub fn validate_public_application_access_token(
    token: &str,
) -> Result<Option<PublicApplicationAccessTokenClaims>, String> {
    let token = token.trim();
    let token = token
        .strip_prefix("Bearer ")
        .or_else(|| token.strip_prefix("bearer "))
        .unwrap_or(token)
        .trim();
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return Ok(None);
    }
    let Some(header) = decode_segment(parts[0]) else {
        return Ok(None);
    };
    if header.get("alg").and_then(Value::as_str) != Some("none")
        || header.get("kid").and_then(Value::as_str) != Some(PUBLIC_APPLICATION_ACCESS_TOKEN_KID)
        || parts[2] != PUBLIC_APPLICATION_ACCESS_TOKEN_SIGNATURE
    {
        return Ok(None);
    }
    let Some(payload) = decode_segment(parts[1]) else {
        return Err(
            "public application access token payload is not base64url-encoded JSON".to_owned(),
        );
    };
    if payload.get("token_class").and_then(Value::as_str)
        != Some(PUBLIC_APPLICATION_ACCESS_TOKEN_CLASS)
        || payload.get("token_type").and_then(Value::as_str)
            != Some(PUBLIC_APPLICATION_ACCESS_TOKEN_TYPE)
    {
        return Ok(None);
    }
    let tenant_id = claim_text(&payload, "tenant_id").ok_or_else(|| {
        "public application access token is missing its tenant_id claim".to_owned()
    })?;
    let app_id = claim_text(&payload, "app_id")
        .ok_or_else(|| "public application access token is missing its app_id claim".to_owned())?;
    let audience = claim_text(&payload, "aud").unwrap_or_else(|| app_id.clone());
    if audience != app_id {
        return Err(format!(
            "public application access token audience {audience:?} does not equal its app_id \
             claim {app_id:?}"
        ));
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
            return Err(format!(
                "public application access token declares login_scope {login_scope:?} but its \
                 organization_id claim {organization_id:?} requires {expected}"
            ));
        }
    }
    let environment =
        normalize_environment(&claim_text(&payload, "environment").ok_or_else(|| {
            "public application access token is missing its environment claim".to_owned()
        })?);
    let deployment_mode = normalize_deployment_mode(
        &claim_text(&payload, "deployment_mode").unwrap_or_else(|| "saas".to_owned()),
    );
    let ownership_scope = match claim_text(&payload, "ownership_scope") {
        Some(value) => ApplicationOwnershipScope::parse(&value).ok_or_else(|| {
            format!(
                "public application access token declares unknown ownership_scope {value:?}; \
                 expected one of TENANT, ORGANIZATION, USER"
            )
        })?,
        None => ApplicationOwnershipScope::derive_from_organization_scope(Some(&organization_id)),
    };
    // A `USER` release is tenant-level in organization terms, so a non-zero
    // organization cannot belong to it; the same holds for a tenant release.
    if ownership_scope == ApplicationOwnershipScope::Organization && !login_scope_is_organization {
        return Err(format!(
            "public application access token declares ownership_scope ORGANIZATION but carries \
             the tenant organization_id {organization_id:?}"
        ));
    }
    if ownership_scope != ApplicationOwnershipScope::Organization && login_scope_is_organization {
        return Err(format!(
            "public application access token declares ownership_scope {} but carries the \
             organization_id claim {organization_id:?}",
            ownership_scope.as_str()
        ));
    }
    // A personal release is one person's deployment: the credential names that
    // person, and the installation check below requires the claim to equal
    // `owner_user_id` (`APPLICATION_IDENTITY_SPEC.md` §4.1 rule 10). Rejecting
    // the absent/non-subject claim here keeps every token channel closed on the
    // same rule instead of letting a channel skip the installation check.
    let user_id = claim_text(&payload, "user_id");
    if ownership_scope == ApplicationOwnershipScope::User {
        let Some(claim_user_id) = user_id.as_deref() else {
            return Err(format!(
                "USER-scoped public application access token for {app_id} is missing its user_id \
                 claim; it must carry the installation owner's user id"
            ));
        };
        if !is_valid_user_id_claim(claim_user_id) {
            return Err(format!(
                "USER-scoped public application access token for {app_id} carries user_id claim \
                 {claim_user_id:?}, which is not a positive decimal IAM user id"
            ));
        }
    }
    let session_id =
        claim_text(&payload, "session_id").unwrap_or_else(|| format!("bootstrap-public-{app_id}"));
    if let Some(exp) = payload.get("exp").and_then(Value::as_i64) {
        if exp != APPLICATION_ACCESS_TOKEN_NO_EXPIRY && exp < current_unix_seconds() {
            return Err(format!(
                "public application access token for {app_id} expired at {exp}"
            ));
        }
    }
    Ok(Some(PublicApplicationAccessTokenClaims {
        tenant_id,
        organization_id,
        login_scope_is_organization,
        app_id,
        ownership_scope,
        user_id,
        environment,
        deployment_mode,
        session_id,
    }))
}

/// Parse and validate one public application access token.
///
/// Returns `None` for every non-application credential (including private
/// signed session tokens) so the caller keeps its existing verified-session
/// path for those. Use [`validate_public_application_access_token`] when the
/// rejection reason is needed.
#[must_use]
pub fn parse_public_application_access_token(
    token: &str,
) -> Option<PublicApplicationAccessTokenClaims> {
    validate_public_application_access_token(token)
        .ok()
        .flatten()
}

/// Data scopes projected for a shared (`TENANT`/`ORGANIZATION`) release.
///
/// The tenant is always the outer isolation key. An organization-level release
/// additionally binds its organization, exactly as session tokens project
/// `organization:<id>` (`sdkwork-iam-bootstrap::resolve_session_scopes`,
/// `sqlite_sessions`). Without that entry an organization credential would reach
/// every row of its tenant on a data plane that filters by `data_scope`, even
/// though `IamShardingContext` already routes it to the organization partition
/// (`DATABASE_SPEC.md` §16, `API_SPEC.md` §10.4).
fn shared_release_data_scope(claims: &PublicApplicationAccessTokenClaims) -> Vec<String> {
    let mut data_scope = vec![format!("tenant:{}", claims.tenant_id)];
    if claims.login_scope_is_organization {
        data_scope.push(format!("organization:{}", claims.organization_id));
    }
    data_scope
}

/// Whether one installation accepts the claims of a public application token.
///
/// The release scope decides the level and the organization claim decides the
/// inner binding: a tenant installation accepts only `TENANT` claims carrying
/// the sentinel `0`, and an organization installation accepts only
/// `ORGANIZATION` claims carrying its own non-zero organization. The two levels
/// are therefore mutually exclusive, which is what keeps a tenant token from
/// resolving an organization installation (and the reverse).
fn installation_accepts_public_claims(
    installation_scope: ApplicationOwnershipScope,
    installation_organization_id: &str,
    claims: &PublicApplicationAccessTokenClaims,
) -> bool {
    installation_scope == claims.ownership_scope
        && installation_organization_id.trim() == claims.organization_id
}

/// Resolve the isolation context of one public application access token,
/// reporting why the credential was rejected.
///
/// `Ok(None)` preserves the historical "not resolvable here" outcomes (the
/// credential is not an application token, or it names no enabled installation
/// of its tenant): the caller keeps its existing fallback. `Err` is a
/// contradiction that must fail closed — currently a `USER`-scoped credential
/// whose subject is not the installation's owner.
///
/// # Errors
///
/// Returns a message naming the installation, the claim, and the expected owner
/// when a `USER`-scoped token is bound to a subject other than the owner.
pub async fn try_resolve_application_access_token_context(
    pg: &PgPool,
    token: &str,
) -> Result<Option<IamAppContext>, String> {
    let Some(claims) = validate_public_application_access_token(token)? else {
        return Ok(None);
    };
    let Some(application) =
        resolve_tenant_application_by_deploy_application_id(pg, &claims.tenant_id, &claims.app_id)
            .await
            .map_err(|error| {
                format!(
                    "load installation for public application access token of {} failed: {error}",
                    claims.app_id
                )
            })?
    else {
        return Ok(None);
    };
    if application.status != "enabled" {
        return Ok(None);
    }
    // The token's release scope and organization must be the installation's: a
    // public token that claims another level or another organization would read
    // rows outside its isolation key (`APPLICATION_IDENTITY_SPEC.md` §4.1 rule
    // 10). The tenant is the outer boundary for every release; the organization
    // is the inner boundary only for an organization release.
    if !installation_accepts_public_claims(
        application.ownership_scope,
        &application.organization_id,
        &claims,
    ) {
        return Ok(None);
    }
    // Environment gate. One deploy application serves several lifecycle
    // environments, each with its own public domain (`installation_lifecycle.rs`),
    // and both issuance and session creation gate on the registered
    // `iam_application_installation_environment` rows. The single legacy
    // `environment` column records the context the installation was registered
    // from, so comparing it with the claim rejected a valid `production` claim
    // whenever that registration happened in development, even though the
    // installation's `production` row was `active`.
    let registered = load_installation_environments(pg, &claims.tenant_id, &application.id)
        .await
        .map_err(|error| {
            format!(
                "load installation environments for public application access token of {} failed: {error}",
                claims.app_id
            )
        })?;
    if !installation_environment_accepts(&registered, &application.environment, &claims.environment)
    {
        return Ok(None);
    }
    let is_personal = claims.ownership_scope == ApplicationOwnershipScope::User;
    // A personal release is one person's deployment: the credential subject is
    // the installation owner, and the isolation key is
    // `(tenant_id, app_id, user_id)` — the subject a data plane filters by.
    let (subject_user_id, data_scope) = if is_personal {
        let owner_user_id = ensure_public_token_subject_is_installation_owner(
            &application.id,
            application.owner_user_id.as_deref(),
            claims.user_id.as_deref(),
        )?;
        (
            owner_user_id.clone(),
            vec![
                format!("tenant:{}", claims.tenant_id),
                format!("user:{owner_user_id}"),
            ],
        )
    } else {
        (
            PUBLIC_APPLICATION_SYSTEM_SUBJECT.to_owned(),
            shared_release_data_scope(&claims),
        )
    };
    let mut context = IamAppContext::new(
        claims.tenant_id.as_str(),
        Some(claims.organization_id.as_str()),
        subject_user_id,
        claims.session_id.as_str(),
        claims.app_id.as_str(),
        claims.environment.clone(),
        claims.deployment_mode.clone(),
        AuthLevel::System,
        data_scope,
        Vec::new(),
    );
    if context.login_scope
        != if claims.login_scope_is_organization {
            sdkwork_iam_context_service::LoginScope::Organization
        } else {
            sdkwork_iam_context_service::LoginScope::Tenant
        }
    {
        return Ok(None);
    }
    // A shared release has no owner, so the credential stays the service-style
    // `system` principal it has always been. A personal release keeps the owner
    // projected by `IamAppContext::new` (user subject, `user_id = owner`).
    if !is_personal {
        context.principal_kind = IamPrincipalKind::ServiceAccount;
        context.principal_id = claims.app_id;
    }
    Ok(Some(context))
}

/// Resolve the isolation context of one public application access token.
///
/// The context is bound to the enabled tenant application registry row; no
/// `iam_session` row is required and no user permissions are granted (the token
/// only enables credential-entry bootstrap). A `USER`-scoped installation
/// projects its owner as the subject; `TENANT`/`ORGANIZATION` installations keep
/// the isolation-only `system` subject.
///
/// The token names its installation by the **deploy application** it serves, not
/// by the IAM runtime `app_id`: `app_id`/`aud` are the same value (checked in
/// [`validate_public_application_access_token`]), and the registry lookup uses
/// the deploy link. A credential that still carries the IAM runtime `app_id` no
/// longer resolves, and an installation without a deploy link cannot resolve at
/// all, so both fail closed here.
///
/// Returns `None` for every rejection; use
/// [`try_resolve_application_access_token_context`] when the reason is needed.
#[must_use]
pub async fn resolve_application_access_token_context(
    pg: &PgPool,
    token: &str,
) -> Option<IamAppContext> {
    try_resolve_application_access_token_context(pg, token)
        .await
        .ok()
        .flatten()
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

    fn personal_payload(user_id: Option<&str>) -> Value {
        let mut payload = public_payload();
        payload["login_scope"] = serde_json::json!("TENANT");
        payload["organization_id"] = serde_json::json!("0");
        payload["ownership_scope"] = serde_json::json!("USER");
        match user_id {
            Some(value) => payload["user_id"] = serde_json::json!(value),
            None => {
                payload.as_object_mut().expect("object").remove("user_id");
            }
        }
        payload
    }

    fn organization_payload() -> Value {
        let mut payload = public_payload();
        payload["login_scope"] = serde_json::json!("ORGANIZATION");
        payload["organization_id"] = serde_json::json!("42");
        payload["ownership_scope"] = serde_json::json!("ORGANIZATION");
        payload.as_object_mut().expect("object").remove("user_id");
        payload
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
        assert_eq!(claims.ownership_scope, ApplicationOwnershipScope::Tenant);
        assert_eq!(claims.user_id.as_deref(), Some("0"));
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
    fn shared_releases_project_the_organization_scope() {
        let organization = parse_public_application_access_token(&token(
            public_header(),
            organization_payload(),
            "public",
        ))
        .expect("an organization token parses");
        assert!(organization.login_scope_is_organization);
        assert_eq!(
            shared_release_data_scope(&organization),
            vec!["tenant:100001".to_owned(), "organization:42".to_owned()]
        );

        // A tenant-level release stays keyed by the tenant alone.
        let tenant = parse_public_application_access_token(&token(
            public_header(),
            public_payload(),
            "public",
        ))
        .expect("a tenant token parses");
        assert!(!tenant.login_scope_is_organization);
        assert_eq!(
            shared_release_data_scope(&tenant),
            vec!["tenant:100001".to_owned()]
        );
    }

    #[test]
    fn tenant_and_organization_installations_accept_only_their_own_level() {
        let tenant = parse_public_application_access_token(&token(
            public_header(),
            public_payload(),
            "public",
        ))
        .expect("a tenant token parses");
        let organization = parse_public_application_access_token(&token(
            public_header(),
            organization_payload(),
            "public",
        ))
        .expect("an organization token parses");

        assert!(installation_accepts_public_claims(
            ApplicationOwnershipScope::Tenant,
            "0",
            &tenant
        ));
        assert!(installation_accepts_public_claims(
            ApplicationOwnershipScope::Organization,
            "42",
            &organization
        ));

        // Neither level resolves the other installation, and an organization
        // installation resolves only its own organization.
        assert!(!installation_accepts_public_claims(
            ApplicationOwnershipScope::Organization,
            "42",
            &tenant
        ));
        assert!(!installation_accepts_public_claims(
            ApplicationOwnershipScope::Tenant,
            "0",
            &organization
        ));
        assert!(!installation_accepts_public_claims(
            ApplicationOwnershipScope::Organization,
            "43",
            &organization
        ));
        // A tenant installation never carries a non-zero organization binding.
        assert!(!installation_accepts_public_claims(
            ApplicationOwnershipScope::Tenant,
            "42",
            &tenant
        ));
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

        // The same envelope declared as an auth token is not an application
        // access credential: the auth channel never accepts the public token.
        let mut auth_typed = public_payload();
        auth_typed["token_type"] = serde_json::json!("auth");
        assert!(parse_public_application_access_token(&token(
            public_header(),
            auth_typed,
            "public",
        ))
        .is_none());

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

    #[test]
    fn a_user_release_requires_a_legal_owner_claim() {
        let claims = parse_public_application_access_token(&token(
            public_header(),
            personal_payload(Some("900001")),
            "public",
        ))
        .expect("personal token with its owner");
        assert_eq!(claims.ownership_scope, ApplicationOwnershipScope::User);
        assert_eq!(claims.user_id.as_deref(), Some("900001"));

        for rejected in [
            personal_payload(None),
            personal_payload(Some("0")),
            personal_payload(Some("not-a-user-id")),
            personal_payload(Some("-7")),
            personal_payload(Some("  ")),
        ] {
            let error = validate_public_application_access_token(&token(
                public_header(),
                rejected,
                "public",
            ))
            .expect_err("a personal token without a legal owner claim must fail closed");
            assert!(
                error.contains("user_id"),
                "the rejection must name the claim: {error}"
            );
            assert!(
                error.contains("USER"),
                "the rejection must name the release scope: {error}"
            );
        }
    }

    #[test]
    fn shared_releases_do_not_require_or_read_the_user_claim() {
        let mut tenant_without_user = public_payload();
        tenant_without_user
            .as_object_mut()
            .expect("object")
            .remove("user_id");
        let claims = parse_public_application_access_token(&token(
            public_header(),
            tenant_without_user,
            "public",
        ))
        .expect("a tenant token keeps working without a user_id claim");
        assert_eq!(claims.ownership_scope, ApplicationOwnershipScope::Tenant);
        assert_eq!(claims.user_id, None);

        let claims = parse_public_application_access_token(&token(
            public_header(),
            organization_payload(),
            "public",
        ))
        .expect("an organization token keeps working without a user_id claim");
        assert_eq!(
            claims.ownership_scope,
            ApplicationOwnershipScope::Organization
        );
        assert!(claims.login_scope_is_organization);
        assert_eq!(claims.user_id, None);
    }

    #[test]
    fn an_unknown_release_scope_is_rejected() {
        for scope in ["PLATFORM", "GLOBAL", "tenant-wide"] {
            let mut payload = public_payload();
            payload["ownership_scope"] = serde_json::json!(scope);
            let error = validate_public_application_access_token(&token(
                public_header(),
                payload,
                "public",
            ))
            .expect_err("an unknown release scope must fail closed");
            assert!(
                error.contains("ownership_scope"),
                "the rejection must name the claim: {error}"
            );
        }
    }

    #[test]
    fn a_multi_lifecycle_installation_accepts_each_active_lifecycle() {
        // One deploy application, two active lifecycles: the same installation
        // serves the development and the production renderer, and each packaged
        // token claims its own coarse environment. The legacy column records
        // only the registration context, so it must not decide the outcome.
        let registered = vec![
            ("development".to_owned(), "active".to_owned()),
            ("production".to_owned(), "active".to_owned()),
        ];
        assert!(installation_environment_accepts(
            &registered,
            "development",
            &Environment::Prod
        ));
        assert!(installation_environment_accepts(
            &registered,
            "development",
            &Environment::Dev
        ));
    }

    #[test]
    fn a_staging_or_demo_lifecycle_satisfies_the_coarse_prod_claim() {
        // `APP_ACCESS_TOKEN_SPEC.md` §8.4: the claim is the session-plane value
        // while the gate runs against the exact lifecycle key.
        for lifecycle in ["production", "staging", "demo"] {
            let registered = vec![(lifecycle.to_owned(), "active".to_owned())];
            assert!(
                installation_environment_accepts(&registered, "", &Environment::Prod),
                "{lifecycle} must satisfy a Prod claim"
            );
        }
    }

    #[test]
    fn a_non_active_or_missing_lifecycle_is_rejected() {
        let pending = vec![("production".to_owned(), "pending".to_owned())];
        assert!(!installation_environment_accepts(
            &pending,
            "production",
            &Environment::Prod
        ));
        let disabled = vec![("production".to_owned(), "disabled".to_owned())];
        assert!(!installation_environment_accepts(
            &disabled,
            "production",
            &Environment::Prod
        ));
        let other = vec![("development".to_owned(), "active".to_owned())];
        assert!(
            !installation_environment_accepts(&other, "development", &Environment::Prod),
            "a production token must not be served by a development-only installation"
        );
    }

    #[test]
    fn an_installation_without_lifecycle_rows_keeps_the_legacy_column_gate() {
        assert!(installation_environment_accepts(
            &[],
            "production",
            &Environment::Prod
        ));
        assert!(
            !installation_environment_accepts(&[], "development", &Environment::Prod),
            "the legacy column still separates environments without lifecycle rows"
        );
        assert!(
            installation_environment_accepts(&[], "", &Environment::Prod),
            "a blank legacy column means no environment constraint"
        );
    }
}
