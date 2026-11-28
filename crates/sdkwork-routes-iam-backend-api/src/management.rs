//! Tenant-scoped IAM directory and RBAC management handlers for backend-api.

use std::collections::HashMap;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{delete, get, patch, post, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use sdkwork_utils_rust::sdkwork_resource_json;
use sdkwork_web_core::WebRequestContext;
use serde_json::{json, Value};
use sqlx::{Executor, PgPool, Postgres, Row, Transaction};
use uuid::Uuid;

use crate::backend_audit::{
    directory_create_with_audit, execute_conditional_mutation_with_audit,
    execute_conditional_mutation_with_audit_typed, execute_mutation_with_audit,
    record_backend_mutation_audit_tx,
};
use crate::backend_sql::{
    cursor_page_json, encode_timeline_keyset_cursor, internal_handler_error,
    list_page_invalid_parameter_error, list_page_params_or_error, list_search_pattern,
    list_tenant_rows, optional_query_value, page_json_from_rows, patch_tenant_row_tx,
    read_i32_field, read_patch_text, read_string_field, retrieve_tenant_row,
    role_binding_list_filter_sql, role_binding_list_filter_values, timeline_cursor_page_from_rows,
    timeline_list_params_or_error, tree_resource_json, PatchValue, TimelineListParams,
    LIST_TOTAL_COLUMN,
};
use crate::handlers::{
    actor_user_id_from_context, appbase_created, appbase_error, appbase_ok,
    assigner_permission_scope, ensure_platform_catalog_access, ensure_target_tenant_access,
    organization_id_from_context, postgres_pool_or_error, tenant_id_from_context, BackendIamState,
};

pub fn apply_management_routes(router: Router<BackendIamState>) -> Router<BackendIamState> {
    router
        .route(
            "/backend/v3/api/iam/users",
            get(list_users).post(create_user),
        )
        .route(
            "/backend/v3/api/iam/users/{userId}",
            get(retrieve_user).patch(update_user).delete(delete_user),
        )
        .route("/backend/v3/api/iam/users/{userId}/ban", post(ban_user))
        .route("/backend/v3/api/iam/users/{userId}/unban", post(unban_user))
        .route(
            "/backend/v3/api/iam/roles",
            get(list_roles).post(create_role),
        )
        .route(
            "/backend/v3/api/iam/roles/{roleId}",
            get(retrieve_role).patch(update_role).delete(delete_role),
        )
        .route(
            "/backend/v3/api/iam/roles/{roleId}/permissions",
            get(list_role_permissions).post(create_role_permission),
        )
        .route(
            "/backend/v3/api/iam/roles/{roleId}/permissions/{permissionId}",
            delete(delete_role_permission),
        )
        .route(
            "/backend/v3/api/iam/permissions",
            get(list_permissions).post(create_permission),
        )
        .route(
            "/backend/v3/api/iam/permissions/resources",
            get(list_permission_resources),
        )
        .route(
            "/backend/v3/api/iam/permissions/{permissionId}",
            get(retrieve_permission)
                .patch(update_permission)
                .delete(delete_permission),
        )
        .route(
            "/backend/v3/api/iam/policies",
            get(list_policies).post(create_policy),
        )
        .route(
            "/backend/v3/api/iam/policies/{policyId}",
            get(retrieve_policy)
                .patch(update_policy)
                .delete(delete_policy),
        )
        .route(
            "/backend/v3/api/iam/organizations",
            get(list_organizations).post(create_organization),
        )
        .route(
            "/backend/v3/api/iam/organizations/tree",
            get(organizations_tree),
        )
        .route(
            "/backend/v3/api/iam/organizations/{organizationId}",
            get(retrieve_organization)
                .patch(update_organization)
                .delete(delete_organization),
        )
        .route(
            "/backend/v3/api/iam/organization_memberships",
            get(list_organization_memberships).post(create_organization_membership),
        )
        .route(
            "/backend/v3/api/iam/organization_memberships/{membershipId}",
            patch(update_organization_membership),
        )
        .route(
            "/backend/v3/api/iam/organization_memberships/roster",
            get(organization_membership_roster),
        )
        .route(
            "/backend/v3/api/iam/organization_memberships/{membershipId}/departments",
            put(replace_organization_membership_departments),
        )
        .route(
            "/backend/v3/api/iam/departments",
            get(list_departments).post(create_department),
        )
        .route(
            "/backend/v3/api/iam/departments/tree",
            get(departments_tree),
        )
        .route(
            "/backend/v3/api/iam/departments/{departmentId}",
            get(retrieve_department)
                .patch(update_department)
                .delete(delete_department),
        )
        .route(
            "/backend/v3/api/iam/department_assignments",
            get(list_department_assignments).post(create_department_assignment),
        )
        .route(
            "/backend/v3/api/iam/department_assignments/{assignmentId}",
            patch(update_department_assignment),
        )
        .route(
            "/backend/v3/api/iam/positions",
            get(list_positions).post(create_position),
        )
        .route(
            "/backend/v3/api/iam/positions/{positionId}",
            patch(update_position).delete(delete_position),
        )
        .route(
            "/backend/v3/api/iam/position_assignments",
            get(list_position_assignments).post(create_position_assignment),
        )
        .route(
            "/backend/v3/api/iam/position_assignments/{assignmentId}",
            patch(update_position_assignment),
        )
        .route(
            "/backend/v3/api/iam/tenants",
            get(list_tenants).post(create_tenant),
        )
        .route(
            "/backend/v3/api/iam/tenants/{tenantId}",
            get(retrieve_tenant)
                .patch(update_tenant)
                .delete(delete_tenant),
        )
        .route(
            "/backend/v3/api/iam/tenants/{tenantId}/members",
            get(list_tenant_members).post(create_tenant_member),
        )
        .route(
            "/backend/v3/api/iam/tenants/{tenantId}/members/{userId}",
            patch(update_tenant_member).delete(delete_tenant_member),
        )
        .route(
            "/backend/v3/api/iam/groups",
            get(list_groups).post(create_group),
        )
        .route(
            "/backend/v3/api/iam/groups/{groupId}",
            get(retrieve_group).patch(update_group).delete(delete_group),
        )
        .route(
            "/backend/v3/api/iam/groups/{groupId}/members",
            get(list_group_members).post(create_group_member),
        )
        .route(
            "/backend/v3/api/iam/groups/{groupId}/members/{memberId}",
            delete(delete_group_member),
        )
        .route(
            "/backend/v3/api/iam/service_accounts",
            get(list_service_accounts).post(create_service_account),
        )
        .route(
            "/backend/v3/api/iam/service_accounts/{serviceAccountId}",
            get(retrieve_service_account)
                .patch(update_service_account)
                .delete(delete_service_account),
        )
        .route(
            "/backend/v3/api/iam/role_bindings",
            get(list_role_bindings).post(create_role_binding),
        )
        .route(
            "/backend/v3/api/iam/role_bindings/{roleBindingId}",
            patch(update_role_binding).delete(delete_role_binding),
        )
        .route(
            "/backend/v3/api/iam/api_keys",
            get(list_api_keys).post(create_api_key),
        )
        .route(
            "/backend/v3/api/iam/api_keys/{apiKeyId}/revoke",
            post(revoke_api_key),
        )
        .route(
            "/backend/v3/api/iam/api_keys/{apiKeyId}/rotate",
            post(rotate_api_key),
        )
        .route(
            "/backend/v3/api/iam/security_events",
            get(list_security_events),
        )
        .route(
            "/backend/v3/api/iam/security_events/{securityEventId}",
            get(retrieve_security_event),
        )
        .route("/backend/v3/api/iam/audit_events", get(list_audit_events))
        .route(
            "/backend/v3/api/iam/audit_events/{auditEventId}",
            get(retrieve_audit_event),
        )
}

async fn list_users(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    let Ok(tenant_id) = tenant_id_from_context(&ctx) else {
        return tenant_id_from_context(&ctx).err().expect("error response");
    };

    let Ok(params) = list_page_params_or_error(&query) else {
        return list_page_params_or_error(&query)
            .err()
            .expect("error response");
    };
    let search_pattern = list_search_pattern(&query);
    let status_filter = query
        .get("status")
        .map(|value| value.trim().to_ascii_lowercase())
        .filter(|value| !value.is_empty());
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT id, tenant_id, username, display_name, email, phone, status, \
                created_at, last_login_at, gender, birth_date, country, avatar_resource_snapshot, \
                COUNT(*) OVER() AS {LIST_TOTAL_COLUMN} \
         FROM iam_user \
         WHERE tenant_id = $1 AND COALESCE(is_deleted, 0) = 0 \
           AND ($4::text IS NULL OR LOWER(username) LIKE $4 OR LOWER(display_name) LIKE $4 OR LOWER(COALESCE(email, '')) LIKE $4) \
           AND ($5::text IS NULL OR status = $5) \
         ORDER BY username, id \
         LIMIT $2 OFFSET $3"
 )   ))
    .bind(&tenant_id)
    .bind(params.page_size)
    .bind(params.offset)
    .bind(&search_pattern)
    .bind(&status_filter)
    .fetch_all(pg)
    .await;

    match rows {
        Ok(rows) => appbase_ok(page_json_from_rows(rows, &params, user_row_to_json)),
        Err(error) => internal_handler_error("iam_users_list_failed", error),
    }
}

async fn retrieve_user(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Path(user_id): Path<String>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    let Ok(tenant_id) = tenant_id_from_context(&ctx) else {
        return tenant_id_from_context(&ctx).err().expect("error response");
    };

    match fetch_user_row(pg, &tenant_id, &user_id).await {
        Ok(Some(row)) => appbase_ok(user_row_to_json(&row)),
        Ok(None) => appbase_error(
            StatusCode::NOT_FOUND,
            "iam_user_not_found",
            "user not found",
        ),
        Err(error) => internal_handler_error("iam_user_retrieve_failed", error),
    }
}

async fn ban_user(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Path(user_id): Path<String>,
) -> Response {
    set_user_banned_state(&state, &ctx, &user_id, true).await
}

async fn unban_user(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Path(user_id): Path<String>,
) -> Response {
    set_user_banned_state(&state, &ctx, &user_id, false).await
}

