//! PostgreSQL persistence for provider accounts and their credentials.

use chrono::{DateTime, Utc};
use sqlx::{PgPool, Row};

use crate::envelope;
use crate::model::{
    normalize_capability_codes, normalize_environment_filter, validate_account_code,
    validate_choice, validate_credential_name, validate_display_name, validate_secret_payload,
    validate_vendor_code, AccountRequirement, AccountResolution, AccountVisibility,
    NewProviderAccount, NewProviderCredential, ProviderAccount, ProviderAccountError,
    ProviderAccountPatch, ProviderCredential, ProviderCredentialMaterial, ScopeCaller,
    ScopeCandidateCount, ACCOUNT_SCOPES, ACCOUNT_SCOPE_PLATFORM, ACCOUNT_SCOPE_USER,
    ACCOUNT_STATUSES, ACCOUNT_STATUS_ACTIVE, ACCOUNT_TYPES, CREDENTIAL_KINDS,
    CREDENTIAL_STATUS_ACTIVE, CREDENTIAL_STATUS_REVOKED, CREDENTIAL_STATUS_SUPERSEDED,
    ENVIRONMENTS, PLATFORM_TENANT_ID, SCOPE_PRECEDENCE,
};

const ACCOUNT_COLUMNS: &str = "a.id, a.uuid, a.tenant_id, a.organization_id, a.scope_type, \
     a.owner_user_id, a.vendor_code, \
     a.account_code, a.display_name, a.account_type, a.environment, a.external_account_id, \
     a.capability_codes, a.region_code, a.is_default, a.status, a.version, a.created_by, a.updated_by, \
     a.created_at, a.updated_at, \
     (SELECT COUNT(*) FROM iam_provider_credential c \
       WHERE c.provider_account_id = a.id AND c.status = 'active' AND c.deleted_at IS NULL) \
       AS active_credential_count, \
     (SELECT COUNT(*) FROM iam_provider_credential c \
       WHERE c.provider_account_id = a.id AND c.deleted_at IS NULL) AS credential_count";

const CREDENTIAL_COLUMNS: &str =
    "id, uuid, provider_account_id, credential_kind, credential_name, \
     masked_label, secret_fingerprint, secret_key_id, secret_algorithm, credential_version, \
     status, expires_at, last_rotated_at, last_verified_at, created_by, created_at, updated_at";

/// The one predicate that decides whether a caller may see or change a row.
///
/// The listing, the single read and every write all splice this in, so a rule
/// can never end up applying to one path and not the others. The placeholders
/// are positional and must stay in this order; any further parameter in a query
/// using this fragment starts at `$7`.
///
/// 1. `include_platform` — the caller may see platform-wide accounts
/// 2. caller tenant id
/// 3. `include_tenant_shared` — the caller may browse the tenant-wide defaults
/// 4. `include_organization_shared` — the caller may browse its own
///    organization's accounts
/// 5. caller organization id (nullable; an organization-scope row requires it)
/// 6. caller user id (nullable; a user-scope row requires it)
///
/// A write passes `true` for the three flags — the route layer has already
/// established that the caller holds the manage permission — and leans on 5 and
/// 6, which are what stop one member from changing another member's personal
/// account or a different organization's account.
const CALLER_VISIBILITY_PREDICATE: &str = "(\
    ($1::boolean AND a.scope_type = 'platform') \
    OR ( \
      a.tenant_id = $2 \
      AND ( \
        ($3::boolean AND a.scope_type = 'tenant' AND a.owner_user_id IS NULL) \
        OR ($4::boolean AND a.scope_type = 'organization' AND a.owner_user_id IS NULL \
            AND $5::text IS NOT NULL AND a.organization_id = $5) \
        OR (a.scope_type = 'user' AND $6::text IS NOT NULL AND a.owner_user_id = $6) \
      ) \
    ) \
  )";

/// The caller's organization as the predicate wants it: trimmed, with a blank
/// value treated as absent.
///
/// This and [`predicate_user`] exist so the four statements that bind the
/// predicate normalize a caller value the same way; a statement that trimmed
/// differently would silently widen or narrow visibility.
fn predicate_organization<'a, 'b>(caller: &'a ScopeCaller<'b>) -> Option<&'b str> {
    caller
        .organization_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

/// The caller's user id as the predicate wants it: trimmed, with a blank value
/// treated as absent.
fn predicate_user<'a, 'b>(caller: &'a ScopeCaller<'b>) -> Option<&'b str> {
    caller
        .user_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn timestamp_to_string(value: DateTime<Utc>) -> String {
    value.to_rfc3339()
}

fn optional_timestamp_to_string(value: Option<DateTime<Utc>>) -> Option<String> {
    value.map(timestamp_to_string)
}

fn unavailable(action: &str, error: sqlx::Error) -> ProviderAccountError {
    ProviderAccountError::Unavailable(format!("{action} failed: {error}"))
}

fn map_write_error(action: &str, error: sqlx::Error) -> ProviderAccountError {
    if let sqlx::Error::Database(database_error) = &error {
        if let Some(constraint) = database_error.constraint() {
            if constraint.contains("ux_iam_provider_account_shared_code")
                || constraint.contains("ux_iam_provider_account_owned_code")
            {
                return ProviderAccountError::Conflict(
                    "an account with this accountCode already exists in this scope".to_owned(),
                );
            }
            if constraint.contains("ux_iam_provider_account_shared_default")
                || constraint.contains("ux_iam_provider_account_owned_default")
            {
                return ProviderAccountError::Conflict(
                    "another account is already the default for this vendor and environment"
                        .to_owned(),
                );
            }
            if constraint.contains("ux_iam_provider_credential_active") {
                return ProviderAccountError::Conflict(
                    "an active credential already exists for this credential slot".to_owned(),
                );
            }
        }
    }
    unavailable(action, error)
}

fn parse_capability_codes(raw: &str) -> Vec<String> {
    serde_json::from_str::<Vec<String>>(raw).unwrap_or_default()
}

