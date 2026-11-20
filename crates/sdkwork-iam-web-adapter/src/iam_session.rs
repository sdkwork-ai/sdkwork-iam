//! IAM database session resolution for dual-token WebFramework integration.

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use hmac::{Hmac, Mac};
use sdkwork_database_sqlx::DatabasePool;
use sdkwork_iam_context_service::{
    AuthLevel, DeploymentMode, Environment, IamAppContext, IamPrincipalKind, IamUserSurface,
    LoginScope,
};
use sdkwork_web_core::{validate_token_version_json, TokenVersionPolicy};
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::application_scope::ApplicationOwnershipScope;
use crate::session_scope_cache::{insert_session_scopes, SessionScopes};
#[cfg(feature = "sqlite")]
use sqlx::SqlitePool;
use sqlx::{types::Json, PgPool, Row};
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha256 = Hmac<Sha256>;

pub(crate) const LOCAL_SESSION_TOKEN_ISSUER: &str = "sdkwork-iam-local";

pub(crate) const IAM_SESSION_CONTEXT_SELECT: &str =
    "s.id, s.tenant_id, s.organization_id, s.login_scope, s.user_id, s.app_id, \
     s.environment, s.deployment_mode, s.auth_level, \
     s.data_scope_json, s.permission_scope_json, \
     COALESCE(u.display_name, '') AS user_display_name, \
     COALESCE(u.email, '') AS user_email, \
     u.email_verified AS user_email_verified, \
     s.principal_kind, COALESCE(s.principal_id, s.user_id) AS principal_id, \
     s.authz_epoch AS session_authz_epoch, \
     COALESCE((SELECT e.epoch FROM iam_authz_epoch e WHERE e.id = 1), 0) AS current_authz_epoch, \
     s.scope_kind";

const IAM_SESSION_CONTEXT_JOINS: &str =
    "JOIN iam_tenant t ON t.id = s.tenant_id AND t.status = 'active' \
       LEFT JOIN iam_user u ON s.principal_kind = 'user' \
       AND u.id = COALESCE(s.principal_id, s.user_id) AND u.tenant_id = s.tenant_id \
     LEFT JOIN iam_service_account sa ON s.principal_kind = 'service_account' \
       AND sa.id = s.principal_id AND sa.tenant_id = s.tenant_id \
     LEFT JOIN iam_service_account_credential sac ON sac.id = s.credential_id";

const IAM_SESSION_PRINCIPAL_ACTIVE: &str =
    "((s.principal_kind = 'user' AND u.status = 'active' AND u.is_deleted = 0) \
      OR (s.principal_kind = 'service_account' AND sa.status = 'active' \
          AND sac.status = 'active' \
          AND (sac.expires_at IS NULL OR sac.expires_at > $3::timestamptz)))";

/// Liveness predicate shared by the two auth-token session queries.
///
/// `iam_session.expires_at` stores the epoch sentinel for a credential issued
/// with the "no expiry" TTL (the packaged portal's bootstrap credential, see
/// `access_token_issue::no_expiry_timestamp`). The access-token channel already
/// treats that sentinel as "never expires" (`expires_at <= 'epoch'`); the
/// auth-token channels must apply the identical rule, otherwise a valid
/// no-expiry credential is rejected as expired before its signature, hash and
/// principal checks ever run.
fn auth_token_expiry_predicate(timestamp_param: &str) -> String {
    format!(
        "(s.expires_at::timestamptz <= 'epoch'::timestamptz \
          OR s.expires_at::timestamptz > {timestamp_param}::timestamptz)"
    )
}

pub(crate) fn user_profile_from_session_row(row: &sqlx::postgres::PgRow) -> (String, String, bool) {
    let display_name: String = row.try_get(11).unwrap_or_default();
    let email: String = row.try_get(12).unwrap_or_default();
    let email_verified = row.try_get::<bool, _>(13).unwrap_or_else(|_| {
        row.try_get::<i32, _>(13)
            .map(|value| value != 0)
            .unwrap_or(false)
    });
    (display_name, email, email_verified)
}

pub async fn resolve_iam_app_context_from_auth_token(
    pg: &PgPool,
    raw_auth_token: &str,
) -> Option<IamAppContext> {
    let auth_token = strip_optional_bearer_prefix(raw_auth_token)?;
    find_iam_context_from_auth_token(pg, &auth_token).await
}

pub async fn resolve_iam_app_context_from_dual_tokens(
    pg: &PgPool,
    raw_auth_token: &str,
    raw_access_token: &str,
) -> Option<IamAppContext> {
    let auth_token = strip_optional_bearer_prefix(raw_auth_token)?;
    find_iam_context_from_dual_tokens(pg, &auth_token, raw_access_token.trim()).await
}

pub async fn resolve_iam_app_context_from_access_token(
    pg: &PgPool,
    raw_access_token: &str,
) -> Option<IamAppContext> {
    let access_token = strip_optional_bearer_prefix(raw_access_token)?;
    find_iam_context_from_access_token(pg, &access_token).await
}

/// Resolves IAM context from a single OAuth bearer token on open-api.
pub async fn resolve_iam_app_context_from_oauth_bearer(
    pg: &PgPool,
    raw_bearer_token: &str,
) -> Option<IamAppContext> {
    let token = strip_optional_bearer_prefix(raw_bearer_token)?;
    if let Some(context) = find_iam_context_from_access_token(pg, &token).await {
        return Some(context);
    }
    find_iam_context_from_oauth_jwt(pg, &token).await
}

pub async fn resolve_iam_app_context_from_dual_tokens_pool(
    pool: &DatabasePool,
    raw_auth_token: &str,
    raw_access_token: &str,
) -> Option<IamAppContext> {
    if let Some(pg) = pool.as_postgres() {
        return resolve_iam_app_context_from_dual_tokens(pg, raw_auth_token, raw_access_token)
            .await;
    }
    #[cfg(feature = "sqlite")]
    if let Some(sqlite) = pool.as_sqlite() {
        return resolve_sqlite_iam_app_context_from_dual_tokens(
            sqlite,
            raw_auth_token,
            raw_access_token,
        )
        .await;
    }
    None
}

pub async fn resolve_iam_app_context_from_access_token_pool(
    pool: &DatabasePool,
    raw_access_token: &str,
) -> Option<IamAppContext> {
    if let Some(pg) = pool.as_postgres() {
        return resolve_iam_app_context_from_access_token(pg, raw_access_token).await;
    }
    #[cfg(feature = "sqlite")]
    if let Some(sqlite) = pool.as_sqlite() {
        return resolve_sqlite_iam_app_context_from_access_token(sqlite, raw_access_token).await;
    }
    None
}

pub async fn resolve_iam_app_context_from_oauth_bearer_pool(
    pool: &DatabasePool,
    raw_bearer_token: &str,
) -> Option<IamAppContext> {
    if let Some(pg) = pool.as_postgres() {
        return resolve_iam_app_context_from_oauth_bearer(pg, raw_bearer_token).await;
    }
    #[cfg(feature = "sqlite")]
    if let Some(sqlite) = pool.as_sqlite() {
        return resolve_sqlite_iam_app_context_from_access_token(sqlite, raw_bearer_token).await;
    }
    None
}

#[cfg(feature = "sqlite")]
async fn resolve_sqlite_iam_app_context_from_dual_tokens(
    sqlite: &SqlitePool,
    raw_auth_token: &str,
    raw_access_token: &str,
) -> Option<IamAppContext> {
    let auth_token = strip_optional_bearer_prefix(raw_auth_token)?;
    let access_token = strip_optional_bearer_prefix(raw_access_token)?;
    let kid = jwt_header_kid(&auth_token).or_else(|| jwt_header_kid(&access_token))?;
    let signing_key = load_sqlite_signing_key_by_kid(sqlite, &kid).await?;
    let now_unix = (current_millis() / 1000) as i64;
    let auth_claims = verify_local_session_token(&signing_key, &auth_token, "auth", now_unix)?;
    let access_claims =
        verify_local_session_token(&signing_key, &access_token, "access", now_unix)?;
    if !session_token_claims_match(&auth_claims, &access_claims) {
        return None;
    }
    let row = sqlx::query(sqlx::AssertSqlSafe(sqlite_session_context_query(
        "s.auth_token_hash = ? AND s.access_token_hash = ?",
        false,
    )))
    .bind(hash_token(&auth_token))
    .bind(hash_token(&access_token))
    .bind(current_timestamp_utc().to_rfc3339())
    .fetch_optional(sqlite)
    .await
    .ok()??;
    let context = iam_context_from_sqlite_session_row(&row)?;
    if !session_claims_match_context(&auth_claims, &context)
        || !session_claims_match_context(&access_claims, &context)
        || !signing_key_matches_claims(&signing_key, &auth_claims)
    {
        return None;
    }
    Some(context)
}

