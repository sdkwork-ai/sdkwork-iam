//! Backend management of installation environments and their OAuth credentials.
//!
//! Every operation is tenant-scoped: the handler first refuses a path tenant the
//! caller may not reach (the existing `iam.installations.update` boundary),
//! then the adapter queries filter by that tenant, so a row of another tenant is
//! indistinguishable from a missing row.
//!
//! Credential secrets are one-time output only: the create and rotate responses
//! carry the plaintext `clientSecret` once, and every read path returns metadata
//! only.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post, put},
    Json, Router,
};
use sdkwork_iam_web_adapter::{
    classify_installation_lifecycle_error, create_installation_credential,
    delete_installation_environment, installation_credential_to_json,
    installation_environment_to_json, installation_lifecycle_error_detail,
    list_installation_credentials, list_installation_environments,
    parse_installation_credential_create_command, parse_installation_credential_rotate_command,
    parse_installation_environment_upsert_command, revoke_installation_credential,
    rotate_installation_credential, upsert_installation_environment,
    InstallationLifecycleErrorKind,
};
use sdkwork_utils_rust::{offset_list_page_data, sdkwork_resource_json};
use sdkwork_web_core::WebRequestContext;
use serde_json::{json, Value};

use crate::backend_sql::{list_page_params_or_error, ListPageParams};
use crate::handlers::{
    appbase_error, appbase_ok, ensure_target_tenant_access, postgres_pool_or_error, BackendIamState,
};

pub(crate) fn apply_installation_lifecycle_routes(
    router: Router<BackendIamState>,
) -> Router<BackendIamState> {
    router
        // Canonical installation subresource surface (transport migration window).
        .route(
            "/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/environments",
            get(list_environments_handler),
        )
        .route(
            "/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/environments/{environmentKey}",
            put(upsert_environment_handler).delete(delete_environment_handler),
        )
        .route(
            "/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/credentials",
            get(list_credentials_handler).post(create_credential_handler),
        )
        .route(
            "/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/credentials/{credentialId}/rotate",
            post(rotate_credential_handler),
        )
        .route(
            "/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/credentials/{credentialId}/revoke",
            post(revoke_credential_handler),
        )
}

fn lifecycle_error(message: String, internal_code: &str) -> Response {
    let detail = installation_lifecycle_error_detail(&message).to_owned();
    match classify_installation_lifecycle_error(&message) {
        InstallationLifecycleErrorKind::Conflict => appbase_error(
            StatusCode::CONFLICT,
            "iam_installation_lifecycle_conflict",
            &detail,
        ),
        InstallationLifecycleErrorKind::NotFound => appbase_error(
            StatusCode::NOT_FOUND,
            "iam_installation_lifecycle_not_found",
            &detail,
        ),
        InstallationLifecycleErrorKind::Invalid => appbase_error(
            StatusCode::BAD_REQUEST,
            "iam_installation_lifecycle_invalid",
            &detail,
        ),
        InstallationLifecycleErrorKind::Internal => {
            tracing::error!(error = %message, wire_code = internal_code, "installation lifecycle handler failed");
            appbase_error(
                StatusCode::SERVICE_UNAVAILABLE,
                internal_code,
                "installation lifecycle operation failed",
            )
        }
    }
}

fn list_page_json(items: Vec<Value>, total: i64, params: ListPageParams) -> Value {
    serde_json::to_value(offset_list_page_data(items, total, params))
        .unwrap_or_else(|_| json!({ "items": [], "pageInfo": { "mode": "offset" } }))
}

async fn list_environments_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, installation_id)): Path<(String, String)>,
    Query(query): Query<std::collections::HashMap<String, String>>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let params = match list_page_params_or_error(&query) {
        Ok(params) => params,
        Err(response) => return response,
    };

    match list_installation_environments(
        pg,
        &tenant_id,
        &installation_id,
        params.page_size,
        params.offset,
    )
    .await
    {
        Ok(page) => {
            let items = page
                .items
                .iter()
                .map(installation_environment_to_json)
                .collect::<Vec<_>>();
            appbase_ok(list_page_json(items, page.total, params))
        }
        Err(message) => lifecycle_error(message, "iam_installation_environment_list_failed"),
    }
}

