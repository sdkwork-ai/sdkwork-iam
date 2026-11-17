//! Per-environment domain records and per-environment OAuth credentials of an
//! installation.
//!
//! An installation is one-to-one with a deploy application, but every lifecycle
//! environment of that application owns its own public domain and its own OAuth
//! client. Those two facts live in `iam_application_installation_environment`
//! and `iam_application_installation_credential` (migration 0039) rather than on
//! the installation row itself.
//!
//! Two concerns are implemented here:
//!
//! 1. **Management** (backend-api only): list / upsert / delete environments and
//!    list / create / rotate / revoke credentials. Credential secrets are stored
//!    as Argon2id PHC hashes only; the plaintext secret is materialized exactly
//!    once, in the create/rotate response, and can never be read back.
//! 2. **Runtime gate** used by token issuance and session creation: when an
//!    installation has at least one live environment row, the environment being
//!    signed must be registered with status `active`, otherwise issuance fails
//!    closed. An installation without environment rows keeps the historical
//!    platform-bootstrap behavior (`Ok`).
//!
//! Management failures use a small machine prefix protocol so HTTP handlers can
//! map them to the right status without parsing prose:
//! `conflict: ...` → 409, `not_found: ...` → 404, `invalid: ...` → 400.
//! Anything else is an infrastructure failure.

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand_core::{OsRng, RngCore};
use serde_json::{json, Value};
use sqlx::{types::Json as SqlJson, PgPool, Row};

use crate::is_blank;
use crate::oauth_relying_party_registration::{
    hash_oauth_client_secret, validate_oauth_client_id, validate_redirect_uri,
};

pub const INSTALLATION_ENVIRONMENT_STATUS_PENDING: &str = "pending";
pub const INSTALLATION_ENVIRONMENT_STATUS_ACTIVE: &str = "active";
pub const INSTALLATION_ENVIRONMENT_STATUS_DISABLED: &str = "disabled";

pub const INSTALLATION_CREDENTIAL_STATUS_ACTIVE: &str = "active";
pub const INSTALLATION_CREDENTIAL_STATUS_ROTATED: &str = "rotated";
pub const INSTALLATION_CREDENTIAL_STATUS_RETIRED: &str = "retired";

const CONFLICT_PREFIX: &str = "conflict: ";
const NOT_FOUND_PREFIX: &str = "not_found: ";
const INVALID_PREFIX: &str = "invalid: ";

const MAX_ENVIRONMENT_KEY_LEN: usize = 64;
const MAX_PRIMARY_DOMAIN_LEN: usize = 253;

/// HTTP classification of an installation lifecycle failure.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum InstallationLifecycleErrorKind {
    Conflict,
    NotFound,
    Invalid,
    Internal,
}

/// Classifies a [`installation_lifecycle`] error message for HTTP mapping.
pub fn classify_installation_lifecycle_error(message: &str) -> InstallationLifecycleErrorKind {
    if message.starts_with(CONFLICT_PREFIX) {
        InstallationLifecycleErrorKind::Conflict
    } else if message.starts_with(NOT_FOUND_PREFIX) {
        InstallationLifecycleErrorKind::NotFound
    } else if message.starts_with(INVALID_PREFIX) {
        InstallationLifecycleErrorKind::Invalid
    } else {
        InstallationLifecycleErrorKind::Internal
    }
}

/// Removes the machine prefix, leaving the operator-facing detail.
pub fn installation_lifecycle_error_detail(message: &str) -> &str {
    message
        .strip_prefix(CONFLICT_PREFIX)
        .or_else(|| message.strip_prefix(NOT_FOUND_PREFIX))
        .or_else(|| message.strip_prefix(INVALID_PREFIX))
        .unwrap_or(message)
}

fn conflict(message: impl Into<String>) -> String {
    format!("{CONFLICT_PREFIX}{}", message.into())
}

fn not_found(message: impl Into<String>) -> String {
    format!("{NOT_FOUND_PREFIX}{}", message.into())
}

fn invalid(message: impl Into<String>) -> String {
    format!("{INVALID_PREFIX}{}", message.into())
}

fn is_unique_violation(error: &sqlx::Error) -> bool {
    error
        .as_database_error()
        .and_then(|database_error| database_error.code())
        .is_some_and(|code| code == "23505")
}

fn unique_violation_constraint(error: &sqlx::Error) -> Option<&str> {
    error
        .as_database_error()
        .and_then(|database_error| database_error.constraint())
}

// ── Environment vocabulary ────────────────────────────────────────────────

/// Canonical spelling of an environment key.
///
/// `env_key` is authored by operators and may be spelled with common aliases
/// (`dev`, `prod`, ...). Registration and the runtime gate both compare the
/// canonical spelling, so an installation that registered `production` accepts a
/// token request whose environment resolves to `prod`.
pub fn canonical_environment_key(raw: &str) -> String {
    match raw.trim().to_ascii_lowercase().as_str() {
        "" => String::new(),
        "dev" | "development" | "local" => "development".to_owned(),
        "test" | "testing" => "test".to_owned(),
        "stage" | "staging" | "pre" | "preprod" | "pre-production" => "staging".to_owned(),
        "live" | "prod" | "production" => "production".to_owned(),
        other => other.to_owned(),
    }
}

/// Decides whether `requested_environment` may be used for `installation_id`.
///
/// `registered` is every live `(env_key, env_status)` row of the installation.
///
/// - No registered rows: compatibility path, the installation predates
///   environment-scoped registration and keeps the historical behavior.
/// - No matching row: fail closed and name the requested environment.
/// - Matching rows but none `active`: fail closed and name the blocked status.
pub fn decide_installation_environment_access(
    installation_id: &str,
    requested_environment: &str,
    registered: &[(String, String)],
) -> Result<(), String> {
    let requested = canonical_environment_key(requested_environment);
    if requested.is_empty() {
        return Err(
            "installation environment is required to issue a credential for this installation"
                .to_owned(),
        );
    }
    if registered.is_empty() {
        return Ok(());
    }

    let mut matching = registered
        .iter()
        .filter(|(env_key, _)| canonical_environment_key(env_key) == requested);
    let first = matching.next();
    let Some((_, first_status)) = first else {
        let known = registered
            .iter()
            .map(|(env_key, env_status)| format!("{env_key} ({env_status})"))
            .collect::<Vec<_>>()
            .join(", ");
        return Err(format!(
            "environment '{requested_environment}' is not registered for installation \
             {installation_id}; registered environments: {known}"
        ));
    };

    let mut statuses = vec![first_status.clone()];
    statuses.extend(matching.map(|(_, env_status)| env_status.clone()));
    if statuses
        .iter()
        .any(|status| status.eq_ignore_ascii_case(INSTALLATION_ENVIRONMENT_STATUS_ACTIVE))
    {
        return Ok(());
    }
    Err(format!(
        "environment '{requested_environment}' of installation {installation_id} is registered \
         but not active (status={}); activate it before issuing credentials",
        statuses.join(", ")
    ))
}

/// Loads the installation's live environment rows and applies the runtime gate.
///
/// A database failure is returned as an error: token issuance must fail closed
/// rather than silently skip the check.
pub async fn ensure_installation_environment_active(
    pg: &PgPool,
    tenant_id: &str,
    installation_id: &str,
    requested_environment: &str,
) -> Result<(), String> {
    let rows = sqlx::query(
        "SELECT env_key, env_status \
         FROM iam_application_installation_environment \
         WHERE tenant_id = $1 AND installation_id = $2 AND deleted_at IS NULL \
         ORDER BY env_key, id",
    )
    .bind(tenant_id)
    .bind(installation_id)
    .fetch_all(pg)
    .await
    .map_err(|error| format!("load installation environments failed: {error}"))?;

    let registered = rows
        .iter()
        .map(|row| (row.get::<String, _>(0), row.get::<String, _>(1)))
        .collect::<Vec<_>>();
    decide_installation_environment_access(installation_id, requested_environment, &registered)
}