#[cfg(feature = "sqlite")]
async fn resolve_sqlite_iam_app_context_from_access_token(
    sqlite: &SqlitePool,
    raw_access_token: &str,
) -> Option<IamAppContext> {
    let access_token = strip_optional_bearer_prefix(raw_access_token)?;
    let kid = jwt_header_kid(&access_token)?;
    let signing_key = load_sqlite_signing_key_by_kid(sqlite, &kid).await?;
    let now_unix = (current_millis() / 1000) as i64;
    let claims = verify_local_session_token(&signing_key, &access_token, "access", now_unix)?;
    let row = sqlx::query(sqlx::AssertSqlSafe(sqlite_session_context_query(
        "s.access_token_hash = ?",
        true,
    )))
    .bind(hash_token(&access_token))
    .bind(current_timestamp_utc().to_rfc3339())
    .fetch_optional(sqlite)
    .await
    .ok()??;
    let context = iam_context_from_sqlite_session_row(&row)?;
    if !session_claims_match_context(&claims, &context)
        || !signing_key_matches_claims(&signing_key, &claims)
    {
        return None;
    }
    Some(context)
}

#[cfg(feature = "sqlite")]
fn sqlite_session_context_query(token_predicate: &str, allow_no_expiry: bool) -> String {
    let expiry_predicate = if allow_no_expiry {
        "(s.expires_at = '1970-01-01T00:00:00Z' OR s.expires_at > ?)"
    } else {
        "s.expires_at > ?"
    };
    format!(
        "SELECT s.id, s.tenant_id, s.organization_id, s.login_scope, s.user_id, \
                s.app_id, s.environment, s.deployment_mode, s.auth_level, \
                s.data_scope_json, s.permission_scope_json, \
                COALESCE(u.display_name, ''), COALESCE(u.email, ''), \
                COALESCE(u.email_verified, 0) \
         FROM iam_session s \
         JOIN iam_user u ON u.id = s.user_id AND u.tenant_id = s.tenant_id \
         WHERE {token_predicate} AND s.revoked_at IS NULL AND {expiry_predicate} \
           AND u.status = 'active' AND u.is_deleted = 0 LIMIT 1"
    )
}

#[cfg(feature = "sqlite")]
fn iam_context_from_sqlite_session_row(row: &sqlx::sqlite::SqliteRow) -> Option<IamAppContext> {
    let organization_id: String = row.try_get(2).ok()?;
    let login_scope = login_scope_from_string(&row.try_get::<String, _>(3).ok()?);
    let organization_id = resolve_context_organization_scope(Some(&organization_id), &login_scope)?;
    let organization_member = login_scope == LoginScope::Organization;
    let principal_id: String = row.try_get(4).ok()?;
    Some(IamAppContext {
        tenant_id: row.try_get(1).ok()?,
        organization_id: Some(organization_id),
        login_scope,
        user_id: principal_id.clone(),
        principal_kind: IamPrincipalKind::User,
        principal_id,
        session_id: row.try_get(0).ok()?,
        app_id: row.try_get(5).ok()?,
        environment: environment_from_config(&row.try_get::<String, _>(6).ok()?),
        deployment_mode: match row.try_get::<String, _>(7).ok()?.as_str() {
            "local" => DeploymentMode::Local,
            "private" => DeploymentMode::Private,
            _ => DeploymentMode::Saas,
        },
        auth_level: match row.try_get::<String, _>(8).ok()?.as_str() {
            "password" => AuthLevel::Password,
            "mfa" => AuthLevel::Mfa,
            "system" => AuthLevel::System,
            _ => AuthLevel::Anonymous,
        },
        data_scope: sqlite_json_string_vec(row, 9),
        permission_scope: sqlite_json_string_vec(row, 10),
        user_surface: IamUserSurface {
            app: true,
            organization_member,
        },
        standard_role_codes: Vec::new(),
        display_name: row.try_get(11).unwrap_or_default(),
        email: row.try_get(12).unwrap_or_default(),
        email_verified: row.try_get::<i32, _>(13).unwrap_or_default() != 0,
    })
}

#[cfg(feature = "sqlite")]
fn sqlite_json_string_vec(row: &sqlx::sqlite::SqliteRow, index: usize) -> Vec<String> {
    row.try_get::<String, _>(index)
        .ok()
        .and_then(|value| serde_json::from_str(&value).ok())
        .unwrap_or_default()
}

async fn find_iam_context_from_dual_tokens(
    pg: &PgPool,
    auth_token: &str,
    access_token: &str,
) -> Option<IamAppContext> {
    if auth_token.is_empty() || access_token.is_empty() {
        return None;
    }
    let kid = jwt_header_kid(auth_token).or_else(|| jwt_header_kid(access_token))?;
    let signing_key = load_signing_key_by_kid(pg, &kid).await?;
    let now_unix = (current_millis() / 1000) as i64;
    let auth_claims = verify_local_session_token(&signing_key, auth_token, "auth", now_unix)?;
    let access_claims = verify_local_session_token(&signing_key, access_token, "access", now_unix)?;
    if !session_token_claims_match(&auth_claims, &access_claims) {
        return None;
    }

    let auth_hash = hash_token(auth_token);
    let access_hash = hash_token(access_token);
    let expiry_predicate = auth_token_expiry_predicate("$3");

    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {IAM_SESSION_CONTEXT_SELECT} \
         FROM iam_session s {IAM_SESSION_CONTEXT_JOINS} \
         WHERE s.auth_token_hash = $1 AND s.access_token_hash = $2 \
           AND s.revoked_at IS NULL AND {expiry_predicate} \
           AND {IAM_SESSION_PRINCIPAL_ACTIVE} \
         LIMIT 1"
    )))
    .bind(&auth_hash)
    .bind(&access_hash)
    .bind(current_timestamp_utc())
    .fetch_optional(pg)
    .await;
    let row = row.ok()??;

    let mut context = iam_context_from_session_row(&row)?;
    let row_scope = session_row_ownership_scope(&row);
    if !session_claims_match_context(&auth_claims, &context)
        || !session_claims_match_context(&access_claims, &context)
        || !session_scope_matches_claims(&auth_claims, row_scope)
        || !session_scope_matches_claims(&access_claims, row_scope)
        || !signing_key_matches_claims(&signing_key, &auth_claims)
    {
        return None;
    }
    if !refresh_session_authorization_if_stale(pg, &row, &mut context).await {
        return None;
    }
    Some(context)
}