/// Applies (or clears) the banned account state for a tenant user.
///
/// Enforcement guarantees:
/// - Refuses to ban/unban the calling principal itself.
/// - The ban transaction persists `status = 'banned'`, revokes every active
///   `iam_session` row and deactivates every active `iam_api_key` owned by the
///   user, so existing tokens and keys stop working immediately (defense in
///   depth; request-time checks also require `status = 'active'` on every
///   authentication path).
/// - The mutation is audited as `iam_user.ban` / `iam_user.unban`.
async fn set_user_banned_state(
    state: &BackendIamState,
    ctx: &WebRequestContext,
    user_id: &str,
    banned: bool,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(state) else {
        return postgres_pool_or_error(state).err().expect("error response");
    };
    let Ok(tenant_id) = tenant_id_from_context(ctx) else {
        return tenant_id_from_context(ctx).err().expect("error response");
    };
    if actor_user_id_from_context(ctx).as_deref() == Some(user_id) {
        return appbase_error(
            StatusCode::BAD_REQUEST,
            "iam_user_self_operation",
            "cannot ban or unban your own account",
        );
    }

    let target = match fetch_user_row(pg, &tenant_id, user_id).await {
        Ok(Some(row)) => row,
        Ok(None) => {
            return appbase_error(
                StatusCode::NOT_FOUND,
                "iam_user_not_found",
                "user not found",
            );
        }
        Err(error) => return internal_handler_error("iam_user_ban_failed", error),
    };
    let current_status = target.get::<String, _>(6);
    let action = if banned {
        "iam_user.ban"
    } else {
        "iam_user.unban"
    };
    let next_status = if banned { "banned" } else { "active" };
    let now = Utc::now().to_rfc3339();
    let detail = json!({
        "status": { "from": current_status, "to": next_status },
        "revokedSessions": banned,
        "deactivatedApiKeys": banned,
    });

    let tenant_id = tenant_id.to_owned();
    let user_id = user_id.to_owned();
    let tenant_id_for_tx = tenant_id.clone();
    let user_id_for_tx = user_id.clone();
    let result = execute_mutation_with_audit(
        pg,
        ctx,
        action,
        "iam_user",
        user_id_for_tx.clone(),
        detail,
        |tx| {
            Box::pin(async move {
                let now = now.clone();
                let status = sqlx::query(
                    "UPDATE iam_user SET status = $3, updated_at = $4 \
                 WHERE tenant_id = $1 AND id = $2 AND COALESCE(is_deleted, 0) = 0",
                )
                .bind(&tenant_id_for_tx)
                .bind(&user_id_for_tx)
                .bind(&next_status)
                .bind(&now)
                .execute(&mut **tx)
                .await?;
                if banned {
                    sqlx::query(
                        "UPDATE iam_session SET revoked_at = $3, updated_at = $3 \
                     WHERE tenant_id = $1 AND principal_kind = 'user' \
                       AND COALESCE(principal_id, user_id) = $2 AND revoked_at IS NULL",
                    )
                    .bind(&tenant_id_for_tx)
                    .bind(&user_id_for_tx)
                    .bind(&now)
                    .execute(&mut **tx)
                    .await?;
                    sqlx::query(
                        "UPDATE iam_api_key SET status = 'inactive', updated_at = $3 \
                     WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'",
                    )
                    .bind(&tenant_id_for_tx)
                    .bind(&user_id_for_tx)
                    .bind(&now)
                    .execute(&mut **tx)
                    .await?;
                }
                Ok(status.rows_affected())
            })
        },
    )
    .await;

    match result {
        Ok(rows_affected) if rows_affected > 0 => {
            match fetch_user_row(pg, &tenant_id, &user_id).await {
                Ok(Some(row)) => appbase_ok(user_row_to_json(&row)),
                _ => appbase_error(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "iam_user_ban_failed",
                    "user updated but could not be loaded",
                ),
            }
        }
        Ok(_) => appbase_error(
            StatusCode::NOT_FOUND,
            "iam_user_not_found",
            "user not found",
        ),
        Err(error) => appbase_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "iam_user_ban_failed",
            &error,
        ),
    }
}

async fn list_roles(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    let Ok(tenant_id) = tenant_id_from_context(&ctx) else {
        return tenant_id_from_context(&ctx).err().expect("error response");
    };

    let Ok(params) = list_page_params_or_error(&query) else {
        return list_page_params_or_error(&query)
            .err()
            .expect("error response");
    };
    let search_pattern = list_search_pattern(&query);
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT id, tenant_id, code, name, status, label_i18n, description_i18n, \
                role_class, standard, \
                COUNT(*) OVER() AS {LIST_TOTAL_COLUMN} \
         FROM iam_role \
         WHERE tenant_id = $1 \
           AND ($4::text IS NULL OR LOWER(code) LIKE $4 OR LOWER(name) LIKE $4 \
                OR LOWER(label_i18n) LIKE $4) \
         ORDER BY code, id \
         LIMIT $2 OFFSET $3"
    )))
    .bind(&tenant_id)
    .bind(params.page_size)
    .bind(params.offset)
    .bind(&search_pattern)
    .fetch_all(pg)
    .await;

    match rows {
        Ok(rows) => appbase_ok(page_json_from_rows(rows, &params, role_row_to_json)),
        Err(error) => internal_handler_error("iam_roles_list_failed", error),
    }
}

async fn retrieve_role(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Path(role_id): Path<String>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    let Ok(tenant_id) = tenant_id_from_context(&ctx) else {
        return tenant_id_from_context(&ctx).err().expect("error response");
    };

    match fetch_role_row(pg, &tenant_id, &role_id).await {
        Ok(Some(row)) => appbase_ok(role_row_to_json(&row)),
        Ok(None) => appbase_error(
            StatusCode::NOT_FOUND,
            "iam_role_not_found",
            "role not found",
        ),
        Err(error) => internal_handler_error("iam_role_retrieve_failed", error),
    }
}

async fn list_role_permissions(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Path(role_id): Path<String>,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    let Ok(tenant_id) = tenant_id_from_context(&ctx) else {
        return tenant_id_from_context(&ctx).err().expect("error response");
    };

    let Ok(params) = list_page_params_or_error(&query) else {
        return list_page_params_or_error(&query)
            .err()
            .expect("error response");
    };
    let search_pattern = list_search_pattern(&query);
    let resource = optional_query_value(&query, "resource");
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT p.id, p.code, p.name, p.resource, p.action, \
                COUNT(*) OVER() AS {LIST_TOTAL_COLUMN} \
         FROM iam_role_permission rp \
         JOIN iam_permission p ON p.id = rp.permission_id \
         JOIN iam_role r ON r.id = rp.role_id AND r.tenant_id = rp.tenant_id \
         WHERE rp.tenant_id = $1 AND rp.role_id = $2 AND r.status = 'active' \
           AND ($5::text IS NULL OR LOWER(p.code) LIKE $5 OR LOWER(p.name) LIKE $5 \
                OR LOWER(p.resource) LIKE $5 OR LOWER(p.action) LIKE $5) \
           AND ($6::text IS NULL OR p.resource = $6) \
         ORDER BY p.code \
         LIMIT $3 OFFSET $4"
    )))
    .bind(&tenant_id)
    .bind(&role_id)
    .bind(params.page_size)
    .bind(params.offset)
    .bind(&search_pattern)
    .bind(&resource)
    .fetch_all(pg)
    .await;

    match rows {
        Ok(rows) => appbase_ok(page_json_from_rows(rows, &params, permission_row_to_json)),
        Err(error) => internal_handler_error("iam_role_permissions_list_failed", error),
    }
}

async fn list_permissions(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };

    let Ok(params) = list_page_params_or_error(&query) else {
        return list_page_params_or_error(&query)
            .err()
            .expect("error response");
    };
    let search_pattern = list_search_pattern(&query);
    let resource = optional_query_value(&query, "resource");
    let role_id = optional_query_value(&query, "role_id");
    let assigned = match optional_query_value(&query, "assigned") {
        None => None,
        Some(value) if value == "true" => Some(true),
        Some(value) if value == "false" => Some(false),
        Some(_) => {
            return list_page_invalid_parameter_error();
        }
    };
    if assigned.is_some() && role_id.is_none() {
        return list_page_invalid_parameter_error();
    }
    let Ok(tenant_id) = tenant_id_from_context(&ctx) else {
        return tenant_id_from_context(&ctx).err().expect("error response");
    };
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT p.id, p.code, p.name, p.resource, p.action, \
                COUNT(*) OVER() AS {LIST_TOTAL_COLUMN} \
         FROM iam_permission p \
         LEFT JOIN iam_role r ON r.id = $5 AND r.tenant_id = $7 \
         LEFT JOIN iam_role_permission rp ON rp.permission_id = p.id \
           AND rp.role_id = r.id AND rp.tenant_id = r.tenant_id \
         WHERE ($3::text IS NULL OR LOWER(p.code) LIKE $3 OR LOWER(p.name) LIKE $3 \
                OR LOWER(p.resource) LIKE $3 OR LOWER(p.action) LIKE $3) \
           AND ($4::text IS NULL OR p.resource = $4) \
           AND ($5::text IS NULL OR r.id IS NOT NULL) \
           AND ($6::boolean IS NULL OR (rp.id IS NOT NULL) = $6) \
         ORDER BY p.code \
         LIMIT $1 OFFSET $2"
    )))
    .bind(params.page_size)
    .bind(params.offset)
    .bind(&search_pattern)
    .bind(&resource)
    .bind(&role_id)
    .bind(assigned)
    .bind(&tenant_id)
    .fetch_all(pg)
    .await;

    match rows {
        Ok(rows) => appbase_ok(page_json_from_rows(rows, &params, permission_row_to_json)),
        Err(error) => internal_handler_error("iam_permissions_list_failed", error),
    }
}

async fn list_permission_resources(
    State(state): State<BackendIamState>,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    let Ok(params) = list_page_params_or_error(&query) else {
        return list_page_params_or_error(&query)
            .err()
            .expect("error response");
    };
    let search_pattern = list_search_pattern(&query);
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT resource, COUNT(*)::BIGINT AS permission_count, \
                COUNT(*) OVER() AS {LIST_TOTAL_COLUMN} \
         FROM iam_permission \
         WHERE ($3::text IS NULL OR LOWER(resource) LIKE $3) \
         GROUP BY resource \
         ORDER BY resource \
         LIMIT $1 OFFSET $2"
    )))
    .bind(params.page_size)
    .bind(params.offset)
    .bind(&search_pattern)
    .fetch_all(pg)
    .await;

    match rows {
        Ok(rows) => appbase_ok(page_json_from_rows(
            rows,
            &params,
            permission_resource_row_to_json,
        )),
        Err(error) => internal_handler_error("iam_permission_resources_list_failed", error),
    }
}

async fn retrieve_permission(
    State(state): State<BackendIamState>,
    Path(permission_id): Path<String>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };

    let row = sqlx::query(
        "SELECT id, code, name, resource, action \
         FROM iam_permission \
         WHERE id = $1 OR code = $1 \
         LIMIT 1",
    )
    .bind(&permission_id)
    .fetch_optional(pg)
    .await;

    match row {
        Ok(Some(row)) => appbase_ok(permission_row_to_json(&row)),
        Ok(None) => appbase_error(
            StatusCode::NOT_FOUND,
            "iam_permission_not_found",
            "permission not found",
        ),
        Err(error) => internal_handler_error("iam_permission_retrieve_failed", error),
    }
}

