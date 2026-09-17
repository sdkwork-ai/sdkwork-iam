//! Backend IAM routes for the platform-wide cloud account center.
//!
//! Accounts are reusable across business domains: one row describes an upstream
//! cloud account (for example one Alibaba Cloud account) and consuming domains
//! reference it by id. An account carries a scope so the same surface serves four
//! levels at once:
//!
//! * `platform` — a global default published by platform operators, resolvable
//!   from every tenant.
//! * `tenant` — an application-tenant default published by the tenant admin.
//! * `organization` — an account kept by one organization inside a tenant, which
//!   only that organization administers and resolves through.
//! * `user` — a personal account an end user keeps for themselves.
//!
//! This is the **administration** surface (`/backend/v3/api/...`), so the manifest
//! gate enforces a declared permission per route. Two consequences drive the code
//! below:
//!
//! * Every caller here holds some `iam.provider_accounts.*` permission, otherwise
//!   the gate rejects the request before the handler runs. So the question the
//!   handler has to answer is not "may this person use the account center?" but
//!   "may this person see and change a *shared* account?" — a wider right than
//!   managing one's own, and the one that keeps an ordinary member from browsing
//!   the tenant default.
//! * The same surface also serves an end user managing their own account. The
//!   routes are declared `dual-token` rather than backend-admin, so an `app_user`
//!   token reaches them, and `app_user` carries the four per-route
//!   `iam.provider_accounts.*` codes without `manage_shared`. There is
//!   deliberately no separate member-facing surface: which level a caller reaches
//!   is decided by the rights it holds, not by which endpoint it asked.
//!
//! Secret material is written through this surface only and is never projected
//! back — responses carry the credential kind, status, fingerprint, and masked
//! label, never ciphertext or plaintext.

use std::collections::HashMap;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Response,
    routing::{get, post},
    Json, Router,
};
use sdkwork_iam_provider_account_service::{
    create_account, find_account_for_caller, list_accounts, list_credentials, resolve_account,
    revoke_credential, set_default_account, soft_delete_account, update_account,
    upsert_active_credential, AccountRequirement, AccountResolution, AccountVisibility,
    NewProviderAccount, NewProviderCredential, ProviderAccount, ProviderAccountError,
    ProviderAccountPatch, ProviderCredential, ScopeCaller, ACCOUNT_SCOPE_PLATFORM,
    ACCOUNT_SCOPE_USER, ACCOUNT_TYPE_LONG_TERM_KEY, PLATFORM_TENANT_ID,
};
use sdkwork_iam_web_adapter::record_audit_event;
use sdkwork_web_core::WebRequestContext;
use serde_json::{json, Value};

use crate::backend_sql::{
    internal_handler_error, list_page_params_or_error, page_json, read_string_field,
};
use crate::handlers::{
    actor_user_id_from_context, appbase_error, appbase_ok, ensure_target_tenant_access,
    postgres_pool_or_error, tenant_id_from_context, BackendIamState,
};

const ACCOUNT_RESOURCE_TABLE: &str = "iam_provider_account";
const CREDENTIAL_RESOURCE_TABLE: &str = "iam_provider_credential";

pub(crate) fn apply_provider_account_routes(
    router: Router<BackendIamState>,
) -> Router<BackendIamState> {
    router
        .route(
            "/backend/v3/api/iam/provider_accounts",
            get(list_provider_accounts).post(create_provider_account),
        )
        // Static segment, matched ahead of `{providerAccountId}` by matchit 0.8.
        .route(
            "/backend/v3/api/iam/provider_accounts/resolve",
            get(resolve_provider_account),
        )
        .route(
            "/backend/v3/api/iam/provider_accounts/{providerAccountId}",
            get(retrieve_provider_account)
                .patch(update_provider_account)
                .delete(delete_provider_account),
        )
        .route(
            "/backend/v3/api/iam/provider_accounts/{providerAccountId}/default",
            post(promote_provider_account_default),
        )
        .route(
            "/backend/v3/api/iam/provider_accounts/{providerAccountId}/credentials",
            get(list_provider_credentials).post(create_provider_credential),
        )
        .route(
            "/backend/v3/api/iam/provider_credentials/{credentialId}/revoke",
            post(revoke_provider_credential),
        )
}

