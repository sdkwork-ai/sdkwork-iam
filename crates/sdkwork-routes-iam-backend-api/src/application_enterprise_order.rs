//! Backend routes for application enterprise-authorization orders.
//!
//! Two planes share this module because they are two views of one row:
//!
//! * **publisher plane** — `tenants/{tenantId}/applications/{applicationId}/enterprise_orders*`:
//!   the tenant that owns the application creates, lists, cancels and terminates
//!   its orders.
//! * **enterprise plane** — `tenants/{tenantId}/enterprise_orders*`: the grantee
//!   enterprise confirms the grant through its one-time link, lists what it was
//!   granted, and assigns or releases seats against its own members.
//!
//! Every operation first refuses a path tenant the caller may not reach
//! (`ensure_target_tenant_access`), then the adapter query binds that tenant, so
//! a row of another tenant is indistinguishable from a missing row.

use std::collections::HashMap;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{delete, get, post},
    Json, Router,
};
use sdkwork_iam_web_adapter::{
    assign_enterprise_seat, authorize_enterprise_order, bulk_release_enterprise_seats,
    cancel_enterprise_order, classify_enterprise_order_error, confirm_enterprise_order_termination,
    create_enterprise_order, create_enterprise_seat_blacklist, create_enterprise_seat_policy,
    delete_enterprise_seat_blacklist, delete_enterprise_seat_policy, ensure_enterprise_order_scope,
    enterprise_order_error_detail, enterprise_order_to_json, enterprise_order_with_link_to_json,
    export_enterprise_seats, list_enterprise_order_events, list_enterprise_orders,
    list_enterprise_orders_for_enterprise, list_enterprise_seat_blacklist,
    list_enterprise_seat_policies, list_enterprise_seats, parse_enterprise_order_create_command,
    parse_enterprise_order_terminate_command, parse_enterprise_seat_assign_command,
    release_enterprise_seat, request_enterprise_order_termination,
    resolve_enterprise_management_scope, retrieve_enterprise_order,
    retrieve_enterprise_seat_policy, update_enterprise_order, update_enterprise_seat_policy,
    EnterpriseManagementScope, EnterpriseOrder, EnterpriseOrderErrorKind,
    EnterpriseSeatPolicyDisposition,
};
use sdkwork_utils_rust::{offset_list_page_data, sdkwork_resource_json};
use sdkwork_web_core::WebRequestContext;
use serde_json::{json, Value};

use crate::backend_sql::{list_page_params_or_error, ListPageParams};
use crate::handlers::{
    appbase_error, appbase_ok, ensure_target_tenant_access, postgres_pool_or_error, BackendIamState,
};

const PUBLISHER_ORDERS: &str =
    "/backend/v3/api/iam/tenants/{tenantId}/applications/{applicationId}/enterprise_orders";
const PUBLISHER_ORDER: &str =
    "/backend/v3/api/iam/tenants/{tenantId}/applications/{applicationId}/enterprise_orders/{orderId}";
const PUBLISHER_ORDER_CANCEL: &str = "/backend/v3/api/iam/tenants/{tenantId}/applications/{applicationId}/enterprise_orders/{orderId}/cancel";
const PUBLISHER_ORDER_TERMINATE: &str = "/backend/v3/api/iam/tenants/{tenantId}/applications/{applicationId}/enterprise_orders/{orderId}/terminate";
const PUBLISHER_ORDER_EVENTS: &str = "/backend/v3/api/iam/tenants/{tenantId}/applications/{applicationId}/enterprise_orders/{orderId}/events";
const ENTERPRISE_ORDERS: &str = "/backend/v3/api/iam/tenants/{tenantId}/enterprise_orders";
const ENTERPRISE_ORDER_SEATS: &str =
    "/backend/v3/api/iam/tenants/{tenantId}/enterprise_orders/{orderId}/seats";