/// Refreshes a local session's authorization snapshot when the platform
/// authorization epoch has advanced.
///
/// `iam_session.permission_scope_json` is written at login, but permission
/// catalogs and role grants change on deploy and on RBAC administration.
/// Requiring a re-login for every such change is poor experience and, for
/// revokes, a security lag. `iam_authz_epoch` is bumped by database triggers on
/// every RBAC/catalog write; a session whose stored `authz_epoch` is older than
/// the current epoch re-resolves its scopes from the authoritative bindings and
/// persists them. Steady state adds one indexed scalar to the existing session
/// read and no extra round trip; only sessions observed after a change pay the
/// two-query refresh. See `sdkwork-specs/AUTHORIZATION_STATE_SPEC.md`.
///
/// Returns `false` when the snapshot is stale and could not be refreshed:
/// authorization fails closed (AUTHORIZATION_STATE_SPEC 3.2) instead of
/// authorizing with scopes that may no longer be current.
async fn refresh_session_authorization_if_stale(
    pg: &PgPool,
    row: &sqlx::postgres::PgRow,
    context: &mut IamAppContext,
) -> bool {
    if context.principal_kind != IamPrincipalKind::User {
        return true;
    }
    let session_epoch = row
        .try_get::<Option<i64>, _>("session_authz_epoch")
        .ok()
        .flatten();
    let current_epoch = row.try_get::<i64, _>("current_authz_epoch").unwrap_or(0);
    if session_epoch == Some(current_epoch) {
        return true;
    }
    let Ok((data_scope, permission_scope)) = sdkwork_iam_bootstrap::resolve_session_scopes(
        pg,
        &context.tenant_id,
        &context.user_id,
        context.organization_id.as_deref(),
    )
    .await
    else {
        return false;
    };
    let persisted = sqlx::query(
        "UPDATE iam_session \
            SET data_scope_json = $2, permission_scope_json = $3, \
                authz_epoch = $4, updated_at = CURRENT_TIMESTAMP \
          WHERE id = $1",
    )
    .bind(&context.session_id)
    .bind(Json(&data_scope))
    .bind(Json(&permission_scope))
    .bind(current_epoch)
    .execute(pg)
    .await;
    if persisted.is_err() {
        return false;
    }
    context.data_scope = data_scope.clone();
    context.permission_scope = permission_scope.clone();
    insert_session_scopes(
        &context.tenant_id,
        &context.session_id,
        SessionScopes {
            data_scope,
            permission_scope,
        },
    );
    true
}

async fn find_iam_context_from_auth_token(pg: &PgPool, auth_token: &str) -> Option<IamAppContext> {
    if auth_token.is_empty() {
        return None;
    }
    let auth_hash = hash_token(auth_token);
    let expiry_predicate = auth_token_expiry_predicate("$2");
    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {IAM_SESSION_CONTEXT_SELECT} \
         FROM iam_session s {IAM_SESSION_CONTEXT_JOINS} \
         WHERE s.auth_token_hash = $1 \
           AND s.revoked_at IS NULL AND {expiry_predicate} \
           AND ((s.principal_kind = 'user' AND u.status = 'active' AND u.is_deleted = 0) \
             OR (s.principal_kind = 'service_account' AND sa.status = 'active' \
               AND sac.status = 'active' \
               AND (sac.expires_at IS NULL OR sac.expires_at > $2::timestamptz))) \
         LIMIT 1"
    )))
    .bind(&auth_hash)
    .bind(current_timestamp_utc())
    .fetch_optional(pg)
    .await
    .ok()??;

    let mut context = iam_context_from_session_row(&row)?;
    if auth_token.contains('.') {
        let kid = jwt_header_kid(auth_token)?;
        let signing_key = load_signing_key_by_kid(pg, &kid).await?;
        let now_unix = (current_millis() / 1000) as i64;
        let claims = verify_local_session_token(&signing_key, auth_token, "auth", now_unix)?;
        if !session_claims_match_context(&claims, &context)
            || !session_scope_matches_claims(&claims, session_row_ownership_scope(&row))
            || !signing_key_matches_claims(&signing_key, &claims)
        {
            return None;
        }
    }
    if !refresh_session_authorization_if_stale(pg, &row, &mut context).await {
        return None;
    }
    Some(context)
}

async fn find_iam_context_from_access_token(
    pg: &PgPool,
    access_token: &str,
) -> Option<IamAppContext> {
    if access_token.is_empty() {
        return None;
    }
    let access_hash = hash_token(access_token);
    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {IAM_SESSION_CONTEXT_SELECT} \
         FROM iam_session s {IAM_SESSION_CONTEXT_JOINS} \
         WHERE s.access_token_hash = $1 \
           AND s.revoked_at IS NULL \
           AND (s.expires_at::timestamptz <= 'epoch'::timestamptz \
             OR s.expires_at::timestamptz > $2::timestamptz) \
           AND ((s.principal_kind = 'user' AND u.status = 'active' AND u.is_deleted = 0) \
             OR (s.principal_kind = 'service_account' AND sa.status = 'active' \
               AND sac.status = 'active' \
               AND (sac.expires_at IS NULL OR sac.expires_at > $2::timestamptz))) \
         LIMIT 1"
    )))
    .bind(&access_hash)
    .bind(current_timestamp_utc())
    .fetch_optional(pg)
    .await
    .ok()??;

    let context = iam_context_from_session_row(&row)?;
    if access_token.contains('.') {
        let kid = jwt_header_kid(access_token)?;
        let signing_key = load_signing_key_by_kid(pg, &kid).await?;
        let now_unix = (current_millis() / 1000) as i64;
        let claims = verify_local_session_token_flexible(
            &signing_key,
            access_token,
            &["access", "oauth", "oauth_access", "bearer"],
            now_unix,
        )?;
        if !session_claims_match_context(&claims, &context)
            || !session_scope_matches_claims(&claims, session_row_ownership_scope(&row))
            || !signing_key_matches_claims(&signing_key, &claims)
        {
            return None;
        }
    }
    Some(context)
}

async fn find_iam_context_from_oauth_jwt(pg: &PgPool, token: &str) -> Option<IamAppContext> {
    if !token.contains('.') {
        return None;
    }
    let now_unix = (current_millis() / 1000) as i64;
    let claims = verify_oauth_access_token_claims_for_database(pg, token, now_unix).await?;
    let mut context = iam_context_from_token_claims(&claims)?;
    // Scope is deliberately *not* taken from the claims (IAM_SPEC 搂5.2): the
    // claims carry an identity envelope only, and the authoritative scope is
    // resolved from the session row. A subject whose scope cannot be resolved
    // is rejected rather than degraded to an empty scope.
    let (data_scope, permission_scope) = resolve_session_authorization_scope(pg, &context).await?;
    context.data_scope = data_scope;
    context.permission_scope = permission_scope;
    if !oauth_access_token_grant_is_active(pg, &hash_token(token)).await {
        return None;
    }
    Some(context)
}

async fn verify_oauth_access_token_claims_for_database(
    pg: &PgPool,
    token: &str,
    now_unix: i64,
) -> Option<Value> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return None;
    }
    let header = decode_jwt_json(parts[0])?;
    let payload = decode_jwt_json(parts[1])?;
    let algorithm = header.get("alg").and_then(Value::as_str)?;
    let kid = header.get("kid").and_then(Value::as_str)?;

    if algorithm == "RS256" {
        let tenant_id = claim_string_value(&payload, &["tenant_id"])?;
        let material = sdkwork_iam_bootstrap::load_postgres_oauth_rs256_signing_key(pg, &tenant_id)
            .await
            .ok()??;
        if material.kid != kid {
            return None;
        }
        let verified = sdkwork_iam_bootstrap::verify_rs256_jwt(&material, token).ok()?;
        return oauth_access_token_claims_are_valid(&verified, now_unix).then_some(verified);
    }

    if algorithm != "HS256" {
        return None;
    }
    let signing_key = load_signing_key_by_kid(pg, kid).await?;
    verify_oauth_access_token_claims(&signing_key, token, now_unix)
}

async fn oauth_access_token_grant_is_active(pg: &PgPool, access_token_hash: &str) -> bool {
    sqlx::query_scalar::<_, i32>(
        "SELECT 1 FROM iam_oauth_grant g \
         JOIN iam_tenant t ON t.id = g.tenant_id AND t.status = 'active' \
         WHERE g.access_token_hash = $1 AND g.status = 'active' \
           AND g.token_expires_at::timestamptz > $2::timestamptz \
         LIMIT 1",
    )
    .bind(access_token_hash)
    .bind(current_timestamp_utc())
    .fetch_optional(pg)
    .await
    .ok()
    .flatten()
    .is_some()
}

pub(crate) fn oauth_issuer_base_url() -> String {
    std::env::var("SDKWORK_IAM_OAUTH_ISSUER")
        .ok()
        .map(|value| value.trim().trim_end_matches('/').to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "https://iam.sdkwork.local".to_string())
}