async fn list_role_bindings(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    let Ok(tenant_id) = tenant_id_from_context(&ctx) else {
        return tenant_id_from_context(&ctx).err().expect("error response");
    };
    let organization_id = organization_id_from_context(&ctx);

    let Ok(params) = list_page_params_or_error(&query) else {
        return list_page_params_or_error(&query)
            .err()
            .expect("error response");
    };
    let search_pattern = list_search_pattern(&query);
    let filter_values = role_binding_list_filter_values(&query);
    let rows = if let Some(organization_id) = organization_id.as_deref() {
        let filter_sql = role_binding_list_filter_sql(&query, 6);
        let mut statement = sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT b.id, b.tenant_id, b.organization_id, b.role_id, r.code AS role_code, \
                    b.principal_kind, b.principal_id, b.scope_kind, b.scope_id, b.effect, b.status, \
                    b.data_scope_kind, b.effective_from, b.effective_to, \
                    COALESCE(u.display_name, u.username) AS principal_display_name, \
                    u.username AS principal_username, \
                    COUNT(*) OVER() AS {LIST_TOTAL_COLUMN} \
             FROM iam_role_binding b \
             JOIN iam_role r ON r.id = b.role_id AND r.tenant_id = b.tenant_id \
             LEFT JOIN iam_organization_membership om \
               ON b.principal_kind = 'organization_membership' AND om.tenant_id = b.tenant_id \
              AND om.id = b.principal_id \
             LEFT JOIN iam_user u ON u.tenant_id = b.tenant_id \
              AND ((b.principal_kind = 'organization_membership' AND u.id = om.user_id) \
                OR (b.principal_kind = 'user' AND u.id = b.principal_id)) \
             WHERE b.tenant_id = $1 AND b.status = 'active' \
               AND (b.scope_kind = 'tenant' OR (b.scope_kind = 'organization' AND b.scope_id = $2)) \
               AND ($5::text IS NULL OR LOWER(r.code) LIKE $5 OR LOWER(b.principal_id) LIKE $5) \
               {filter_sql} \
             ORDER BY r.code, b.id \
             LIMIT $3 OFFSET $4"
        )))
        .bind(&tenant_id)
        .bind(organization_id)
        .bind(params.page_size)
        .bind(params.offset)
        .bind(&search_pattern);
        for value in &filter_values {
            statement = statement.bind(value);
        }
        statement.fetch_all(pg).await
    } else {
        let mut statement = sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT b.id, b.tenant_id, b.organization_id, b.role_id, r.code AS role_code, \
                    b.principal_kind, b.principal_id, b.scope_kind, b.scope_id, b.effect, b.status, \
                    b.data_scope_kind, b.effective_from, b.effective_to, \
                    COALESCE(u.display_name, u.username) AS principal_display_name, \
                    u.username AS principal_username, \
                    COUNT(*) OVER() AS {LIST_TOTAL_COLUMN} \
             FROM iam_role_binding b \
             JOIN iam_role r ON r.id = b.role_id AND r.tenant_id = b.tenant_id \
             LEFT JOIN iam_organization_membership om \
               ON b.principal_kind = 'organization_membership' AND om.tenant_id = b.tenant_id \
              AND om.id = b.principal_id \
             LEFT JOIN iam_user u ON u.tenant_id = b.tenant_id \
              AND ((b.principal_kind = 'organization_membership' AND u.id = om.user_id) \
                OR (b.principal_kind = 'user' AND u.id = b.principal_id)) \
             WHERE b.tenant_id = $1 AND b.status = 'active' \
               AND ($4::text IS NULL OR LOWER(r.code) LIKE $4 OR LOWER(b.principal_id) LIKE $4) \
               {filter_sql} \
             ORDER BY r.code, b.id \
             LIMIT $2 OFFSET $3"
        )))
        .bind(&tenant_id)
        .bind(params.page_size)
        .bind(params.offset)
        .bind(&search_pattern);
        for value in &filter_values {
            statement = statement.bind(value);
        }
        statement.fetch_all(pg).await
    };

    match rows {
        Ok(rows) => appbase_ok(page_json_from_rows(rows, &params, role_binding_row_to_json)),
        Err(error) => internal_handler_error("iam_role_bindings_list_failed", error),
    }
}

async fn create_role_binding(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Json(body): Json<Value>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    let Ok(tenant_id) = tenant_id_from_context(&ctx) else {
        return tenant_id_from_context(&ctx).err().expect("error response");
    };

    let role_ref = read_string_field(&body, &["roleId", "role_id"]).unwrap_or_else(|| {
        read_string_field(&body, &["roleCode", "role_code"]).unwrap_or_default()
    });
    let principal_kind =
        read_string_field(&body, &["principalKind", "principal_kind"]).unwrap_or_default();
    let principal_id =
        read_string_field(&body, &["principalId", "principal_id"]).unwrap_or_default();
    let scope_kind = read_string_field(&body, &["scopeKind", "scope_kind"]).unwrap_or_default();
    let scope_id = read_string_field(&body, &["scopeId", "scope_id"]).unwrap_or_default();
    let effect = read_string_field(&body, &["effect"]).unwrap_or_else(|| "allow".to_string());

    if role_ref.is_empty()
        || principal_kind.is_empty()
        || principal_id.is_empty()
        || scope_kind.is_empty()
        || scope_id.is_empty()
    {
        return appbase_error(
            StatusCode::BAD_REQUEST,
            "iam_role_binding_invalid",
            "roleId, principalKind, principalId, scopeKind, and scopeId are required",
        );
    }

    if !matches!(
        principal_kind.as_str(),
        "user" | "organization_membership" | "group" | "service_account"
    ) {
        return appbase_error(
            StatusCode::BAD_REQUEST,
            "iam_role_binding_invalid",
            "principalKind must be user, organization_membership, group, or service_account",
        );
    }

    if effect != "allow" && effect != "deny" {
        return appbase_error(
            StatusCode::BAD_REQUEST,
            "iam_role_binding_invalid",
            "effect must be allow or deny",
        );
    }

    // Data scope and effective window: an operator can narrow what a role grants
    // and until when. `scope` keeps the pre-0049 semantics (same as the binding
    // scope) for callers that do not send the field.
    let data_scope_kind = read_string_field(&body, &["dataScopeKind", "data_scope_kind"])
        .unwrap_or_else(|| "scope".to_owned());
    if !matches!(
        data_scope_kind.as_str(),
        "scope" | "self" | "department" | "department_and_children" | "organization" | "tenant"
    ) {
        return appbase_error(
            StatusCode::BAD_REQUEST,
            "iam_role_binding_invalid_data_scope",
            "dataScopeKind must be scope, self, department, department_and_children, organization, or tenant",
        );
    }
    let effective_from = read_string_field(&body, &["effectiveFrom", "effective_from"]);
    let effective_to = read_string_field(&body, &["effectiveTo", "effective_to"]);
    let (effective_from, effective_to) =
        match validate_role_binding_effective_window(effective_from, effective_to) {
            Ok(window) => window,
            Err(error) => return role_binding_error_response("create", error),
        };
    let organization_id = organization_id_from_context(&ctx);
    if let Err(error) = validate_role_binding_target_scope(
        pg,
        &tenant_id,
        organization_id.as_deref(),
        &scope_kind,
        &scope_id,
    )
    .await
    {
        return role_binding_error_response("create", error);
    }

    let role_row = match fetch_role_row(pg, &tenant_id, &role_ref).await {
        Ok(Some(row)) => row,
        Ok(None) => {
            return appbase_error(
                StatusCode::NOT_FOUND,
                "iam_role_not_found",
                "role not found",
            );
        }
        Err(error) => {
            return internal_handler_error("iam_role_lookup_failed", error);
        }
    };
    let role_id: String = role_row.get(0);
    let role_code: String = role_row.get(2);

    let organization_id = organization_id.unwrap_or_else(|| "0".to_owned());
    let now = Utc::now().to_rfc3339();
    let result: Result<Option<RoleBindingRecord>, RoleBindingMutationError> = async {
        let mut tx = pg.begin().await.map_err(RoleBindingMutationError::internal)?;
        lock_role_binding_assignment(
            &mut tx,
            &tenant_id,
            &principal_kind,
            &principal_id,
            &scope_kind,
            &scope_id,
        )
        .await?;
        if effect == "allow" {
            sdkwork_iam_bootstrap::ensure_role_assignment_allowed_tx(
                &mut tx,
                &tenant_id,
                &principal_kind,
                &principal_id,
                &scope_kind,
                &scope_id,
                &role_code,
            )
            .await
            .map_err(|error| RoleBindingMutationError::new(RoleBindingErrorKind::SodConflict, error))?;
            let assigner_scope = assigner_permission_scope(&ctx).map_err(|_| {
                RoleBindingMutationError::new(
                    RoleBindingErrorKind::AssignerForbidden,
                    "assigner permission scope is unavailable",
                )
            })?;
            sdkwork_iam_bootstrap::ensure_role_grant_within_assigner_scope_tx(
                &mut tx,
                &tenant_id,
                &role_id,
                &assigner_scope,
            )
            .await
            .map_err(|error| RoleBindingMutationError::new(RoleBindingErrorKind::AssignerForbidden, error))?;
        }

        let existing_revoked_id = sqlx::query_scalar::<_, String>(
            "SELECT id FROM iam_role_binding \
             WHERE tenant_id = $1 AND organization_id = $2 AND role_id = $3 \
               AND principal_kind = $4 AND principal_id = $5 AND scope_kind = $6 AND scope_id = $7 \
               AND status = 'revoked'",
        )
        .bind(&tenant_id)
        .bind(&organization_id)
        .bind(&role_id)
        .bind(&principal_kind)
        .bind(&principal_id)
        .bind(&scope_kind)
        .bind(&scope_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(RoleBindingMutationError::internal)?;
        let binding_id = existing_revoked_id.unwrap_or_else(|| format!("iamrb-{}", Uuid::new_v4()));
        let rows_affected = sqlx::query(
            "INSERT INTO iam_role_binding \
                (id, tenant_id, organization_id, role_id, principal_kind, principal_id, scope_kind, scope_id, \
                 effect, data_scope_kind, effective_from, effective_to, status, created_at, updated_at) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $11, $12, $13, 'active', $10, $10) \
             ON CONFLICT (tenant_id, role_id, principal_kind, principal_id, scope_kind, scope_id) \
             DO UPDATE SET organization_id = EXCLUDED.organization_id, effect = EXCLUDED.effect, \
                 data_scope_kind = EXCLUDED.data_scope_kind, effective_from = EXCLUDED.effective_from, \
                 effective_to = EXCLUDED.effective_to, status = 'active', updated_at = EXCLUDED.updated_at \
             WHERE iam_role_binding.status = 'revoked' \
               AND iam_role_binding.organization_id = EXCLUDED.organization_id",
        )
        .bind(&binding_id)
        .bind(&tenant_id)
        .bind(&organization_id)
        .bind(&role_id)
        .bind(&principal_kind)
        .bind(&principal_id)
        .bind(&scope_kind)
        .bind(&scope_id)
        .bind(&effect)
        .bind(&now)
        .bind(&data_scope_kind)
        .bind(&effective_from)
        .bind(&effective_to)
        .execute(&mut *tx)
        .await
        .map_err(RoleBindingMutationError::internal)?
        .rows_affected();
        if rows_affected == 0 {
            return Ok(None);
        }

        let row = sqlx::query(
            "SELECT b.id, b.tenant_id, b.organization_id, b.role_id, r.code AS role_code, \
                    b.principal_kind, b.principal_id, b.scope_kind, b.scope_id, b.effect, b.status, \
                    b.data_scope_kind, b.effective_from, b.effective_to \
             FROM iam_role_binding b \
             JOIN iam_role r ON r.id = b.role_id AND r.tenant_id = b.tenant_id \
             WHERE b.id = $1",
        )
        .bind(&binding_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(RoleBindingMutationError::internal)?;
        let binding = RoleBindingRecord::from_row(&row);
        record_backend_mutation_audit_tx(
            &mut *tx,
            &ctx,
            "iam_role_binding.create",
            "iam_role_binding",
            &binding_id,
            json!({ "roleId": role_id, "principalKind": principal_kind, "principalId": principal_id }),
        )
        .await
        .map_err(|error| RoleBindingMutationError::internal(sqlx::Error::Protocol(error.to_string())))?;
        tx.commit().await.map_err(RoleBindingMutationError::internal)?;
        Ok(Some(binding))
    }
    .await;

    match result {
        Ok(Some(binding)) => appbase_created(sdkwork_resource_json(binding.to_json())),
        Ok(None) => appbase_error(
            StatusCode::CONFLICT,
            "iam_role_binding_conflict",
            "role binding conflicts with an existing binding",
        ),
        Err(error) => role_binding_error_response("create", error),
    }
}

async fn update_role_binding(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Path(role_binding_id): Path<String>,
    Json(body): Json<Value>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    let Ok(tenant_id) = tenant_id_from_context(&ctx) else {
        return tenant_id_from_context(&ctx).err().expect("error response");
    };
    let organization_id = organization_id_from_context(&ctx);
    let patch = match parse_role_binding_patch(&body) {
        Ok(patch) => patch,
        Err(error) => return role_binding_error_response("update", error),
    };

    match update_role_binding_record(
        pg,
        &ctx,
        &tenant_id,
        organization_id.as_deref(),
        &role_binding_id,
        patch,
    )
    .await
    {
        Ok(binding) => appbase_ok(sdkwork_resource_json(binding.to_json())),
        Err(error) => role_binding_error_response("update", error),
    }
}

#[derive(Clone, Debug, Default)]
struct RoleBindingPatch {
    effect: Option<PatchValue>,
    principal_kind: Option<PatchValue>,
    principal_id: Option<PatchValue>,
    scope_kind: Option<PatchValue>,
    scope_id: Option<PatchValue>,
    data_scope_kind: Option<PatchValue>,
    effective_from: Option<PatchValue>,
    effective_to: Option<PatchValue>,
}

#[derive(Clone, Debug)]
struct RoleBindingRecord {
    id: String,
    tenant_id: String,
    organization_id: String,
    role_id: String,
    role_code: String,
    principal_kind: String,
    principal_id: String,
    scope_kind: String,
    scope_id: String,
    effect: String,
    status: String,
    data_scope_kind: String,
    effective_from: Option<String>,
    effective_to: Option<String>,
}

impl RoleBindingRecord {
    fn from_row(row: &sqlx::postgres::PgRow) -> Self {
        Self {
            id: row.get(0),
            tenant_id: row.get(1),
            organization_id: row.get(2),
            role_id: row.get(3),
            role_code: row.get(4),
            principal_kind: row.get(5),
            principal_id: row.get(6),
            scope_kind: row.get(7),
            scope_id: row.get(8),
            effect: row.get(9),
            status: row.get(10),
            data_scope_kind: row.get(11),
            effective_from: row.get(12),
            effective_to: row.get(13),
        }
    }

    fn to_json(&self) -> Value {
        json!({
            "id": self.id,
            "tenantId": self.tenant_id,
            "organizationId": self.organization_id,
            "dataScopeKind": self.data_scope_kind,
            "effect": self.effect,
            "effectiveFrom": self.effective_from,
            "effectiveTo": self.effective_to,
            "principalId": self.principal_id,
            "principalKind": self.principal_kind,
            "roleCode": self.role_code,
            "roleId": self.role_id,
            "scopeId": self.scope_id,
            "scopeKind": self.scope_kind,
            "status": self.status,
        })
    }
}

#[derive(Clone, Copy, Debug)]
enum RoleBindingErrorKind {
    Invalid,
    InvalidDataScope,
    InvalidEffectiveWindow,
    InvalidScope,
    NotFound,
    SodConflict,
    AssignerForbidden,
    Conflict,
    Internal,
}

#[derive(Debug)]
struct RoleBindingMutationError {
    kind: RoleBindingErrorKind,
    message: String,
}

impl RoleBindingMutationError {
    fn new(kind: RoleBindingErrorKind, message: impl Into<String>) -> Self {
        Self {
            kind,
            message: message.into(),
        }
    }

    fn internal(error: impl std::fmt::Display) -> Self {
        Self::new(RoleBindingErrorKind::Internal, error.to_string())
    }
}

fn parse_role_binding_patch(body: &Value) -> Result<RoleBindingPatch, RoleBindingMutationError> {
    let Some(fields) = body.as_object() else {
        return Err(RoleBindingMutationError::new(
            RoleBindingErrorKind::Invalid,
            "request body must be an object",
        ));
    };
    const WRITABLE_KEYS: [&str; 15] = [
        "effect",
        "principalKind",
        "principal_kind",
        "principalId",
        "principal_id",
        "scopeKind",
        "scope_kind",
        "scopeId",
        "scope_id",
        "dataScopeKind",
        "data_scope_kind",
        "effectiveFrom",
        "effective_from",
        "effectiveTo",
        "effective_to",
    ];
    if fields.is_empty() {
        return Err(RoleBindingMutationError::new(
            RoleBindingErrorKind::Invalid,
            "at least one writable field is required",
        ));
    }
    if let Some(key) = fields
        .keys()
        .find(|key| !WRITABLE_KEYS.contains(&key.as_str()))
    {
        return Err(RoleBindingMutationError::new(
            RoleBindingErrorKind::Invalid,
            format!("field {key} is not writable"),
        ));
    }

    Ok(RoleBindingPatch {
        effect: role_binding_patch_text(body, "effect", "effect", false)?,
        principal_kind: role_binding_patch_text(body, "principalKind", "principal_kind", false)?,
        principal_id: role_binding_patch_text(body, "principalId", "principal_id", false)?,
        scope_kind: role_binding_patch_text(body, "scopeKind", "scope_kind", false)?,
        scope_id: role_binding_patch_text(body, "scopeId", "scope_id", false)?,
        data_scope_kind: role_binding_patch_text(body, "dataScopeKind", "data_scope_kind", false)?,
        effective_from: role_binding_patch_text(body, "effectiveFrom", "effective_from", true)?,
        effective_to: role_binding_patch_text(body, "effectiveTo", "effective_to", true)?,
    })
}

fn role_binding_patch_text(
    body: &Value,
    camel_key: &str,
    snake_key: &str,
    nullable: bool,
) -> Result<Option<PatchValue>, RoleBindingMutationError> {
    let Some(value) = body.get(camel_key).or_else(|| body.get(snake_key)) else {
        return Ok(None);
    };
    if nullable && value.is_null() {
        return Ok(Some(PatchValue::NullText));
    }
    let Some(text) = value
        .as_str()
        .map(str::trim)
        .filter(|text| !text.is_empty())
    else {
        return Err(RoleBindingMutationError::new(
            RoleBindingErrorKind::Invalid,
            format!(
                "{camel_key} must be a non-empty string{}",
                if nullable { " or null" } else { "" }
            ),
        ));
    };
    Ok(Some(PatchValue::Text(text.to_owned())))
}

fn role_binding_patch_ref<'a>(value: &'a Option<PatchValue>) -> Option<&'a str> {
    match value {
        Some(PatchValue::Text(text)) => Some(text.as_str()),
        Some(PatchValue::NullText) | None => None,
        Some(PatchValue::Int(_)) => None,
    }
}