/// Runtime gate for call sites that address the installation by deploy
/// application (session creation resolves the installation from the token's
/// deploy anchor).
pub async fn ensure_deploy_application_environment_active(
    pg: &PgPool,
    tenant_id: &str,
    deploy_application_id: &str,
    requested_environment: &str,
) -> Result<(), String> {
    if is_blank(Some(deploy_application_id)) {
        return Err("deploy application id is required".to_owned());
    }
    let rows = sqlx::query(
        "SELECT a.id, e.env_key, e.env_status \
         FROM iam_application_installation a \
         LEFT JOIN iam_application_installation_environment e \
           ON e.installation_id = a.id AND e.tenant_id = a.tenant_id AND e.deleted_at IS NULL \
         WHERE a.tenant_id = $1 AND a.deploy_application_id = $2 \
         ORDER BY a.id, e.env_key, e.id",
    )
    .bind(tenant_id)
    .bind(deploy_application_id.trim())
    .fetch_all(pg)
    .await
    .map_err(|error| format!("load installation environments failed: {error}"))?;

    let Some(first) = rows.first() else {
        return Err(format!(
            "deploy application {} is not bound to an installation of tenant {tenant_id}",
            deploy_application_id.trim()
        ));
    };
    let installation_id: String = first.get(0);
    let registered = rows
        .iter()
        .filter_map(|row| {
            let env_key: Option<String> = row.get(1);
            let env_status: Option<String> = row.get(2);
            env_key.zip(env_status)
        })
        .collect::<Vec<_>>();
    decide_installation_environment_access(&installation_id, requested_environment, &registered)
}

// ── Environment model and management ─────────────────────────────────────

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InstallationEnvironment {
    pub id: String,
    pub tenant_id: String,
    pub organization_id: String,
    pub installation_id: String,
    pub env_key: String,
    pub primary_domain: Option<String>,
    pub domain_config: Value,
    pub env_status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InstallationEnvironmentUpsertCommand {
    /// Environment key from the request body. A path-addressed upsert may omit
    /// it; the handler then supplies the path value.
    pub env_key: Option<String>,
    pub primary_domain: Option<String>,
    pub domain_config: Value,
    /// `pending` | `active` | `disabled`. An omitted value keeps the stored
    /// status on update and defaults to `pending` on insert.
    pub env_status: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InstallationEnvironmentPage {
    pub items: Vec<InstallationEnvironment>,
    pub total: i64,
}

pub fn installation_environment_to_json(environment: &InstallationEnvironment) -> Value {
    json!({
        "createdAt": environment.created_at,
        "domainConfig": environment.domain_config,
        "environmentId": environment.id,
        "environmentKey": environment.env_key,
        "installationId": environment.installation_id,
        "organizationId": environment.organization_id,
        "primaryDomain": environment.primary_domain,
        "status": environment.env_status,
        "tenantId": environment.tenant_id,
        "updatedAt": environment.updated_at,
    })
}

pub fn parse_installation_environment_upsert_command(
    body: &Value,
) -> Result<InstallationEnvironmentUpsertCommand, String> {
    let env_key = read_optional_string(
        body,
        &["environmentKey", "environment_key", "envKey", "env_key"],
    );
    let primary_domain = read_optional_string(body, &["primaryDomain", "primary_domain"]);
    let domain_config = body
        .get("domainConfig")
        .or_else(|| body.get("domain_config"))
        .cloned()
        .unwrap_or_else(|| json!({}));
    if !domain_config.is_object() {
        return Err(invalid("domainConfig must be an object"));
    }
    let env_status = read_optional_string(body, &["status", "envStatus", "env_status"]);
    Ok(InstallationEnvironmentUpsertCommand {
        env_key,
        primary_domain,
        domain_config,
        env_status,
    })
}

/// Normalizes and validates an `env_key`.
pub fn normalize_environment_key(raw: &str) -> Result<String, String> {
    let value = raw.trim().to_ascii_lowercase();
    if value.is_empty() {
        return Err(invalid("environmentKey is required"));
    }
    if value.chars().count() > MAX_ENVIRONMENT_KEY_LEN {
        return Err(invalid(format!(
            "environmentKey must be at most {MAX_ENVIRONMENT_KEY_LEN} characters"
        )));
    }
    if !value.chars().all(|character| {
        character.is_ascii_lowercase()
            || character.is_ascii_digit()
            || matches!(character, '-' | '_' | '.')
    }) {
        return Err(invalid(
            "environmentKey may only contain lowercase letters, digits, '-', '_', and '.'",
        ));
    }
    Ok(value)
}

fn normalize_primary_domain(raw: Option<&str>) -> Result<Option<String>, String> {
    let Some(raw) = raw else {
        return Ok(None);
    };
    let value = raw.trim();
    if value.is_empty() {
        // An absent domain is the multi-row case the unique index deliberately
        // allows; a blank string must not be stored as `''`.
        return Ok(None);
    }
    if value.chars().count() > MAX_PRIMARY_DOMAIN_LEN {
        return Err(invalid(format!(
            "primaryDomain must be at most {MAX_PRIMARY_DOMAIN_LEN} characters"
        )));
    }
    if value
        .chars()
        .any(|character| character.is_whitespace() || character.is_control())
    {
        return Err(invalid("primaryDomain must not contain whitespace"));
    }
    if value.contains('*') {
        return Err(invalid("primaryDomain must not contain a wildcard"));
    }
    Ok(Some(value.to_ascii_lowercase()))
}

fn normalize_environment_status(raw: Option<&str>) -> Result<Option<String>, String> {
    let Some(raw) = raw else {
        return Ok(None);
    };
    let value = raw.trim().to_ascii_lowercase();
    if value.is_empty() {
        return Ok(None);
    }
    match value.as_str() {
        INSTALLATION_ENVIRONMENT_STATUS_PENDING
        | INSTALLATION_ENVIRONMENT_STATUS_ACTIVE
        | INSTALLATION_ENVIRONMENT_STATUS_DISABLED => Ok(Some(value)),
        _ => Err(invalid(
            "status must be one of pending, active, or disabled",
        )),
    }
}

const ENVIRONMENT_COLUMNS: &str = "id, tenant_id, organization_id, installation_id, env_key, \
     primary_domain, domain_config_json, env_status, created_at::text, updated_at::text";

fn environment_from_row(row: &sqlx::postgres::PgRow) -> InstallationEnvironment {
    InstallationEnvironment {
        id: row.get(0),
        tenant_id: row.get(1),
        organization_id: row.get(2),
        installation_id: row.get(3),
        env_key: row.get(4),
        primary_domain: row.get(5),
        domain_config: row
            .try_get::<SqlJson<Value>, _>(6)
            .map(|value| value.0)
            .unwrap_or_else(|_| json!({})),
        env_status: row.get(7),
        created_at: row.get(8),
        updated_at: row.get(9),
    }
}

async fn load_installation_organization_id(
    pg: &PgPool,
    tenant_id: &str,
    installation_id: &str,
) -> Result<String, String> {
    sqlx::query_scalar(
        "SELECT organization_id FROM iam_application_installation \
         WHERE tenant_id = $1 AND id = $2 LIMIT 1",
    )
    .bind(tenant_id)
    .bind(installation_id)
    .fetch_optional(pg)
    .await
    .map_err(|error| format!("load installation failed: {error}"))?
    .ok_or_else(|| not_found("installation was not found"))
}

pub async fn list_installation_environments(
    pg: &PgPool,
    tenant_id: &str,
    installation_id: &str,
    limit: i64,
    offset: i64,
) -> Result<InstallationEnvironmentPage, String> {
    load_installation_organization_id(pg, tenant_id, installation_id).await?;
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {ENVIRONMENT_COLUMNS}, COUNT(*) OVER() AS __list_total \
         FROM iam_application_installation_environment \
         WHERE tenant_id = $1 AND installation_id = $2 AND deleted_at IS NULL \
         ORDER BY env_key, id LIMIT $3 OFFSET $4"
    )))
    .bind(tenant_id)
    .bind(installation_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pg)
    .await
    .map_err(|error| format!("list installation environments failed: {error}"))?;

    let total = rows
        .first()
        .map(|row| row.get::<i64, _>("__list_total"))
        .unwrap_or(0);
    Ok(InstallationEnvironmentPage {
        items: rows.iter().map(environment_from_row).collect(),
        total,
    })
}