const ENTERPRISE_ORDER: &str = "/backend/v3/api/iam/tenants/{tenantId}/enterprise_orders/{orderId}";
const ENTERPRISE_ORDER_SEAT: &str =
    "/backend/v3/api/iam/tenants/{tenantId}/enterprise_orders/{orderId}/seats/{seatId}";
const ENTERPRISE_ORDER_POLICIES: &str =
    "/backend/v3/api/iam/tenants/{tenantId}/enterprise_orders/{orderId}/seat_policies";
const ENTERPRISE_ORDER_POLICY: &str =
    "/backend/v3/api/iam/tenants/{tenantId}/enterprise_orders/{orderId}/seat_policies/{policyId}";
const ENTERPRISE_ORDER_BLACKLIST: &str =
    "/backend/v3/api/iam/tenants/{tenantId}/enterprise_orders/{orderId}/seat_blacklist";
const ENTERPRISE_ORDER_BLACKLIST_ENTRY: &str =
    "/backend/v3/api/iam/tenants/{tenantId}/enterprise_orders/{orderId}/seat_blacklist/{entryId}";
const ENTERPRISE_ORDER_BULK_RELEASE: &str =
    "/backend/v3/api/iam/tenants/{tenantId}/enterprise_orders/{orderId}/seats/bulk_release";
const ENTERPRISE_ORDER_EXPORT: &str =
    "/backend/v3/api/iam/tenants/{tenantId}/enterprise_orders/{orderId}/seats/export";
const ENTERPRISE_ORDER_AUTHORIZATIONS: &str =
    "/backend/v3/api/iam/tenants/{tenantId}/enterprise_order_authorizations";
const ENTERPRISE_ORDER_TERMINATIONS: &str =
    "/backend/v3/api/iam/tenants/{tenantId}/enterprise_order_terminations";

pub(crate) fn apply_application_enterprise_order_routes(
    router: Router<BackendIamState>,
) -> Router<BackendIamState> {
    router
        .route(
            PUBLISHER_ORDERS,
            get(list_publisher_orders_handler).post(create_order_handler),
        )
        .route(PUBLISHER_ORDER, get(retrieve_order_handler))
        .route(PUBLISHER_ORDER_CANCEL, post(cancel_order_handler))
        .route(PUBLISHER_ORDER_TERMINATE, post(request_termination_handler))
        .route(PUBLISHER_ORDER_EVENTS, get(list_events_handler))
        .route(ENTERPRISE_ORDERS, get(list_enterprise_orders_handler))
        .route(
            ENTERPRISE_ORDER,
            get(retrieve_enterprise_order_handler).patch(update_enterprise_order_handler),
        )
        .route(
            ENTERPRISE_ORDER_POLICIES,
            get(list_policies_handler).post(create_policy_handler),
        )
        .route(
            ENTERPRISE_ORDER_POLICY,
            get(retrieve_policy_handler)
                .patch(update_policy_handler)
                .delete(delete_policy_handler),
        )
        .route(
            ENTERPRISE_ORDER_BLACKLIST,
            get(list_blacklist_handler).post(create_blacklist_handler),
        )
        .route(
            ENTERPRISE_ORDER_BLACKLIST_ENTRY,
            delete(delete_blacklist_handler),
        )
        .route(ENTERPRISE_ORDER_BULK_RELEASE, post(bulk_release_handler))
        .route(ENTERPRISE_ORDER_EXPORT, post(export_handler))
        .route(
            ENTERPRISE_ORDER_SEATS,
            get(list_seats_handler).post(assign_seat_handler),
        )
        .route(
            ENTERPRISE_ORDER_SEAT,
            axum::routing::delete(release_seat_handler),
        )
        .route(
            ENTERPRISE_ORDER_AUTHORIZATIONS,
            post(authorize_order_handler),
        )
        .route(
            ENTERPRISE_ORDER_TERMINATIONS,
            post(confirm_termination_handler),
        )
}