fn account_from_row(row: &sqlx::postgres::PgRow) -> Result<ProviderAccount, ProviderAccountError> {
    let capability_raw: String = row
        .try_get("capability_codes")
        .map_err(|error| unavailable("read provider account capability codes", error))?;
    let active_credential_count: i64 = row
        .try_get("active_credential_count")
        .map_err(|error| unavailable("read provider account credential count", error))?;
    let credential_count: i64 = row
        .try_get("credential_count")
        .map_err(|error| unavailable("read provider account credential count", error))?;
    Ok(ProviderAccount {
        id: row
            .try_get("id")
            .map_err(|e| unavailable("read provider account", e))?,
        uuid: row
            .try_get("uuid")
            .map_err(|e| unavailable("read provider account", e))?,
        tenant_id: row
            .try_get("tenant_id")
            .map_err(|e| unavailable("read provider account", e))?,
        organization_id: row
            .try_get("organization_id")
            .map_err(|e| unavailable("read provider account", e))?,
        scope_type: row
            .try_get("scope_type")
            .map_err(|e| unavailable("read provider account", e))?,
        owner_user_id: row
            .try_get("owner_user_id")
            .map_err(|e| unavailable("read provider account", e))?,
        vendor_code: row
            .try_get("vendor_code")
            .map_err(|e| unavailable("read provider account", e))?,
        account_code: row
            .try_get("account_code")
            .map_err(|e| unavailable("read provider account", e))?,
        display_name: row
            .try_get("display_name")
            .map_err(|e| unavailable("read provider account", e))?,
        account_type: row
            .try_get("account_type")
            .map_err(|e| unavailable("read provider account", e))?,
        environment: row
            .try_get("environment")
            .map_err(|e| unavailable("read provider account", e))?,
        external_account_id: row
            .try_get("external_account_id")
            .map_err(|e| unavailable("read provider account", e))?,
        capability_codes: parse_capability_codes(&capability_raw),
        region_code: row
            .try_get("region_code")
            .map_err(|e| unavailable("read provider account", e))?,
        is_default: row
            .try_get("is_default")
            .map_err(|e| unavailable("read provider account", e))?,
        status: row
            .try_get("status")
            .map_err(|e| unavailable("read provider account", e))?,
        version: row
            .try_get("version")
            .map_err(|e| unavailable("read provider account", e))?,
        created_by: row
            .try_get("created_by")
            .map_err(|e| unavailable("read provider account", e))?,
        updated_by: row
            .try_get("updated_by")
            .map_err(|e| unavailable("read provider account", e))?,
        created_at: timestamp_to_string(
            row.try_get("created_at")
                .map_err(|e| unavailable("read provider account", e))?,
        ),
        updated_at: timestamp_to_string(
            row.try_get("updated_at")
                .map_err(|e| unavailable("read provider account", e))?,
        ),
        credential_configured: active_credential_count > 0,
        credential_count,
    })
}

fn credential_from_row(
    row: &sqlx::postgres::PgRow,
) -> Result<ProviderCredential, ProviderAccountError> {
    Ok(ProviderCredential {
        id: row
            .try_get("id")
            .map_err(|e| unavailable("read provider credential", e))?,
        uuid: row
            .try_get("uuid")
            .map_err(|e| unavailable("read provider credential", e))?,
        provider_account_id: row
            .try_get("provider_account_id")
            .map_err(|e| unavailable("read provider credential", e))?,
        credential_kind: row
            .try_get("credential_kind")
            .map_err(|e| unavailable("read provider credential", e))?,
        credential_name: row
            .try_get("credential_name")
            .map_err(|e| unavailable("read provider credential", e))?,
        masked_label: row
            .try_get("masked_label")
            .map_err(|e| unavailable("read provider credential", e))?,
        secret_fingerprint: row
            .try_get("secret_fingerprint")
            .map_err(|e| unavailable("read provider credential", e))?,
        secret_key_id: row
            .try_get("secret_key_id")
            .map_err(|e| unavailable("read provider credential", e))?,
        secret_algorithm: row
            .try_get("secret_algorithm")
            .map_err(|e| unavailable("read provider credential", e))?,
        credential_version: row
            .try_get("credential_version")
            .map_err(|e| unavailable("read provider credential", e))?,
        status: row
            .try_get("status")
            .map_err(|e| unavailable("read provider credential", e))?,
        expires_at: optional_timestamp_to_string(
            row.try_get("expires_at")
                .map_err(|e| unavailable("read provider credential", e))?,
        ),
        last_rotated_at: optional_timestamp_to_string(
            row.try_get("last_rotated_at")
                .map_err(|e| unavailable("read provider credential", e))?,
        ),
        last_verified_at: optional_timestamp_to_string(
            row.try_get("last_verified_at")
                .map_err(|e| unavailable("read provider credential", e))?,
        ),
        created_by: row
            .try_get("created_by")
            .map_err(|e| unavailable("read provider credential", e))?,
        created_at: timestamp_to_string(
            row.try_get("created_at")
                .map_err(|e| unavailable("read provider credential", e))?,
        ),
        updated_at: timestamp_to_string(
            row.try_get("updated_at")
                .map_err(|e| unavailable("read provider credential", e))?,
        ),
    })
}

/// Create a reusable cloud account.
///
/// `scope_type` decides how widely the account is resolvable: `user` accounts
/// are private to their owner, `organization` accounts belong to one
/// organization inside the tenant, `tenant` accounts become the tenant-wide
/// default, and `platform` accounts are shared with every tenant.
///
/// The scope rules live in [`crate::model::resolve_account_scope`] and are
/// applied here rather than at the route layer on purpose: consumers such as
/// Drive and Deploy call this function in-process, so a rule that only lived in
/// an HTTP handler would simply not exist for them.
///
/// `caller` is who is asking — the same value the read and write paths take. It
/// is what decides whether a shared scope may be used at all
/// (`may_manage_shared`) and which organization an `organization`-scope row is
/// pinned to.
pub async fn create_account(
    pg: &PgPool,
    new: &NewProviderAccount,
    caller: &ScopeCaller<'_>,
) -> Result<ProviderAccount, ProviderAccountError> {
    let vendor_code = validate_vendor_code(&new.vendor_code)?;
    let account_code = validate_account_code(&new.account_code)?;
    let display_name = validate_display_name(&new.display_name)?;
    let account_type = validate_choice("accountType", &new.account_type, ACCOUNT_TYPES)?;
    let environment = validate_choice("environment", &new.environment, ENVIRONMENTS)?;
    let capability_codes = normalize_capability_codes(&new.capability_codes);
    // The organization the request acts inside, if any. It serves two roles at
    // once — what the caller states about itself, and the value an
    // organization-scope row is pinned to — so the two can never disagree.
    let requested_organization = {
        let trimmed = new.organization_id.trim();
        (!trimmed.is_empty()).then_some(trimmed)
    };

    let id = format!("iampacct-{}", uuid::Uuid::now_v7());
    let vendor_value = vendor_code.clone();
    let account_code_value = account_code.clone();
    let display_name_value = display_name.clone();
    let actor = new.actor_id.trim().to_owned();
    // A platform-scope account is not owned by the caller's tenant: it lives
    // with the platform tenant so that every tenant can resolve it.
    let requested_tenant = new.tenant_id.trim().to_owned();
    let tenant = match new.scope_type.trim().to_ascii_lowercase().as_str() {
        "platform" => PLATFORM_TENANT_ID.to_owned(),
        _ => requested_tenant.clone(),
    };
    let external = new
        .external_account_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned);
    let region = new
        .region_code
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned);
    let capability_json = serde_json::to_string(&capability_codes).map_err(|error| {
        ProviderAccountError::Validation(format!("capabilityCodes invalid: {error}"))
    })?;

    let crate::model::ResolvedScope {
        scope_type,
        owner_user_id,
        organization_id,
    } = crate::model::resolve_account_scope(
        Some(new.scope_type.as_str()),
        new.owner_user_id.as_deref(),
        caller,
        requested_organization,
    )?;
    let is_default = new.is_default;

    let mut transaction = pg
        .begin()
        .await
        .map_err(|error| unavailable("create provider account", error))?;

    if new.is_default {
        clear_default_in_scope(
            &mut transaction,
            &scope_type,
            &tenant,
            &organization_id,
            owner_user_id.as_deref(),
            &vendor_value,
            &environment,
            None,
        )
        .await?;
    }

    sqlx::query(
        "INSERT INTO iam_provider_account (
            id, uuid, tenant_id, organization_id, scope_type, owner_user_id, vendor_code,
            account_code, display_name, account_type, environment, external_account_id,
            capability_codes, region_code, is_default, status, version, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'active', 1, \
            $16, $16)",
    )
    .bind(&id)
    .bind(uuid::Uuid::now_v7().to_string())
    .bind(&tenant)
    .bind(&organization_id)
    .bind(&scope_type)
    .bind(&owner_user_id)
    .bind(&vendor_value)
    .bind(&account_code_value)
    .bind(&display_name_value)
    .bind(&account_type)
    .bind(&environment)
    .bind(&external)
    .bind(&capability_json)
    .bind(&region)
    .bind(is_default)
    .bind(&actor)
    .execute(&mut *transaction)
    .await
    .map_err(|error| map_write_error("create provider account", error))?;

    transaction
        .commit()
        .await
        .map_err(|error| unavailable("create provider account", error))?;

    find_account(pg, &tenant, &id).await?.ok_or_else(|| {
        ProviderAccountError::Unavailable("created provider account not readable".to_owned())
    })
}