/// Creates or reconciles one environment of an installation.
///
/// `(installation_id, env_key)` is unique among live rows, and
/// `(tenant_id, primary_domain)` is unique among live rows that carry a domain;
/// both conflicts are reported as `conflict: ...` with the conflicting fact
/// named. A blank primary domain stores `NULL`, which is the case the partial
/// index deliberately allows to repeat.
pub async fn upsert_installation_environment(
    pg: &PgPool,
    tenant_id: &str,
    installation_id: &str,
    command: &InstallationEnvironmentUpsertCommand,
) -> Result<InstallationEnvironment, String> {
    let env_key = normalize_environment_key(
        command
            .env_key
            .as_deref()
            .ok_or_else(|| invalid("environmentKey is required"))?,
    )?;
    let primary_domain = normalize_primary_domain(command.primary_domain.as_deref())?;
    let requested_status = normalize_environment_status(command.env_status.as_deref())?;
    let now = chrono::Utc::now();

    let mut transaction = pg
        .begin()
        .await
        .map_err(|error| format!("begin installation environment upsert failed: {error}"))?;
    let organization_id: String = sqlx::query_scalar(
        "SELECT organization_id FROM iam_application_installation \
         WHERE tenant_id = $1 AND id = $2 LIMIT 1",
    )
    .bind(tenant_id)
    .bind(installation_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| format!("load installation failed: {error}"))?
    .ok_or_else(|| not_found("installation was not found"))?;

    if let Some(domain) = primary_domain.as_deref() {
        let conflicting_key: Option<String> = sqlx::query_scalar(
            "SELECT env_key FROM iam_application_installation_environment \
             WHERE tenant_id = $1 AND primary_domain = $2 AND deleted_at IS NULL \
               AND NOT (installation_id = $3 AND env_key = $4) \
             LIMIT 1",
        )
        .bind(tenant_id)
        .bind(domain)
        .bind(installation_id)
        .bind(&env_key)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(|error| format!("check primary domain availability failed: {error}"))?;
        if let Some(conflicting_key) = conflicting_key {
            return Err(conflict(format!(
                "primaryDomain '{domain}' is already registered to environment '{conflicting_key}' \
                 of this tenant"
            )));
        }
    }

    let existing_id: Option<String> = sqlx::query_scalar(
        "SELECT id FROM iam_application_installation_environment \
         WHERE installation_id = $1 AND env_key = $2 AND deleted_at IS NULL LIMIT 1",
    )
    .bind(installation_id)
    .bind(&env_key)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| format!("load installation environment failed: {error}"))?;

    let environment_id = if let Some(environment_id) = existing_id {
        sqlx::query(
            "UPDATE iam_application_installation_environment \
             SET primary_domain = $2, domain_config_json = $3, env_status = COALESCE($4, env_status), \
                 updated_at = $5, version = version + 1 \
             WHERE id = $1",
        )
        .bind(&environment_id)
        .bind(primary_domain.as_deref())
        .bind(SqlJson(&command.domain_config))
        .bind(requested_status.as_deref())
        .bind(now)
        .execute(&mut *transaction)
        .await
        .map_err(map_environment_write_error)?;
        environment_id
    } else {
        let environment_id = generate_prefixed_id("iaenv");
        sqlx::query(
            "INSERT INTO iam_application_installation_environment \
             (id, tenant_id, organization_id, installation_id, env_key, primary_domain, \
              domain_config_json, env_status, created_at, updated_at, version) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, 0)",
        )
        .bind(&environment_id)
        .bind(tenant_id)
        .bind(&organization_id)
        .bind(installation_id)
        .bind(&env_key)
        .bind(primary_domain.as_deref())
        .bind(SqlJson(&command.domain_config))
        .bind(
            requested_status
                .as_deref()
                .unwrap_or(INSTALLATION_ENVIRONMENT_STATUS_PENDING),
        )
        .bind(now)
        .execute(&mut *transaction)
        .await
        .map_err(map_environment_write_error)?;
        environment_id
    };

    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {ENVIRONMENT_COLUMNS} FROM iam_application_installation_environment \
         WHERE id = $1"
    )))
    .bind(&environment_id)
    .fetch_one(&mut *transaction)
    .await
    .map_err(|error| format!("reload installation environment failed: {error}"))?;
    transaction
        .commit()
        .await
        .map_err(|error| format!("commit installation environment upsert failed: {error}"))?;
    Ok(environment_from_row(&row))
}

fn map_environment_write_error(error: sqlx::Error) -> String {
    if !is_unique_violation(&error) {
        return format!("write installation environment failed: {error}");
    }
    match unique_violation_constraint(&error) {
        Some(constraint) if constraint.contains("environment_key") => {
            conflict("environmentKey is already registered for this installation")
        }
        Some(constraint) if constraint.contains("environment_domain") => {
            conflict("primaryDomain is already registered to another environment of this tenant")
        }
        _ => conflict("installation environment conflicts with an existing row"),
    }
}

/// Soft-deletes an environment and retires every credential that belonged to it.
pub async fn delete_installation_environment(
    pg: &PgPool,
    tenant_id: &str,
    installation_id: &str,
    env_key: &str,
) -> Result<(), String> {
    let env_key = normalize_environment_key(env_key)?;
    let now = chrono::Utc::now();

    let mut transaction = pg
        .begin()
        .await
        .map_err(|error| format!("begin installation environment delete failed: {error}"))?;
    let environment_id: Option<String> = sqlx::query_scalar(
        "SELECT id FROM iam_application_installation_environment \
         WHERE tenant_id = $1 AND installation_id = $2 AND env_key = $3 AND deleted_at IS NULL \
         LIMIT 1 FOR UPDATE",
    )
    .bind(tenant_id)
    .bind(installation_id)
    .bind(&env_key)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| format!("load installation environment failed: {error}"))?;
    let Some(environment_id) = environment_id else {
        return Err(not_found("environment was not found"));
    };

    sqlx::query(
        "UPDATE iam_application_installation_credential \
         SET credential_status = $2, retired_at = COALESCE(retired_at, $3), updated_at = $3, \
             version = version + 1 \
         WHERE tenant_id = $1 AND installation_environment_id = $4 AND credential_status <> $2",
    )
    .bind(tenant_id)
    .bind(INSTALLATION_CREDENTIAL_STATUS_RETIRED)
    .bind(now)
    .bind(&environment_id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| format!("retire installation credentials failed: {error}"))?;

    sqlx::query(
        "UPDATE iam_application_installation_environment \
         SET deleted_at = $2, updated_at = $2, version = version + 1 WHERE id = $1",
    )
    .bind(&environment_id)
    .bind(now)
    .execute(&mut *transaction)
    .await
    .map_err(|error| format!("delete installation environment failed: {error}"))?;

    transaction
        .commit()
        .await
        .map_err(|error| format!("commit installation environment delete failed: {error}"))?;
    Ok(())
}