fn order_error(message: String, internal_code: &str) -> Response {
    let detail = enterprise_order_error_detail(&message).to_owned();
    match classify_enterprise_order_error(&message) {
        EnterpriseOrderErrorKind::Conflict => appbase_error(
            StatusCode::CONFLICT,
            "iam_enterprise_order_conflict",
            &detail,
        ),
        EnterpriseOrderErrorKind::NotFound => appbase_error(
            StatusCode::NOT_FOUND,
            "iam_enterprise_order_not_found",
            &detail,
        ),
        EnterpriseOrderErrorKind::Forbidden => appbase_error(
            StatusCode::FORBIDDEN,
            "iam_enterprise_order_forbidden",
            &detail,
        ),
        EnterpriseOrderErrorKind::Invalid => appbase_error(
            StatusCode::BAD_REQUEST,
            "iam_enterprise_order_invalid",
            &detail,
        ),
        EnterpriseOrderErrorKind::Internal => {
            tracing::error!(error = %message, wire_code = internal_code, "enterprise order handler failed");
            appbase_error(
                StatusCode::SERVICE_UNAVAILABLE,
                internal_code,
                "enterprise order operation failed",
            )
        }
    }
}

fn list_page_json(items: Vec<Value>, total: i64, params: ListPageParams) -> Value {
    serde_json::to_value(offset_list_page_data(items, total, params))
        .unwrap_or_else(|_| json!({ "items": [], "pageInfo": { "mode": "offset" } }))
}

fn actor_id(context: &WebRequestContext) -> String {
    context
        .principal()
        .map(|principal| principal.user_id().to_owned())
        .unwrap_or_else(|| "0".to_owned())
}

async fn enterprise_order_access(
    pg: &sqlx::PgPool,
    context: &WebRequestContext,
    tenant_id: &str,
    order_id: &str,
    manage: bool,
) -> Result<(EnterpriseOrder, EnterpriseManagementScope), Response> {
    if let Err(response) = ensure_target_tenant_access(context, tenant_id) {
        return Err(response);
    }
    ensure_enterprise_order_scope(pg, tenant_id, &actor_id(context), order_id, manage)
        .await
        .map_err(|message| order_error(message, "iam_enterprise_order_scope_failed"))
}

fn created(item: Value) -> Response {
    let mut response = appbase_ok(sdkwork_resource_json(item));
    *response.status_mut() = StatusCode::CREATED;
    response
}

async fn list_publisher_orders_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, application_id)): Path<(String, String)>,
    Query(query): Query<HashMap<String, String>>,
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
    let status = query.get("status").map(String::as_str);
    match list_enterprise_orders(
        pg,
        &tenant_id,
        Some(application_id.as_str()),
        status,
        i64::from(params.page_size),
        params.offset,
    )
    .await
    {
        Ok((orders, total)) => {
            let items = orders
                .iter()
                .map(enterprise_order_to_json)
                .collect::<Vec<_>>();
            appbase_ok(list_page_json(items, total, params))
        }
        Err(message) => order_error(message, "iam_enterprise_order_list_failed"),
    }
}

async fn create_order_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, application_id)): Path<(String, String)>,
    Json(body): Json<Value>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let mut command = match parse_enterprise_order_create_command(&body) {
        Ok(command) => command,
        Err(message) => return order_error(message, "iam_enterprise_order_create_failed"),
    };
    // The path names the application; a body that disagrees is a client bug, not
    // a second source of truth.
    command.application_id = application_id.clone();
    let organization_id = body
        .get("organizationId")
        .and_then(Value::as_str)
        .unwrap_or("0");
    let actor_id = context
        .principal()
        .map(|principal| principal.user_id().to_owned())
        .unwrap_or_else(|| "0".to_owned());
    match create_enterprise_order(pg, &tenant_id, organization_id, &actor_id, &command).await {
        Ok(issued) => created(enterprise_order_with_link_to_json(&issued)),
        Err(message) => order_error(message, "iam_enterprise_order_create_failed"),
    }
}