/// Demote whatever is currently the default in a scope so a new default can be
/// promoted without tripping the partial unique index.
#[allow(clippy::too_many_arguments)]
async fn clear_default_in_scope(
    transaction: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    scope_type: &str,
    tenant_id: &str,
    organization_id: &str,
    owner_user_id: Option<&str>,
    vendor_code: &str,
    environment: &str,
    keep_account_id: Option<&str>,
) -> Result<(), ProviderAccountError> {
    sqlx::query(
        "UPDATE iam_provider_account SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP \
         WHERE scope_type = $1 AND tenant_id = $2 AND organization_id = $3 \
           AND vendor_code = $4 AND environment = $5 AND is_default AND deleted_at IS NULL \
           AND ($6::text IS NULL AND owner_user_id IS NULL OR owner_user_id = $6) \
           AND ($7::text IS NULL OR id <> $7)",
    )
    .bind(scope_type)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(vendor_code)
    .bind(environment)
    .bind(owner_user_id)
    .bind(keep_account_id)
    .execute(&mut **transaction)
    .await
    .map_err(|error| unavailable("clear previous default provider account", error))?;
    Ok(())
}

/// List the accounts a caller may act on.
///
/// Visibility is a scope walk, and two of the four levels are gated on their own
/// flag because browsing a shared account is a different right from resolving
/// through one:
///
/// * `user` — the caller's own personal accounts, always included when the
///   caller has an identity.
/// * `organization` — accounts kept by the caller's own organization, only when
///   `visibility.include_organization_shared` is set and the caller names an
///   organization.
/// * `tenant` — the tenant-wide defaults, only when
///   `visibility.include_tenant_shared` is set. An ordinary member resolves
///   through these but does not browse them.
/// * `platform` — only when `visibility.include_platform` is set (the console
///   hides platform credentials from ordinary tenant listings).
///
/// `organization_id` on the function is a *filter* over the result — "show me
/// only the accounts that belong to this organization" — and is unrelated to the
/// caller's own organization, which travels inside `visibility`.
pub async fn list_accounts(
    pg: &PgPool,
    visibility: &AccountVisibility,
    organization_id: Option<&str>,
    vendor_code: Option<&str>,
    status: Option<&str>,
    search: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<(Vec<ProviderAccount>, i64), ProviderAccountError> {
    let organization = organization_id
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let vendor = vendor_code
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_ascii_lowercase);
    let status_filter = status
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_ascii_lowercase);
    let scope_filter = visibility
        .scope_type
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_ascii_lowercase);
    if let Some(candidate) = scope_filter.as_deref() {
        if !ACCOUNT_SCOPES.contains(&candidate) {
            return Err(ProviderAccountError::Validation(format!(
                "scopeType must be one of {}",
                ACCOUNT_SCOPES.join(", ")
            )));
        }
    }
    let owner_filter = visibility
        .owner_user_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let caller_organization = visibility
        .organization_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let pattern = search
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| format!("%{}%", value.to_ascii_lowercase()));

    let sql = format!(
        "SELECT {ACCOUNT_COLUMNS}, COUNT(*) OVER() AS total_count \
         FROM iam_provider_account a \
         WHERE a.deleted_at IS NULL \
           AND {CALLER_VISIBILITY_PREDICATE} \
           AND ($7::text IS NULL OR a.scope_type = $7) \
           AND ($8::text IS NULL OR a.owner_user_id = $8) \
           AND ($9::text IS NULL OR a.organization_id = $9) \
           AND ($10::text IS NULL OR a.vendor_code = $10) \
           AND ($11::text IS NULL OR a.status = $11) \
           AND ($12::text IS NULL OR LOWER(a.display_name) LIKE $12 \
                OR LOWER(a.account_code) LIKE $12 OR LOWER(a.vendor_code) LIKE $12) \
         ORDER BY CASE a.scope_type WHEN 'user' THEN 0 WHEN 'organization' THEN 1 \
                                    WHEN 'tenant' THEN 2 ELSE 3 END, \
                  a.vendor_code, a.is_default DESC, a.account_code \
         LIMIT $13 OFFSET $14"
    );

    let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(visibility.include_platform)
        .bind(visibility.tenant_id.trim())
        .bind(visibility.include_tenant_shared)
        .bind(visibility.include_organization_shared)
        .bind(caller_organization)
        .bind(visibility.user_id.as_deref())
        .bind(&scope_filter)
        .bind(owner_filter)
        .bind(&organization)
        .bind(&vendor)
        .bind(&status_filter)
        .bind(&pattern)
        .bind(limit)
        .bind(offset)
        .fetch_all(pg)
        .await
        .map_err(|error| unavailable("list provider accounts", error))?;

    let total = rows
        .first()
        .map(|row| row.try_get::<i64, _>("total_count").unwrap_or(0))
        .unwrap_or(0);
    let mut accounts = Vec::with_capacity(rows.len());
    for row in &rows {
        accounts.push(account_from_row(row)?);
    }
    Ok((accounts, total))
}

/// Load one account inside a tenant scope, **without** applying caller
/// visibility.
///
/// This is the system-internal lookup: the pinned-reference path
/// ([`load_bound_account`]) and the read that follows a successful write both use
/// it, because in both cases the caller's right to the row is already settled.
/// Anything a caller reaches by id from a console must go through
/// [`find_account_for_caller`] instead, or knowing an id is enough to read
/// another member's personal account.
pub async fn find_account(
    pg: &PgPool,
    tenant_id: &str,
    account_id: &str,
) -> Result<Option<ProviderAccount>, ProviderAccountError> {
    let sql = format!(
        "SELECT {ACCOUNT_COLUMNS} FROM iam_provider_account a \
         WHERE a.tenant_id = $1 AND a.id = $2 AND a.deleted_at IS NULL"
    );
    let row = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(tenant_id)
        .bind(account_id)
        .fetch_optional(pg)
        .await
        .map_err(|error| unavailable("read provider account", error))?;
    match row {
        Some(row) => Ok(Some(account_from_row(&row)?)),
        None => Ok(None),
    }
}