// ── Credential model and management ──────────────────────────────────────

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InstallationCredential {
    pub id: String,
    pub tenant_id: String,
    pub installation_environment_id: String,
    pub environment_key: String,
    pub client_id: String,
    pub redirect_uris: Vec<String>,
    pub granted_scopes: Vec<String>,
    pub credential_status: String,
    pub rotated_at: Option<String>,
    pub retired_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InstallationCredentialCreateCommand {
    pub environment_key: String,
    pub client_id: Option<String>,
    pub redirect_uris: Vec<String>,
    pub granted_scopes: Vec<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InstallationCredentialRotateCommand {
    /// Explicit replacement client id. Omitted generates a fresh one; an id that
    /// is already in use (by any credential of any tenant) is a conflict.
    pub client_id: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InstallationCredentialPage {
    pub items: Vec<InstallationCredential>,
    pub total: i64,
}

pub fn installation_credential_to_json(
    credential: &InstallationCredential,
    client_secret: Option<&str>,
) -> Value {
    let mut value = json!({
        "clientId": credential.client_id,
        "createdAt": credential.created_at,
        "credentialId": credential.id,
        "environmentKey": credential.environment_key,
        "grantedScopes": credential.granted_scopes,
        "installationEnvironmentId": credential.installation_environment_id,
        "redirectUris": credential.redirect_uris,
        "retiredAt": credential.retired_at,
        "rotatedAt": credential.rotated_at,
        "status": credential.credential_status,
        "tenantId": credential.tenant_id,
        "updatedAt": credential.updated_at,
    });
    if let Some(client_secret) = client_secret {
        // The plaintext secret is materialized exactly once, in the create and
        // rotate response. No read path selects `secret_hash`, so it can never be
        // echoed again.
        value["clientSecret"] = Value::String(client_secret.to_owned());
    }
    value
}

pub fn parse_installation_credential_create_command(
    body: &Value,
) -> Result<InstallationCredentialCreateCommand, String> {
    let environment_key = read_optional_string(
        body,
        &["environmentKey", "environment_key", "envKey", "env_key"],
    )
    .ok_or_else(|| invalid("environmentKey is required"))?;
    let client_id = read_optional_string(body, &["clientId", "client_id"]);
    let redirect_uris =
        read_string_array(body, &["redirectUris", "redirect_uris"]).unwrap_or_default();
    let granted_scopes =
        read_string_array(body, &["grantedScopes", "granted_scopes"]).unwrap_or_default();
    Ok(InstallationCredentialCreateCommand {
        environment_key,
        client_id,
        redirect_uris,
        granted_scopes,
    })
}

pub fn parse_installation_credential_rotate_command(
    body: &Value,
) -> Result<InstallationCredentialRotateCommand, String> {
    Ok(InstallationCredentialRotateCommand {
        client_id: read_optional_string(body, &["clientId", "client_id"]),
    })
}

const CREDENTIAL_COLUMNS: &str = "c.id, c.tenant_id, c.installation_environment_id, e.env_key, \
     c.client_id, c.redirect_uris_json, c.granted_scopes_json, c.credential_status, \
     c.rotated_at::text, c.retired_at::text, c.created_at::text, c.updated_at::text";

fn credential_from_row(row: &sqlx::postgres::PgRow) -> InstallationCredential {
    InstallationCredential {
        id: row.get(0),
        tenant_id: row.get(1),
        installation_environment_id: row.get(2),
        environment_key: row.get(3),
        client_id: row.get(4),
        redirect_uris: row
            .try_get::<SqlJson<Vec<String>>, _>(5)
            .map(|value| value.0)
            .unwrap_or_default(),
        granted_scopes: row
            .try_get::<SqlJson<Vec<String>>, _>(6)
            .map(|value| value.0)
            .unwrap_or_default(),
        credential_status: row.get(7),
        rotated_at: row.get(8),
        retired_at: row.get(9),
        created_at: row.get(10),
        updated_at: row.get(11),
    }
}

fn validate_redirect_uris(redirect_uris: &[String]) -> Result<Vec<String>, String> {
    redirect_uris
        .iter()
        .map(|redirect_uri| {
            let value = redirect_uri.trim();
            validate_redirect_uri(value).map_err(|error| invalid(error))?;
            Ok(value.to_owned())
        })
        .collect()
}

/// Resolves a live environment of the installation by key.
///
/// Exact key wins; common aliases (`prod`/`production`) also resolve as long as
/// they identify a single registered environment.
async fn resolve_environment_id(
    pg: &PgPool,
    tenant_id: &str,
    installation_id: &str,
    environment_key: &str,
) -> Result<String, String> {
    let rows = sqlx::query(
        "SELECT id, env_key FROM iam_application_installation_environment \
         WHERE tenant_id = $1 AND installation_id = $2 AND deleted_at IS NULL \
         ORDER BY env_key, id",
    )
    .bind(tenant_id)
    .bind(installation_id)
    .fetch_all(pg)
    .await
    .map_err(|error| format!("load installation environments failed: {error}"))?;
    if rows.is_empty() {
        return Err(not_found(
            "installation has no registered environment; register the environment before creating a credential",
        ));
    }
    let requested = environment_key.trim();
    if let Some(row) = rows
        .iter()
        .find(|row| row.get::<String, _>(1).eq_ignore_ascii_case(requested))
    {
        return Ok(row.get(0));
    }
    let canonical = canonical_environment_key(requested);
    let matches = rows
        .iter()
        .filter(|row| canonical_environment_key(&row.get::<String, _>(1)) == canonical)
        .collect::<Vec<_>>();
    match matches.as_slice() {
        [row] => Ok(row.get(0)),
        [] => Err(not_found(format!(
            "environment '{requested}' is not registered for this installation"
        ))),
        _ => Err(conflict(format!(
            "environment key '{requested}' is ambiguous for this installation; use the exact registered key"
        ))),
    }
}

pub async fn list_installation_credentials(
    pg: &PgPool,
    tenant_id: &str,
    installation_id: &str,
    limit: i64,
    offset: i64,
) -> Result<InstallationCredentialPage, String> {
    load_installation_organization_id(pg, tenant_id, installation_id).await?;
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {CREDENTIAL_COLUMNS}, COUNT(*) OVER() AS __list_total \
         FROM iam_application_installation_credential c \
         JOIN iam_application_installation_environment e \
           ON e.id = c.installation_environment_id AND e.tenant_id = c.tenant_id \
         WHERE c.tenant_id = $1 AND e.installation_id = $2 AND e.deleted_at IS NULL \
         ORDER BY c.created_at DESC, c.id LIMIT $3 OFFSET $4"
    )))
    .bind(tenant_id)
    .bind(installation_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pg)
    .await
    .map_err(|error| format!("list installation credentials failed: {error}"))?;

    let total = rows
        .first()
        .map(|row| row.get::<i64, _>("__list_total"))
        .unwrap_or(0);
    Ok(InstallationCredentialPage {
        items: rows.iter().map(credential_from_row).collect(),
        total,
    })
}