async fn retrieve_order_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, _application_id, order_id)): Path<(String, String, String)>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    match retrieve_enterprise_order(pg, &tenant_id, &order_id).await {
        Ok(order) => appbase_ok(sdkwork_resource_json(enterprise_order_to_json(&order))),
        Err(message) => order_error(message, "iam_enterprise_order_retrieve_failed"),
    }
}

async fn cancel_order_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, _application_id, order_id)): Path<(String, String, String)>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let actor_id = context
        .principal()
        .map(|principal| principal.user_id().to_owned())
        .unwrap_or_else(|| "0".to_owned());
    match cancel_enterprise_order(pg, &tenant_id, &actor_id, &order_id).await {
        Ok(order) => appbase_ok(sdkwork_resource_json(enterprise_order_to_json(&order))),
        Err(message) => order_error(message, "iam_enterprise_order_cancel_failed"),
    }
}

async fn request_termination_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, _application_id, order_id)): Path<(String, String, String)>,
    Json(body): Json<Value>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let command = match parse_enterprise_order_terminate_command(&body) {
        Ok(command) => command,
        Err(message) => return order_error(message, "iam_enterprise_order_terminate_failed"),
    };
    let actor_id = context
        .principal()
        .map(|principal| principal.user_id().to_owned())
        .unwrap_or_else(|| "0".to_owned());
    match request_enterprise_order_termination(pg, &tenant_id, &actor_id, &order_id, &command).await
    {
        Ok(issued) => appbase_ok(sdkwork_resource_json(enterprise_order_with_link_to_json(
            &issued,
        ))),
        Err(message) => order_error(message, "iam_enterprise_order_terminate_failed"),
    }
}

async fn list_events_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, _application_id, order_id)): Path<(String, String, String)>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    match list_enterprise_order_events(pg, &tenant_id, &order_id).await {
        Ok(events) => {
            let items = events
                .iter()
                .map(|event| serde_json::to_value(event).unwrap_or_else(|_| json!({})))
                .collect::<Vec<_>>();
            let total = items.len() as i64;
            let params = match list_page_params_or_error(&HashMap::new()) {
                Ok(params) => params,
                Err(response) => return response,
            };
            appbase_ok(list_page_json(items, total, params))
        }
        Err(message) => order_error(message, "iam_enterprise_order_events_failed"),
    }
}

async fn list_enterprise_orders_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path(tenant_id): Path<String>,
    Query(query): Query<HashMap<String, String>>,
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
    let status = query.get("status").map(String::as_str);
    let scope = match resolve_enterprise_management_scope(
        pg,
        &tenant_id,
        &actor_id(&context),
        "iam.enterprise_orders.read",
    )
    .await
    {
        Ok(scope) => scope,
        Err(message) => return order_error(message, "iam_enterprise_order_scope_failed"),
    };
    match list_enterprise_orders_for_enterprise(
        pg,
        &tenant_id,
        status,
        query.get("q").map(String::as_str),
        query.get("authorization_mode").map(String::as_str),
        &actor_id(&context),
        &scope,
        i64::from(params.page_size),
        params.offset,
    )
    .await
    {
        Ok((orders, total)) => {
            let items = orders
                .into_iter()
                .map(|mut order| {
                    order.management_scope = Some(scope.kind.clone());
                    enterprise_order_to_json(&order)
                })
                .collect::<Vec<_>>();
            appbase_ok(list_page_json(items, total, params))
        }
        Err(message) => order_error(message, "iam_enterprise_order_grant_list_failed"),
    }
}