/// Load one account on behalf of a caller, applying the same visibility the
/// listing applies.
///
/// The single read is where a scope walk is easiest to forget: the listing looks
/// right, and then a caller who guesses or keeps an id reads a row the listing
/// would never have shown them — a personal account belonging to somebody else,
/// or one kept by an organization they are not in.
pub async fn find_account_for_caller(
    pg: &PgPool,
    account_id: &str,
    visibility: &AccountVisibility,
) -> Result<Option<ProviderAccount>, ProviderAccountError> {
    let caller_organization = visibility
        .organization_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let sql = format!(
        "SELECT {ACCOUNT_COLUMNS} FROM iam_provider_account a \
         WHERE a.deleted_at IS NULL AND {CALLER_VISIBILITY_PREDICATE} AND a.id = $7"
    );
    let row = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(visibility.include_platform)
        .bind(visibility.tenant_id.trim())
        .bind(visibility.include_tenant_shared)
        .bind(visibility.include_organization_shared)
        .bind(caller_organization)
        .bind(visibility.user_id.as_deref())
        .bind(account_id)
        .fetch_optional(pg)
        .await
        .map_err(|error| unavailable("read provider account", error))?;
    match row {
        Some(row) => Ok(Some(account_from_row(&row)?)),
        None => Ok(None),
    }
}

/// Visibility rule for a consumer that already pinned an account by id.
///
/// A pinned reference (drive stores `provider_account_id` per storage provider)
/// is an explicit choice made when the resource was configured, so re-running the
/// `user -> organization -> tenant -> platform` walk at use time would be wrong:
/// the pinned account is often *wider* than the caller's own scope, and a storage
/// provider deliberately bound to a platform-scope account has to keep working
/// from inside an ordinary tenant.
///
/// The account is readable when it is platform-wide, when it belongs to the
/// caller's tenant, or when it is a personal account owned by the caller. An
/// organization-scope account falls into the tenant-wide branch on purpose:
/// whoever configured the resource picked that account for it, and the resource's
/// audience — not the caller's own organization — is what decides who then
/// reaches the credential through it.
pub fn account_is_visible_to(
    account: &ProviderAccount,
    caller_tenant_id: &str,
    caller_user_id: Option<&str>,
) -> bool {
    let caller_tenant_id = caller_tenant_id.trim();
    match account.scope_type.as_str() {
        ACCOUNT_SCOPE_PLATFORM => true,
        ACCOUNT_SCOPE_USER => {
            let caller = caller_user_id
                .map(str::trim)
                .filter(|value| !value.is_empty());
            account.tenant_id == caller_tenant_id
                && matches!(
                    (account.owner_user_id.as_deref(), caller),
                    (Some(owner), Some(caller)) if owner == caller
                )
        }
        _ => account.tenant_id == caller_tenant_id,
    }
}

/// Load an account that a consumer pinned by id, enforcing
/// [`account_is_visible_to`].
///
/// An out-of-scope id answers `NotFound` rather than `PermissionDenied` so the
/// endpoint cannot be used to probe which account ids exist.
pub async fn load_bound_account(
    pg: &PgPool,
    tenant_id: &str,
    user_id: Option<&str>,
    account_id: &str,
) -> Result<ProviderAccount, ProviderAccountError> {
    let account_id = account_id.trim();
    if account_id.is_empty() {
        return Err(ProviderAccountError::Validation(
            "provider account id must not be empty".to_owned(),
        ));
    }
    let sql = format!(
        "SELECT {ACCOUNT_COLUMNS} FROM iam_provider_account a \
         WHERE a.id = $1 AND a.deleted_at IS NULL"
    );
    let row = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(account_id)
        .fetch_optional(pg)
        .await
        .map_err(|error| unavailable("read bound provider account", error))?;
    let Some(row) = row else {
        return Err(ProviderAccountError::NotFound(
            "provider account not found".to_owned(),
        ));
    };
    let account = account_from_row(&row)?;
    if !account_is_visible_to(&account, tenant_id, user_id) {
        return Err(ProviderAccountError::NotFound(
            "provider account not found".to_owned(),
        ));
    }
    Ok(account)
}

/// Resolve the credential material behind a pinned account reference.
///
/// Consumers that stored an explicit `provider_account_id` use this instead of
/// [`resolve_account`]: the account is already known, its own `tenant_id` owns
/// the credential row, and the only remaining question is whether the caller is
/// allowed to use it. This is what lets a storage provider bound to a
/// platform-scoped account work from inside an ordinary tenant.
pub async fn resolve_bound_credential_material(
    pg: &PgPool,
    tenant_id: &str,
    user_id: Option<&str>,
    account_id: &str,
    credential_kind: Option<&str>,
) -> Result<ProviderCredentialMaterial, ProviderAccountError> {
    let account = load_bound_account(pg, tenant_id, user_id, account_id).await?;
    resolve_credential_material(pg, &account.tenant_id, &account.id, credential_kind).await
}