/// Creates the OAuth client of one environment.
///
/// The caller may supply `clientId` or let one be generated. The plaintext
/// secret is returned once and only its Argon2id PHC hash is persisted.
pub async fn create_installation_credential(
    pg: &PgPool,
    tenant_id: &str,
    installation_id: &str,
    command: &InstallationCredentialCreateCommand,
) -> Result<(InstallationCredential, String), String> {
    let environment_id =
        resolve_environment_id(pg, tenant_id, installation_id, &command.environment_key).await?;
    let client_id = match command.client_id.as_deref() {
        Some(client_id) => {
            let client_id = client_id.trim();
            validate_oauth_client_id(client_id).map_err(|error| invalid(error))?;
            client_id.to_owned()
        }
        None => generate_client_id(),
    };
    let redirect_uris = validate_redirect_uris(&command.redirect_uris)?;
    let granted_scopes = normalize_scopes(&command.granted_scopes);
    let secret = generate_client_secret();
    let secret_hash = hash_oauth_client_secret(&secret).map_err(|error| invalid(error))?;
    let credential_id = generate_prefixed_id("iacred");
    let now = chrono::Utc::now();

    let mut transaction = pg
        .begin()
        .await
        .map_err(|error| format!("begin installation credential create failed: {error}"))?;
    let claimed: Option<String> = sqlx::query_scalar(
        "SELECT id FROM iam_application_installation_credential WHERE client_id = $1 LIMIT 1",
    )
    .bind(&client_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| format!("check client id availability failed: {error}"))?;
    if claimed.is_some() {
        return Err(conflict(format!(
            "clientId '{client_id}' is already registered"
        )));
    }

    sqlx::query(
        "INSERT INTO iam_application_installation_credential \
         (id, tenant_id, installation_environment_id, client_id, secret_hash, \
          redirect_uris_json, granted_scopes_json, credential_status, created_at, updated_at, version) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, 0)",
    )
    .bind(&credential_id)
    .bind(tenant_id)
    .bind(&environment_id)
    .bind(&client_id)
    .bind(&secret_hash)
    .bind(SqlJson(&redirect_uris))
    .bind(SqlJson(&granted_scopes))
    .bind(INSTALLATION_CREDENTIAL_STATUS_ACTIVE)
    .bind(now)
    .execute(&mut *transaction)
    .await
    .map_err(map_credential_write_error)?;

    let row = load_credential_row(&mut transaction, &credential_id).await?;
    transaction
        .commit()
        .await
        .map_err(|error| format!("commit installation credential create failed: {error}"))?;
    Ok((credential_from_row(&row), secret))
}

/// Rotates the active credential of an environment.
///
/// The replacement row becomes `active` and carries a fresh client id and
/// secret. Because `client_id` is globally unique (including historical rows),
/// rotation necessarily issues a new client id rather than reusing the retired
/// one; the previous row is kept as `rotated` history. Callers must reconfigure
/// the environment with both the new `clientId` and `clientSecret`.
pub async fn rotate_installation_credential(
    pg: &PgPool,
    tenant_id: &str,
    installation_id: &str,
    credential_id: &str,
    command: &InstallationCredentialRotateCommand,
) -> Result<(InstallationCredential, String), String> {
    let mut transaction = pg
        .begin()
        .await
        .map_err(|error| format!("begin installation credential rotate failed: {error}"))?;
    let row = sqlx::query(
        "SELECT c.installation_environment_id, c.credential_status, c.redirect_uris_json, \
                c.granted_scopes_json \
         FROM iam_application_installation_credential c \
         JOIN iam_application_installation_environment e \
           ON e.id = c.installation_environment_id AND e.tenant_id = c.tenant_id \
         WHERE c.id = $1 AND c.tenant_id = $2 AND e.installation_id = $3 AND e.deleted_at IS NULL \
         LIMIT 1 FOR UPDATE OF c",
    )
    .bind(credential_id)
    .bind(tenant_id)
    .bind(installation_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| format!("load installation credential failed: {error}"))?;
    let Some(row) = row else {
        return Err(not_found("credential was not found"));
    };
    let environment_id: String = row.get(0);
    let current_status: String = row.get(1);
    if !current_status.eq_ignore_ascii_case(INSTALLATION_CREDENTIAL_STATUS_ACTIVE) {
        return Err(conflict(format!(
            "credential is not active (status={current_status}) and cannot be rotated"
        )));
    }
    let redirect_uris: Vec<String> = row
        .try_get::<SqlJson<Vec<String>>, _>(2)
        .map(|value| value.0)
        .unwrap_or_default();
    let granted_scopes: Vec<String> = row
        .try_get::<SqlJson<Vec<String>>, _>(3)
        .map(|value| value.0)
        .unwrap_or_default();

    let client_id = match command.client_id.as_deref() {
        Some(client_id) => {
            let client_id = client_id.trim();
            validate_oauth_client_id(client_id).map_err(|error| invalid(error))?;
            client_id.to_owned()
        }
        None => generate_client_id(),
    };
    let claimed: Option<String> = sqlx::query_scalar(
        "SELECT id FROM iam_application_installation_credential WHERE client_id = $1 LIMIT 1",
    )
    .bind(&client_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| format!("check client id availability failed: {error}"))?;
    if claimed.is_some() {
        return Err(conflict(format!(
            "clientId '{client_id}' is already registered"
        )));
    }

    let secret = generate_client_secret();
    let secret_hash = hash_oauth_client_secret(&secret).map_err(|error| invalid(error))?;
    let replacement_id = generate_prefixed_id("iacred");
    let now = chrono::Utc::now();

    sqlx::query(
        "UPDATE iam_application_installation_credential \
         SET credential_status = $2, rotated_at = $3, updated_at = $3, version = version + 1 \
         WHERE id = $1",
    )
    .bind(credential_id)
    .bind(INSTALLATION_CREDENTIAL_STATUS_ROTATED)
    .bind(now)
    .execute(&mut *transaction)
    .await
    .map_err(|error| format!("mark installation credential rotated failed: {error}"))?;

    sqlx::query(
        "INSERT INTO iam_application_installation_credential \
         (id, tenant_id, installation_environment_id, client_id, secret_hash, \
          redirect_uris_json, granted_scopes_json, credential_status, created_at, updated_at, version) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, 0)",
    )
    .bind(&replacement_id)
    .bind(tenant_id)
    .bind(&environment_id)
    .bind(&client_id)
    .bind(&secret_hash)
    .bind(SqlJson(&redirect_uris))
    .bind(SqlJson(&granted_scopes))
    .bind(INSTALLATION_CREDENTIAL_STATUS_ACTIVE)
    .bind(now)
    .execute(&mut *transaction)
    .await
    .map_err(map_credential_write_error)?;

    let row = load_credential_row(&mut transaction, &replacement_id).await?;
    transaction
        .commit()
        .await
        .map_err(|error| format!("commit installation credential rotate failed: {error}"))?;
    Ok((credential_from_row(&row), secret))
}

/// Revokes (retires) a credential. Revoking an already retired credential is a
/// no-op so retries stay idempotent.
pub async fn revoke_installation_credential(
    pg: &PgPool,
    tenant_id: &str,
    installation_id: &str,
    credential_id: &str,
) -> Result<InstallationCredential, String> {
    let mut transaction = pg
        .begin()
        .await
        .map_err(|error| format!("begin installation credential revoke failed: {error}"))?;
    let status: Option<String> = sqlx::query_scalar(
        "SELECT c.credential_status \
         FROM iam_application_installation_credential c \
         JOIN iam_application_installation_environment e \
           ON e.id = c.installation_environment_id AND e.tenant_id = c.tenant_id \
         WHERE c.id = $1 AND c.tenant_id = $2 AND e.installation_id = $3 AND e.deleted_at IS NULL \
         LIMIT 1 FOR UPDATE OF c",
    )
    .bind(credential_id)
    .bind(tenant_id)
    .bind(installation_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| format!("load installation credential failed: {error}"))?;
    let Some(status) = status else {
        return Err(not_found("credential was not found"));
    };
    if !status.eq_ignore_ascii_case(INSTALLATION_CREDENTIAL_STATUS_RETIRED) {
        let now = chrono::Utc::now();
        sqlx::query(
            "UPDATE iam_application_installation_credential \
             SET credential_status = $2, retired_at = $3, updated_at = $3, version = version + 1 \
             WHERE id = $1",
        )
        .bind(credential_id)
        .bind(INSTALLATION_CREDENTIAL_STATUS_RETIRED)
        .bind(now)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("revoke installation credential failed: {error}"))?;
    }

    let row = load_credential_row(&mut transaction, credential_id).await?;
    transaction
        .commit()
        .await
        .map_err(|error| format!("commit installation credential revoke failed: {error}"))?;
    Ok(credential_from_row(&row))
}