fn role_binding_patch_nullable(
    patch: &Option<PatchValue>,
    current: &Option<String>,
) -> Option<String> {
    match patch {
        Some(PatchValue::Text(text)) => Some(text.clone()),
        Some(PatchValue::NullText) => None,
        None => current.clone(),
        Some(PatchValue::Int(_)) => current.clone(),
    }
}

fn validate_role_binding_effective_window(
    effective_from: Option<String>,
    effective_to: Option<String>,
) -> Result<(Option<String>, Option<String>), RoleBindingMutationError> {
    let from = effective_from
        .as_deref()
        .map(DateTime::parse_from_rfc3339)
        .transpose()
        .map_err(|_| {
            RoleBindingMutationError::new(
                RoleBindingErrorKind::InvalidEffectiveWindow,
                "effectiveFrom must be an RFC3339 date-time or null",
            )
        })?;
    let to = effective_to
        .as_deref()
        .map(DateTime::parse_from_rfc3339)
        .transpose()
        .map_err(|_| {
            RoleBindingMutationError::new(
                RoleBindingErrorKind::InvalidEffectiveWindow,
                "effectiveTo must be an RFC3339 date-time or null",
            )
        })?;
    if matches!((from, to), (Some(from), Some(to)) if to < from) {
        return Err(RoleBindingMutationError::new(
            RoleBindingErrorKind::InvalidEffectiveWindow,
            "effectiveTo must not precede effectiveFrom",
        ));
    }
    Ok((effective_from, effective_to))
}

fn role_binding_visibility_sql() -> &'static str {
    "AND (($2::text IS NULL AND b.scope_kind = 'tenant') \
          OR ($2::text IS NOT NULL AND (b.scope_kind = 'tenant' \
              OR (b.scope_kind = 'organization' AND b.scope_id = $2) \
              OR (b.scope_kind = 'department' AND EXISTS ( \
                  SELECT 1 FROM iam_department d \
                  WHERE d.tenant_id = b.tenant_id AND d.id = b.scope_id \
                    AND d.status = 'active' AND d.organization_id = $2)))))"
}

async fn validate_role_binding_target_scope<'e, E>(
    executor: E,
    tenant_id: &str,
    organization_id: Option<&str>,
    scope_kind: &str,
    scope_id: &str,
) -> Result<(), RoleBindingMutationError>
where
    E: Executor<'e, Database = Postgres>,
{
    match scope_kind {
        "tenant" => {
            validate_tenant_role_binding_scope(organization_id, scope_id)?;
            Ok(())
        }
        "organization" => {
            if organization_id != Some(scope_id) {
                return Err(invalid_role_binding_scope());
            }
            let exists: Option<i32> = sqlx::query_scalar(
                "SELECT 1 FROM iam_organization \
                 WHERE tenant_id = $1 AND id = $2 AND status = 'active'",
            )
            .bind(tenant_id)
            .bind(scope_id)
            .fetch_optional(executor)
            .await
            .map_err(RoleBindingMutationError::internal)?;
            if exists.is_none() {
                return Err(invalid_role_binding_scope());
            }
            Ok(())
        }
        "department" => {
            let exists: Option<i32> = sqlx::query_scalar(
                "SELECT 1 FROM iam_department \
                 WHERE tenant_id = $1 AND id = $2 AND status = 'active' \
                   AND ($3::text IS NOT NULL AND organization_id = $3)",
            )
            .bind(tenant_id)
            .bind(scope_id)
            .bind(organization_id)
            .fetch_optional(executor)
            .await
            .map_err(RoleBindingMutationError::internal)?;
            if exists.is_none() {
                return Err(invalid_role_binding_scope());
            }
            Ok(())
        }
        _ => Err(invalid_role_binding_scope()),
    }
}

async fn lock_role_binding_assignment(
    tx: &mut Transaction<'_, Postgres>,
    tenant_id: &str,
    principal_kind: &str,
    principal_id: &str,
    scope_kind: &str,
    scope_id: &str,
) -> Result<(), RoleBindingMutationError> {
    let lock_key = format!(
        "iam-role-assignment:{tenant_id}:{principal_kind}:{principal_id}:{scope_kind}:{scope_id}"
    );
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))")
        .bind(lock_key)
        .execute(&mut **tx)
        .await
        .map_err(RoleBindingMutationError::internal)?;
    Ok(())
}

fn validate_tenant_role_binding_scope(
    organization_id: Option<&str>,
    scope_id: &str,
) -> Result<(), RoleBindingMutationError> {
    if scope_id != "0" || organization_id.is_some() {
        return Err(invalid_role_binding_scope());
    }
    Ok(())
}

fn invalid_role_binding_scope() -> RoleBindingMutationError {
    RoleBindingMutationError::new(
        RoleBindingErrorKind::InvalidScope,
        "scopeKind and scopeId must identify a scope accessible in this organization",
    )
}