/// Apply a partial update. Returns `None` when the account does not exist — or
/// when it exists but the caller may not change it.
///
/// Those two are deliberately the same answer. Reporting "you may not change
/// this one" separately would turn the endpoint into a probe for which account
/// ids exist, and the account center holds operator credentials.
///
/// Two scope invariants live here because only the stored row can answer them:
/// promoting an account to default has to demote whichever account held that
/// slot, and disabling an account has to release the default slot it occupied
/// (otherwise the partial unique index would later reject a re-promotion).
///
/// The caller is the same value the create path takes, and it is read by
/// [`CALLER_VISIBILITY_PREDICATE`] and nothing else, so "who may touch this
/// account" has one definition rather than three. Its organization confines an
/// organization-scope row, its user id confines a user-scope row, and
/// `may_manage_shared` is what reaches the tenant-wide and platform-wide rows at
/// all.
pub async fn update_account(
    pg: &PgPool,
    account_id: &str,
    patch: &ProviderAccountPatch,
    caller: &ScopeCaller<'_>,
) -> Result<Option<ProviderAccount>, ProviderAccountError> {
    let mut columns: Vec<&'static str> = Vec::new();
    let mut values: Vec<Option<String>> = Vec::new();
    let mut force_clear_default = false;

    if let Some(display_name) = &patch.display_name {
        columns.push("display_name");
        values.push(Some(validate_display_name(display_name)?));
    }
    if let Some(account_type) = &patch.account_type {
        columns.push("account_type");
        values.push(Some(validate_choice(
            "accountType",
            account_type,
            ACCOUNT_TYPES,
        )?));
    }
    if let Some(environment) = &patch.environment {
        columns.push("environment");
        values.push(Some(validate_choice(
            "environment",
            environment,
            ENVIRONMENTS,
        )?));
    }
    if let Some(external) = &patch.external_account_id {
        columns.push("external_account_id");
        values.push(
            external
                .trim()
                .is_empty()
                .then_some(None)
                .unwrap_or_else(|| Some(external.trim().to_owned())),
        );
    }
    if let Some(region) = &patch.region_code {
        columns.push("region_code");
        values.push(
            region
                .trim()
                .is_empty()
                .then_some(None)
                .unwrap_or_else(|| Some(region.trim().to_owned())),
        );
    }
    if let Some(codes) = &patch.capability_codes {
        columns.push("capability_codes");
        let normalized = normalize_capability_codes(codes);
        values.push(Some(serde_json::to_string(&normalized).map_err(
            |error| ProviderAccountError::Validation(format!("capabilityCodes invalid: {error}")),
        )?));
    }
    if let Some(status) = &patch.status {
        let normalized = validate_choice("status", status, ACCOUNT_STATUSES)?;
        if normalized != ACCOUNT_STATUS_ACTIVE {
            // A disabled account must not keep the default slot: resolution
            // skips it anyway, and holding the slot would block the successor.
            force_clear_default = true;
        }
        columns.push("status");
        values.push(Some(normalized));
    }

    let promote_default = patch.is_default == Some(true);

    if columns.is_empty() && !force_clear_default && !promote_default {
        return Err(ProviderAccountError::Validation(
            "no updatable fields provided".to_owned(),
        ));
    }

    // Read the row through the same visibility predicate the write uses, so an
    // account the caller may not change is indistinguishable from one that is
    // not there — including for the default-slot bookkeeping below.
    let existing_sql = format!(
        "SELECT a.scope_type, a.owner_user_id, a.organization_id, a.vendor_code, a.environment, \
             a.is_default \
         FROM iam_provider_account a \
         WHERE a.deleted_at IS NULL AND {CALLER_VISIBILITY_PREDICATE} AND a.id = $7"
    );
    let existing = sqlx::query(sqlx::AssertSqlSafe(existing_sql))
        .bind(caller.may_manage_shared)
        .bind(caller.tenant_id.trim())
        .bind(caller.may_manage_shared)
        .bind(caller.may_manage_shared)
        .bind(predicate_organization(caller))
        .bind(predicate_user(caller))
        .bind(account_id)
        .fetch_optional(pg)
        .await
        .map_err(|error| unavailable("read provider account", error))?;
    let Some(existing) = existing else {
        return Ok(None);
    };
    let scope_type: String = existing
        .try_get("scope_type")
        .map_err(|error| unavailable("read provider account", error))?;
    let owner_user_id: Option<String> = existing
        .try_get("owner_user_id")
        .map_err(|error| unavailable("read provider account", error))?;
    let organization_id: String = existing
        .try_get("organization_id")
        .map_err(|error| unavailable("read provider account", error))?;
    let vendor_code: String = existing
        .try_get("vendor_code")
        .map_err(|error| unavailable("read provider account", error))?;
    let environment: String = existing
        .try_get("environment")
        .map_err(|error| unavailable("read provider account", error))?;

    let mut transaction = pg
        .begin()
        .await
        .map_err(|error| unavailable("update provider account", error))?;

    if promote_default {
        clear_default_in_scope(
            &mut transaction,
            &scope_type,
            caller.tenant_id,
            &organization_id,
            owner_user_id.as_deref(),
            &vendor_code,
            &environment,
            Some(account_id),
        )
        .await?;
    }

    let mut assignments: Vec<String> = Vec::new();
    // The visibility predicate owns $1..$6, so the settled columns start at $7.
    let mut index = 7usize;
    for column in &columns {
        assignments.push(format!("{column} = ${index}::text"));
        index += 1;
    }
    if promote_default {
        assignments.push("is_default = TRUE".to_owned());
    } else if force_clear_default {
        // Literal, not a parameter: the column is boolean and the value is
        // never caller supplied.
        assignments.push("is_default = FALSE".to_owned());
    }
    let actor_placeholder = index;
    index += 1;
    let account_placeholder = index;
    assignments.push(format!("updated_by = ${actor_placeholder}"));
    assignments.push("updated_at = CURRENT_TIMESTAMP".to_owned());
    assignments.push("version = version + 1".to_owned());

    let sql = format!(
        "UPDATE iam_provider_account a SET {} \
         WHERE a.deleted_at IS NULL AND {CALLER_VISIBILITY_PREDICATE} \
           AND a.id = ${account_placeholder}",
        assignments.join(", ")
    );

    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    query = query
        .bind(caller.may_manage_shared)
        .bind(caller.tenant_id.trim())
        .bind(caller.may_manage_shared)
        .bind(caller.may_manage_shared)
        .bind(predicate_organization(caller))
        .bind(predicate_user(caller));
    for value in &values {
        query = query.bind(value);
    }
    query = query.bind(caller.actor_label()).bind(account_id);
    let result = query
        .execute(&mut *transaction)
        .await
        .map_err(|error| map_write_error("update provider account", error))?;
    if result.rows_affected() == 0 {
        transaction
            .rollback()
            .await
            .map_err(|error| unavailable("update provider account", error))?;
        return Ok(None);
    }
    transaction
        .commit()
        .await
        .map_err(|error| unavailable("update provider account", error))?;
    find_account(pg, caller.tenant_id, account_id).await
}

/// Promote `account_id` to be its scope's default for its vendor + environment.
///
/// Returns `None` when the account is invisible to `tenant_id`, so callers can
/// answer 404 without leaking the existence of another tenant's account.
pub async fn set_default_account(
    pg: &PgPool,
    account_id: &str,
    caller: &ScopeCaller<'_>,
) -> Result<Option<ProviderAccount>, ProviderAccountError> {
    update_account(
        pg,
        account_id,
        &ProviderAccountPatch {
            is_default: Some(true),
            ..Default::default()
        },
        caller,
    )
    .await
}

/// Soft delete an account and revoke its credentials.
///
/// The account is claimed first and its credentials revoked second, both inside
/// one transaction. That order matters: revoking first would let a caller who may
/// not delete the account still revoke its credentials, and would leave the
/// account pointing at a credential somebody else then had to repair.
pub async fn soft_delete_account(
    pg: &PgPool,
    account_id: &str,
    caller: &ScopeCaller<'_>,
) -> Result<bool, ProviderAccountError> {
    let mut transaction = pg
        .begin()
        .await
        .map_err(|error| unavailable("delete provider account", error))?;

    let claim_sql = format!(
        "UPDATE iam_provider_account a SET status = 'deleted', \
             deleted_at = CURRENT_TIMESTAMP, updated_by = $7, \
             updated_at = CURRENT_TIMESTAMP, version = version + 1 \
         WHERE a.deleted_at IS NULL AND {CALLER_VISIBILITY_PREDICATE} AND a.id = $8"
    );
    let claimed = sqlx::query(sqlx::AssertSqlSafe(claim_sql))
        .bind(caller.may_manage_shared)
        .bind(caller.tenant_id.trim())
        .bind(caller.may_manage_shared)
        .bind(caller.may_manage_shared)
        .bind(predicate_organization(caller))
        .bind(predicate_user(caller))
        .bind(caller.actor_label())
        .bind(account_id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| unavailable("delete provider account", error))?;

    if claimed.rows_affected() == 0 {
        transaction
            .rollback()
            .await
            .map_err(|error| unavailable("delete provider account", error))?;
        return Ok(false);
    }

    sqlx::query(
        "UPDATE iam_provider_credential SET status = $1, revoked_at = CURRENT_TIMESTAMP, \
             updated_at = CURRENT_TIMESTAMP \
         WHERE tenant_id = $2 AND provider_account_id = $3 AND status = $4 AND deleted_at IS NULL",
    )
    .bind(CREDENTIAL_STATUS_REVOKED)
    .bind(caller.tenant_id)
    .bind(account_id)
    .bind(CREDENTIAL_STATUS_ACTIVE)
    .execute(&mut *transaction)
    .await
    .map_err(|error| unavailable("revoke provider credentials", error))?;

    transaction
        .commit()
        .await
        .map_err(|error| unavailable("delete provider account", error))?;
    Ok(true)
}