async fn list_seats_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, order_id)): Path<(String, String)>,
    Query(query): Query<HashMap<String, String>>,
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
    let (_, scope) = match enterprise_order_access(pg, &context, &tenant_id, &order_id, false).await
    {
        Ok(access) => access,
        Err(response) => return response,
    };
    let status = query.get("status").map(String::as_str);
    match list_enterprise_seats(
        pg,
        &tenant_id,
        &actor_id(&context),
        &order_id,
        status,
        query.get("q").map(String::as_str),
        &scope,
        i64::from(params.page_size),
        params.offset,
    )
    .await
    {
        Ok((seats, total)) => {
            let items = seats
                .iter()
                .map(|seat| serde_json::to_value(seat).unwrap_or_else(|_| json!({})))
                .collect::<Vec<_>>();
            appbase_ok(list_page_json(items, total, params))
        }
        Err(message) => order_error(message, "iam_enterprise_seat_list_failed"),
    }
}

async fn assign_seat_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, order_id)): Path<(String, String)>,
    Json(body): Json<Value>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let command = match parse_enterprise_seat_assign_command(&body) {
        Ok(command) => command,
        Err(message) => return order_error(message, "iam_enterprise_seat_assign_failed"),
    };
    let actor_id = context
        .principal()
        .map(|principal| principal.user_id().to_owned())
        .unwrap_or_else(|| "0".to_owned());
    let (_, scope) = match enterprise_order_access(pg, &context, &tenant_id, &order_id, true).await
    {
        Ok(access) => access,
        Err(response) => return response,
    };
    match assign_enterprise_seat(pg, &tenant_id, &actor_id, &order_id, &command, &scope).await {
        Ok(seat) => created(sdkwork_resource_json(
            serde_json::to_value(&seat).unwrap_or_else(|_| json!({})),
        )),
        Err(message) => order_error(message, "iam_enterprise_seat_assign_failed"),
    }
}

async fn release_seat_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, order_id, seat_id)): Path<(String, String, String)>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let actor_id = context
        .principal()
        .map(|principal| principal.user_id().to_owned())
        .unwrap_or_else(|| "0".to_owned());
    let (_, scope) = match enterprise_order_access(pg, &context, &tenant_id, &order_id, true).await
    {
        Ok(access) => access,
        Err(response) => return response,
    };
    match release_enterprise_seat(pg, &tenant_id, &actor_id, &order_id, &seat_id, &scope).await {
        // The seat row stays for audit; the operation answers `204` because the
        // addressed assignment no longer exists in the active set.
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(message) => order_error(message, "iam_enterprise_seat_release_failed"),
    }
}

fn parse_body<T: serde::de::DeserializeOwned>(body: &Value, code: &str) -> Result<T, Response> {
    let parsed: Result<T, _> = serde_json::from_value(body.clone());
    parsed.map_err(|error| {
        order_error(
            format!("enterprise_order_invalid:invalid body: {error}"),
            code,
        )
    })
}

async fn retrieve_enterprise_order_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, order_id)): Path<(String, String)>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let (mut order, scope) =
        match enterprise_order_access(pg, &context, &tenant_id, &order_id, false).await {
            Ok(access) => access,
            Err(response) => return response,
        };
    order.management_scope = Some(scope.kind);
    appbase_ok(sdkwork_resource_json(enterprise_order_to_json(&order)))
}

async fn update_enterprise_order_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, order_id)): Path<(String, String)>,
    Json(body): Json<Value>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let command = match parse_body(&body, "iam_enterprise_order_update_failed") {
        Ok(v) => v,
        Err(r) => return r,
    };
    let (_, scope) = match enterprise_order_access(pg, &context, &tenant_id, &order_id, true).await
    {
        Ok(v) => v,
        Err(r) => return r,
    };
    match update_enterprise_order(pg, &tenant_id, &actor_id(&context), &order_id, &command).await {
        Ok(mut order) => {
            order.management_scope = Some(scope.kind);
            appbase_ok(sdkwork_resource_json(enterprise_order_to_json(&order)))
        }
        Err(message) => order_error(message, "iam_enterprise_order_update_failed"),
    }
}