async fn update_role_binding_record(
    pg: &PgPool,
    ctx: &WebRequestContext,
    tenant_id: &str,
    organization_id: Option<&str>,
    role_binding_id: &str,
    patch: RoleBindingPatch,
) -> Result<RoleBindingRecord, RoleBindingMutationError> {
    let mut tx = pg
        .begin()
        .await
        .map_err(RoleBindingMutationError::internal)?;
    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT b.id, b.tenant_id, b.organization_id, b.role_id, r.code AS role_code, \
                b.principal_kind, b.principal_id, b.scope_kind, b.scope_id, b.effect, b.status, \
                b.data_scope_kind, b.effective_from, b.effective_to \
         FROM iam_role_binding b \
         JOIN iam_role r ON r.id = b.role_id AND r.tenant_id = b.tenant_id \
         WHERE b.tenant_id = $1 AND b.id = $3 AND b.status = 'active' {} \
         FOR UPDATE OF b",
        role_binding_visibility_sql()
    )))
    .bind(tenant_id)
    .bind(organization_id)
    .bind(role_binding_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(RoleBindingMutationError::internal)?
    .ok_or_else(|| {
        RoleBindingMutationError::new(RoleBindingErrorKind::NotFound, "role binding not found")
    })?;

    let current = RoleBindingRecord::from_row(&row);
    let effect = role_binding_patch_ref(&patch.effect)
        .unwrap_or(&current.effect)
        .to_owned();
    let principal_kind = role_binding_patch_ref(&patch.principal_kind)
        .unwrap_or(&current.principal_kind)
        .to_owned();
    let principal_id = role_binding_patch_ref(&patch.principal_id)
        .unwrap_or(&current.principal_id)
        .to_owned();
    let scope_kind = role_binding_patch_ref(&patch.scope_kind)
        .unwrap_or(&current.scope_kind)
        .to_owned();
    let scope_id = role_binding_patch_ref(&patch.scope_id)
        .unwrap_or(&current.scope_id)
        .to_owned();
    let data_scope_kind = role_binding_patch_ref(&patch.data_scope_kind)
        .unwrap_or(&current.data_scope_kind)
        .to_owned();

    if !matches!(effect.as_str(), "allow" | "deny") {
        return Err(RoleBindingMutationError::new(
            RoleBindingErrorKind::Invalid,
            "effect must be allow or deny",
        ));
    }
    if !matches!(
        principal_kind.as_str(),
        "user" | "organization_membership" | "group" | "service_account"
    ) {
        return Err(RoleBindingMutationError::new(
            RoleBindingErrorKind::Invalid,
            "principalKind must be user, organization_membership, group, or service_account",
        ));
    }
    if !matches!(
        data_scope_kind.as_str(),
        "scope" | "self" | "department" | "department_and_children" | "organization" | "tenant"
    ) {
        return Err(RoleBindingMutationError::new(
            RoleBindingErrorKind::InvalidDataScope,
            "dataScopeKind must be scope, self, department, department_and_children, organization, or tenant",
        ));
    }
    let (effective_from, effective_to) = validate_role_binding_effective_window(
        role_binding_patch_nullable(&patch.effective_from, &current.effective_from),
        role_binding_patch_nullable(&patch.effective_to, &current.effective_to),
    )?;
    validate_role_binding_target_scope(
        &mut *tx,
        tenant_id,
        organization_id,
        &scope_kind,
        &scope_id,
    )
    .await?;

    lock_role_binding_assignment(
        &mut tx,
        tenant_id,
        &principal_kind,
        &principal_id,
        &scope_kind,
        &scope_id,
    )
    .await?;
    if effect == "allow" {
        sdkwork_iam_bootstrap::ensure_role_assignment_allowed_tx(
            &mut tx,
            tenant_id,
            &principal_kind,
            &principal_id,
            &scope_kind,
            &scope_id,
            &current.role_code,
        )
        .await
        .map_err(|error| RoleBindingMutationError::new(RoleBindingErrorKind::SodConflict, error))?;
        let assigner_scope = assigner_permission_scope(ctx).map_err(|_| {
            RoleBindingMutationError::new(
                RoleBindingErrorKind::AssignerForbidden,
                "assigner permission scope is unavailable",
            )
        })?;
        sdkwork_iam_bootstrap::ensure_role_grant_within_assigner_scope_tx(
            &mut tx,
            tenant_id,
            &current.role_id,
            &assigner_scope,
        )
        .await
        .map_err(|error| {
            RoleBindingMutationError::new(RoleBindingErrorKind::AssignerForbidden, error)
        })?;
    }

    let updated = RoleBindingRecord {
        id: current.id.clone(),
        tenant_id: current.tenant_id.clone(),
        organization_id: current.organization_id.clone(),
        role_id: current.role_id.clone(),
        role_code: current.role_code.clone(),
        principal_kind,
        principal_id,
        scope_kind,
        scope_id,
        effect,
        status: current.status.clone(),
        data_scope_kind,
        effective_from,
        effective_to,
    };
    let now = Utc::now().to_rfc3339();
    let rows_affected = sqlx::query(sqlx::AssertSqlSafe(format!(
        "UPDATE iam_role_binding \
         SET effect = $4, principal_kind = $5, principal_id = $6, \
             scope_kind = $7, scope_id = $8, data_scope_kind = $9, \
             effective_from = $10, effective_to = $11, updated_at = $12 \
         WHERE tenant_id = $1 AND id = $3 AND status = 'active' {}",
        role_binding_visibility_sql()
    )))
    .bind(tenant_id)
    .bind(organization_id)
    .bind(role_binding_id)
    .bind(&updated.effect)
    .bind(&updated.principal_kind)
    .bind(&updated.principal_id)
    .bind(&updated.scope_kind)
    .bind(&updated.scope_id)
    .bind(&updated.data_scope_kind)
    .bind(&updated.effective_from)
    .bind(&updated.effective_to)
    .bind(now)
    .execute(&mut *tx)
    .await
    .map_err(|error| {
        if is_role_binding_unique_violation(&error) {
            RoleBindingMutationError::new(
                RoleBindingErrorKind::Conflict,
                "role binding conflicts with an existing binding",
            )
        } else {
            RoleBindingMutationError::internal(error)
        }
    })?
    .rows_affected();
    if rows_affected == 0 {
        return Err(RoleBindingMutationError::new(
            RoleBindingErrorKind::NotFound,
            "role binding not found",
        ));
    }
    record_backend_mutation_audit_tx(
        &mut *tx,
        ctx,
        "iam_role_binding.update",
        "iam_role_binding",
        role_binding_id,
        json!({ "before": current.to_json(), "after": updated.to_json() }),
    )
    .await
    .map_err(|error| {
        RoleBindingMutationError::internal(sqlx::Error::Protocol(error.to_string()))
    })?;
    tx.commit()
        .await
        .map_err(RoleBindingMutationError::internal)?;
    Ok(updated)
}

fn is_role_binding_unique_violation(error: &sqlx::Error) -> bool {
    let sqlx::Error::Database(database_error) = error else {
        return false;
    };
    database_error.code().as_deref() == Some("23505")
        && (database_error.table().as_deref() == Some("iam_role_binding")
            || database_error
                .constraint()
                .is_some_and(|name| name.starts_with("iam_role_binding_")))
}

fn role_binding_error_response(action: &str, error: RoleBindingMutationError) -> Response {
    let RoleBindingMutationError { kind, message } = error;
    match kind {
        RoleBindingErrorKind::Invalid => appbase_error(
            StatusCode::BAD_REQUEST,
            "iam_role_binding_invalid",
            &message,
        ),
        RoleBindingErrorKind::InvalidDataScope => appbase_error(
            StatusCode::BAD_REQUEST,
            "iam_role_binding_invalid_data_scope",
            &message,
        ),
        RoleBindingErrorKind::InvalidEffectiveWindow => appbase_error(
            StatusCode::BAD_REQUEST,
            "iam_role_binding_invalid_effective_window",
            &message,
        ),
        RoleBindingErrorKind::InvalidScope => appbase_error(
            StatusCode::BAD_REQUEST,
            "iam_role_binding_invalid_scope",
            &message,
        ),
        RoleBindingErrorKind::NotFound => appbase_error(
            StatusCode::NOT_FOUND,
            "iam_role_binding_not_found",
            &message,
        ),
        RoleBindingErrorKind::SodConflict => appbase_error(
            StatusCode::CONFLICT,
            "iam_role_binding_sod_violation",
            &message,
        ),
        RoleBindingErrorKind::AssignerForbidden => appbase_error(
            StatusCode::FORBIDDEN,
            "iam_role_binding_assigner_scope_exceeded",
            &message,
        ),
        RoleBindingErrorKind::Conflict => {
            appbase_error(StatusCode::CONFLICT, "iam_role_binding_conflict", &message)
        }
        RoleBindingErrorKind::Internal => {
            internal_handler_error(&format!("iam_role_binding_{action}_failed"), message)
        }
    }
}

async fn delete_role_binding(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Path(role_binding_id): Path<String>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    let Ok(tenant_id) = tenant_id_from_context(&ctx) else {
        return tenant_id_from_context(&ctx).err().expect("error response");
    };

    let now = Utc::now().to_rfc3339();
    let tenant_id_update = tenant_id.clone();
    let organization_id_update = organization_id_from_context(&ctx);
    let role_binding_id_update = role_binding_id.clone();
    let result = execute_conditional_mutation_with_audit(
        pg,
        &ctx,
        "iam_role_binding.delete",
        "iam_role_binding",
        role_binding_id.clone(),
        json!({}),
        |tx| {
            Box::pin(async move {
                sqlx::query(sqlx::AssertSqlSafe(format!(
                    "UPDATE iam_role_binding \
                     SET status = 'revoked', updated_at = $3 \
                     WHERE tenant_id = $1 AND id = $4 AND status = 'active' {}",
                    role_binding_visibility_sql()
                )))
                .bind(tenant_id_update)
                .bind(organization_id_update)
                .bind(now)
                .bind(role_binding_id_update)
                .execute(&mut **tx)
                .await
                .map(|result| result.rows_affected())
            })
        },
        |rows_affected| *rows_affected > 0,
    )
    .await;

    match result {
        Ok(done) if done > 0 => StatusCode::NO_CONTENT.into_response(),
        Ok(_) => appbase_error(
            StatusCode::NOT_FOUND,
            "iam_role_binding_not_found",
            "role binding not found",
        ),
        Err(error) => appbase_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "iam_role_binding_delete_failed",
            &error,
        ),
    }
}

async fn list_organizations(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    let Ok(tenant_id) = tenant_id_from_context(&ctx) else {
        return tenant_id_from_context(&ctx).err().expect("error response");
    };

    let Ok(params) = list_page_params_or_error(&query) else {
        return list_page_params_or_error(&query)
            .err()
            .expect("error response");
    };
    let search_pattern = list_search_pattern(&query);
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT id, tenant_id, code, name, status, organization_kind, parent_organization_id, \
                {}, COUNT(*) OVER() AS {LIST_TOTAL_COLUMN} \
         FROM iam_organization \
         WHERE tenant_id = $1 AND status = 'active' \
           AND ($4::text IS NULL OR LOWER(name) LIKE $4 OR LOWER(code) LIKE $4) \
         ORDER BY name, id \
         LIMIT $2 OFFSET $3",
        ORGANIZATION_PROFILE_COLUMNS
    )))
    .bind(&tenant_id)
    .bind(params.page_size)
    .bind(params.offset)
    .bind(&search_pattern)
    .fetch_all(pg)
    .await;

    match rows {
        Ok(rows) => appbase_ok(page_json_from_rows(rows, &params, organization_row_to_json)),
        Err(error) => internal_handler_error("iam_organizations_list_failed", error),
    }
}