/// List credential projections (never secret bytes) for an account.
pub async fn list_credentials(
    pg: &PgPool,
    tenant_id: &str,
    account_id: &str,
) -> Result<Vec<ProviderCredential>, ProviderAccountError> {
    let sql = format!(
        "SELECT {CREDENTIAL_COLUMNS} FROM iam_provider_credential \
         WHERE tenant_id = $1 AND provider_account_id = $2 AND deleted_at IS NULL \
         ORDER BY credential_kind, credential_name, credential_version DESC"
    );
    let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(tenant_id)
        .bind(account_id)
        .fetch_all(pg)
        .await
        .map_err(|error| unavailable("list provider credentials", error))?;
    let mut credentials = Vec::with_capacity(rows.len());
    for row in &rows {
        credentials.push(credential_from_row(row)?);
    }
    Ok(credentials)
}

/// Create a credential, superseding the previous active value in the same slot.
///
/// Rotation is therefore a single call: the old row becomes `superseded` and a
/// new `active` row carries the incremented version, so every consumer that
/// references the account picks up the new secret without touching its own
/// configuration.
pub async fn upsert_active_credential(
    pg: &PgPool,
    new: &NewProviderCredential,
) -> Result<ProviderCredential, ProviderAccountError> {
    let credential_kind =
        validate_choice("credentialKind", &new.credential_kind, CREDENTIAL_KINDS)?;
    let credential_name = validate_credential_name(Some(new.credential_name.as_str()))?;
    let payload = new.secret_payload();
    validate_secret_payload(&credential_kind, &payload)?;
    let payload_json = serde_json::to_vec(&payload).map_err(|error| {
        ProviderAccountError::Validation(format!("credential payload invalid: {error}"))
    })?;

    let sealed = envelope::seal(&payload_json)?;
    let fingerprint = envelope::fingerprint(&payload_json);
    let masked_label = payload
        .access_key_id
        .as_deref()
        .map(envelope::mask_secret_label)
        .or_else(|| {
            payload
                .secret_text
                .as_deref()
                .map(envelope::mask_secret_label)
        });

    let mut transaction = pg
        .begin()
        .await
        .map_err(|error| unavailable("write provider credential", error))?;

    let account_row = sqlx::query(
        "SELECT tenant_id, organization_id FROM iam_provider_account \
         WHERE id = $1 AND deleted_at IS NULL AND status <> 'deleted' FOR UPDATE",
    )
    .bind(new.provider_account_id.trim())
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| unavailable("read provider account", error))?;
    let Some(account_row) = account_row else {
        transaction
            .rollback()
            .await
            .map_err(|error| unavailable("write provider credential", error))?;
        return Err(ProviderAccountError::NotFound(
            "provider account not found".to_owned(),
        ));
    };
    let tenant_id: String = account_row
        .try_get("tenant_id")
        .map_err(|error| unavailable("read provider account", error))?;
    let organization_id: String = account_row
        .try_get("organization_id")
        .map_err(|error| unavailable("read provider account", error))?;

    sqlx::query(
        "UPDATE iam_provider_credential SET status = $1, updated_at = CURRENT_TIMESTAMP \
         WHERE tenant_id = $2 AND organization_id = $3 AND provider_account_id = $4 \
           AND credential_kind = $5 AND credential_name = $6 \
           AND status = $7 AND deleted_at IS NULL",
    )
    .bind(CREDENTIAL_STATUS_SUPERSEDED)
    .bind(&tenant_id)
    .bind(&organization_id)
    .bind(new.provider_account_id.trim())
    .bind(&credential_kind)
    .bind(&credential_name)
    .bind(CREDENTIAL_STATUS_ACTIVE)
    .execute(&mut *transaction)
    .await
    .map_err(|error| unavailable("supersede provider credential", error))?;

    let next_version: i64 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(credential_version), 0) + 1 FROM iam_provider_credential \
         WHERE tenant_id = $1 AND provider_account_id = $2 AND credential_kind = $3 \
           AND credential_name = $4",
    )
    .bind(&tenant_id)
    .bind(new.provider_account_id.trim())
    .bind(&credential_kind)
    .bind(&credential_name)
    .fetch_one(&mut *transaction)
    .await
    .map_err(|error| unavailable("read provider credential version", error))?;

    let credential_id = format!("iampcred-{}", uuid::Uuid::now_v7());
    let expires_at = new
        .expires_at
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| {
            DateTime::parse_from_rfc3339(value)
                .map(|parsed| parsed.with_timezone(&Utc))
                .map_err(|error| {
                    ProviderAccountError::Validation(format!("expiresAt must be RFC3339: {error}"))
                })
        })
        .transpose()?;

    sqlx::query(
        "INSERT INTO iam_provider_credential (
            id, uuid, tenant_id, organization_id, provider_account_id, credential_kind,
            credential_name, secret_ciphertext, secret_key_id, secret_algorithm,
            secret_fingerprint, masked_label, credential_version, status, expires_at,
            last_rotated_at, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', $14, \
            CURRENT_TIMESTAMP, $15)",
    )
    .bind(&credential_id)
    .bind(uuid::Uuid::now_v7().to_string())
    .bind(&tenant_id)
    .bind(&organization_id)
    .bind(new.provider_account_id.trim())
    .bind(&credential_kind)
    .bind(&credential_name)
    .bind(&sealed)
    .bind(envelope::PRIMARY_KEY_ID)
    .bind(envelope::ENVELOPE_ALGORITHM)
    .bind(&fingerprint)
    .bind(&masked_label)
    .bind(next_version)
    .bind(expires_at)
    .bind(new.actor_id.trim())
    .execute(&mut *transaction)
    .await
    .map_err(|error| map_write_error("write provider credential", error))?;

    transaction
        .commit()
        .await
        .map_err(|error| unavailable("write provider credential", error))?;

    let sql = format!("SELECT {CREDENTIAL_COLUMNS} FROM iam_provider_credential WHERE id = $1");
    let row = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(&credential_id)
        .fetch_one(pg)
        .await
        .map_err(|error| unavailable("read provider credential", error))?;
    credential_from_row(&row)
}