async fn list_policies_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, order_id)): Path<(String, String)>,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let params = match list_page_params_or_error(&query) {
        Ok(v) => v,
        Err(r) => return r,
    };
    match list_enterprise_seat_policies(
        pg,
        &tenant_id,
        &actor_id(&context),
        &order_id,
        query.get("q").map(String::as_str),
        i64::from(params.page_size),
        params.offset,
    )
    .await
    {
        Ok((items, total)) => appbase_ok(list_page_json(
            items
                .iter()
                .map(|v| serde_json::to_value(v).unwrap_or_else(|_| json!({})))
                .collect(),
            total,
            params,
        )),
        Err(message) => order_error(message, "iam_enterprise_seat_policy_list_failed"),
    }
}

async fn retrieve_policy_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, order_id, policy_id)): Path<(String, String, String)>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    match retrieve_enterprise_seat_policy(
        pg,
        &tenant_id,
        &actor_id(&context),
        &order_id,
        &policy_id,
    )
    .await
    {
        Ok(item) => appbase_ok(sdkwork_resource_json(
            serde_json::to_value(item).unwrap_or_else(|_| json!({})),
        )),
        Err(message) => order_error(message, "iam_enterprise_seat_policy_retrieve_failed"),
    }
}

async fn create_policy_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, order_id)): Path<(String, String)>,
    Json(body): Json<Value>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let command = match parse_body(&body, "iam_enterprise_seat_policy_create_failed") {
        Ok(v) => v,
        Err(r) => return r,
    };
    match create_enterprise_seat_policy(pg, &tenant_id, &actor_id(&context), &order_id, &command)
        .await
    {
        Ok(item) => created(sdkwork_resource_json(
            serde_json::to_value(item).unwrap_or_else(|_| json!({})),
        )),
        Err(message) => order_error(message, "iam_enterprise_seat_policy_create_failed"),
    }
}

async fn update_policy_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, order_id, policy_id)): Path<(String, String, String)>,
    Json(body): Json<Value>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let command = match parse_body(&body, "iam_enterprise_seat_policy_update_failed") {
        Ok(v) => v,
        Err(r) => return r,
    };
    match update_enterprise_seat_policy(
        pg,
        &tenant_id,
        &actor_id(&context),
        &order_id,
        &policy_id,
        &command,
    )
    .await
    {
        Ok(item) => appbase_ok(sdkwork_resource_json(
            serde_json::to_value(item).unwrap_or_else(|_| json!({})),
        )),
        Err(message) => order_error(message, "iam_enterprise_seat_policy_update_failed"),
    }
}

async fn delete_policy_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, order_id, policy_id)): Path<(String, String, String)>,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let disposition = match query
        .get("disposition")
        .map(String::as_str)
        .unwrap_or("release")
    {
        value => match EnterpriseSeatPolicyDisposition::parse(value) {
            Ok(value) => value,
            Err(message) => {
                return order_error(message, "iam_enterprise_seat_policy_delete_failed")
            }
        },
    };
    match delete_enterprise_seat_policy(
        pg,
        &tenant_id,
        &actor_id(&context),
        &order_id,
        &policy_id,
        disposition,
    )
    .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(message) => order_error(message, "iam_enterprise_seat_policy_delete_failed"),
    }
}

async fn list_blacklist_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, order_id)): Path<(String, String)>,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let params = match list_page_params_or_error(&query) {
        Ok(v) => v,
        Err(r) => return r,
    };
    match list_enterprise_seat_blacklist(
        pg,
        &tenant_id,
        &actor_id(&context),
        &order_id,
        query.get("q").map(String::as_str),
        i64::from(params.page_size),
        params.offset,
    )
    .await
    {
        Ok((items, total)) => appbase_ok(list_page_json(
            items
                .iter()
                .map(|v| serde_json::to_value(v).unwrap_or_else(|_| json!({})))
                .collect(),
            total,
            params,
        )),
        Err(message) => order_error(message, "iam_enterprise_seat_blacklist_list_failed"),
    }
}