async fn load_credential_row(
    transaction: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    credential_id: &str,
) -> Result<sqlx::postgres::PgRow, String> {
    sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {CREDENTIAL_COLUMNS} \
         FROM iam_application_installation_credential c \
         JOIN iam_application_installation_environment e \
           ON e.id = c.installation_environment_id AND e.tenant_id = c.tenant_id \
         WHERE c.id = $1"
    )))
    .bind(credential_id)
    .fetch_one(&mut **transaction)
    .await
    .map_err(|error| format!("reload installation credential failed: {error}"))
}

fn map_credential_write_error(error: sqlx::Error) -> String {
    if !is_unique_violation(&error) {
        return format!("write installation credential failed: {error}");
    }
    match unique_violation_constraint(&error) {
        Some(constraint) if constraint.contains("client") => {
            conflict("clientId is already registered")
        }
        _ => conflict("installation credential conflicts with an existing row"),
    }
}

fn generate_prefixed_id(prefix: &str) -> String {
    format!("{prefix}_{}", uuid::Uuid::now_v7().simple())
}

fn generate_client_id() -> String {
    let mut bytes = [0u8; 12];
    OsRng.fill_bytes(&mut bytes);
    let mut value = String::from("iamc_");
    for byte in bytes {
        value.push_str(&format!("{byte:02x}"));
    }
    value
}

fn generate_client_secret() -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    format!("iacs_{}", URL_SAFE_NO_PAD.encode(bytes))
}

fn normalize_scopes(scopes: &[String]) -> Vec<String> {
    let mut normalized = scopes
        .iter()
        .map(|scope| scope.trim().to_owned())
        .filter(|scope| !scope.is_empty())
        .collect::<Vec<_>>();
    normalized.sort();
    normalized.dedup();
    normalized
}

fn read_optional_string(body: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        body.get(*key)
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !is_blank(Some(value)))
            .map(str::to_owned)
    })
}