/// Revoke a single credential row.
pub async fn revoke_credential(
    pg: &PgPool,
    tenant_id: &str,
    credential_id: &str,
) -> Result<bool, ProviderAccountError> {
    let result = sqlx::query(
        "UPDATE iam_provider_credential SET status = $1, revoked_at = CURRENT_TIMESTAMP, \
             updated_at = CURRENT_TIMESTAMP \
         WHERE tenant_id = $2 AND id = $3 AND deleted_at IS NULL AND status <> $1",
    )
    .bind(CREDENTIAL_STATUS_REVOKED)
    .bind(tenant_id)
    .bind(credential_id)
    .execute(pg)
    .await
    .map_err(|error| unavailable("revoke provider credential", error))?;
    Ok(result.rows_affected() > 0)
}

/// Decrypt the active credential material for a consuming domain.
///
/// This is the single entry point consumers use; it returns plaintext only in
/// memory and never persists or logs it.
pub async fn resolve_credential_material(
    pg: &PgPool,
    tenant_id: &str,
    account_id: &str,
    credential_kind: Option<&str>,
) -> Result<ProviderCredentialMaterial, ProviderAccountError> {
    let kind = credential_kind
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned);

    let account_row = sqlx::query(
        "SELECT id, status FROM iam_provider_account \
         WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL",
    )
    .bind(tenant_id)
    .bind(account_id)
    .fetch_optional(pg)
    .await
    .map_err(|error| unavailable("read provider account", error))?;
    let Some(account_row) = account_row else {
        return Err(ProviderAccountError::NotFound(
            "provider account not found".to_owned(),
        ));
    };
    let account_status: String = account_row
        .try_get("status")
        .map_err(|error| unavailable("read provider account", error))?;
    if account_status != "active" {
        return Err(ProviderAccountError::Validation(format!(
            "provider account is {account_status}; an active account is required to resolve credentials"
        )));
    }

    let row = sqlx::query(
        "SELECT credential_kind, credential_version, secret_ciphertext, expires_at FROM iam_provider_credential \
         WHERE tenant_id = $1 AND provider_account_id = $2 AND status = $3 AND deleted_at IS NULL \
           AND ($4::text IS NULL OR credential_kind = $4) \
         ORDER BY credential_version DESC LIMIT 1",
    )
    .bind(tenant_id)
    .bind(account_id)
    .bind(CREDENTIAL_STATUS_ACTIVE)
    .bind(&kind)
    .fetch_optional(pg)
    .await
    .map_err(|error| unavailable("read provider credential", error))?;
    let Some(row) = row else {
        return Err(ProviderAccountError::NotFound(
            "no active credential is configured for this provider account".to_owned(),
        ));
    };

    let credential_kind: String = row
        .try_get("credential_kind")
        .map_err(|error| unavailable("read provider credential", error))?;
    let credential_version: i64 = row
        .try_get("credential_version")
        .map_err(|error| unavailable("read provider credential", error))?;
    let sealed: String = row
        .try_get("secret_ciphertext")
        .map_err(|error| unavailable("read provider credential", error))?;
    let expires_at: Option<DateTime<Utc>> = row
        .try_get("expires_at")
        .map_err(|error| unavailable("read provider credential", error))?;

    let plaintext = envelope::open(&sealed)?;
    let payload: crate::model::CredentialSecretPayload = serde_json::from_slice(&plaintext)
        .map_err(|error| {
            ProviderAccountError::Cipher(format!(
                "provider credential payload is unreadable: {error}"
            ))
        })?;

    Ok(ProviderCredentialMaterial {
        provider_account_id: account_id.to_owned(),
        credential_kind,
        credential_version,
        access_key_id: payload.access_key_id,
        secret_access_key: payload.secret_access_key,
        session_token: payload.session_token,
        secret_text: payload.secret_text,
        expires_at: optional_timestamp_to_string(expires_at),
    })
}

/// Resolve which cloud account a consumer should use.
///
/// The walk is `user -> organization -> tenant -> platform`, narrowest first, so
/// an end user's personal account always beats the one their organization keeps,
/// which always beats the tenant default, which always beats the platform
/// default. Inside one level the account flagged `is_default` wins.
///
/// When a level offers several candidates and none is the default the call
/// fails with `Conflict` instead of guessing: silently picking the
/// alphabetically first account would hand a consumer the wrong credential.
/// A consumer that already knows its account (drive stores
/// `provider_account_id` per storage provider) should call
/// [`resolve_credential_material`] directly and skip the walk entirely.
pub async fn resolve_account(
    pg: &PgPool,
    requirement: &AccountRequirement,
) -> Result<AccountResolution, ProviderAccountError> {
    let vendor_code = validate_vendor_code(&requirement.vendor_code)?;
    let environment = normalize_environment_filter(requirement.environment.as_deref());
    let organization = requirement
        .organization_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let tenant_id = requirement.tenant_id.trim();
    let user_id = requirement
        .user_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let capability_code = requirement
        .capability_code
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_ascii_lowercase);

    if tenant_id.is_empty() {
        return Err(ProviderAccountError::Validation(
            "tenantId is required to resolve a provider account".to_owned(),
        ));
    }

    // One statement shape covers all four levels; the WHERE keeps every bind
    // referenced so Postgres never sees an unused parameter. `organization_id`
    // does double duty on purpose: it is both the filter a caller may apply and
    // the organization an `organization`-scope account must live in, because the
    // organization a caller asks about is the one it is acting inside.
    let sql = format!(
        "SELECT {ACCOUNT_COLUMNS} FROM iam_provider_account a \
         WHERE a.deleted_at IS NULL AND a.status = 'active' \
           AND a.scope_type = $1::text AND a.vendor_code = $2 \
           AND ($3::text IS NULL OR a.organization_id = $3) \
           AND ($4::text IS NULL OR a.environment = $4) \
           AND ( \
             $1::text = 'platform' \
             OR ($1::text = 'user' AND a.tenant_id = $5 \
                 AND $6::text IS NOT NULL AND a.owner_user_id = $6) \
             OR ($1::text = 'organization' AND a.tenant_id = $5 \
                 AND $3::text IS NOT NULL AND a.owner_user_id IS NULL) \
             OR ($1::text = 'tenant' AND a.tenant_id = $5 AND a.owner_user_id IS NULL) \
           ) \
         ORDER BY a.is_default DESC, a.account_code"
    );

    let mut candidates_by_scope = Vec::with_capacity(SCOPE_PRECEDENCE.len());
    for scope in SCOPE_PRECEDENCE {
        let rows = sqlx::query(sqlx::AssertSqlSafe(sql.clone()))
            .bind(*scope)
            .bind(&vendor_code)
            .bind(organization)
            .bind(&environment)
            .bind(tenant_id)
            .bind(user_id)
            .fetch_all(pg)
            .await
            .map_err(|error| unavailable("resolve provider account", error))?;

        let mut candidates: Vec<ProviderAccount> = Vec::with_capacity(rows.len());
        for row in &rows {
            let account = account_from_row(row)?;
            // Capability matching happens here rather than in SQL: the column
            // is a JSON array in TEXT, and casting it in the query would turn
            // one malformed row into a hard failure for every resolution.
            let matches = capability_code
                .as_deref()
                .map(|code| account.serves_capability(code))
                .unwrap_or(true);
            if matches {
                candidates.push(account);
            }
        }

        candidates_by_scope.push(ScopeCandidateCount {
            scope_type: (*scope).to_owned(),
            count: candidates.len() as i64,
        });

        if candidates.is_empty() {
            continue;
        }
        if let Some(default) = candidates.iter().find(|account| account.is_default) {
            return Ok(AccountResolution {
                account: default.clone(),
                matched_scope: (*scope).to_owned(),
                matched_by_default: true,
                candidates_by_scope,
            });
        }
        if candidates.len() == 1 {
            return Ok(AccountResolution {
                account: candidates.remove(0),
                matched_scope: (*scope).to_owned(),
                matched_by_default: false,
                candidates_by_scope,
            });
        }
        return Err(ProviderAccountError::Conflict(format!(
            "{} accounts match vendor `{vendor_code}` at scope `{scope}` and none is the default; \
             mark one as the default or pass providerAccountId explicitly",
            candidates_by_scope
                .last()
                .map(|entry| entry.count)
                .unwrap_or(0)
        )));
    }

    let capability_note = capability_code
        .as_deref()
        .map(|code| format!(" for capability `{code}`"))
        .unwrap_or_default();
    Err(ProviderAccountError::NotFound(format!(
        "no active provider account matches vendor `{vendor_code}`{capability_note} in tenant `{tenant_id}`, \
         its tenant default, or the platform default"
    )))
}