/// Tenant / organization / actor triple every write needs.
/// The permission that separates "manage my own account" from "manage the account
/// everyone in the tenant resolves through".
///
/// It is a distinct code rather than a reuse of `iam.provider_accounts.update` for
/// one reason: the two rights have to be granted apart. An end user needs the four
/// per-route codes to reach this surface at all, and must still not receive this
/// one. `iam.*` (org_admin and the platform roles) and `*`
/// (platform_super_admin) both match it, so no existing role needs editing to keep
/// working.
const PERM_MANAGE_SHARED_ACCOUNTS: &str = "iam.provider_accounts.manage_shared";

struct RequestScope {
    tenant_id: String,
    organization_id: Option<String>,
    actor_id: String,
    /// Whether the caller may see and change accounts that are not their own:
    /// the tenant-wide default and the one their organization keeps.
    can_manage_shared: bool,
}

impl RequestScope {
    /// The acting end user, which is what enables the personal account layer.
    fn user_id(&self) -> Option<&str> {
        let trimmed = self.actor_id.trim();
        (!trimmed.is_empty()).then_some(trimmed)
    }

    /// Which accounts this caller may list.
    ///
    /// `includePlatform` and `scopeType` come from the query string: the console
    /// asks for `scopeType=user` to render "my accounts", and asks for
    /// `scopeType=platform` to render the global defaults.
    ///
    /// The shared levels ride on `can_manage_shared`, not on those query
    /// parameters, because a query parameter is a request rather than a right: a
    /// member could otherwise pass `includePlatform=true` and read the operator's
    /// credentials out of the listing.
    fn visibility(
        &self,
        include_platform: bool,
        scope_type: Option<String>,
        owner_user_id: Option<String>,
    ) -> AccountVisibility {
        AccountVisibility {
            tenant_id: self.tenant_id.clone(),
            user_id: self.user_id().map(str::to_owned),
            organization_id: self.organization_id.clone(),
            include_platform: include_platform && self.can_manage_shared,
            include_tenant_shared: self.can_manage_shared,
            include_organization_shared: self.can_manage_shared,
            scope_type,
            owner_user_id,
        }
    }

    /// The same caller as the service layer sees it.
    ///
    /// Built here so reading, listing and writing all hand over one value, and the
    /// service layer never has to be told the same facts twice.
    fn caller(&self) -> ScopeCaller<'_> {
        ScopeCaller::new(
            &self.tenant_id,
            self.user_id(),
            self.organization_id.as_deref(),
        )
        .managing_shared(self.can_manage_shared)
    }
}

fn scope_or_error(context: &WebRequestContext) -> Result<RequestScope, Response> {
    let tenant_id = tenant_id_from_context(context)?;
    if let Err(response) = ensure_target_tenant_access(context, &tenant_id) {
        return Err(response);
    }
    let actor_id = actor_user_id_from_context(context).ok_or_else(|| {
        appbase_error(
            StatusCode::UNAUTHORIZED,
            "iam_principal_required",
            "authenticated admin principal is required",
        )
    })?;
    Ok(RequestScope {
        tenant_id,
        organization_id: context.organization_id().map(str::to_owned),
        actor_id,
        can_manage_shared: context.has_permission(PERM_MANAGE_SHARED_ACCOUNTS),
    })
}