async fn upsert_environment_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, installation_id, environment_key)): Path<(String, String, String)>,
    Json(body): Json<Value>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }

    let mut command = match parse_installation_environment_upsert_command(&body) {
        Ok(command) => command,
        Err(message) => {
            return lifecycle_error(message, "iam_installation_environment_upsert_failed")
        }
    };
    match command.env_key.as_deref() {
        Some(body_key)
            if sdkwork_iam_web_adapter::normalize_environment_key(body_key)
                != sdkwork_iam_web_adapter::normalize_environment_key(&environment_key) =>
        {
            return lifecycle_error(
                "invalid: environmentKey in the body must match the environmentKey path parameter"
                    .to_owned(),
                "iam_installation_environment_upsert_failed",
            );
        }
        _ => command.env_key = Some(environment_key),
    }

    match upsert_installation_environment(pg, &tenant_id, &installation_id, &command).await {
        Ok(environment) => appbase_ok(sdkwork_resource_json(installation_environment_to_json(
            &environment,
        ))),
        Err(message) => lifecycle_error(message, "iam_installation_environment_upsert_failed"),
    }
}

async fn delete_environment_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, installation_id, environment_key)): Path<(String, String, String)>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }

    match delete_installation_environment(pg, &tenant_id, &installation_id, &environment_key).await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(message) => lifecycle_error(message, "iam_installation_environment_delete_failed"),
    }
}

async fn list_credentials_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, installation_id)): Path<(String, String)>,
    Query(query): Query<std::collections::HashMap<String, String>>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let params = match list_page_params_or_error(&query) {
        Ok(params) => params,
        Err(response) => return response,
    };

    match list_installation_credentials(
        pg,
        &tenant_id,
        &installation_id,
        params.page_size,
        params.offset,
    )
    .await
    {
        Ok(page) => {
            let items = page
                .items
                .iter()
                .map(|credential| installation_credential_to_json(credential, None))
                .collect::<Vec<_>>();
            appbase_ok(list_page_json(items, page.total, params))
        }
        Err(message) => lifecycle_error(message, "iam_installation_credential_list_failed"),
    }
}

async fn create_credential_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, installation_id)): Path<(String, String)>,
    Json(body): Json<Value>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let command = match parse_installation_credential_create_command(&body) {
        Ok(command) => command,
        Err(message) => {
            return lifecycle_error(message, "iam_installation_credential_create_failed")
        }
    };

    match create_installation_credential(pg, &tenant_id, &installation_id, &command).await {
        Ok((credential, client_secret)) => {
            let item = installation_credential_to_json(&credential, Some(&client_secret));
            let mut response = appbase_ok(sdkwork_resource_json(item));
            *response.status_mut() = StatusCode::CREATED;
            response
        }
        Err(message) => lifecycle_error(message, "iam_installation_credential_create_failed"),
    }
}

async fn rotate_credential_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, installation_id, credential_id)): Path<(String, String, String)>,
    Json(body): Json<Value>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let command = match parse_installation_credential_rotate_command(&body) {
        Ok(command) => command,
        Err(message) => {
            return lifecycle_error(message, "iam_installation_credential_rotate_failed")
        }
    };

    match rotate_installation_credential(pg, &tenant_id, &installation_id, &credential_id, &command)
        .await
    {
        Ok((credential, client_secret)) => appbase_ok(sdkwork_resource_json(
            installation_credential_to_json(&credential, Some(&client_secret)),
        )),
        Err(message) => lifecycle_error(message, "iam_installation_credential_rotate_failed"),
    }
}

async fn revoke_credential_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, installation_id, credential_id)): Path<(String, String, String)>,
    Json(_body): Json<Value>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }

    match revoke_installation_credential(pg, &tenant_id, &installation_id, &credential_id).await {
        Ok(credential) => appbase_ok(json!({
            "accepted": true,
            "resourceId": credential.id,
            "status": credential.credential_status,
        })),
        Err(message) => lifecycle_error(message, "iam_installation_credential_revoke_failed"),
    }
}