/// Convenience wrapper: resolve the account and decrypt its active credential
/// in one call. Returns the resolution so callers can report which scope won.
pub async fn resolve_account_credentials(
    pg: &PgPool,
    requirement: &AccountRequirement,
    credential_kind: Option<&str>,
) -> Result<(AccountResolution, ProviderCredentialMaterial), ProviderAccountError> {
    let resolution = resolve_account(pg, requirement).await?;
    let material = resolve_credential_material(
        pg,
        &resolution.account.tenant_id,
        &resolution.account.id,
        credential_kind,
    )
    .await?;
    Ok((resolution, material))
}

#[cfg(test)]
mod visibility_tests {
    use super::*;
    use crate::model::{
        ACCOUNT_SCOPE_ORGANIZATION, ACCOUNT_TYPE_LONG_TERM_KEY, DEFAULT_ORGANIZATION_ID,
    };

    /// An account held in the tenant's root organization — the common case.
    fn account(scope_type: &str, tenant_id: &str, owner_user_id: Option<&str>) -> ProviderAccount {
        account_in(
            scope_type,
            tenant_id,
            owner_user_id,
            DEFAULT_ORGANIZATION_ID,
        )
    }

    /// An account that names a specific organization.
    fn account_in(
        scope_type: &str,
        tenant_id: &str,
        owner_user_id: Option<&str>,
        organization_id: &str,
    ) -> ProviderAccount {
        ProviderAccount {
            id: "iampacct-1".to_owned(),
            uuid: "00000000-0000-0000-0000-000000000001".to_owned(),
            tenant_id: tenant_id.to_owned(),
            organization_id: organization_id.to_owned(),
            scope_type: scope_type.to_owned(),
            owner_user_id: owner_user_id.map(str::to_owned),
            vendor_code: "aliyun".to_owned(),
            account_code: "primary".to_owned(),
            display_name: "Primary".to_owned(),
            account_type: ACCOUNT_TYPE_LONG_TERM_KEY.to_owned(),
            environment: "production".to_owned(),
            external_account_id: None,
            capability_codes: vec!["object_storage".to_owned()],
            region_code: None,
            is_default: false,
            status: ACCOUNT_STATUS_ACTIVE.to_owned(),
            version: 1,
            created_by: "ops".to_owned(),
            updated_by: "ops".to_owned(),
            created_at: "2026-09-17T00:00:00Z".to_owned(),
            updated_at: "2026-09-17T00:00:00Z".to_owned(),
            credential_configured: true,
            credential_count: 1,
        }
    }

    #[test]
    fn platform_account_is_visible_from_every_tenant() {
        let platform = account(ACCOUNT_SCOPE_PLATFORM, PLATFORM_TENANT_ID, None);
        assert!(account_is_visible_to(&platform, "100000", None));
        assert!(account_is_visible_to(&platform, PLATFORM_TENANT_ID, None));
    }

    #[test]
    fn tenant_account_is_only_visible_to_its_own_tenant() {
        let tenant = account("tenant", "100000", None);
        assert!(account_is_visible_to(&tenant, "100000", None));
        assert!(!account_is_visible_to(&tenant, "100001", None));
    }

    #[test]
    fn user_account_requires_the_owning_user_in_the_same_tenant() {
        let personal = account(ACCOUNT_SCOPE_USER, "100000", Some("user-7"));
        assert!(account_is_visible_to(&personal, "100000", Some("user-7")));
        assert!(!account_is_visible_to(&personal, "100000", Some("user-8")));
        assert!(!account_is_visible_to(&personal, "100000", None));
        assert!(!account_is_visible_to(&personal, "100001", Some("user-7")));
    }

    #[test]
    fn caller_tenant_and_user_are_trimmed_before_comparison() {
        let personal = account(ACCOUNT_SCOPE_USER, "100000", Some("user-7"));
        assert!(account_is_visible_to(
            &personal,
            " 100000 ",
            Some(" user-7 ")
        ));
        let tenant = account("tenant", "100000", None);
        assert!(account_is_visible_to(&tenant, " 100000 ", Some("   ")));
    }

    #[test]
    fn organization_account_is_visible_to_its_whole_tenant_when_pinned() {
        // The pinned path does not re-walk scopes. Whoever bound the resource to
        // this account decided who reaches it, so the organization that keeps the
        // account does not narrow the credential's audience here — but the tenant
        // boundary still holds.
        let organization = account_in(ACCOUNT_SCOPE_ORGANIZATION, "100000", None, "org-7");
        assert!(account_is_visible_to(
            &organization,
            "100000",
            Some("user-8")
        ));
        assert!(!account_is_visible_to(
            &organization,
            "100001",
            Some("user-8")
        ));
    }

    #[test]
    fn the_visibility_predicate_uses_placeholders_one_through_six_in_order() {
        // The predicate is spliced into the listing, the single read and both
        // write paths, so a mistake in a placeholder is a runtime error rather
        // than a compile error. Pin the contract here: $1..$6, each first
        // appearing in that order, and nothing past $6 — callers number their own
        // extra parameters from $7.
        //
        // Repetition is allowed on purpose: $5 guards both the null check and the
        // comparison, so it legitimately appears twice.
        let mut previous = 0usize;
        for index in 1..=6 {
            let placeholder = format!("${index}");
            let position = CALLER_VISIBILITY_PREDICATE
                .find(&placeholder)
                .unwrap_or_else(|| panic!("{placeholder} must appear in the visibility predicate"));
            assert!(
                position >= previous,
                "{placeholder} must not appear before the earlier placeholders"
            );
            previous = position;
        }
        for index in 7..=9 {
            let placeholder = format!("${index}");
            assert!(
                !CALLER_VISIBILITY_PREDICATE.contains(&placeholder),
                "{placeholder} must not appear: the predicate owns $1..$6 only"
            );
        }
    }
}