fn read_string_array(body: &Value, keys: &[&str]) -> Option<Vec<String>> {
    keys.iter().find_map(|key| {
        body.get(*key).and_then(Value::as_array).map(|values| {
            values
                .iter()
                .filter_map(Value::as_str)
                .map(str::to_owned)
                .collect()
        })
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn registered(rows: &[(&str, &str)]) -> Vec<(String, String)> {
        rows.iter()
            .map(|(key, status)| ((*key).to_owned(), (*status).to_owned()))
            .collect()
    }

    #[test]
    fn canonical_environment_key_folds_common_aliases() {
        assert_eq!(canonical_environment_key(" DEV "), "development");
        assert_eq!(canonical_environment_key("production"), "production");
        assert_eq!(canonical_environment_key("prod"), "production");
        assert_eq!(canonical_environment_key("testing"), "test");
        assert_eq!(canonical_environment_key("staging"), "staging");
        assert_eq!(canonical_environment_key("qa"), "qa");
    }

    #[test]
    fn runtime_gate_allows_installations_without_environment_rows() {
        assert!(
            decide_installation_environment_access("tapp_1", "production", &[]).is_ok(),
            "an installation without environment rows keeps the platform-bootstrap path"
        );
    }

    #[test]
    fn runtime_gate_accepts_a_registered_active_alias() {
        let rows = registered(&[("prod", "active")]);
        assert!(decide_installation_environment_access("tapp_1", "production", &rows).is_ok());
    }

    #[test]
    fn runtime_gate_fails_closed_when_the_environment_is_not_registered() {
        let rows = registered(&[("staging", "active")]);
        let error = decide_installation_environment_access("tapp_1", "production", &rows)
            .expect_err("unregistered environment must fail closed");
        assert!(error.contains("not registered"), "{error}");
        assert!(error.contains("production"), "{error}");
        assert!(error.contains("staging (active)"), "{error}");
    }

    #[test]
    fn runtime_gate_fails_closed_when_the_environment_is_not_active() {
        for status in ["pending", "disabled"] {
            let rows = registered(&[("production", status)]);
            let error = decide_installation_environment_access("tapp_1", "prod", &rows)
                .expect_err("inactive environment must fail closed");
            assert!(error.contains("not active"), "{error}");
            assert!(error.contains(status), "{error}");
        }
    }

    #[test]
    fn runtime_gate_fails_closed_when_no_environment_is_requested() {
        let rows = registered(&[("production", "active")]);
        assert!(decide_installation_environment_access("tapp_1", "  ", &rows).is_err());
    }

    #[test]
    fn environment_key_validation_rejects_separators_and_uppercase_only_input() {
        assert_eq!(normalize_environment_key(" Prod-1 ").unwrap(), "prod-1");
        assert!(normalize_environment_key("  ").is_err());
        assert!(normalize_environment_key("prod us").is_err());
        assert!(normalize_environment_key("prod/us").is_err());
    }

    #[test]
    fn blank_primary_domain_is_the_repeatable_null_case() {
        assert_eq!(normalize_primary_domain(Some("  ")).unwrap(), None);
        assert_eq!(
            normalize_primary_domain(Some("App.Example.COM")).unwrap(),
            Some("app.example.com".to_owned())
        );
        assert!(normalize_primary_domain(Some("bad domain")).is_err());
        assert!(normalize_primary_domain(Some("*.example.com")).is_err());
    }

    #[test]
    fn generated_secret_is_never_stored_in_plaintext_shape() {
        let secret = generate_client_secret();
        assert!(secret.starts_with("iacs_"));
        let hash = hash_oauth_client_secret(&secret).expect("hash generated client secret");
        assert_ne!(hash, secret);
        assert!(!hash.contains(&secret));
        assert!(hash.starts_with("$argon2id$"), "{hash}");
    }

    #[test]
    fn credential_json_only_carries_the_secret_when_one_is_supplied() {
        let credential = InstallationCredential {
            id: "iacred_1".to_owned(),
            tenant_id: "0".to_owned(),
            installation_environment_id: "iaenv_1".to_owned(),
            environment_key: "production".to_owned(),
            client_id: "iamc_1".to_owned(),
            redirect_uris: vec!["https://app.example.com/callback".to_owned()],
            granted_scopes: vec!["openid".to_owned()],
            credential_status: INSTALLATION_CREDENTIAL_STATUS_ACTIVE.to_owned(),
            rotated_at: None,
            retired_at: None,
            created_at: "2026-01-01 00:00:00+00".to_owned(),
            updated_at: "2026-01-01 00:00:00+00".to_owned(),
        };
        let created = installation_credential_to_json(&credential, Some("iacs_once"));
        assert_eq!(created["clientSecret"], json!("iacs_once"));
        let listed = installation_credential_to_json(&credential, None);
        assert!(listed.get("clientSecret").is_none());
        // Hash material is not part of the public shape at all.
        assert!(listed.get("secretHash").is_none());
    }

    #[test]
    fn error_classification_maps_management_failures_to_http_statuses() {
        assert_eq!(
            classify_installation_lifecycle_error("conflict: env exists"),
            InstallationLifecycleErrorKind::Conflict
        );
        assert_eq!(
            classify_installation_lifecycle_error("not_found: missing"),
            InstallationLifecycleErrorKind::NotFound
        );
        assert_eq!(
            classify_installation_lifecycle_error("invalid: bad key"),
            InstallationLifecycleErrorKind::Invalid
        );
        assert_eq!(
            classify_installation_lifecycle_error("connection reset"),
            InstallationLifecycleErrorKind::Internal
        );
        assert_eq!(
            installation_lifecycle_error_detail("conflict: env exists"),
            "env exists"
        );
    }
}

/// Live PostgreSQL coverage for the installation environment/credential tables.
///
/// These tests need a migrated IAM schema and are therefore ignored by default.
/// Run them explicitly after `pnpm db:migrate`:
///
/// ```text
/// cargo test -p sdkwork-iam-web-adapter --lib -- --ignored installation_lifecycle
/// ```
#[cfg(test)]
mod postgres_tests {
    use super::*;

    const DEFAULT_DATABASE_URL: &str =
        "postgresql://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev";

    async fn connect_test_pool() -> PgPool {
        let database_url = std::env::var("SDKWORK_DATABASE_URL")
            .unwrap_or_else(|_| DEFAULT_DATABASE_URL.to_owned());
        sqlx::postgres::PgPoolOptions::new()
            .max_connections(2)
            .connect(&database_url)
            .await
            .expect("connect the live IAM database for installation lifecycle tests")
    }

    fn unique_suffix() -> String {
        uuid::Uuid::now_v7().simple().to_string()
    }

    async fn insert_installation(pg: &PgPool, tenant_id: &str, installation_id: &str) {
        let now = chrono::Utc::now();
        sqlx::query(
            "INSERT INTO iam_application_installation \
             (id, app_id, tenant_id, organization_id, instance_key, display_name, environment, \
              application_type, status, primary_domain, domain_config_json, \
              access_permissions_json, runtime_config_json, provisioned_at, activated_at, \
              created_at, updated_at, deploy_application_id) \
             VALUES ($1, $2, $3, '0', $4, $5, 'production', 'pc', 'enabled', NULL, \
                     '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, $6, $6, $6, $6, $7)",
        )
        .bind(installation_id)
        .bind(format!("app_{installation_id}"))
        .bind(tenant_id)
        .bind(installation_id)
        .bind(installation_id)
        .bind(now)
        .bind(format!("deploy_{installation_id}"))
        .execute(pg)
        .await
        .expect("insert installation fixture");
    }

    async fn cleanup_installation(pg: &PgPool, tenant_id: &str, installation_id: &str) {
        sqlx::query("DELETE FROM iam_application_installation WHERE tenant_id = $1 AND id = $2")
            .bind(tenant_id)
            .bind(installation_id)
            .execute(pg)
            .await
            .expect("delete installation fixture");
    }

    fn upsert_command(
        key: &str,
        domain: Option<&str>,
        status: &str,
    ) -> InstallationEnvironmentUpsertCommand {
        InstallationEnvironmentUpsertCommand {
            env_key: Some(key.to_owned()),
            primary_domain: domain.map(str::to_owned),
            domain_config: json!({ "tls": "managed" }),
            env_status: Some(status.to_owned()),
        }
    }

    #[tokio::test]
    #[ignore = "requires a local PostgreSQL database with the IAM schema migrated"]
    async fn postgres_environment_key_and_primary_domain_are_unique() {
        let pg = connect_test_pool().await;
        let suffix = unique_suffix();
        let tenant_id = format!("tenant_env_{suffix}");
        let installation_id = format!("tapp_env_{suffix}");
        let other_installation_id = format!("tapp_env_other_{suffix}");
        insert_installation(&pg, &tenant_id, &installation_id).await;
        insert_installation(&pg, &tenant_id, &other_installation_id).await;

        let domain = format!("app-{suffix}.example.com");
        upsert_installation_environment(
            &pg,
            &tenant_id,
            &installation_id,
            &upsert_command("production", Some(&domain), "active"),
        )
        .await
        .expect("register the production environment");

        // Upserting the same (installation, env_key) reconciles the row instead of
        // creating a duplicate.
        let updated = upsert_installation_environment(
            &pg,
            &tenant_id,
            &installation_id,
            &upsert_command("production", Some(&domain), "active"),
        )
        .await
        .expect("re-upsert the production environment");
        assert_eq!(updated.env_key, "production");

        // A second environment of the same tenant must not reuse the domain.
        let domain_error = upsert_installation_environment(
            &pg,
            &tenant_id,
            &installation_id,
            &upsert_command("staging", Some(&domain), "pending"),
        )
        .await
        .expect_err("a tenant-wide duplicate primary domain must conflict");
        assert_eq!(
            classify_installation_lifecycle_error(&domain_error),
            InstallationLifecycleErrorKind::Conflict,
            "{domain_error}"
        );
        assert!(domain_error.contains(&domain), "{domain_error}");

        // The same env_key on another installation is independent, and a blank
        // domain is the repeatable NULL case.
        upsert_installation_environment(
            &pg,
            &tenant_id,
            &other_installation_id,
            &upsert_command("production", None, "pending"),
        )
        .await
        .expect("another installation may register the same env key without a domain");

        let page = list_installation_environments(&pg, &tenant_id, &installation_id, 50, 0)
            .await
            .expect("list installation environments");
        assert_eq!(
            page.total, 1,
            "upsert must not duplicate the environment row"
        );

        delete_installation_environment(&pg, &tenant_id, &installation_id, "production")
            .await
            .expect("delete the production environment");
        let page = list_installation_environments(&pg, &tenant_id, &installation_id, 50, 0)
            .await
            .expect("list installation environments after delete");
        assert_eq!(page.total, 0, "delete is a soft delete");

        cleanup_installation(&pg, &tenant_id, &installation_id).await;
        cleanup_installation(&pg, &tenant_id, &other_installation_id).await;
    }

    #[tokio::test]
    #[ignore = "requires a local PostgreSQL database with the IAM schema migrated"]
    async fn postgres_credential_secret_is_returned_once_and_rotation_keeps_history() {
        let pg = connect_test_pool().await;
        let suffix = unique_suffix();
        let tenant_id = format!("tenant_cred_{suffix}");
        let installation_id = format!("tapp_cred_{suffix}");
        insert_installation(&pg, &tenant_id, &installation_id).await;
        upsert_installation_environment(
            &pg,
            &tenant_id,
            &installation_id,
            &upsert_command(
                "production",
                Some(&format!("cred-{suffix}.example.com")),
                "active",
            ),
        )
        .await
        .expect("register the environment");

        let (created, secret) = create_installation_credential(
            &pg,
            &tenant_id,
            &installation_id,
            &InstallationCredentialCreateCommand {
                environment_key: "production".to_owned(),
                client_id: None,
                redirect_uris: vec![format!("https://cred-{suffix}.example.com/callback")],
                granted_scopes: vec!["openid".to_owned(), "iam:self".to_owned()],
            },
        )
        .await
        .expect("create the installation credential");
        assert_eq!(created.credential_status, "active");
        assert!(created.client_id.starts_with("iamc_"));
        assert!(!secret.is_empty());

        let stored: String = sqlx::query_scalar(
            "SELECT secret_hash FROM iam_application_installation_credential WHERE id = $1",
        )
        .bind(&created.id)
        .fetch_one(&pg)
        .await
        .expect("read the stored secret hash");
        assert_ne!(stored, secret, "the plaintext secret must never be stored");
        assert!(!stored.contains(&secret));
        assert!(stored.starts_with("$argon2id$"), "{stored}");

        // Listing never selects or returns secret material.
        let page = list_installation_credentials(&pg, &tenant_id, &installation_id, 50, 0)
            .await
            .expect("list installation credentials");
        assert_eq!(page.total, 1);
        let listed = installation_credential_to_json(&page.items[0], None);
        assert!(listed.get("clientSecret").is_none());
        assert!(listed.get("secretHash").is_none());

        // Rotation activates a replacement row and keeps the previous one as
        // `rotated` history with a new client id.
        let (rotated, new_secret) = rotate_installation_credential(
            &pg,
            &tenant_id,
            &installation_id,
            &created.id,
            &InstallationCredentialRotateCommand { client_id: None },
        )
        .await
        .expect("rotate the installation credential");
        assert_eq!(rotated.credential_status, "active");
        assert_ne!(rotated.client_id, created.client_id);
        assert_ne!(new_secret, secret);

        let old_status: String = sqlx::query_scalar(
            "SELECT credential_status FROM iam_application_installation_credential WHERE id = $1",
        )
        .bind(&created.id)
        .fetch_one(&pg)
        .await
        .expect("read the rotated predecessor");
        assert_eq!(old_status, "rotated");

        let page = list_installation_credentials(&pg, &tenant_id, &installation_id, 50, 0)
            .await
            .expect("list installation credentials after rotation");
        assert_eq!(page.total, 2, "rotation keeps the predecessor as history");

        // A non-active credential cannot rotate again.
        let rotate_error = rotate_installation_credential(
            &pg,
            &tenant_id,
            &installation_id,
            &created.id,
            &InstallationCredentialRotateCommand { client_id: None },
        )
        .await
        .expect_err("a rotated credential must not rotate again");
        assert_eq!(
            classify_installation_lifecycle_error(&rotate_error),
            InstallationLifecycleErrorKind::Conflict,
            "{rotate_error}"
        );

        let revoked =
            revoke_installation_credential(&pg, &tenant_id, &installation_id, &rotated.id)
                .await
                .expect("revoke the active credential");
        assert_eq!(revoked.credential_status, "retired");
        assert!(revoked.retired_at.is_some());
        // Revoke is idempotent.
        revoke_installation_credential(&pg, &tenant_id, &installation_id, &rotated.id)
            .await
            .expect("revoke is idempotent");

        cleanup_installation(&pg, &tenant_id, &installation_id).await;
    }

    #[tokio::test]
    #[ignore = "requires a local PostgreSQL database with the IAM schema migrated"]
    async fn postgres_cross_tenant_access_and_duplicate_client_ids_are_rejected() {
        let pg = connect_test_pool().await;
        let suffix = unique_suffix();
        let tenant_id = format!("tenant_scope_{suffix}");
        let other_tenant_id = format!("tenant_scope_other_{suffix}");
        let installation_id = format!("tapp_scope_{suffix}");
        insert_installation(&pg, &tenant_id, &installation_id).await;
        upsert_installation_environment(
            &pg,
            &tenant_id,
            &installation_id,
            &upsert_command("production", None, "active"),
        )
        .await
        .expect("register the scoped environment");

        // Every management entry point scopes by tenant and must not reach the row
        // through another tenant.
        let list_error =
            list_installation_environments(&pg, &other_tenant_id, &installation_id, 50, 0)
                .await
                .expect_err("cross-tenant environment list must be rejected");
        assert_eq!(
            classify_installation_lifecycle_error(&list_error),
            InstallationLifecycleErrorKind::NotFound,
            "{list_error}"
        );
        let upsert_error = upsert_installation_environment(
            &pg,
            &other_tenant_id,
            &installation_id,
            &upsert_command("production", None, "active"),
        )
        .await
        .expect_err("cross-tenant environment upsert must be rejected");
        assert_eq!(
            classify_installation_lifecycle_error(&upsert_error),
            InstallationLifecycleErrorKind::NotFound,
            "{upsert_error}"
        );
        let delete_error =
            delete_installation_environment(&pg, &other_tenant_id, &installation_id, "production")
                .await
                .expect_err("cross-tenant environment delete must be rejected");
        assert_eq!(
            classify_installation_lifecycle_error(&delete_error),
            InstallationLifecycleErrorKind::NotFound,
            "{delete_error}"
        );
        let create_error = create_installation_credential(
            &pg,
            &other_tenant_id,
            &installation_id,
            &InstallationCredentialCreateCommand {
                environment_key: "production".to_owned(),
                client_id: None,
                redirect_uris: vec![],
                granted_scopes: vec![],
            },
        )
        .await
        .expect_err("cross-tenant credential create must be rejected");
        assert_eq!(
            classify_installation_lifecycle_error(&create_error),
            InstallationLifecycleErrorKind::NotFound,
            "{create_error}"
        );

        // A client id is globally unique across tenants.
        let client_id = format!("iamc_scope_{suffix}");
        let (created, _secret) = create_installation_credential(
            &pg,
            &tenant_id,
            &installation_id,
            &InstallationCredentialCreateCommand {
                environment_key: "prod".to_owned(),
                client_id: Some(client_id.clone()),
                redirect_uris: vec![],
                granted_scopes: vec![],
            },
        )
        .await
        .expect("create a credential with an explicit client id");
        assert_eq!(created.client_id, client_id);

        let duplicate_error = create_installation_credential(
            &pg,
            &tenant_id,
            &installation_id,
            &InstallationCredentialCreateCommand {
                environment_key: "production".to_owned(),
                client_id: Some(client_id),
                redirect_uris: vec![],
                granted_scopes: vec![],
            },
        )
        .await
        .expect_err("a duplicate client id must conflict globally");
        assert_eq!(
            classify_installation_lifecycle_error(&duplicate_error),
            InstallationLifecycleErrorKind::Conflict,
            "{duplicate_error}"
        );

        cleanup_installation(&pg, &tenant_id, &installation_id).await;
    }

    #[tokio::test]
    #[ignore = "requires a local PostgreSQL database with the IAM schema migrated"]
    async fn postgres_runtime_gate_fails_closed_and_keeps_the_compatibility_path() {
        let pg = connect_test_pool().await;
        let suffix = unique_suffix();
        let tenant_id = format!("tenant_gate_{suffix}");
        let gated_installation_id = format!("tapp_gate_{suffix}");
        let legacy_installation_id = format!("tapp_gate_legacy_{suffix}");
        insert_installation(&pg, &tenant_id, &gated_installation_id).await;

        // No environment rows: the platform-bootstrap compatibility path stays open.
        assert!(
            ensure_installation_environment_active(
                &pg,
                &tenant_id,
                &gated_installation_id,
                "production"
            )
            .await
            .is_ok(),
            "an installation without environment rows must keep the legacy path"
        );

        upsert_installation_environment(
            &pg,
            &tenant_id,
            &gated_installation_id,
            &upsert_command(
                "staging",
                Some(&format!("gate-{suffix}.example.com")),
                "pending",
            ),
        )
        .await
        .expect("register a pending staging environment");

        let pending_error = ensure_installation_environment_active(
            &pg,
            &tenant_id,
            &gated_installation_id,
            "staging",
        )
        .await
        .expect_err("a pending environment must fail closed");
        assert!(pending_error.contains("not active"), "{pending_error}");

        let missing_error = ensure_installation_environment_active(
            &pg,
            &tenant_id,
            &gated_installation_id,
            "production",
        )
        .await
        .expect_err("an unregistered environment must fail closed");
        assert!(missing_error.contains("not registered"), "{missing_error}");
        assert!(missing_error.contains("staging"), "{missing_error}");

        upsert_installation_environment(
            &pg,
            &tenant_id,
            &gated_installation_id,
            &upsert_command(
                "staging",
                Some(&format!("gate-{suffix}.example.com")),
                "active",
            ),
        )
        .await
        .expect("activate the staging environment");
        ensure_installation_environment_active(&pg, &tenant_id, &gated_installation_id, "staging")
            .await
            .expect("an active environment passes the gate");

        // The deploy-application lookup path applies the same decision.
        let deploy_application_id = format!("deploy_{gated_installation_id}");
        ensure_deploy_application_environment_active(
            &pg,
            &tenant_id,
            &deploy_application_id,
            "staging",
        )
        .await
        .expect("the deploy-application gate accepts the active environment");
        let deploy_error = ensure_deploy_application_environment_active(
            &pg,
            &tenant_id,
            &deploy_application_id,
            "production",
        )
        .await
        .expect_err("the deploy-application gate fails closed on an unregistered environment");
        assert!(deploy_error.contains("not registered"), "{deploy_error}");

        // A different installation of the same tenant keeps its own empty set.
        insert_installation(&pg, &tenant_id, &legacy_installation_id).await;
        ensure_installation_environment_active(
            &pg,
            &tenant_id,
            &legacy_installation_id,
            "production",
        )
        .await
        .expect("another installation without environments keeps the compatibility path");

        cleanup_installation(&pg, &tenant_id, &gated_installation_id).await;
        cleanup_installation(&pg, &tenant_id, &legacy_installation_id).await;
    }
}