async fn list_organization_memberships(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    let Ok(tenant_id) = tenant_id_from_context(&ctx) else {
        return tenant_id_from_context(&ctx).err().expect("error response");
    };
    let organization_id = optional_query_value(&query, "organization_id")
        .or_else(|| organization_id_from_context(&ctx));
    let department_id = optional_query_value(&query, "department_id");

    let Ok(params) = list_page_params_or_error(&query) else {
        return list_page_params_or_error(&query)
            .err()
            .expect("error response");
    };
    let search_pattern = list_search_pattern(&query);
    let rows = if let Some(organization_id) = organization_id.as_deref() {
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT m.id, m.tenant_id, m.organization_id, m.user_id, m.membership_kind, m.status, \
                    u.username, u.display_name, u.email, u.phone, \
                    COUNT(*) OVER() AS {LIST_TOTAL_COLUMN} \
             FROM iam_organization_membership m \
             JOIN iam_user u ON u.id = m.user_id AND u.tenant_id = m.tenant_id \
             WHERE m.tenant_id = $1 AND m.organization_id = $2 AND m.status = 'active' \
               AND ($5::text IS NULL OR LOWER(u.username) LIKE $5 OR LOWER(u.display_name) LIKE $5 \
                    OR LOWER(COALESCE(u.email, '')) LIKE $5) \
               AND ($6::text IS NULL OR EXISTS (\
                     SELECT 1 FROM iam_department_assignment da \
                      WHERE da.tenant_id = m.tenant_id \
                        AND da.organization_id = m.organization_id \
                        AND da.organization_membership_id = m.id \
                        AND da.department_id = $6 AND da.status = 'active')) \
             ORDER BY m.joined_at DESC NULLS LAST, m.id \
             LIMIT $3 OFFSET $4"
        )))
        .bind(&tenant_id)
        .bind(organization_id)
        .bind(params.page_size)
        .bind(params.offset)
        .bind(&search_pattern)
        .bind(&department_id)
        .fetch_all(pg)
        .await
    } else {
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT m.id, m.tenant_id, m.organization_id, m.user_id, m.membership_kind, m.status, \
                    u.username, u.display_name, u.email, u.phone, \
                    COUNT(*) OVER() AS {LIST_TOTAL_COLUMN} \
             FROM iam_organization_membership m \
             JOIN iam_user u ON u.id = m.user_id AND u.tenant_id = m.tenant_id \
             WHERE m.tenant_id = $1 AND m.status = 'active' \
               AND ($4::text IS NULL OR LOWER(u.username) LIKE $4 OR LOWER(u.display_name) LIKE $4 \
                    OR LOWER(COALESCE(u.email, '')) LIKE $4) \
               AND ($5::text IS NULL OR EXISTS (\
                     SELECT 1 FROM iam_department_assignment da \
                      WHERE da.tenant_id = m.tenant_id \
                        AND da.organization_id = m.organization_id \
                        AND da.organization_membership_id = m.id \
                        AND da.department_id = $5 AND da.status = 'active')) \
             ORDER BY m.joined_at DESC NULLS LAST, m.id \
             LIMIT $2 OFFSET $3"
        )))
        .bind(&tenant_id)
        .bind(params.page_size)
        .bind(params.offset)
        .bind(&search_pattern)
        .bind(&department_id)
        .fetch_all(pg)
        .await
    };

    match rows {
        Ok(rows) => appbase_ok(page_json_from_rows(rows, &params, membership_row_to_json)),
        Err(error) => internal_handler_error("iam_memberships_list_failed", error),
    }
}

async fn list_departments(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    let Ok(tenant_id) = tenant_id_from_context(&ctx) else {
        return tenant_id_from_context(&ctx).err().expect("error response");
    };
    let organization_id = optional_query_value(&query, "organization_id")
        .or_else(|| organization_id_from_context(&ctx));

    let Ok(params) = list_page_params_or_error(&query) else {
        return list_page_params_or_error(&query)
            .err()
            .expect("error response");
    };
    let search_pattern = list_search_pattern(&query);
    let rows = if let Some(organization_id) = organization_id.as_deref() {
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT id, tenant_id, organization_id, code, name, status, parent_department_id, \
                    sort_order, department_kind, path, version, \
                    COUNT(*) OVER() AS {LIST_TOTAL_COLUMN} \
             FROM iam_department \
             WHERE tenant_id = $1 AND organization_id = $2 AND status = 'active' \
               AND ($5::text IS NULL OR LOWER(name) LIKE $5 OR LOWER(code) LIKE $5) \
             ORDER BY sort_order, name, id \
             LIMIT $3 OFFSET $4"
        )))
        .bind(&tenant_id)
        .bind(organization_id)
        .bind(params.page_size)
        .bind(params.offset)
        .bind(&search_pattern)
        .fetch_all(pg)
        .await
    } else {
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT id, tenant_id, organization_id, code, name, status, parent_department_id, \
                    sort_order, department_kind, path, version, \
                    COUNT(*) OVER() AS {LIST_TOTAL_COLUMN} \
             FROM iam_department \
             WHERE tenant_id = $1 AND status = 'active' \
               AND ($4::text IS NULL OR LOWER(name) LIKE $4 OR LOWER(code) LIKE $4) \
             ORDER BY sort_order, name, id \
             LIMIT $2 OFFSET $3"
        )))
        .bind(&tenant_id)
        .bind(params.page_size)
        .bind(params.offset)
        .bind(&search_pattern)
        .fetch_all(pg)
        .await
    };

    match rows {
        Ok(rows) => appbase_ok(page_json_from_rows(rows, &params, department_row_to_json)),
        Err(error) => internal_handler_error("iam_departments_list_failed", error),
    }
}

async fn list_api_keys(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    let Ok(tenant_id) = tenant_id_from_context(&ctx) else {
        return tenant_id_from_context(&ctx).err().expect("error response");
    };

    let Ok(params) = list_page_params_or_error(&query) else {
        return list_page_params_or_error(&query)
            .err()
            .expect("error response");
    };
    let search_pattern = list_search_pattern(&query);
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT id, tenant_id, organization_id, user_id, name, status, expires_at, \
                key_prefix, revoked_at, \
                COUNT(*) OVER() AS {LIST_TOTAL_COLUMN} \
         FROM iam_api_key \
         WHERE tenant_id = $1 \
           AND ($4::text IS NULL OR LOWER(name) LIKE $4) \
         ORDER BY created_at DESC NULLS LAST, id \
         LIMIT $2 OFFSET $3"
    )))
    .bind(&tenant_id)
    .bind(params.page_size)
    .bind(params.offset)
    .bind(&search_pattern)
    .fetch_all(pg)
    .await;

    match rows {
        Ok(rows) => appbase_ok(page_json_from_rows(rows, &params, api_key_row_to_json)),
        Err(error) => internal_handler_error("iam_api_keys_list_failed", error),
    }
}

async fn list_security_events(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    let Ok(tenant_id) = tenant_id_from_context(&ctx) else {
        return tenant_id_from_context(&ctx).err().expect("error response");
    };

    let Ok(params) = timeline_list_params_or_error(&query) else {
        return timeline_list_params_or_error(&query)
            .err()
            .expect("error response");
    };
    let search_pattern = list_search_pattern(&query);
    match list_timeline_feed(
        pg,
        &tenant_id,
        "iam_security_event",
        "id, tenant_id, organization_id, user_id, event_type, severity, created_at",
        "LOWER(event_type) LIKE $4 OR LOWER(severity) LIKE $4",
        params,
        search_pattern,
        security_event_row_to_json,
        |row| encode_timeline_keyset_cursor(&row.get::<String, _>(6), &row.get::<String, _>(0)),
    )
    .await
    {
        Ok(payload) => appbase_ok(payload),
        Err(error) => internal_handler_error("iam_security_events_list_failed", &error),
    }
}

async fn list_audit_events(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    let Ok(tenant_id) = tenant_id_from_context(&ctx) else {
        return tenant_id_from_context(&ctx).err().expect("error response");
    };

    let Ok(params) = timeline_list_params_or_error(&query) else {
        return timeline_list_params_or_error(&query)
            .err()
            .expect("error response");
    };
    let search_pattern = list_search_pattern(&query);
    match list_timeline_feed(
        pg,
        &tenant_id,
        "iam_audit_event",
        "id, tenant_id, organization_id, actor_user_id, action, resource_type, resource_id, environment, created_at",
        "LOWER(action) LIKE $4 OR LOWER(resource_type) LIKE $4",
        params,
        search_pattern,
        audit_event_row_to_json,
        |row| encode_timeline_keyset_cursor(&row.get::<String, _>(8), &row.get::<String, _>(0)),
    )
    .await
    {
        Ok(payload) => appbase_ok(payload),
        Err(error) => internal_handler_error("iam_audit_events_list_failed", &error),
    }
}

async fn list_timeline_feed<F, C>(
    pg: &PgPool,
    tenant_id: &str,
    table: &str,
    select: &str,
    search_predicate: &str,
    params: TimelineListParams,
    search_pattern: Option<String>,
    map_row: F,
    encode_cursor: C,
) -> Result<Value, sqlx::Error>
where
    F: FnMut(&sqlx::postgres::PgRow) -> Value,
    C: Fn(&sqlx::postgres::PgRow) -> String,
{
    match params {
        TimelineListParams::Offset(offset) => {
            let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
                "SELECT {select}, COUNT(*) OVER() AS {LIST_TOTAL_COLUMN} \
                 FROM {table} \
                 WHERE tenant_id = $1 \
                   AND ($4::text IS NULL OR {search_predicate}) \
                 ORDER BY created_at DESC NULLS LAST, id \
                 LIMIT $2 OFFSET $3"
            )))
            .bind(tenant_id)
            .bind(offset.page_size)
            .bind(offset.offset)
            .bind(&search_pattern)
            .fetch_all(pg)
            .await?;
            Ok(page_json_from_rows(rows, &offset, map_row))
        }
        TimelineListParams::CursorOffset(cursor) => {
            let limit = (cursor.page_size + 1) as i64;
            let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
                "SELECT {select} \
                 FROM {table} \
                 WHERE tenant_id = $1 \
                   AND ($4::text IS NULL OR {search_predicate}) \
                 ORDER BY created_at DESC NULLS LAST, id \
                 LIMIT $2 OFFSET $3"
            )))
            .bind(tenant_id)
            .bind(limit)
            .bind(cursor.offset as i64)
            .bind(&search_pattern)
            .fetch_all(pg)
            .await?;
            let has_more = rows.len() > cursor.page_size;
            let next_cursor = has_more.then(|| (cursor.offset + cursor.page_size).to_string());
            let items = rows
                .iter()
                .take(cursor.page_size)
                .map(map_row)
                .collect::<Vec<_>>();
            Ok(cursor_page_json(
                items,
                cursor.page_size,
                next_cursor,
                has_more,
            ))
        }
        TimelineListParams::CursorKeyset { page_size, cursor } => {
            let limit = (page_size + 1) as i64;
            let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
                "SELECT {select} \
                 FROM {table} \
                 WHERE tenant_id = $1 \
                   AND ($3::text IS NULL OR {search_predicate}) \
                   AND (created_at < $4 OR (created_at = $4 AND id < $5)) \
                 ORDER BY created_at DESC NULLS LAST, id \
                 LIMIT $2"
            )))
            .bind(tenant_id)
            .bind(limit)
            .bind(&search_pattern)
            .bind(&cursor.created_at)
            .bind(&cursor.id)
            .fetch_all(pg)
            .await?;
            Ok(timeline_cursor_page_from_rows(
                rows,
                page_size,
                map_row,
                encode_cursor,
            ))
        }
    }
}

async fn retrieve_audit_event(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Path(audit_event_id): Path<String>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    let Ok(tenant_id) = tenant_id_from_context(&ctx) else {
        return tenant_id_from_context(&ctx).err().expect("error response");
    };

    match fetch_audit_event_row(pg, &tenant_id, &audit_event_id).await {
        Ok(Some(row)) => appbase_ok(sdkwork_resource_json(audit_event_detail_row_to_json(&row))),
        Ok(None) => appbase_error(
            StatusCode::NOT_FOUND,
            "iam_audit_event_not_found",
            "audit event not found",
        ),
        Err(error) => internal_handler_error("iam_audit_event_retrieve_failed", error),
    }
}