fn verify_oauth_access_token_claims(
    signing_key: &TenantSigningKey,
    token: &str,
    now_unix: i64,
) -> Option<Value> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return None;
    }
    let header = decode_jwt_json(parts[0])?;
    let payload = decode_jwt_json(parts[1])?;
    let kid = header.get("kid").and_then(Value::as_str)?;
    if kid != signing_key.kid {
        return None;
    }
    let signing_input = format!("{}.{}", parts[0], parts[1]);
    let mut mac = HmacSha256::new_from_slice(signing_key.secret.as_slice()).ok()?;
    mac.update(signing_input.as_bytes());
    let expected_signature = URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes());
    if expected_signature != parts[2] {
        return None;
    }
    if !oauth_access_token_claims_are_valid(&payload, now_unix) {
        return None;
    }
    if !signing_key_matches_claims(signing_key, &payload) {
        return None;
    }
    Some(payload)
}

fn oauth_access_token_claims_are_valid(payload: &Value, now_unix: i64) -> bool {
    payload
        .get("token_type")
        .and_then(Value::as_str)
        .is_some_and(|value| value.eq_ignore_ascii_case("oauth"))
        && payload
            .get("exp")
            .and_then(Value::as_i64)
            .is_some_and(|exp| exp >= now_unix)
        && payload.get("iss").and_then(Value::as_str) == Some(oauth_issuer_base_url().as_str())
        && claim_string_value(payload, &["app_id"]).is_some()
        && claims_login_scope_organization_consistent(payload)
        && claims_ownership_scope_consistent(payload)
        && validate_token_version_json(payload, &TokenVersionPolicy::standard()).is_ok()
}

/// IAM_SPEC 搂5.6: the authorization scope of an OAuth bearer subject is a
/// server-side fact read from the authoritative session row, never a claim.
/// Liveness and scope come from the *same* row in a *single* query, so a
/// subject that passes this gate cannot be authorized against a row it did not
/// pass the gate for. A subject whose row is missing/inactive resolves to
/// `None`, which makes the caller reject the request instead of degrading to an
/// empty (i.e. silently ungated) scope.
async fn resolve_session_authorization_scope(
    pg: &PgPool,
    context: &IamAppContext,
) -> Option<(Vec<String>, Vec<String>)> {
    if context.session_id.starts_with("oauth:") {
        return None;
    }
    let row = sqlx::query(IAM_SESSION_AUTHORIZATION_SCOPE_SELECT)
        .bind(&context.session_id)
        .bind(&context.tenant_id)
        .bind(current_timestamp_utc())
        .fetch_optional(pg)
        .await
        .ok()
        .flatten()?;
    Some((
        json_string_vec_from_row(&row, 0),
        json_string_vec_from_row(&row, 1),
    ))
}

/// Predicate kept byte-identical to the app-api main-path session lookup so
/// liveness can never agree in one path and disagree in the other.
const IAM_SESSION_AUTHORIZATION_SCOPE_SELECT: &str =
    "SELECT s.data_scope_json, s.permission_scope_json FROM iam_session s \
     WHERE s.id = $1 AND s.tenant_id = $2 AND s.revoked_at IS NULL \
       AND s.expires_at::timestamptz > $3::timestamptz \
       AND (s.principal_kind = 'service_account' OR EXISTS ( \
         SELECT 1 FROM iam_user u \
         WHERE u.id = COALESCE(s.principal_id, s.user_id) AND u.tenant_id = s.tenant_id \
           AND u.status = 'active' AND u.is_deleted = 0)) \
     LIMIT 1";

fn iam_context_from_token_claims(claims: &Value) -> Option<IamAppContext> {
    let tenant_id = claim_string_value(claims, &["tenant_id"])?;
    let user_id = claim_string_value(claims, &["user_id"])?;
    let session_id =
        claim_string_value(claims, &["session_id"]).unwrap_or_else(|| format!("oauth:{user_id}"));
    let app_id = claim_string_value(claims, &["app_id"])?;
    let organization_id = claim_string_value(claims, &["organization_id"]);
    let login_scope = login_scope_from_string(
        claim_string_value(claims, &["login_scope"])
            .unwrap_or_else(|| "TENANT".to_owned())
            .as_str(),
    );
    let environment = environment_from_config(
        claim_string_value(claims, &["environment"])
            .unwrap_or_else(|| "prod".to_owned())
            .as_str(),
    );
    let deployment_mode = match claim_string_value(claims, &["deployment_mode"])
        .unwrap_or_else(|| "saas".to_owned())
        .to_ascii_lowercase()
        .as_str()
    {
        "local" => DeploymentMode::Local,
        "private" => DeploymentMode::Private,
        _ => DeploymentMode::Saas,
    };
    let auth_level = match claim_string_value(claims, &["auth_level"])
        .unwrap_or_else(|| "password".to_owned())
        .to_ascii_lowercase()
        .as_str()
    {
        "mfa" => AuthLevel::Mfa,
        "system" => AuthLevel::System,
        _ => AuthLevel::Password,
    };
    // IAM_SPEC 搂5.6: authorization scope is server-resolved, never a claim.
    // Reading it from the claims here would silently re-introduce a second
    // source of truth 鈥?and, with the claims slimmed per 搂5.2, an empty scope.
    // `find_iam_context_from_oauth_jwt` overwrites both fields from the
    // authoritative session row; anything that builds a context from claims
    // without doing so must be treated as having no scope at all.
    let data_scope = Vec::new();
    let permission_scope = Vec::new();
    let normalized_organization_id =
        resolve_context_organization_scope(organization_id.as_deref(), &login_scope)?;
    let organization_member = login_scope == LoginScope::Organization;

    Some(IamAppContext {
        tenant_id,
        organization_id: Some(normalized_organization_id),
        login_scope,
        user_id: user_id.clone(),
        principal_kind: IamPrincipalKind::User,
        principal_id: user_id,
        session_id,
        app_id,
        environment,
        deployment_mode,
        auth_level,
        data_scope,
        permission_scope,
        user_surface: IamUserSurface {
            app: true,
            organization_member,
        },
        standard_role_codes: Vec::new(),
        display_name: claim_string_value(claims, &["display_name", "displayName", "name"])
            .unwrap_or_default(),
        email: claim_string_value(claims, &["email"]).unwrap_or_default(),
        email_verified: claims
            .get("email_verified")
            .or_else(|| claims.get("emailVerified"))
            .and_then(|value| value.as_bool())
            .unwrap_or(false),
    })
}

fn verify_local_session_token_flexible(
    signing_key: &TenantSigningKey,
    token: &str,
    accepted_token_types: &[&str],
    now_unix: i64,
) -> Option<Value> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return None;
    }
    let header = decode_jwt_json(parts[0])?;
    let payload = decode_jwt_json(parts[1])?;
    let kid = header.get("kid").and_then(Value::as_str)?;
    if kid != signing_key.kid {
        return None;
    }
    let signing_input = format!("{}.{}", parts[0], parts[1]);
    let mut mac = HmacSha256::new_from_slice(signing_key.secret.as_slice()).ok()?;
    mac.update(signing_input.as_bytes());
    let expected_signature = URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes());
    if expected_signature != parts[2] {
        return None;
    }
    let token_type = payload.get("token_type").and_then(Value::as_str)?;
    if !accepted_token_types
        .iter()
        .any(|candidate| token_type.eq_ignore_ascii_case(candidate))
    {
        return None;
    }
    let exp = payload.get("exp").and_then(Value::as_i64)?;
    // `0` is the explicit "never expires" sentinel for the application
    // bootstrap access credential; a concrete past instant still expires.
    if exp != 0 && exp < now_unix {
        return None;
    }
    let iss = payload.get("iss").and_then(Value::as_str)?;
    if iss != LOCAL_SESSION_TOKEN_ISSUER {
        return None;
    }
    let aud = payload.get("aud").and_then(Value::as_str)?;
    let app_id = payload.get("app_id").and_then(Value::as_str)?;
    if aud != app_id {
        return None;
    }
    if !claims_login_scope_organization_consistent(&payload) {
        return None;
    }
    if !claims_ownership_scope_consistent(&payload) {
        return None;
    }
    if validate_token_version_json(&payload, &TokenVersionPolicy::standard()).is_err() {
        return None;
    }
    if !signing_key_matches_claims(signing_key, &payload) {
        return None;
    }
    Some(payload)
}

struct TenantSigningKey {
    tenant_id: String,
    kid: String,
    secret: Vec<u8>,
}