async fn create_blacklist_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, order_id)): Path<(String, String)>,
    Json(body): Json<Value>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let command = match parse_body(&body, "iam_enterprise_seat_blacklist_create_failed") {
        Ok(v) => v,
        Err(r) => return r,
    };
    match create_enterprise_seat_blacklist(pg, &tenant_id, &actor_id(&context), &order_id, &command)
        .await
    {
        Ok(item) => created(sdkwork_resource_json(
            serde_json::to_value(item).unwrap_or_else(|_| json!({})),
        )),
        Err(message) => order_error(message, "iam_enterprise_seat_blacklist_create_failed"),
    }
}

async fn delete_blacklist_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, order_id, entry_id)): Path<(String, String, String)>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    match delete_enterprise_seat_blacklist(
        pg,
        &tenant_id,
        &actor_id(&context),
        &order_id,
        &entry_id,
    )
    .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(message) => order_error(message, "iam_enterprise_seat_blacklist_delete_failed"),
    }
}

async fn bulk_release_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, order_id)): Path<(String, String)>,
    Json(body): Json<Value>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let command = match parse_body(&body, "iam_enterprise_seats_bulk_release_failed") {
        Ok(v) => v,
        Err(r) => return r,
    };
    match bulk_release_enterprise_seats(pg, &tenant_id, &actor_id(&context), &order_id, &command)
        .await
    {
        Ok(result) => appbase_ok(serde_json::to_value(result).unwrap_or_else(|_| json!({}))),
        Err(message) => order_error(message, "iam_enterprise_seats_bulk_release_failed"),
    }
}

async fn export_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path((tenant_id, order_id)): Path<(String, String)>,
    Json(body): Json<Value>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let command = match parse_body(&body, "iam_enterprise_seats_export_failed") {
        Ok(v) => v,
        Err(r) => return r,
    };
    match export_enterprise_seats(pg, &tenant_id, &actor_id(&context), &order_id, &command).await {
        Ok(result) => appbase_ok(serde_json::to_value(result).unwrap_or_else(|_| json!({}))),
        Err(message) => order_error(message, "iam_enterprise_seats_export_failed"),
    }
}

async fn authorize_order_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path(tenant_id): Path<String>,
    Json(body): Json<Value>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let Some(token) = body
        .get("token")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return order_error(
            "enterprise_order_invalid:token is required".to_owned(),
            "iam_enterprise_order_authorize_failed",
        );
    };
    let actor_id = context
        .principal()
        .map(|principal| principal.user_id().to_owned())
        .unwrap_or_else(|| "0".to_owned());
    match authorize_enterprise_order(pg, &tenant_id, token, &actor_id).await {
        Ok(order) => appbase_ok(sdkwork_resource_json(enterprise_order_to_json(&order))),
        Err(message) => order_error(message, "iam_enterprise_order_authorize_failed"),
    }
}

async fn confirm_termination_handler(
    State(state): State<BackendIamState>,
    context: WebRequestContext,
    Path(tenant_id): Path<String>,
    Json(body): Json<Value>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    if let Err(response) = ensure_target_tenant_access(&context, &tenant_id) {
        return response;
    }
    let Some(token) = body
        .get("token")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return order_error(
            "enterprise_order_invalid:token is required".to_owned(),
            "iam_enterprise_order_termination_confirm_failed",
        );
    };
    let actor_id = context
        .principal()
        .map(|principal| principal.user_id().to_owned())
        .unwrap_or_else(|| "0".to_owned());
    match confirm_enterprise_order_termination(pg, &tenant_id, token, &actor_id).await {
        Ok(order) => appbase_ok(sdkwork_resource_json(enterprise_order_to_json(&order))),
        Err(message) => order_error(message, "iam_enterprise_order_termination_confirm_failed"),
    }
}