async fn retrieve_security_event(
    State(state): State<BackendIamState>,
    ctx: WebRequestContext,
    Path(security_event_id): Path<String>,
) -> Response {
    let Ok(pg) = postgres_pool_or_error(&state) else {
        return postgres_pool_or_error(&state)
            .err()
            .expect("error response");
    };
    let Ok(tenant_id) = tenant_id_from_context(&ctx) else {
        return tenant_id_from_context(&ctx).err().expect("error response");
    };

    match fetch_security_event_row(pg, &tenant_id, &security_event_id).await {
        Ok(Some(row)) => appbase_ok(sdkwork_resource_json(security_event_detail_row_to_json(
            &row,
        ))),
        Ok(None) => appbase_error(
            StatusCode::NOT_FOUND,
            "iam_security_event_not_found",
            "security event not found",
        ),
        Err(error) => internal_handler_error("iam_security_event_retrieve_failed", error),
    }
}

async fn fetch_audit_event_row<'e>(
    pg: &'e PgPool,
    tenant_id: &str,
    audit_event_id: &str,
) -> Result<Option<sqlx::postgres::PgRow>, sqlx::Error> {
    sqlx::query(
        "SELECT id, tenant_id, organization_id, actor_user_id, action, resource_type, resource_id, request_id, environment, detail_json, created_at \
         FROM iam_audit_event \
         WHERE tenant_id = $1 AND id = $2 \
         LIMIT 1",
    )
    .bind(tenant_id)
    .bind(audit_event_id)
    .fetch_optional(pg)
    .await
}

async fn fetch_security_event_row<'e>(
    pg: &'e PgPool,
    tenant_id: &str,
    security_event_id: &str,
) -> Result<Option<sqlx::postgres::PgRow>, sqlx::Error> {
    sqlx::query(
        "SELECT id, tenant_id, organization_id, user_id, session_id, event_type, severity, detail_json, created_at \
         FROM iam_security_event \
         WHERE tenant_id = $1 AND id = $2 \
         LIMIT 1",
    )
    .bind(tenant_id)
    .bind(security_event_id)
    .fetch_optional(pg)
    .await
}

async fn fetch_user_row<'e>(
    pg: &'e PgPool,
    tenant_id: &str,
    user_id: &str,
) -> Result<Option<sqlx::postgres::PgRow>, sqlx::Error> {
    sqlx::query(
        "SELECT id, tenant_id, username, display_name, email, phone, status, \
                created_at, last_login_at, gender, birth_date, country, avatar_resource_snapshot \
         FROM iam_user \
         WHERE tenant_id = $1 AND id = $2 AND COALESCE(is_deleted, 0) = 0 \
         LIMIT 1",
    )
    .bind(tenant_id)
    .bind(user_id)
    .fetch_optional(pg)
    .await
}

async fn fetch_role_row<'e>(
    pg: &'e PgPool,
    tenant_id: &str,
    role_id: &str,
) -> Result<Option<sqlx::postgres::PgRow>, sqlx::Error> {
    sqlx::query(
        "SELECT id, tenant_id, code, name, status, label_i18n, description_i18n, \
                role_class, standard \
         FROM iam_role \
         WHERE tenant_id = $1 AND (id = $2 OR code = $2) \
         LIMIT 1",
    )
    .bind(tenant_id)
    .bind(role_id)
    .fetch_optional(pg)
    .await
}

async fn resolve_role_id(pg: &PgPool, tenant_id: &str, role_ref: &str) -> Option<String> {
    fetch_role_row(pg, tenant_id, role_ref)
        .await
        .ok()
        .flatten()
        .map(|row| row.get::<String, _>(0))
}

fn user_row_to_json(row: &sqlx::postgres::PgRow) -> Value {
    let avatar: Option<Value> = row
        .get::<Option<String>, _>(12)
        .and_then(|snapshot| serde_json::from_str::<Value>(&snapshot).ok())
        .filter(|value| value.is_object());
    json!({
        "avatar": avatar,
        "avatarUrl": avatar.as_ref().and_then(media_delivery_url),
        "birthDate": row.get::<Option<String>, _>(10),
        "country": row.get::<Option<String>, _>(11),
        "createdAt": row.get::<Option<String>, _>(7),
        "displayName": row.get::<String, _>(3),
        "email": row.get::<Option<String>, _>(4),
        "gender": row.get::<Option<String>, _>(9),
        "id": row.get::<String, _>(0),
        "lastLoginAt": row.get::<Option<String>, _>(8),
        "phone": row.get::<Option<String>, _>(5),
        "status": row.get::<String, _>(6),
        "tenantId": row.get::<String, _>(1),
        "userId": row.get::<String, _>(0),
        "username": row.get::<String, _>(2),
    })
}

/// Delivery URL of a stored image media-resource snapshot (user avatar,
/// organization logo, tenant logo). Reads the camelCase SDK shape first and
/// falls back to the snake_case shape the user-center host serializes.
///
/// A `drive://` uri is a Drive reference, not a browser-usable URL: emitting it
/// here would make every console render a broken image. Drive-backed images
/// travel through the snapshot object and its bounded preview reader instead.
fn media_delivery_url(image: &Value) -> Option<String> {
    ["publicUrl", "url", "uri", "public_url"]
        .iter()
        .find_map(|key| {
            image
                .get(*key)
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_owned)
        })
        .filter(|url| !url.starts_with("drive://"))
}

/// Reads one locale-map column into a JSON object.
///
/// A role's display text is machine vocabulary on the wire: `labels` and
/// `descriptions` carry the locale maps verbatim (`{"zh-CN": "组织管理员"}`), and
/// the caller renders the sentence in its own locale. The server never picks a
/// language for the client, so the response body does not vary by
/// `Accept-Language` and no `Content-Language` / `Vary` negotiation is involved.
/// Display resolution is map[locale] -> `name`, where `name` stays the fallback
/// for an uncovered locale and for tenant-authored roles. A damaged or absent
/// map degrades to `{}` rather than failing the read.
fn role_i18n_map(row: &sqlx::postgres::PgRow, index: usize) -> Value {
    row.try_get::<String, _>(index)
        .ok()
        .and_then(|raw| serde_json::from_str::<Value>(&raw).ok())
        .filter(Value::is_object)
        .unwrap_or_else(|| json!({}))
}

fn role_row_to_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "code": row.get::<String, _>(2),
        "descriptions": role_i18n_map(row, 6),
        "id": row.get::<String, _>(0),
        "labels": role_i18n_map(row, 5),
        "name": row.get::<String, _>(3),
        "roleClass": row.try_get::<String, _>(7).unwrap_or_default(),
        "roleId": row.get::<String, _>(0),
        "standard": row.try_get::<i32, _>(8).unwrap_or(0) != 0,
        "status": row.get::<String, _>(4),
        "tenantId": row.get::<String, _>(1),
    })
}

fn permission_row_to_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "action": row.get::<String, _>(4),
        "code": row.get::<String, _>(1),
        "id": row.get::<String, _>(0),
        "name": row.get::<String, _>(2),
        "permissionId": row.get::<String, _>(0),
        "resource": row.get::<String, _>(3),
    })
}

fn permission_resource_row_to_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "permissionCount": row.get::<i64, _>(1).to_string(),
        "resource": row.get::<String, _>(0),
    })
}

fn role_binding_row_to_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "dataScopeKind": row.get::<String, _>(11),
        "effect": row.get::<String, _>(9),
        "effectiveFrom": row.get::<Option<String>, _>(12),
        "effectiveTo": row.get::<Option<String>, _>(13),
        "id": row.get::<String, _>(0),
        "organizationId": row.get::<String, _>(2),
        "principalId": row.get::<String, _>(6),
        "principalKind": row.get::<String, _>(5),
        "principalDisplayName": row.get::<Option<String>, _>(15),
        "principalUsername": row.get::<Option<String>, _>(16),
        "roleCode": row.get::<String, _>(4),
        "roleId": row.get::<String, _>(3),
        "scopeId": row.get::<String, _>(8),
        "scopeKind": row.get::<String, _>(7),
        "status": row.get::<String, _>(10),
        "tenantId": row.get::<String, _>(1),
    })
}

fn organization_row_to_json(row: &sqlx::postgres::PgRow) -> Value {
    let logo: Option<Value> = row
        .get::<Option<String>, _>(13)
        .and_then(|snapshot| serde_json::from_str::<Value>(&snapshot).ok())
        .filter(|value| value.is_object());
    json!({
        "address": row.get::<Option<String>, _>(12),
        "code": row.get::<String, _>(2),
        "contactEmail": row.get::<Option<String>, _>(11),
        "contactPhone": row.get::<Option<String>, _>(10),
        "description": row.get::<Option<String>, _>(9),
        "id": row.get::<String, _>(0),
        "industryCategory": row.get::<Option<String>, _>(8),
        "logo": logo,
        "logoUrl": logo.as_ref().and_then(media_delivery_url),
        "name": row.get::<String, _>(3),
        "organizationCategory": row.get::<Option<String>, _>(7),
        "organizationId": row.get::<String, _>(0),
        "organizationKind": row.get::<Option<String>, _>(5),
        "parentOrganizationId": row.get::<Option<String>, _>(6),
        "status": row.get::<String, _>(4),
        "tenantId": row.get::<String, _>(1),
    })
}

fn membership_row_to_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "displayName": row.get::<String, _>(7),
        "email": row.get::<Option<String>, _>(8),
        "id": row.get::<String, _>(0),
        "membershipId": row.get::<String, _>(0),
        "membershipKind": row.get::<String, _>(4),
        "organizationId": row.get::<String, _>(2),
        "phone": row.get::<Option<String>, _>(9),
        "status": row.get::<String, _>(5),
        "tenantId": row.get::<String, _>(1),
        "userId": row.get::<String, _>(3),
        "username": row.get::<String, _>(6),
    })
}

fn department_row_to_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "code": row.get::<String, _>(3),
        "departmentId": row.get::<String, _>(0),
        "departmentKind": row.get::<String, _>(8),
        "id": row.get::<String, _>(0),
        "name": row.get::<String, _>(4),
        "organizationId": row.get::<String, _>(2),
        "parentDepartmentId": row.get::<Option<String>, _>(6),
        "path": row.get::<String, _>(9),
        "sortOrder": row.get::<i32, _>(7),
        "status": row.get::<String, _>(5),
        "tenantId": row.get::<String, _>(1),
        "version": row.get::<i32, _>(10),
    })
}

fn api_key_row_to_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "apiKeyId": row.get::<String, _>(0),
        "expiresAt": row.get::<Option<String>, _>(6),
        "id": row.get::<String, _>(0),
        "keyPrefix": row.get::<String, _>(7),
        "name": row.get::<String, _>(4),
        "organizationId": row.get::<String, _>(2),
        "revokedAt": row.get::<Option<String>, _>(8),
        "status": row.get::<String, _>(5),
        "tenantId": row.get::<String, _>(1),
        "userId": row.get::<String, _>(3),
    })
}

fn security_event_row_to_json(row: &sqlx::postgres::PgRow) -> Value {
    let id = row.get::<String, _>(0);
    json!({
        "category": row.get::<String, _>(4),
        "createdAt": row.get::<String, _>(6),
        "eventType": row.get::<String, _>(4),
        "id": id,
        "organizationId": row.get::<String, _>(2),
        "securityEventId": id,
        "severity": row.get::<String, _>(5),
        "tenantId": row.get::<String, _>(1),
        "userId": row.get::<Option<String>, _>(3),
    })
}