fn iam_context_from_session_row(row: &sqlx::postgres::PgRow) -> Option<IamAppContext> {
    let session_id: String = row.get(0);
    let tenant_id: String = row.get(1);
    let organization_id: String = row.get(2);
    let login_scope: String = row.get(3);
    let user_id: Option<String> = row.get(4);
    let app_id: String = row.get(5);
    let environment: String = row.get(6);
    let deployment_mode: String = row.get(7);
    let auth_level: String = row.get(8);
    let data_scope = json_string_vec_from_row(row, 9);
    let permission_scope = json_string_vec_from_row(row, 10);
    let login_scope = login_scope_from_string(&login_scope);
    // `iam_session.organization_id` is NOT NULL DEFAULT '0' and carries the
    // resolved scope. Reconcile it with `login_scope` exactly once here so the
    // projected context never pairs a tenant-level scope with organization
    // membership (which previously made `organization_member` true for `'0'`),
    // and never pairs `ORGANIZATION` with the sentinel.
    let organization_id = resolve_context_organization_scope(Some(&organization_id), &login_scope)?;
    let organization_member = login_scope == LoginScope::Organization;

    let (display_name, email, email_verified) = user_profile_from_session_row(row);

    let principal_kind: String = row.get(14);
    let principal_id: String = row.get(15);
    Some(IamAppContext {
        tenant_id,
        organization_id: Some(organization_id),
        user_id: user_id.unwrap_or_else(|| principal_id.clone()),
        principal_kind: if principal_kind == "service_account" {
            IamPrincipalKind::ServiceAccount
        } else {
            IamPrincipalKind::User
        },
        principal_id,
        session_id,
        app_id,
        environment: environment_from_config(&environment),
        deployment_mode: match deployment_mode.as_str() {
            "local" => DeploymentMode::Local,
            "private" => DeploymentMode::Private,
            _ => DeploymentMode::Saas,
        },
        auth_level: match auth_level.as_str() {
            "password" => AuthLevel::Password,
            "mfa" => AuthLevel::Mfa,
            "system" => AuthLevel::System,
            _ => AuthLevel::Anonymous,
        },
        login_scope,
        data_scope,
        permission_scope,
        user_surface: IamUserSurface {
            app: true,
            organization_member,
        },
        standard_role_codes: Vec::new(),
        display_name,
        email,
        email_verified,
    })
}

/// Reads the release scope a session row was issued for.
///
/// `iam_session.scope_kind` is written by the issuer from the installation row
/// (`APPLICATION_IDENTITY_SPEC.md` §4.1), so the resolver compares the credential
/// against the scope it authorized against instead of re-deriving it from
/// `login_scope` — a personal release keeps `login_scope = TENANT`.
///
/// A row from a database that predates the column keeps the historical
/// derivation: the organization scope decides, and `USER` is never inferred.
fn session_row_ownership_scope(row: &sqlx::postgres::PgRow) -> ApplicationOwnershipScope {
    row.try_get::<String, _>(18)
        .ok()
        .and_then(|value| ApplicationOwnershipScope::parse(&value))
        .unwrap_or_else(|| {
            let organization_id: String = row.try_get(2).unwrap_or_else(|_| "0".to_owned());
            ApplicationOwnershipScope::derive_from_organization_scope(Some(&organization_id))
        })
}

/// The release scope a credential claims, if it declares one.
fn claimed_ownership_scope(claims: &Value) -> Option<ApplicationOwnershipScope> {
    claim_string_value(claims, &["ownership_scope", "ownershipScope"])
        .and_then(|value| ApplicationOwnershipScope::parse(&value))
}

/// The scope a credential stands for: its claim, or the legacy derivation from
/// its organization scope when the claim is absent.
fn effective_claims_ownership_scope(claims: &Value) -> ApplicationOwnershipScope {
    claimed_ownership_scope(claims).unwrap_or_else(|| {
        ApplicationOwnershipScope::derive_from_organization_scope(
            claim_string_value(claims, &["organization_id"]).as_deref(),
        )
    })
}

/// IAM_SPEC §5.2: the scope claim must agree with the organization claim, and an
/// unknown value is a contradictory credential.
///
/// `ORGANIZATION` requires a non-zero organization and `USER` requires the
/// sentinel: both are the installation's own organization claim. `TENANT` is
/// neutral — a tenant-released application keeps the ordinary login-context
/// organization, which narrows business data without changing the application's
/// release level.
///
/// An absent claim is accepted (pre-existing credentials,
/// `APPLICATION_IDENTITY_SPEC.md` §4.1 rule 6); knowing whether it *should* be
/// present is the session row's job, done in [`session_scope_matches_claims`].
fn claims_ownership_scope_consistent(claims: &Value) -> bool {
    let raw = claim_string_value(claims, &["ownership_scope", "ownershipScope"]);
    let Some(raw) = raw else {
        return true;
    };
    let Some(scope) = ApplicationOwnershipScope::parse(&raw) else {
        return false;
    };
    let organization_id = claim_string_value(claims, &["organization_id"]);
    let has_organization = organization_id
        .as_deref()
        .map(|value| !crate::is_blank(Some(value)) && value.trim() != "0")
        .unwrap_or(false);
    match scope {
        ApplicationOwnershipScope::Tenant => true,
        ApplicationOwnershipScope::Organization => has_organization,
        ApplicationOwnershipScope::User => !has_organization,
    }
}

/// The credential and the session row must agree on the release scope, and a
/// `USER`-scoped row demands the claim explicitly.
fn session_scope_matches_claims(claims: &Value, row_scope: ApplicationOwnershipScope) -> bool {
    match (claimed_ownership_scope(claims), row_scope) {
        (Some(claim), row) => claim == row,
        // A personal release is only ever issued with the claim, so its absence
        // on a USER-scoped row is a mismatch rather than a legacy credential.
        (None, ApplicationOwnershipScope::User) => false,
        (None, _) => true,
    }
}

fn json_string_vec_from_row(row: &sqlx::postgres::PgRow, index: usize) -> Vec<String> {
    if let Ok(Json(value)) = row.try_get::<Json<Value>, _>(index) {
        return serde_json::from_value(value).unwrap_or_default();
    }
    if let Ok(text) = row.try_get::<String, _>(index) {
        return serde_json::from_str(&text).unwrap_or_default();
    }
    Vec::new()
}

pub(crate) fn hash_token(token: &str) -> String {
    let digest = Sha256::digest(token.as_bytes());
    format!("{:x}", digest)
}

fn strip_optional_bearer_prefix(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }
    let token = trimmed
        .strip_prefix("Bearer ")
        .or_else(|| trimmed.strip_prefix("bearer "))
        .unwrap_or(trimmed)
        .trim();
    if token.is_empty() {
        None
    } else {
        Some(token.to_owned())
    }
}

fn jwt_header_kid(token: &str) -> Option<String> {
    let header_part = token.split('.').next()?;
    let header = decode_jwt_json(header_part)?;
    header
        .get("kid")
        .and_then(Value::as_str)
        .map(str::to_string)
}

fn decode_jwt_json(part: &str) -> Option<Value> {
    let decoded = URL_SAFE_NO_PAD.decode(part).ok()?;
    serde_json::from_slice(&decoded).ok()
}

async fn load_signing_key_by_kid(pg: &PgPool, kid: &str) -> Option<TenantSigningKey> {
    sdkwork_iam_bootstrap::resolve_postgres_tenant_signing_key_by_kid(pg, kid)
        .await
        .ok()
        .flatten()
        .map(|material| TenantSigningKey {
            tenant_id: material.tenant_id,
            kid: material.kid,
            secret: material.secret,
        })
}

#[cfg(feature = "sqlite")]
async fn load_sqlite_signing_key_by_kid(
    sqlite: &SqlitePool,
    kid: &str,
) -> Option<TenantSigningKey> {
    sdkwork_iam_bootstrap::resolve_sqlite_tenant_signing_key_by_kid(sqlite, kid)
        .await
        .ok()
        .flatten()
        .map(|material| TenantSigningKey {
            tenant_id: material.tenant_id,
            kid: material.kid,
            secret: material.secret,
        })
}