fn provider_error(error: ProviderAccountError) -> Response {
    if matches!(error, ProviderAccountError::Cipher(_)) {
        // Sealing/opening failures carry operator-relevant detail (missing or
        // wrong master secret) that must not reach the client.
        return internal_handler_error(error.wire_code(), error.message());
    }
    let status =
        StatusCode::from_u16(error.http_status_code()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    appbase_error(status, error.wire_code(), error.message())
}

fn read_string_array_field(body: &Value, keys: &[&str]) -> Vec<String> {
    for key in keys {
        if let Some(array) = body.get(*key).and_then(Value::as_array) {
            return array
                .iter()
                .filter_map(Value::as_str)
                .map(str::to_owned)
                .collect();
        }
    }
    Vec::new()
}

fn account_to_json(account: &ProviderAccount) -> Value {
    json!({
        "id": account.id,
        "uuid": account.uuid,
        "tenantId": account.tenant_id,
        "organizationId": account.organization_id,
        "scopeType": account.scope_type,
        "ownerUserId": account.owner_user_id,
        "vendorCode": account.vendor_code,
        "accountCode": account.account_code,
        "displayName": account.display_name,
        "accountType": account.account_type,
        "environment": account.environment,
        "externalAccountId": account.external_account_id,
        "capabilityCodes": account.capability_codes,
        "regionCode": account.region_code,
        "isDefault": account.is_default,
        "status": account.status,
        "version": account.version.to_string(),
        "credentialConfigured": account.credential_configured,
        "credentialCount": account.credential_count.to_string(),
        "createdBy": account.created_by,
        "updatedBy": account.updated_by,
        "createdAt": account.created_at,
        "updatedAt": account.updated_at,
    })
}

/// Resolution projection: which account a requirement lands on, and why.
///
/// Deliberately carries no secret bytes — consumers that need the actual
/// credential call the library resolver in process.
fn resolution_to_json(resolution: &AccountResolution) -> Value {
    json!({
        "account": account_to_json(&resolution.account),
        "matchedScope": resolution.matched_scope,
        "matchedByDefault": resolution.matched_by_default,
        "candidatesByScope": resolution
            .candidates_by_scope
            .iter()
            .map(|entry| {
                json!({
                    "scopeType": entry.scope_type,
                    "count": entry.count.to_string(),
                })
            })
            .collect::<Vec<Value>>(),
    })
}

/// Read a JSON boolean, accepting the string forms a form-encoded client sends.
fn read_bool_field(body: &Value, keys: &[&str]) -> Option<bool> {
    for key in keys {
        match body.get(*key) {
            Some(Value::Bool(value)) => return Some(*value),
            Some(Value::String(value)) => {
                let normalized = value.trim().to_ascii_lowercase();
                if normalized == "true" || normalized == "1" {
                    return Some(true);
                }
                if normalized == "false" || normalized == "0" {
                    return Some(false);
                }
            }
            _ => {}
        }
    }
    None
}

/// Read a query boolean, defaulting when the parameter is absent.
fn query_bool(query: &HashMap<String, String>, key: &str, default: bool) -> bool {
    match query.get(key) {
        Some(value) => {
            let normalized = value.trim().to_ascii_lowercase();
            normalized == "true" || normalized == "1"
        }
        None => default,
    }
}

/// Credential projection: deliberately has no ciphertext field.
fn credential_to_json(credential: &ProviderCredential) -> Value {
    json!({
        "id": credential.id,
        "uuid": credential.uuid,
        "providerAccountId": credential.provider_account_id,
        "credentialKind": credential.credential_kind,
        "credentialName": credential.credential_name,
        "maskedLabel": credential.masked_label,
        "secretFingerprint": credential.secret_fingerprint,
        "secretKeyId": credential.secret_key_id,
        "secretAlgorithm": credential.secret_algorithm,
        "credentialVersion": credential.credential_version.to_string(),
        "status": credential.status,
        "expiresAt": credential.expires_at,
        "lastRotatedAt": credential.last_rotated_at,
        "lastVerifiedAt": credential.last_verified_at,
        "createdBy": credential.created_by,
        "createdAt": credential.created_at,
        "updatedAt": credential.updated_at,
    })
}

async fn list_provider_accounts(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    let scope = match scope_or_error(&context) {
        Ok(scope) => scope,
        Err(response) => return response,
    };
    let params = match list_page_params_or_error(&query) {
        Ok(params) => params,
        Err(response) => return response,
    };
    let organization_filter = query
        .get("organizationId")
        .map(String::as_str)
        .or(scope.organization_id.as_deref());
    let vendor_filter = query.get("vendorCode").map(String::as_str);
    let status_filter = query.get("status").map(String::as_str);
    let search = query.get("q").map(String::as_str);

    // `mine=true` is the "my cloud accounts" tab: it pins the walk to the
    // caller's own personal accounts instead of the whole visible set.
    let mine = query_bool(&query, "mine", false);
    let scope_type_filter = if mine {
        Some(ACCOUNT_SCOPE_USER.to_owned())
    } else {
        query.get("scopeType").cloned()
    };
    let owner_filter = if mine {
        scope.user_id().map(str::to_owned)
    } else {
        query.get("ownerUserId").cloned()
    };

    let visibility = scope.visibility(
        query_bool(&query, "includePlatform", true),
        scope_type_filter,
        owner_filter,
    );

    match list_accounts(
        pg,
        &visibility,
        organization_filter,
        vendor_filter,
        status_filter,
        search,
        params.page_size,
        params.offset,
    )
    .await
    {
        Ok((accounts, total)) => {
            let items = accounts.iter().map(account_to_json).collect();
            appbase_ok(page_json(items, total, &params))
        }
        Err(error) => provider_error(error),
    }
}

/// Report which cloud account a requirement resolves to, without secrets.
///
/// This is the console's "what will actually be used" preview; consumers in
/// process call the library resolver directly.
async fn resolve_provider_account(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    let scope = match scope_or_error(&context) {
        Ok(scope) => scope,
        Err(response) => return response,
    };

    let Some(vendor_code) = query
        .get("vendorCode")
        .map(String::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return appbase_error(
            StatusCode::BAD_REQUEST,
            "iam_provider_account_invalid",
            "vendorCode is required",
        );
    };

    // Default to the caller: resolving for another user would leak which
    // personal account they hold.
    let user_id = query
        .get("userId")
        .map(String::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .or_else(|| scope.user_id().map(str::to_owned));

    let requirement = AccountRequirement {
        tenant_id: scope.tenant_id.clone(),
        user_id,
        vendor_code: vendor_code.to_owned(),
        capability_code: query.get("capabilityCode").cloned(),
        environment: query.get("environment").cloned(),
        organization_id: query
            .get("organizationId")
            .cloned()
            .or_else(|| scope.organization_id.clone()),
    };

    match resolve_account(pg, &requirement).await {
        Ok(resolution) => appbase_ok(resolution_to_json(&resolution)),
        Err(error) => provider_error(error),
    }
}

async fn create_provider_account(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Json(body): Json<Value>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    let scope = match scope_or_error(&context) {
        Ok(scope) => scope,
        Err(response) => return response,
    };

    let vendor_code = read_string_field(&body, &["vendorCode", "vendor_code"]);
    let account_code = read_string_field(&body, &["accountCode", "account_code"]);
    let display_name = read_string_field(&body, &["displayName", "display_name"]);
    if vendor_code.is_none() || account_code.is_none() || display_name.is_none() {
        return appbase_error(
            StatusCode::BAD_REQUEST,
            "iam_provider_account_invalid",
            "vendorCode, accountCode, and displayName are required",
        );
    }

    let requested_scope = read_string_field(&body, &["scopeType", "scope_type"]);
    // A platform-scope account is globally resolvable, so only a platform
    // operator may publish one. The tenant check happens here because the
    // route's declared permission cannot express "platform tenant only".
    if requested_scope
        .as_deref()
        .is_some_and(|value| value.trim().eq_ignore_ascii_case(ACCOUNT_SCOPE_PLATFORM))
        && scope.tenant_id.trim() != PLATFORM_TENANT_ID
    {
        return appbase_error(
            StatusCode::FORBIDDEN,
            "iam_provider_account_scope_forbidden",
            "scopeType=platform is reserved for platform operators",
        );
    }

    let new_account = NewProviderAccount {
        tenant_id: scope.tenant_id.clone(),
        organization_id: scope.organization_id.clone().unwrap_or_default(),
        scope_type: requested_scope.unwrap_or_default(),
        owner_user_id: read_string_field(&body, &["ownerUserId", "owner_user_id"]),
        vendor_code: vendor_code.unwrap_or_default(),
        account_code: account_code.unwrap_or_default(),
        display_name: display_name.unwrap_or_default(),
        account_type: read_string_field(&body, &["accountType", "account_type"])
            .unwrap_or_else(|| ACCOUNT_TYPE_LONG_TERM_KEY.to_owned()),
        environment: read_string_field(&body, &["environment"])
            .unwrap_or_else(|| "production".to_owned()),
        external_account_id: read_string_field(
            &body,
            &["externalAccountId", "external_account_id"],
        ),
        capability_codes: read_string_array_field(&body, &["capabilityCodes", "capability_codes"]),
        region_code: read_string_field(&body, &["regionCode", "region_code"]),
        is_default: read_bool_field(&body, &["isDefault", "is_default"]).unwrap_or(false),
        actor_id: scope.actor_id.clone(),
    };

    match create_account(pg, &new_account, &scope.caller()).await {
        Ok(account) => {
            audit_account(
                &context,
                pg,
                &scope,
                "provider_account.create",
                &account.id,
                json!({
                    "vendorCode": account.vendor_code,
                    "accountCode": account.account_code,
                    "scopeType": account.scope_type,
                    "ownerUserId": account.owner_user_id,
                    "isDefault": account.is_default,
                }),
            )
            .await;
            appbase_ok(account_to_json(&account))
        }
        Err(error) => provider_error(error),
    }
}

async fn retrieve_provider_account(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path(provider_account_id): Path<String>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    let scope = match scope_or_error(&context) {
        Ok(scope) => scope,
        Err(response) => return response,
    };
    // The single read applies the same walk the listing applies. Without it,
    // knowing an id would be enough to open an account the listing would never
    // show — another member's personal account, or one kept by an organization the
    // caller is not in.
    let visibility = scope.visibility(true, None, None);
    match find_account_for_caller(pg, &provider_account_id, &visibility).await {
        Ok(Some(account)) => appbase_ok(account_to_json(&account)),
        Ok(None) => appbase_error(
            StatusCode::NOT_FOUND,
            "iam_provider_account_not_found",
            "provider account not found",
        ),
        Err(error) => provider_error(error),
    }
}

async fn update_provider_account(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path(provider_account_id): Path<String>,
    Json(body): Json<Value>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    let scope = match scope_or_error(&context) {
        Ok(scope) => scope,
        Err(response) => return response,
    };

    let has_capability_codes =
        body.get("capabilityCodes").is_some() || body.get("capability_codes").is_some();
    let patch = ProviderAccountPatch {
        display_name: read_string_field(&body, &["displayName", "display_name"]),
        account_type: read_string_field(&body, &["accountType", "account_type"]),
        environment: read_string_field(&body, &["environment"]),
        external_account_id: read_string_field(
            &body,
            &["externalAccountId", "external_account_id"],
        ),
        region_code: read_string_field(&body, &["regionCode", "region_code"]),
        capability_codes: has_capability_codes
            .then(|| read_string_array_field(&body, &["capabilityCodes", "capability_codes"])),
        status: read_string_field(&body, &["status"]),
        is_default: read_bool_field(&body, &["isDefault", "is_default"]),
    };

    match update_account(pg, &provider_account_id, &patch, &scope.caller()).await {
        Ok(Some(account)) => {
            audit_account(
                &context,
                pg,
                &scope,
                "provider_account.update",
                &account.id,
                json!({
                    "isDefault": account.is_default,
                    "status": account.status,
                }),
            )
            .await;
            appbase_ok(account_to_json(&account))
        }
        Ok(None) => appbase_error(
            StatusCode::NOT_FOUND,
            "iam_provider_account_not_found",
            "provider account not found",
        ),
        Err(error) => provider_error(error),
    }
}

/// Promote an account to be its scope's default for its vendor + environment.
///
/// The previous default is demoted in the same transaction, so a vendor always
/// has exactly one default per scope and resolution never has to guess.
async fn promote_provider_account_default(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path(provider_account_id): Path<String>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    let scope = match scope_or_error(&context) {
        Ok(scope) => scope,
        Err(response) => return response,
    };
    match set_default_account(pg, &provider_account_id, &scope.caller()).await {
        Ok(Some(account)) => {
            audit_account(
                &context,
                pg,
                &scope,
                "provider_account.set_default",
                &account.id,
                json!({
                    "scopeType": account.scope_type,
                    "vendorCode": account.vendor_code,
                    "environment": account.environment,
                }),
            )
            .await;
            appbase_ok(account_to_json(&account))
        }
        Ok(None) => appbase_error(
            StatusCode::NOT_FOUND,
            "iam_provider_account_not_found",
            "provider account not found",
        ),
        Err(error) => provider_error(error),
    }
}

async fn delete_provider_account(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path(provider_account_id): Path<String>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    let scope = match scope_or_error(&context) {
        Ok(scope) => scope,
        Err(response) => return response,
    };
    match soft_delete_account(pg, &provider_account_id, &scope.caller()).await {
        Ok(true) => {
            audit_account(
                &context,
                pg,
                &scope,
                "provider_account.delete",
                &provider_account_id,
                json!({}),
            )
            .await;
            appbase_ok(json!({
                "accepted": true,
                "resourceId": provider_account_id,
                "status": "deleted",
            }))
        }
        Ok(false) => appbase_error(
            StatusCode::NOT_FOUND,
            "iam_provider_account_not_found",
            "provider account not found",
        ),
        Err(error) => provider_error(error),
    }
}

async fn list_provider_credentials(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path(provider_account_id): Path<String>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    let scope = match scope_or_error(&context) {
        Ok(scope) => scope,
        Err(response) => return response,
    };
    match list_credentials(pg, &scope.tenant_id, &provider_account_id).await {
        Ok(credentials) => {
            let items: Vec<Value> = credentials.iter().map(credential_to_json).collect();
            appbase_ok(json!({ "items": items }))
        }
        Err(error) => provider_error(error),
    }
}

/// Create the active credential for a slot.
///
/// Calling this again for the same slot rotates it: the previous active row is
/// superseded and consumers referencing the account pick up the new value with
/// no configuration change of their own.
async fn create_provider_credential(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path(provider_account_id): Path<String>,
    Json(body): Json<Value>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    let scope = match scope_or_error(&context) {
        Ok(scope) => scope,
        Err(response) => return response,
    };

    let credential_kind = read_string_field(&body, &["credentialKind", "credential_kind"])
        .unwrap_or_else(|| "access_key_pair".to_owned());
    let credential_name = read_string_field(&body, &["credentialName", "credential_name"])
        .unwrap_or_else(|| "default".to_owned());

    let new_credential = NewProviderCredential {
        provider_account_id,
        credential_kind,
        credential_name,
        access_key_id: read_string_field(&body, &["accessKeyId", "access_key_id"]),
        secret_access_key: read_string_field(&body, &["secretAccessKey", "secret_access_key"]),
        session_token: read_string_field(&body, &["sessionToken", "session_token"]),
        secret_text: read_string_field(&body, &["secretText", "secret_text"]),
        expires_at: read_string_field(&body, &["expiresAt", "expires_at"]),
        actor_id: scope.actor_id.clone(),
    };

    match upsert_active_credential(pg, &new_credential).await {
        Ok(credential) => {
            audit_account(
                &context,
                pg,
                &scope,
                "provider_credential.create",
                &credential.id,
                json!({
                    "providerAccountId": credential.provider_account_id,
                    "credentialKind": credential.credential_kind,
                    "credentialVersion": credential.credential_version.to_string(),
                }),
            )
            .await;
            appbase_ok(credential_to_json(&credential))
        }
        Err(error) => provider_error(error),
    }
}

async fn revoke_provider_credential(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path(credential_id): Path<String>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    let scope = match scope_or_error(&context) {
        Ok(scope) => scope,
        Err(response) => return response,
    };
    match revoke_credential(pg, &scope.tenant_id, &credential_id).await {
        Ok(true) => {
            audit_account(
                &context,
                pg,
                &scope,
                "provider_credential.revoke",
                &credential_id,
                json!({}),
            )
            .await;
            appbase_ok(json!({
                "accepted": true,
                "resourceId": credential_id,
                "status": "revoked",
            }))
        }
        Ok(false) => appbase_error(
            StatusCode::NOT_FOUND,
            "iam_provider_credential_not_found",
            "provider credential not found",
        ),
        Err(error) => provider_error(error),
    }
}

async fn audit_account(
    context: &WebRequestContext,
    pg: &sqlx::PgPool,
    scope: &RequestScope,
    action: &str,
    resource_id: &str,
    detail: Value,
) {
    let table = if action.starts_with("provider_credential") {
        CREDENTIAL_RESOURCE_TABLE
    } else {
        ACCOUNT_RESOURCE_TABLE
    };
    if let Err(error) = record_audit_event(
        pg,
        &scope.tenant_id,
        scope.organization_id.as_deref(),
        Some(&scope.actor_id),
        action,
        table,
        Some(resource_id),
        Some(context.request_id.0.as_str()),
        "prod",
        detail,
    )
    .await
    {
        tracing::warn!(error = %error, action, "provider account audit failed");
    }
}

#[cfg(test)]
mod visibility_tests {
    use super::*;

    /// The route layer's whole job in the scope model: turn the caller's granted
    /// codes into the three visibility flags. Everything above it (the catalog and
    /// the role grants) and everything below it (the SQL predicate) is covered
    /// elsewhere, so a mistake here would leave the two halves each correct and the
    /// chain broken.
    fn scope(can_manage_shared: bool) -> RequestScope {
        RequestScope {
            tenant_id: "tenant-1".to_owned(),
            organization_id: Some("org-1".to_owned()),
            actor_id: "user-1".to_owned(),
            can_manage_shared,
        }
    }

    #[test]
    fn the_shared_levels_ride_on_the_manage_shared_permission_alone() {
        let member = scope(false).visibility(true, None, None);
        assert!(
            !member.include_platform,
            "a member without the shared-account permission must not see platform accounts"
        );
        assert!(
            !member.include_tenant_shared,
            "a member without the shared-account permission must not browse the tenant default"
        );
        assert!(
            !member.include_organization_shared,
            "a member without the shared-account permission must not browse a shared \
             organization account"
        );

        let administrator = scope(true).visibility(false, None, None);
        assert!(
            !administrator.include_platform,
            "includePlatform is still a request: asking for it is not the same as being \
             allowed it"
        );
        assert!(administrator.include_tenant_shared);
        assert!(administrator.include_organization_shared);
    }

    #[test]
    fn a_query_parameter_cannot_widen_what_a_member_sees() {
        // `includePlatform=true` is what the console sends to render the global
        // defaults. Without the permission it must be ignored rather than honoured,
        // or a member could read the operator's credentials out of a listing.
        assert!(!scope(false).visibility(true, None, None).include_platform);
        assert!(scope(true).visibility(true, None, None).include_platform);
    }

    #[test]
    fn the_personal_layer_and_the_acting_organization_travel_with_the_caller() {
        let visibility = scope(false).visibility(false, Some("user".to_owned()), None);
        assert_eq!(Some("user-1"), visibility.user_id.as_deref());
        assert_eq!(Some("org-1"), visibility.organization_id.as_deref());
        assert_eq!("tenant-1", visibility.tenant_id);
        assert_eq!(Some("user"), visibility.scope_type.as_deref());
    }

    #[test]
    fn the_caller_handed_to_the_service_carries_the_same_shared_account_right() {
        // One value crosses the boundary, so a write cannot be held to a different
        // rule from the listing that led to it.
        assert!(!scope(false).caller().may_manage_shared);
        assert!(scope(true).caller().may_manage_shared);

        let caller_scope = scope(false);
        let caller = caller_scope.caller();
        assert_eq!("tenant-1", caller.tenant_id);
        assert_eq!(Some("user-1"), caller.user_id);
        assert_eq!(Some("org-1"), caller.organization_id);
        assert_eq!(
            "iam.provider_accounts.manage_shared",
            PERM_MANAGE_SHARED_ACCOUNTS
        );
    }
}