fn security_event_detail_row_to_json(row: &sqlx::postgres::PgRow) -> Value {
    let id = row.get::<String, _>(0);
    json!({
        "category": row.get::<String, _>(5),
        "createdAt": row.get::<String, _>(8),
        "detailJson": row.get::<String, _>(7),
        "eventType": row.get::<String, _>(5),
        "id": id,
        "organizationId": row.get::<String, _>(2),
        "securityEventId": id,
        "sessionId": row.get::<Option<String>, _>(4),
        "severity": row.get::<String, _>(6),
        "tenantId": row.get::<String, _>(1),
        "userId": row.get::<Option<String>, _>(3),
    })
}

fn audit_event_row_to_json(row: &sqlx::postgres::PgRow) -> Value {
    let id = row.get::<String, _>(0);
    json!({
        "action": row.get::<String, _>(4),
        "actorUserId": row.get::<Option<String>, _>(3),
        "auditEventId": id,
        "createdAt": row.get::<String, _>(8),
        "environment": row.get::<Option<String>, _>(7),
        "id": id,
        "organizationId": row.get::<Option<String>, _>(2),
        "resourceId": row.get::<Option<String>, _>(6),
        "resourceType": row.get::<String, _>(5),
        "tenantId": row.get::<String, _>(1),
    })
}

fn audit_event_detail_row_to_json(row: &sqlx::postgres::PgRow) -> Value {
    let id = row.get::<String, _>(0);
    json!({
        "action": row.get::<String, _>(4),
        "actorUserId": row.get::<Option<String>, _>(3),
        "auditEventId": id,
        "createdAt": row.get::<String, _>(10),
        "detailJson": row.get::<String, _>(9),
        "environment": row.get::<Option<String>, _>(8),
        "id": id,
        "organizationId": row.get::<Option<String>, _>(2),
        "requestId": row.get::<Option<String>, _>(7),
        "resourceId": row.get::<Option<String>, _>(6),
        "resourceType": row.get::<String, _>(5),
        "tenantId": row.get::<String, _>(1),
    })
}

fn group_row_to_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "code": row.get::<String, _>(3),
        "groupId": row.get::<String, _>(0),
        "groupKind": row.get::<String, _>(5),
        "id": row.get::<String, _>(0),
        "name": row.get::<String, _>(4),
        "organizationId": row.get::<Option<String>, _>(2),
        "status": row.get::<String, _>(6),
        "tenantId": row.get::<String, _>(1),
    })
}

fn group_member_row_to_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "groupId": row.get::<String, _>(2),
        "id": row.get::<String, _>(0),
        "joinedAt": row.get::<String, _>(5),
        "memberId": row.get::<String, _>(0),
        "principalId": row.get::<String, _>(4),
        "principalKind": row.get::<String, _>(3),
        "status": row.get::<String, _>(6),
        "tenantId": row.get::<String, _>(1),
    })
}

fn service_account_row_to_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "code": row.get::<String, _>(3),
        "credentialKind": row.get::<String, _>(6),
        "id": row.get::<String, _>(0),
        "name": row.get::<String, _>(4),
        "organizationId": row.get::<Option<String>, _>(2),
        "serviceAccountId": row.get::<String, _>(0),
        "status": row.get::<String, _>(5),
        "tenantId": row.get::<String, _>(1),
    })
}

async fn patch_directory_row(
    pg: &PgPool,
    ctx: &WebRequestContext,
    tenant_id: &str,
    table: &str,
    id: &str,
    assignments: &[(String, PatchValue)],
) -> Result<bool, sqlx::Error> {
    let mut tx = pg.begin().await?;
    let updated = patch_tenant_row_tx(&mut *tx, tenant_id, table, id, assignments).await?;
    if updated {
        let audit_detail = json!({
            "updatedFields": assignments
                .iter()
                .map(|(column, _)| column.as_str())
                .filter(|column| *column != "updated_at")
                .collect::<Vec<_>>()
        });
        if let Err(error) = record_backend_mutation_audit_tx(
            &mut *tx,
            ctx,
            &format!("{table}.update"),
            table,
            id,
            audit_detail,
        )
        .await
        {
            tracing::error!(%error, table, resource_id = %id, "directory patch audit failed; rolling back");
            return Err(sqlx::Error::Protocol(error));
        }
    }
    tx.commit().await?;
    Ok(updated)
}

include!("directory_crud.impl.rs");

#[cfg(test)]
mod tests {
    use super::{
        media_delivery_url, nest_tree, organization_patch_fields, parse_role_binding_patch,
        role_binding_visibility_sql, tenant_patch_fields, validate_role_binding_effective_window,
        validate_tenant_role_binding_scope, PatchValue, RoleBindingErrorKind,
    };
    use serde_json::json;

    #[test]
    fn organization_patch_fields_clears_the_logo_on_an_explicit_null() {
        let assignments =
            organization_patch_fields(&json!({ "logo": null })).expect("patch fields");
        assert!(assignments.iter().any(|(column, value)| {
            column == "logo_resource_snapshot" && *value == PatchValue::NullText
        }));
    }

    #[test]
    fn organization_patch_fields_keeps_a_delivery_url_over_a_null_logo() {
        let assignments = organization_patch_fields(&json!({
            "logo": null,
            "logoUrl": "https://cdn.example.com/logo.png",
        }))
        .expect("patch fields");
        let snapshot = assignments
            .iter()
            .find(|(column, _)| column == "logo_resource_snapshot");
        assert!(matches!(
            snapshot.map(|(_, value)| value),
            Some(PatchValue::Text(text)) if text.contains("cdn.example.com/logo.png")
        ));
    }

    #[test]
    fn organization_patch_fields_leaves_the_logo_untouched_when_the_key_is_absent() {
        let assignments =
            organization_patch_fields(&json!({ "name": "North" })).expect("patch fields");
        assert!(!assignments
            .iter()
            .any(|(column, _)| column == "logo_resource_snapshot"));
    }

    #[test]
    fn organization_patch_fields_clears_a_profile_field_on_an_explicit_empty_string() {
        let assignments =
            organization_patch_fields(&json!({ "description": "" })).expect("patch fields");
        assert!(assignments
            .iter()
            .any(|(column, value)| column == "description" && *value == PatchValue::NullText));
    }

    #[test]
    fn tenant_patch_fields_clears_profile_fields_and_the_logo() {
        let assignments = tenant_patch_fields(&json!({
            "address": "   ",
            "description": "",
            "logo": null,
        }))
        .expect("patch fields");
        for column in ["address", "description", "logo_resource_snapshot"] {
            assert!(
                assignments
                    .iter()
                    .any(|(candidate, value)| candidate == column && *value == PatchValue::NullText),
                "{column} should be explicitly cleared"
            );
        }
    }

    #[test]
    fn tenant_patch_fields_normalizes_and_guards_the_lifecycle_status() {
        let assignments =
            tenant_patch_fields(&json!({ "status": "Suspended" })).expect("patch fields");
        assert!(assignments.iter().any(|(column, value)| column == "status"
            && *value == PatchValue::Text("suspended".to_owned())));

        assert!(tenant_patch_fields(&json!({ "status": "archived" })).is_err());
    }

    #[test]
    fn media_delivery_url_never_exposes_a_drive_reference() {
        assert_eq!(
            media_delivery_url(&json!({ "uri": "drive://spaces/space-1/nodes/node-1" })),
            None
        );
        assert_eq!(
            media_delivery_url(&json!({ "uri": "https://cdn.example.com/logo.png" })),
            Some("https://cdn.example.com/logo.png".to_owned())
        );
    }

    #[test]
    fn role_binding_patch_distinguishes_omitted_dates_from_explicit_null() {
        let omitted =
            parse_role_binding_patch(&json!({ "effect": "deny" })).expect("valid partial patch");
        assert_eq!(omitted.effective_from, None);
        assert_eq!(omitted.effective_to, None);

        let cleared = parse_role_binding_patch(&json!({
            "effectiveFrom": null,
            "effectiveTo": null,
            "dataScopeKind": "self"
        }))
        .expect("valid nullable patch");
        assert_eq!(cleared.effective_from, Some(PatchValue::NullText));
        assert_eq!(cleared.effective_to, Some(PatchValue::NullText));
        assert!(matches!(
            cleared.data_scope_kind,
            Some(PatchValue::Text(value)) if value == "self"
        ));
    }

    #[test]
    fn role_binding_patch_accepts_legacy_snake_case_but_rejects_server_owned_fields() {
        let patch = parse_role_binding_patch(&json!({
            "principal_kind": "group",
            "scope_id": "dept-1"
        }))
        .expect("legacy aliases remain accepted at runtime");
        assert!(matches!(
            patch.principal_kind,
            Some(PatchValue::Text(value)) if value == "group"
        ));

        for body in [
            json!({}),
            json!({ "roleId": "role-2" }),
            json!({ "tenantId": "tenant-2" }),
            json!({ "id": "binding-2" }),
            json!({ "updatedAt": "2026-01-01T00:00:00Z" }),
            json!({ "effect": null }),
            json!({ "scopeId": "" }),
        ] {
            assert!(
                parse_role_binding_patch(&body).is_err(),
                "must reject {body}"
            );
        }
    }

    #[test]
    fn tenant_role_binding_scope_requires_a_tenant_context() {
        assert!(validate_tenant_role_binding_scope(None, "0").is_ok());
        for (organization_id, scope_id) in [(Some("iamorg-1"), "0"), (None, "iamorg-1")] {
            let error = validate_tenant_role_binding_scope(organization_id, scope_id)
                .expect_err("tenant scope must not be organization-scoped");
            assert!(matches!(error.kind, RoleBindingErrorKind::InvalidScope));
        }
    }

    #[test]
    fn role_binding_effective_window_requires_rfc3339_and_ordered_instants() {
        let valid = validate_role_binding_effective_window(
            Some("2026-01-01T00:00:00Z".to_owned()),
            Some("2026-01-02T00:00:00+00:00".to_owned()),
        )
        .expect("ordered RFC3339 window");
        assert!(valid.0.is_some() && valid.1.is_some());

        for (from, to) in [
            (Some("2026-01-02".to_owned()), Some("2026-01-03".to_owned())),
            (
                Some("2026-01-02T00:00:00Z".to_owned()),
                Some("2026-01-01T00:00:00Z".to_owned()),
            ),
        ] {
            let error = validate_role_binding_effective_window(from, to)
                .expect_err("invalid effective window");
            assert!(matches!(
                error.kind,
                RoleBindingErrorKind::InvalidEffectiveWindow
            ));
        }
    }

    #[test]
    fn role_binding_visibility_scopes_organization_and_department_targets() {
        let sql = role_binding_visibility_sql();
        assert!(sql.contains("b.scope_kind = 'tenant'"));
        assert!(sql.contains("b.scope_kind = 'organization' AND b.scope_id = $2"));
        assert!(sql.contains("d.tenant_id = b.tenant_id"));
        assert!(sql.contains("d.organization_id = $2"));
    }

    #[test]
    fn nest_tree_preserves_descendants_when_rows_are_not_topologically_sorted() {
        let tree = nest_tree(
            vec![
                json!({ "id": "grandchild", "parentId": "child" }),
                json!({ "id": "root", "parentId": null }),
                json!({ "id": "child", "parentId": "root" }),
            ],
            "id",
            "parentId",
        );
        assert_eq!(tree[0]["id"], "root");
        assert_eq!(tree[0]["children"][0]["id"], "child");
        assert_eq!(tree[0]["children"][0]["children"][0]["id"], "grandchild");
    }

    #[test]
    fn nest_tree_breaks_cycles_without_recursing_forever() {
        let tree = nest_tree(
            vec![
                json!({ "id": "a", "parentId": "b" }),
                json!({ "id": "b", "parentId": "a" }),
            ],
            "id",
            "parentId",
        );
        assert!(tree.is_empty());
    }
}