fn verify_local_session_token(
    signing_key: &TenantSigningKey,
    token: &str,
    expected_token_type: &str,
    now_unix: i64,
) -> Option<Value> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return None;
    }
    let header = decode_jwt_json(parts[0])?;
    let payload = decode_jwt_json(parts[1])?;
    let kid = header.get("kid").and_then(Value::as_str)?;
    if kid != signing_key.kid {
        return None;
    }
    let signing_input = format!("{}.{}", parts[0], parts[1]);
    let mut mac = HmacSha256::new_from_slice(signing_key.secret.as_slice()).ok()?;
    mac.update(signing_input.as_bytes());
    let expected_signature = URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes());
    if expected_signature != parts[2] {
        return None;
    }
    let token_type = payload.get("token_type").and_then(Value::as_str)?;
    if !token_type.eq_ignore_ascii_case(expected_token_type) {
        return None;
    }
    let exp = payload.get("exp").and_then(Value::as_i64)?;
    // `0` is the explicit "never expires" sentinel for the application
    // bootstrap access credential; a concrete past instant still expires.
    if exp != 0 && exp < now_unix {
        return None;
    }
    let iss = payload.get("iss").and_then(Value::as_str)?;
    if iss != LOCAL_SESSION_TOKEN_ISSUER {
        return None;
    }
    let aud = payload.get("aud").and_then(Value::as_str)?;
    let app_id = payload.get("app_id").and_then(Value::as_str)?;
    if aud != app_id {
        return None;
    }
    if !claims_login_scope_organization_consistent(&payload) {
        return None;
    }
    if !claims_ownership_scope_consistent(&payload) {
        return None;
    }
    if validate_token_version_json(&payload, &TokenVersionPolicy::standard()).is_err() {
        return None;
    }
    Some(payload)
}

fn signing_key_matches_claims(signing_key: &TenantSigningKey, claims: &Value) -> bool {
    claims
        .get("tenant_id")
        .and_then(Value::as_str)
        .is_some_and(|tenant_id| tenant_id == signing_key.tenant_id)
}

fn claims_login_scope_organization_consistent(claims: &Value) -> bool {
    let login_scope = claims
        .get("login_scope")
        .and_then(Value::as_str)
        .map(|value| value.trim().to_ascii_uppercase())
        .unwrap_or_else(|| "TENANT".to_string());
    let organization_id = claims
        .get("organization_id")
        .and_then(Value::as_str)
        .unwrap_or("0");
    let has_organization = !crate::is_blank(Some(organization_id)) && organization_id != "0";
    match login_scope.as_str() {
        "ORGANIZATION" => has_organization,
        _ => !has_organization,
    }
}

fn claim_string_value(claims: &Value, keys: &[&str]) -> Option<String> {
    keys.iter()
        .find_map(|key| claims.get(*key).and_then(Value::as_str).map(str::to_string))
}

fn session_token_claims_match(auth_claims: &Value, access_claims: &Value) -> bool {
    for keys in [
        &["tenant_id"][..],
        &["user_id"][..],
        &["session_id"][..],
        &["app_id"][..],
    ] {
        if claim_string_value(auth_claims, keys) != claim_string_value(access_claims, keys) {
            return false;
        }
    }
    // Overlapping tenancy claims are compared after normalization
    // (`API_SPEC.md` 搂10.2): an absent `organization_id` and `"0"` are the same
    // tenant-level scope, and `login_scope` is case-insensitive on the wire.
    let auth_scope = sdkwork_iam_context_service::normalize_resolved_organization_scope(
        claim_string_value(auth_claims, &["organization_id"]).as_deref(),
    );
    let access_scope = sdkwork_iam_context_service::normalize_resolved_organization_scope(
        claim_string_value(access_claims, &["organization_id"]).as_deref(),
    );
    if auth_scope != access_scope {
        return false;
    }
    let auth_scope_claim = claim_string_value(auth_claims, &["login_scope"])
        .map(|value| value.trim().to_ascii_uppercase());
    let access_scope_claim = claim_string_value(access_claims, &["login_scope"])
        .map(|value| value.trim().to_ascii_uppercase());
    if auth_scope_claim != access_scope_claim {
        return false;
    }
    // Both halves of one dual-token pair are signed from the same installation,
    // so a pair that disagrees about the release scope is not a valid pair even
    // when each half is individually well-formed.
    effective_claims_ownership_scope(auth_claims) == effective_claims_ownership_scope(access_claims)
}

fn session_claims_match_context(claims: &Value, context: &IamAppContext) -> bool {
    let claim_scope = sdkwork_iam_context_service::normalize_resolved_organization_scope(
        claim_string_value(claims, &["organization_id"]).as_deref(),
    );
    claim_string_value(claims, &["tenant_id"]) == Some(context.tenant_id.clone())
        && claim_string_value(claims, &["user_id"]) == Some(context.user_id.clone())
        && claim_string_value(claims, &["session_id"]) == Some(context.session_id.clone())
        && claim_string_value(claims, &["app_id"]) == Some(context.app_id.clone())
        && claim_string_value(claims, &["login_scope"])
            == Some(login_scope_to_string(&context.login_scope).to_string())
        && claim_scope == context.organization_scope()
}

fn login_scope_to_string(login_scope: &LoginScope) -> &'static str {
    match login_scope {
        LoginScope::Tenant => "TENANT",
        LoginScope::Organization => "ORGANIZATION",
    }
}

fn login_scope_from_string(value: &str) -> LoginScope {
    match value.trim().to_ascii_uppercase().as_str() {
        "ORGANIZATION" => LoginScope::Organization,
        _ => LoginScope::Tenant,
    }
}

/// Reconciles a persisted/claimed organization scope with its `login_scope`.
///
/// `API_SPEC.md` 搂10.4 derives the resolved scope from those two facts only. A
/// `TENANT` scope must be the sentinel `0`; an `ORGANIZATION` scope must be a
/// non-zero id. Anything else is a contradictory credential and MUST fail closed
/// (`40103`) instead of degrading to tenant-level data or guessing an
/// organization, so this returns `None` for the caller to reject.
fn resolve_context_organization_scope(
    organization_id: Option<&str>,
    login_scope: &LoginScope,
) -> Option<String> {
    let scope = sdkwork_iam_context_service::normalize_resolved_organization_scope(organization_id);
    let tenant_level = sdkwork_iam_context_service::is_platform_organization_id(&scope);
    match (login_scope, tenant_level) {
        (LoginScope::Tenant, true) | (LoginScope::Organization, false) => Some(scope),
        _ => None,
    }
}

fn environment_from_config(environment: &str) -> Environment {
    match environment.trim().to_ascii_lowercase().as_str() {
        "prod" | "production" => Environment::Prod,
        "test" | "testing" => Environment::Test,
        _ => Environment::Dev,
    }
}

fn current_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

fn current_timestamp_utc() -> chrono::DateTime<chrono::Utc> {
    chrono::Utc::now()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::access_token_issue::{
        sign_local_session_token_with_ttl, TenantSigningKey as IssuerSigningKey,
    };
    use serde_json::json;

    const TEST_SIGNING_SECRET: &[u8] = b"0123456789abcdef0123456789abcdef";

    /// AUTHORIZATION_STATE_SPEC.md section 3.3: the session read must carry both
    /// the snapshot version it was derived from and the current platform epoch,
    /// otherwise a stale login-time snapshot can never be detected.
    #[test]
    fn session_context_select_versions_the_authorization_snapshot() {
        assert!(IAM_SESSION_CONTEXT_SELECT.contains("s.authz_epoch"));
        assert!(IAM_SESSION_CONTEXT_SELECT.contains("current_authz_epoch"));
        assert!(IAM_SESSION_CONTEXT_SELECT.contains("iam_authz_epoch"));
    }

    /// The packaged portal's bootstrap credential is issued with `ttl = 0`
    /// (`NO_EXPIRY_EPOCH_SECONDS`) and persisted with `expires_at = UNIX_EPOCH`
    /// (`no_expiry_timestamp`). Both auth-token channels must treat that
    /// sentinel as "never expires" exactly like the access-token channel,
    /// otherwise the credential the gateway receives on first boot is rejected
    /// as expired before its signature/hash/principal checks run.
    #[test]
    fn auth_token_liveness_accepts_the_no_expiry_epoch_sentinel() {
        for timestamp_param in ["$2", "$3"] {
            let predicate = auth_token_expiry_predicate(timestamp_param);
            assert!(
                predicate.contains("<= 'epoch'::timestamptz"),
                "the no-expiry sentinel must be allowed: {predicate}"
            );
            assert!(
                predicate.contains(&format!("> {timestamp_param}::timestamptz")),
                "a concrete expiry must still be compared against {timestamp_param}: {predicate}"
            );
        }
    }

    fn test_signing_key() -> TenantSigningKey {
        TenantSigningKey {
            tenant_id: "100001".to_owned(),
            kid: "kid-1".to_owned(),
            secret: TEST_SIGNING_SECRET.to_vec(),
        }
    }

    fn test_app_context() -> IamAppContext {
        IamAppContext::new(
            "100001".to_owned(),
            Some("org-1"),
            "user-1".to_owned(),
            "session-1".to_owned(),
            "sdkwork-cloudrouter".to_owned(),
            Environment::Prod,
            DeploymentMode::Private,
            AuthLevel::Password,
            vec!["tenant:100001".to_owned()],
            vec!["iam:self".to_owned()],
        )
    }

    fn encode_jwt_part(value: &Value) -> String {
        URL_SAFE_NO_PAD.encode(serde_json::to_vec(value).expect("JWT JSON should serialize"))
    }

    /// Signs an arbitrary payload with the test secret so legacy and tampered
    /// tokens can be constructed without going through the production issuer.
    fn sign_payload_with_test_secret(payload: &Value) -> String {
        let header = json!({"alg": "HS256", "kid": "kid-1", "typ": "JWT"});
        let signing_input = format!("{}.{}", encode_jwt_part(&header), encode_jwt_part(payload));
        let mut mac =
            HmacSha256::new_from_slice(TEST_SIGNING_SECRET).expect("HMAC key should construct");
        mac.update(signing_input.as_bytes());
        format!(
            "{signing_input}.{}",
            URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes())
        )
    }

    // token-claims-gate: legacy-fixture 鈥?models a pre-slimming token (with the
    // retired sid/sub/principal_id aliases plus scope claims) so this test can
    // assert the scope is no longer an authorization source (IAM_SPEC 搂5.2/搂5.6).
    fn legacy_payload_with_user_id(user_id: &str, now_unix: i64) -> Value {
        json!({
            "app_id": "sdkwork-cloudrouter",
            "aud": "sdkwork-cloudrouter",
            "auth_level": "password",
            "data_scope": ["tenant:100001"],
            "deployment_mode": "private",
            "environment": "prod",
            "exp": now_unix + 3600,
            "iat": now_unix,
            "iss": LOCAL_SESSION_TOKEN_ISSUER,
            "login_scope": "ORGANIZATION",
            "organization_id": "org-1",
            "permission_scope": ["iam:self"],
            "principal_id": user_id,
            "principal_kind": "user",
            "session_id": "session-1",
            "sid": "session-1",
            "sub": user_id,
            "tenant_id": "100001",
            "token_type": "auth",
            "token_version": 1,
            "user_id": user_id,
        })
    }

    #[test]
    fn cleaned_claims_verify_legacy_tokens_stay_compatible_and_tampering_is_rejected() {
        let key = test_signing_key();
        let context = test_app_context();
        let now_unix = (current_millis() / 1000) as i64;

        // New-format dual tokens: issue -> verify signature -> dual-token
        // pairing -> context matching.
        let issue_key = IssuerSigningKey {
            kid: key.kid.clone(),
            secret: key.secret.clone(),
        };
        let auth_token = sign_local_session_token_with_ttl(
            &issue_key,
            "auth",
            &context,
            ApplicationOwnershipScope::Organization,
            3600,
        );
        let access_token = sign_local_session_token_with_ttl(
            &issue_key,
            "access",
            &context,
            ApplicationOwnershipScope::Organization,
            3600,
        );
        let auth_claims = verify_local_session_token(&key, &auth_token, "auth", now_unix)
            .expect("new auth token should verify");
        let access_claims = verify_local_session_token(&key, &access_token, "access", now_unix)
            .expect("new access token should verify");
        assert!(session_token_claims_match(&auth_claims, &access_claims));
        assert!(session_claims_match_context(&auth_claims, &context));
        for claim in ["sid", "sub", "principal_id", "principal_kind"] {
            assert!(auth_claims.get(claim).is_none(), "{claim} must be absent");
        }

        // Legacy-format token (with sid/sub/principal_id/principal_kind):
        // signature verification and context matching must still pass.
        let legacy_token =
            sign_payload_with_test_secret(&legacy_payload_with_user_id("user-1", now_unix));
        let legacy_claims = verify_local_session_token(&key, &legacy_token, "auth", now_unix)
            .expect("legacy token should still verify");
        assert!(session_claims_match_context(&legacy_claims, &context));

        // Tampered primary claim user_id: signature stays valid but context
        // matching must reject the token.
        let tampered_token =
            sign_payload_with_test_secret(&legacy_payload_with_user_id("user-2", now_unix));
        let tampered_claims = verify_local_session_token(&key, &tampered_token, "auth", now_unix)
            .expect("tampered token signature should still verify");
        assert!(!session_claims_match_context(&tampered_claims, &context));
    }

    #[test]
    fn tenant_level_session_scope_is_the_sentinel_and_not_organization_membership() {
        // `iam_session.organization_id` is NOT NULL DEFAULT '0', so a tenant-level
        // row stores '0'. Projecting that as `Some("0")` must NOT make the
        // principal an organization member (API_SPEC 搂10.4, DATABASE_SPEC 搂6.10).
        let scope = resolve_context_organization_scope(Some("0"), &LoginScope::Tenant)
            .expect("tenant-level scope");
        assert_eq!("0", scope);
        assert!(sdkwork_iam_context_service::is_platform_organization_id(
            &scope
        ));
    }

    #[test]
    fn organization_scope_rejects_the_sentinel_and_contradictions() {
        // ORGANIZATION requires a positive non-zero organization id.
        assert_eq!(
            None,
            resolve_context_organization_scope(Some("0"), &LoginScope::Organization)
        );
        assert_eq!(
            None,
            resolve_context_organization_scope(None, &LoginScope::Organization)
        );
        // TENANT requires the sentinel; a non-zero organization contradicts it.
        assert_eq!(
            None,
            resolve_context_organization_scope(Some("100002"), &LoginScope::Tenant)
        );
        assert_eq!(
            Some("100002".to_owned()),
            resolve_context_organization_scope(Some("100002"), &LoginScope::Organization)
        );
    }

    #[test]
    fn token_claims_project_absent_organization_as_the_sentinel() {
        let claims = json!({
            "app_id": "sdkwork-cloudrouter",
            "auth_level": "password",
            "deployment_mode": "private",
            "environment": "prod",
            "login_scope": "TENANT",
            "session_id": "session-1",
            "tenant_id": "100001",
            "token_type": "access",
            "token_version": 1,
            "user_id": "user-1",
        });
        let context = iam_context_from_token_claims(&claims).expect("tenant-level claims");
        assert_eq!(Some("0".to_owned()), context.organization_id);
        assert_eq!("0", context.organization_scope());
        assert_eq!(LoginScope::Tenant, context.login_scope);
        assert!(!context.user_surface.organization_member);
    }

    #[test]
    fn token_claims_reject_organization_scope_contradictions() {
        let mut claims = json!({
            "app_id": "sdkwork-cloudrouter",
            "login_scope": "TENANT",
            "organization_id": "100002",
            "session_id": "session-1",
            "tenant_id": "100001",
            "token_type": "access",
            "user_id": "user-1",
        });
        assert!(iam_context_from_token_claims(&claims).is_none());
        claims["login_scope"] = json!("ORGANIZATION");
        claims["organization_id"] = json!("0");
        assert!(iam_context_from_token_claims(&claims).is_none());
    }

    #[test]
    fn dual_token_claims_match_after_organization_normalization() {
        // An absent `organization_id` and `"0"` are the same tenant-level scope;
        // comparing the raw claim strings rejected a legitimate pair.
        let auth = json!({
            "tenant_id": "100001",
            "user_id": "user-1",
            "session_id": "session-1",
            "app_id": "sdkwork-cloudrouter",
            "login_scope": "TENANT",
        });
        let access = json!({
            "tenant_id": "100001",
            "user_id": "user-1",
            "session_id": "session-1",
            "app_id": "sdkwork-cloudrouter",
            "login_scope": "TENANT",
            "organization_id": "0",
        });
        assert!(session_token_claims_match(&auth, &access));

        let mut mismatched = access.clone();
        mismatched["organization_id"] = json!("100002");
        assert!(!session_token_claims_match(&auth, &mismatched));
    }

    fn scoped_claims(scope: &str, organization_id: &str, login_scope: &str) -> Value {
        json!({
            "app_id": "deploy-app-7",
            "aud": "deploy-app-7",
            "login_scope": login_scope,
            "organization_id": organization_id,
            "ownership_scope": scope,
            "session_id": "session-1",
            "tenant_id": "100001",
            "token_type": "access",
            "token_version": 1,
            "user_id": "user-1",
        })
    }

    /// IAM_SPEC §5.2: the scope claim and the organization claim must agree, and
    /// an unknown scope value is a contradictory credential rather than a
    /// value to normalize.
    #[test]
    fn scope_claim_must_agree_with_the_organization_claim() {
        assert!(claims_ownership_scope_consistent(&scoped_claims(
            "TENANT", "0", "TENANT"
        )));
        assert!(claims_ownership_scope_consistent(&scoped_claims(
            "USER", "0", "TENANT"
        )));
        assert!(claims_ownership_scope_consistent(&scoped_claims(
            "ORGANIZATION",
            "42",
            "ORGANIZATION"
        )));
        // A tenant-released application keeps the login-context organization.
        assert!(claims_ownership_scope_consistent(&scoped_claims(
            "TENANT",
            "42",
            "ORGANIZATION"
        )));

        // Widening/narrowing contradictions.
        assert!(!claims_ownership_scope_consistent(&scoped_claims(
            "USER",
            "42",
            "ORGANIZATION"
        )));
        assert!(!claims_ownership_scope_consistent(&scoped_claims(
            "ORGANIZATION",
            "0",
            "TENANT"
        )));
        // Unknown level: rejected, never defaulted.
        assert!(!claims_ownership_scope_consistent(&scoped_claims(
            "GLOBAL", "0", "TENANT"
        )));
        // Legacy credential without the claim stays accepted.
        let mut legacy = scoped_claims("TENANT", "0", "TENANT");
        legacy
            .as_object_mut()
            .expect("object")
            .remove("ownership_scope");
        assert!(claims_ownership_scope_consistent(&legacy));
    }

    /// A `USER`-scoped session row demands the claim; the other levels accept a
    /// pre-existing credential without one, and every level rejects a claim that
    /// disagrees with the row.
    #[test]
    fn session_scope_matches_the_claims_row_and_the_personal_level_is_explicit() {
        let tenant = scoped_claims("TENANT", "0", "TENANT");
        assert!(session_scope_matches_claims(
            &tenant,
            ApplicationOwnershipScope::Tenant
        ));
        let mut legacy = tenant.clone();
        legacy
            .as_object_mut()
            .expect("object")
            .remove("ownership_scope");
        assert!(session_scope_matches_claims(
            &legacy,
            ApplicationOwnershipScope::Tenant
        ));
        assert!(
            !session_scope_matches_claims(&legacy, ApplicationOwnershipScope::User),
            "a personal session is only ever issued with the claim"
        );

        let personal = scoped_claims("USER", "0", "TENANT");
        assert!(session_scope_matches_claims(
            &personal,
            ApplicationOwnershipScope::User
        ));
        assert!(
            !session_scope_matches_claims(&personal, ApplicationOwnershipScope::Tenant),
            "a personal credential must not be accepted by a tenant-scoped row"
        );
    }

    /// Both halves of a dual-token pair are signed from the same installation, so
    /// a pair that disagrees about the release scope is not a valid pair.
    #[test]
    fn dual_token_pair_must_agree_on_the_release_scope() {
        let auth = scoped_claims("USER", "0", "TENANT");
        let mut access = auth.clone();
        assert!(session_token_claims_match(&auth, &access));

        access["ownership_scope"] = json!("TENANT");
        assert!(!session_token_claims_match(&auth, &access));

        // Legacy pair without the claim on either half: both derive the same
        // tenant level from the organization scope.
        let mut legacy_auth = auth.clone();
        legacy_auth
            .as_object_mut()
            .expect("object")
            .remove("ownership_scope");
        let mut legacy_access = legacy_auth.clone();
        legacy_access["organization_id"] = json!("0");
        assert!(session_token_claims_match(&legacy_auth, &legacy_access));
    }

    /// `APPLICATION_IDENTITY_SPEC.md` §4.1 rules 8 and 10: a personal release
    /// credentials exactly its owner, and the rule applies to both halves of a
    /// dual-token pair. Each credential's `user_id` claim must equal the subject
    /// the session row was issued for, so a pair naming any other subject is
    /// rejected before authorization.
    #[test]
    fn a_personal_dual_token_pair_must_name_the_installation_owner() {
        let context = IamAppContext::new(
            "100001".to_owned(),
            Some("0"),
            "900001".to_owned(),
            "session-1".to_owned(),
            "deploy-app-7".to_owned(),
            Environment::Prod,
            DeploymentMode::Private,
            AuthLevel::System,
            vec!["tenant:100001".to_owned(), "user:900001".to_owned()],
            Vec::new(),
        );
        let mut auth = scoped_claims("USER", "0", "TENANT");
        auth["user_id"] = json!("900001");
        let access = auth.clone();
        assert!(session_claims_match_context(&auth, &context));
        assert!(session_claims_match_context(&access, &context));

        let mut foreign = auth.clone();
        foreign["user_id"] = json!("900002");
        assert!(
            !session_claims_match_context(&foreign, &context),
            "a personal credential must name the installation owner"
        );
        assert!(
            !session_token_claims_match(&auth, &foreign),
            "both halves of the pair must name the same subject"
        );
    }

    /// `APP_ACCESS_TOKEN_SPEC.md` §5: the public application token is
    /// isolation-only input for the Access-Token channel, never a session
    /// credential. The auth/access dual-token path keeps proving a signed pair, so
    /// a public token — including a `USER`-scoped one bound to its owner — cannot
    /// authenticate there, and the owner binding added for `USER` releases is not
    /// a second way in.
    #[tokio::test]
    async fn a_public_application_token_is_not_a_dual_token_credential() {
        // A lazy pool that cannot connect: every session lookup fails, which is
        // exactly the "public token is not a signed session" outcome under test.
        // The acquire timeout keeps the failure immediate instead of waiting out
        // the default pool timeout.
        let pool = sqlx::postgres::PgPoolOptions::new()
            .acquire_timeout(std::time::Duration::from_millis(250))
            .connect_lazy("postgresql://sdkwork@127.0.0.1:1/sdkwork")
            .expect("lazy PostgreSQL pool");
        let header = json!({"alg": "none", "kid": "public-app-token", "typ": "JWT"});
        let payload = json!({
            "app_id": "sdkwork-cloudrouter",
            "aud": "sdkwork-cloudrouter",
            "deployment_mode": "private",
            "environment": "production",
            "exp": 0,
            "login_scope": "TENANT",
            "organization_id": "0",
            "ownership_scope": "USER",
            "session_id": "bootstrap-public-sdkwork-cloudrouter",
            "tenant_id": "100001",
            "token_class": "application",
            "token_type": "access",
            "user_id": "900001"
        });
        let token = format!(
            "{}.{}.public",
            encode_jwt_part(&header),
            encode_jwt_part(&payload)
        );

        assert!(
            resolve_iam_app_context_from_dual_tokens(&pool, &token, &token)
                .await
                .is_none(),
            "the dual-token channel must not accept a public application token"
        );
        assert!(
            resolve_iam_app_context_from_auth_token(&pool, &token)
                .await
                .is_none(),
            "the auth-token channel must not accept a public application token"
        );
    }
}
