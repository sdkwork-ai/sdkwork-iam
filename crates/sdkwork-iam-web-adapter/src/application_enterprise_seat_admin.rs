//! WorkBuddy-aligned seat-pool administration. Every command resolves server-side
//! RBAC scope, locks its order and writes the append-only order ledger atomically.

use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{AssertSqlSafe, PgPool, Row};
use uuid::Uuid;

use crate::application_enterprise_order::{
    conflict, ensure_enterprise_order_scope, forbidden, insert_event, invalid,
    load_enterprise_order_for_scope, not_found, resolve_enterprise_management_scope,
    EnterpriseManagementScope, EnterpriseOrder, EnterpriseOrderUpdateCommand, MODE_SEAT,
    ORDER_STATUS_ACTIVE,
};

fn id(prefix: &str) -> String {
    format!("{prefix}_{}", Uuid::now_v7().simple())
}
fn internal(context: &str, error: impl std::fmt::Display) -> String {
    format!("{context}: {error}")
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseSeatPolicyCommand {
    pub department_id: String,
    pub allocation_type: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseSeatPolicy {
    pub id: String,
    pub tenant_id: String,
    pub order_id: String,
    pub application_id: String,
    pub organization_id: String,
    pub department_id: String,
    pub department_name: String,
    pub allocation_type: String,
    pub created_by: String,
    pub created_at: String,
    pub updated_at: String,
    #[serde(serialize_with = "int64_string")]
    pub version: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseSeatBlacklistCommand {
    pub user_id: String,
    #[serde(default)]
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseSeatBlacklistEntry {
    pub id: String,
    pub tenant_id: String,
    pub order_id: String,
    pub application_id: String,
    pub user_id: String,
    pub display_name: String,
    pub one_id_id: Option<String>,
    pub department_name: Option<String>,
    pub reason: Option<String>,
    pub created_by: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseSeatPolicyUpdateCommand {
    #[serde(default)]
    pub department_id: Option<String>,
    #[serde(default)]
    pub allocation_type: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EnterpriseSeatPolicyDisposition {
    Release,
    Keep,
}

impl EnterpriseSeatPolicyDisposition {
    pub fn parse(value: &str) -> Result<Self, String> {
        match value {
            "release" => Ok(Self::Release),
            "keep" => Ok(Self::Keep),
            _ => Err(invalid("disposition must be release or keep")),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseSeatBulkReleaseCommand {
    pub items: Vec<EnterpriseSeatBulkReleaseItem>,
    #[serde(default)]
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseSeatBulkReleaseItem {
    pub seat_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseSeatBulkReleaseResult {
    pub items: Vec<EnterpriseSeatBulkReleaseResultItem>,
    pub all_or_nothing: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseSeatBulkReleaseResultItem {
    pub seat_id: String,
    pub success: bool,
}

fn int64_string<S: serde::Serializer>(value: &i64, serializer: S) -> Result<S::Ok, S::Error> {
    serializer.serialize_str(&value.to_string())
}

async fn lock_order(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    tenant_id: &str,
    order_id: &str,
) -> Result<EnterpriseOrder, String> {
    let row = sqlx::query(AssertSqlSafe(format!(
        "SELECT id, order_no, tenant_id, organization_id, application_id, enterprise_tenant_id, \
         enterprise_organization_id, enterprise_name, authorization_mode, seat_count, seat_name, \
         duration_months, order_status, contact_name, contact_phone, authorized_at, expires_at, \
         terminated_at, termination_reason, termination_note, created_at, updated_at, version \
         FROM iam_application_enterprise_order WHERE enterprise_tenant_id = $1 AND id = $2 \
           AND deleted_at IS NULL FOR UPDATE"
    )))
    .bind(tenant_id)
    .bind(order_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| internal("lock enterprise order failed", error))?
    .ok_or_else(|| not_found("enterprise order not found"))?;
    Ok(EnterpriseOrder {
        id: row.get("id"),
        order_no: row.get("order_no"),
        tenant_id: row.get("tenant_id"),
        organization_id: row.get("organization_id"),
        application_id: row.get("application_id"),
        enterprise_tenant_id: row.get("enterprise_tenant_id"),
        enterprise_organization_id: row.get("enterprise_organization_id"),
        enterprise_name: row.get("enterprise_name"),
        authorization_mode: row.get("authorization_mode"),
        seat_count: row.get("seat_count"),
        seat_name: row.get("seat_name"),
        active_seat_count: None,
        management_scope: None,
        duration_months: row.get("duration_months"),
        order_status: row.get("order_status"),
        contact_name: row.get("contact_name"),
        contact_phone: row.get("contact_phone"),
        authorized_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("authorized_at")
            .ok()
            .flatten()
            .map(|v| v.to_rfc3339()),
        expires_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("expires_at")
            .ok()
            .flatten()
            .map(|v| v.to_rfc3339()),
        terminated_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("terminated_at")
            .ok()
            .flatten()
            .map(|v| v.to_rfc3339()),
        termination_reason: row.get("termination_reason"),
        termination_note: row.get("termination_note"),
        created_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at")
            .ok()
            .flatten()
            .map(|v| v.to_rfc3339())
            .unwrap_or_default(),
        updated_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at")
            .ok()
            .flatten()
            .map(|v| v.to_rfc3339())
            .unwrap_or_default(),
        version: row.get("version"),
    })
}

fn active(order: &EnterpriseOrder) -> Result<(), String> {
    if order.order_status != ORDER_STATUS_ACTIVE {
        return Err(conflict("seats can only be managed on an active order"));
    }
    if order
        .expires_at
        .as_deref()
        .and_then(|v| chrono::DateTime::parse_from_rfc3339(v).ok())
        .is_some_and(|v| v <= chrono::Utc::now())
    {
        return Err(conflict("the enterprise order has expired"));
    }
    Ok(())
}

fn validate_order_update(command: &EnterpriseOrderUpdateCommand) -> Result<(), String> {
    if command.seat_name.as_deref().is_some_and(|value| {
        let length = value.trim().chars().count();
        !(1..=100).contains(&length)
    }) {
        return Err(invalid(
            "seatName must contain 1..=100 characters after trimming",
        ));
    }
    if command
        .seat_count
        .is_some_and(|count| !(1..=1_000_000).contains(&count))
    {
        return Err(invalid("seatCount must be between 1 and 1000000"));
    }
    Ok(())
}

pub async fn update_enterprise_order(
    pg: &PgPool,
    tenant_id: &str,
    actor_id: &str,
    order_id: &str,
    command: &EnterpriseOrderUpdateCommand,
) -> Result<EnterpriseOrder, String> {
    let (_, scope) = ensure_enterprise_order_scope(pg, tenant_id, actor_id, order_id, true).await?;
    if !scope.can_manage_order() {
        return Err(forbidden(
            "only tenant and organization administrators can resize a seat pool",
        ));
    }
    validate_order_update(command)?;
    let name = command.seat_name.as_deref().map(str::trim);
    let mut tx = pg
        .begin()
        .await
        .map_err(|e| internal("begin order resize failed", e))?;
    let order = lock_order(&mut tx, tenant_id, order_id).await?;
    active(&order)?;
    if order.authorization_mode != MODE_SEAT {
        return Err(conflict("only a seat-mode order has a resizable seat pool"));
    }
    let count = command.seat_count.unwrap_or(order.seat_count.unwrap_or(0));
    if count <= 0 {
        return Err(invalid("seatCount must be positive"));
    }
    let used: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM iam_application_enterprise_seat WHERE tenant_id = $1 AND order_id = $2 AND seat_status = 'active'")
        .bind(tenant_id).bind(order_id).fetch_one(&mut *tx).await.map_err(|e| internal("count active seats failed", e))?;
    if i64::from(count) < used {
        return Err(conflict(format!(
            "seatCount cannot be smaller than {used} active seats"
        )));
    }
    sqlx::query("UPDATE iam_application_enterprise_order SET seat_name = COALESCE($3, seat_name), seat_count = $4, updated_by = $5, updated_at = NOW(), version = version + 1 WHERE tenant_id = $6 AND id = $2")
        .bind(tenant_id).bind(order_id).bind(name).bind(count).bind(actor_id).bind(&order.tenant_id).execute(&mut *tx).await
        .map_err(|e| internal("resize enterprise order failed", e))?;
    insert_event(
        &mut tx,
        &order.tenant_id,
        order_id,
        "order_resized",
        "enterprise_admin",
        Some(actor_id),
        json!({"seatName": name, "seatCount": count}),
    )
    .await?;
    tx.commit()
        .await
        .map_err(|e| internal("commit order resize failed", e))?;
    load_enterprise_order_for_scope(pg, tenant_id, order_id).await
}

async fn validate_policy_department(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    tenant_id: &str,
    order: &EnterpriseOrder,
    department_id: &str,
    allocation_type: &str,
    excluded_policy_id: Option<&str>,
) -> Result<String, String> {
    let department: Option<(String, String)> = sqlx::query_as(
        "SELECT d.id, d.name FROM iam_department d WHERE d.tenant_id = $1 AND d.organization_id = $2 AND d.id = $3 AND d.status = 'active'",
    ).bind(tenant_id).bind(&order.enterprise_organization_id).bind(department_id).fetch_optional(&mut **tx).await
        .map_err(|e| internal("load policy department failed", e))?;
    let Some((id, name)) = department else {
        return Err(invalid(
            "department must belong to the order's enterprise organization",
        ));
    };
    let same_department: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM iam_application_enterprise_seat_policy p \
         WHERE p.tenant_id = $1 AND p.order_id = $2 AND p.department_id = $3 \
           AND ($4::text IS NULL OR p.id <> $4))",
    )
    .bind(tenant_id)
    .bind(&order.id)
    .bind(&id)
    .bind(excluded_policy_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|e| internal("check department seat policy failed", e))?;
    if same_department {
        return Err(conflict("the department already has a seat policy"));
    }
    let parent: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM iam_department_closure c JOIN iam_application_enterprise_seat_policy p \
         ON p.tenant_id = c.tenant_id AND p.organization_id = c.organization_id AND p.department_id = c.ancestor_department_id \
         WHERE c.tenant_id = $1 AND c.organization_id = $2 AND c.descendant_department_id = $3 AND c.depth > 0 AND p.order_id = $4 \
           AND ($5::text IS NULL OR p.id <> $5))",
    ).bind(tenant_id).bind(&order.enterprise_organization_id).bind(&id).bind(&order.id).bind(excluded_policy_id).fetch_one(&mut **tx).await
        .map_err(|e| internal("check parent seat policy failed", e))?;
    if parent {
        return Err(conflict("a parent department already has a seat policy"));
    }
    let conflicting_child: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM iam_department_closure c JOIN iam_application_enterprise_seat_policy p \
         ON p.tenant_id = c.tenant_id AND p.organization_id = c.organization_id AND p.department_id = c.descendant_department_id \
         WHERE c.tenant_id = $1 AND c.organization_id = $2 AND c.ancestor_department_id = $3 AND c.depth > 0 AND p.order_id = $4 AND p.allocation_type = $5 \
           AND ($6::text IS NULL OR p.id <> $6))",
    ).bind(tenant_id).bind(&order.enterprise_organization_id).bind(&id).bind(&order.id).bind(allocation_type).bind(excluded_policy_id).fetch_one(&mut **tx).await
        .map_err(|e| internal("check child seat policy failed", e))?;
    if conflicting_child {
        return Err(conflict(
            "a child department already has a policy of the same allocation type",
        ));
    }
    Ok(name)
}

fn policy_from_row(row: &sqlx::postgres::PgRow) -> EnterpriseSeatPolicy {
    EnterpriseSeatPolicy {
        id: row.get("id"),
        tenant_id: row.get("tenant_id"),
        order_id: row.get("order_id"),
        application_id: row.get("application_id"),
        organization_id: row.get("organization_id"),
        department_id: row.get("department_id"),
        department_name: row.get("department_name"),
        allocation_type: row.get("allocation_type"),
        created_by: row.get("created_by"),
        created_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at")
            .ok()
            .flatten()
            .map(|v| v.to_rfc3339())
            .unwrap_or_default(),
        updated_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at")
            .ok()
            .flatten()
            .map(|v| v.to_rfc3339())
            .unwrap_or_default(),
        version: row.get("version"),
    }
}

const POLICY_COLUMNS: &str = "id, tenant_id, order_id, application_id, organization_id, department_id, department_name, allocation_type, created_by, created_at, updated_at, version";

pub async fn list_enterprise_seat_policies(
    pg: &PgPool,
    tenant_id: &str,
    actor_id: &str,
    order_id: &str,
    q: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<(Vec<EnterpriseSeatPolicy>, i64), String> {
    let (_, scope) = ensure_enterprise_order_scope(pg, tenant_id, actor_id, order_id, true).await?;
    if !scope.can_manage_order() {
        return Err(forbidden(
            "only tenant and organization administrators can manage seat policies",
        ));
    }
    let pattern = q
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .map(|v| format!("%{}%", v.to_lowercase()))
        .unwrap_or_default();
    let visibility = "($4::text[] = '{}' OR organization_id = ANY($4::text[]))";
    let total: i64 = sqlx::query_scalar(AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM iam_application_enterprise_seat_policy WHERE tenant_id = $1 AND order_id = $2 AND ($3 = '' OR LOWER(department_name) LIKE $3) AND ({visibility})"
    ))).bind(tenant_id).bind(order_id).bind(&pattern).bind(&scope.organization_ids)
        .fetch_one(pg).await.map_err(|e| internal("count seat policies failed", e))?;
    let rows = sqlx::query(AssertSqlSafe(format!(
        "SELECT {POLICY_COLUMNS} FROM iam_application_enterprise_seat_policy WHERE tenant_id = $1 AND order_id = $2 AND ($3 = '' OR LOWER(department_name) LIKE $3) AND ({visibility}) ORDER BY created_at, id LIMIT $5 OFFSET $6"
    ))).bind(tenant_id).bind(order_id).bind(&pattern).bind(&scope.organization_ids).bind(limit).bind(offset)
        .fetch_all(pg).await.map_err(|e| internal("list seat policies failed", e))?;
    Ok((rows.iter().map(policy_from_row).collect(), total))
}

pub async fn create_enterprise_seat_policy(
    pg: &PgPool,
    tenant_id: &str,
    actor_id: &str,
    order_id: &str,
    command: &EnterpriseSeatPolicyCommand,
) -> Result<EnterpriseSeatPolicy, String> {
    let (_, scope) = ensure_enterprise_order_scope(pg, tenant_id, actor_id, order_id, true).await?;
    if !scope.can_manage_order() {
        return Err(forbidden(
            "only tenant and organization administrators can manage seat policies",
        ));
    }
    if !matches!(command.allocation_type.as_str(), "auto" | "login") {
        return Err(invalid("allocationType must be auto or login"));
    }
    let department_id = command.department_id.trim();
    if department_id.is_empty() {
        return Err(invalid("departmentId cannot be empty"));
    }
    let mut tx = pg
        .begin()
        .await
        .map_err(|e| internal("begin seat policy create failed", e))?;
    let order = lock_order(&mut tx, tenant_id, order_id).await?;
    active(&order)?;
    let name = validate_policy_department(
        &mut tx,
        tenant_id,
        &order,
        department_id,
        &command.allocation_type,
        None,
    )
    .await?;
    if scope.kind == "organization"
        && order.enterprise_organization_id != "0"
        && !scope
            .organization_ids
            .contains(&order.enterprise_organization_id)
    {
        return Err(forbidden(
            "seat policy is outside the caller's organization scope",
        ));
    }
    let policy_id = id("iaesp");
    sqlx::query("INSERT INTO iam_application_enterprise_seat_policy (id, tenant_id, order_id, application_id, organization_id, department_id, department_name, allocation_type, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)")
        .bind(&policy_id).bind(tenant_id).bind(order_id).bind(&order.application_id).bind(&order.enterprise_organization_id).bind(department_id).bind(name).bind(&command.allocation_type).bind(actor_id)
        .execute(&mut *tx).await.map_err(|e| {
            if e.as_database_error().is_some_and(|d| d.code().as_deref() == Some("23505")) { conflict("the department already has a seat policy") } else { internal("insert seat policy failed", e) }
        })?;
    insert_event(&mut tx, &order.tenant_id, order_id, "seat_policy_created", "enterprise_admin", Some(actor_id), json!({"policyId": policy_id, "departmentId": command.department_id, "allocationType": command.allocation_type})).await?;
    tx.commit()
        .await
        .map_err(|e| internal("commit seat policy create failed", e))?;
    retrieve_policy(pg, tenant_id, order_id, &policy_id).await
}

pub async fn retrieve_enterprise_seat_policy(
    pg: &PgPool,
    tenant_id: &str,
    actor_id: &str,
    order_id: &str,
    policy_id: &str,
) -> Result<EnterpriseSeatPolicy, String> {
    let (_, scope) = ensure_enterprise_order_scope(pg, tenant_id, actor_id, order_id, true).await?;
    if !scope.can_manage_order() {
        return Err(forbidden(
            "only tenant and organization administrators can read seat policies",
        ));
    }
    let policy = retrieve_policy(pg, tenant_id, order_id, policy_id).await?;
    if scope.kind == "organization" && !scope.organization_ids.contains(&policy.organization_id) {
        return Err(forbidden(
            "seat policy is outside the caller's organization scope",
        ));
    }
    Ok(policy)
}

async fn retrieve_policy<'e, E: sqlx::Executor<'e, Database = sqlx::Postgres>>(
    executor: E,
    tenant_id: &str,
    order_id: &str,
    policy_id: &str,
) -> Result<EnterpriseSeatPolicy, String> {
    sqlx::query(AssertSqlSafe(format!("SELECT {POLICY_COLUMNS} FROM iam_application_enterprise_seat_policy WHERE tenant_id = $1 AND order_id = $2 AND id = $3")))
        .bind(tenant_id).bind(order_id).bind(policy_id).fetch_optional(executor).await.map_err(|e| internal("load seat policy failed", e))?
        .map(|row| policy_from_row(&row)).ok_or_else(|| not_found("seat policy not found"))
}

pub async fn update_enterprise_seat_policy(
    pg: &PgPool,
    tenant_id: &str,
    actor_id: &str,
    order_id: &str,
    policy_id: &str,
    command: &EnterpriseSeatPolicyUpdateCommand,
) -> Result<EnterpriseSeatPolicy, String> {
    let (_, scope) = ensure_enterprise_order_scope(pg, tenant_id, actor_id, order_id, true).await?;
    if !scope.can_manage_order() {
        return Err(forbidden(
            "only tenant and organization administrators can manage seat policies",
        ));
    }
    if command.department_id.is_none() && command.allocation_type.is_none() {
        return Err(invalid("at least one seat policy field is required"));
    }
    let allocation_type = command.allocation_type.as_deref().map(str::trim);
    if allocation_type.is_some_and(|v| !matches!(v, "auto" | "login")) {
        return Err(invalid("allocationType must be auto or login"));
    }
    if command
        .department_id
        .as_deref()
        .is_some_and(|v| v.trim().is_empty())
    {
        return Err(invalid("departmentId cannot be empty"));
    }
    let mut tx = pg
        .begin()
        .await
        .map_err(|e| internal("begin seat policy update failed", e))?;
    let order = lock_order(&mut tx, tenant_id, order_id).await?;
    active(&order)?;
    let existing = retrieve_policy(&mut *tx, tenant_id, order_id, policy_id).await?;
    if scope.kind == "organization" && !scope.organization_ids.contains(&existing.organization_id) {
        return Err(forbidden(
            "seat policy is outside the caller's organization scope",
        ));
    }
    if command
        .department_id
        .as_deref()
        .is_some_and(|v| v.trim() != existing.department_id)
    {
        return Err(invalid(
            "a seat policy department cannot be moved; delete and recreate it",
        ));
    }
    let next = allocation_type.unwrap_or(&existing.allocation_type);
    let name = validate_policy_department(
        &mut tx,
        tenant_id,
        &order,
        &existing.department_id,
        next,
        Some(policy_id),
    )
    .await?;
    if next != existing.allocation_type {
        sqlx::query("UPDATE iam_application_enterprise_seat SET seat_status = 'released', released_by = $3, released_at = NOW(), updated_at = NOW(), version = version + 1 WHERE tenant_id = $1 AND order_id = $2 AND policy_id = $4 AND seat_status = 'active'")
            .bind(tenant_id).bind(order_id).bind(actor_id).bind(policy_id).execute(&mut *tx).await.map_err(|e| internal("release policy seats failed", e))?;
        sqlx::query("UPDATE iam_application_enterprise_seat_policy SET allocation_type = $3, department_name = $4, updated_at = NOW(), version = version + 1 WHERE tenant_id = $1 AND order_id = $2 AND id = $5")
            .bind(tenant_id).bind(order_id).bind(next).bind(name).bind(policy_id).execute(&mut *tx).await.map_err(|e| internal("update seat policy failed", e))?;
    }
    insert_event(
        &mut tx,
        &order.tenant_id,
        order_id,
        "seat_policy_updated",
        "enterprise_admin",
        Some(actor_id),
        json!({"policyId": policy_id, "allocationType": allocation_type}),
    )
    .await?;
    tx.commit()
        .await
        .map_err(|e| internal("commit seat policy update failed", e))?;
    retrieve_policy(pg, tenant_id, order_id, policy_id).await
}

pub async fn delete_enterprise_seat_policy(
    pg: &PgPool,
    tenant_id: &str,
    actor_id: &str,
    order_id: &str,
    policy_id: &str,
    disposition: EnterpriseSeatPolicyDisposition,
) -> Result<(), String> {
    let (_, scope) = ensure_enterprise_order_scope(pg, tenant_id, actor_id, order_id, true).await?;
    if !scope.can_manage_order() {
        return Err(forbidden(
            "only tenant and organization administrators can manage seat policies",
        ));
    }
    let mut tx = pg
        .begin()
        .await
        .map_err(|e| internal("begin seat policy delete failed", e))?;
    let order = lock_order(&mut tx, tenant_id, order_id).await?;
    active(&order)?;
    let policy = retrieve_policy(&mut *tx, tenant_id, order_id, policy_id).await?;
    if scope.kind == "organization" && !scope.organization_ids.contains(&policy.organization_id) {
        return Err(forbidden(
            "seat policy is outside the caller's organization scope",
        ));
    }
    // Conversion, delete and any resulting trigger work share one transaction.
    sqlx::query("SELECT set_config('sdkwork.enterprise_seat_admin', 'on', true)")
        .execute(&mut *tx)
        .await
        .map_err(|e| internal("suspend seat reconciliation failed", e))?;
    // Convert seats before deleting the policy: the reconciliation trigger only
    // revisits policy-managed seats, so kept manual seats survive the delete.
    match disposition {
        EnterpriseSeatPolicyDisposition::Release => {
            sqlx::query("UPDATE iam_application_enterprise_seat SET seat_status = 'released', released_by = $3, released_at = NOW(), updated_at = NOW(), version = version + 1 WHERE tenant_id = $1 AND order_id = $2 AND policy_id = $4 AND seat_status = 'active'")
                .bind(tenant_id).bind(order_id).bind(actor_id).bind(policy_id).execute(&mut *tx).await.map_err(|e| internal("release policy seats failed", e))?;
        }
        EnterpriseSeatPolicyDisposition::Keep => {
            sqlx::query("UPDATE iam_application_enterprise_seat SET allocation_method = 'manual', policy_id = NULL, updated_at = NOW(), version = version + 1 WHERE tenant_id = $1 AND order_id = $2 AND policy_id = $3 AND seat_status = 'active'")
                .bind(tenant_id).bind(order_id).bind(policy_id).execute(&mut *tx).await.map_err(|e| internal("convert policy seats failed", e))?;
        }
    }
    sqlx::query("DELETE FROM iam_application_enterprise_seat_policy WHERE tenant_id = $1 AND order_id = $2 AND id = $3")
        .bind(tenant_id).bind(order_id).bind(policy_id).execute(&mut *tx).await.map_err(|e| internal("delete seat policy failed", e))?;
    insert_event(&mut tx, &order.tenant_id, order_id, "seat_policy_deleted", "enterprise_admin", Some(actor_id), json!({"policyId": policy_id, "disposition": if disposition == EnterpriseSeatPolicyDisposition::Keep { "keep" } else { "release"}})).await?;
    tx.commit()
        .await
        .map_err(|e| internal("commit seat policy delete failed", e))
}

fn blacklist_from_row(row: &sqlx::postgres::PgRow) -> EnterpriseSeatBlacklistEntry {
    EnterpriseSeatBlacklistEntry {
        id: row.get("id"),
        tenant_id: row.get("tenant_id"),
        order_id: row.get("order_id"),
        application_id: row.get("application_id"),
        user_id: row.get("user_id"),
        display_name: row.get("display_name"),
        one_id_id: row.get("one_id_id"),
        department_name: row.get("department_name"),
        reason: row.get("reason"),
        created_by: row.get("created_by"),
        created_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at")
            .ok()
            .flatten()
            .map(|v| v.to_rfc3339())
            .unwrap_or_default(),
    }
}

const BLACKLIST_COLUMNS: &str = "b.id, b.tenant_id, b.order_id, b.application_id, b.user_id, b.display_name, b.one_id_id, b.department_name, b.reason, b.created_by, b.created_at";

pub async fn list_enterprise_seat_blacklist(
    pg: &PgPool,
    tenant_id: &str,
    actor_id: &str,
    order_id: &str,
    q: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<(Vec<EnterpriseSeatBlacklistEntry>, i64), String> {
    let (_, scope) = ensure_enterprise_order_scope(pg, tenant_id, actor_id, order_id, true).await?;
    if !scope.can_manage_order() {
        return Err(forbidden(
            "only tenant and organization administrators can manage the seat blacklist",
        ));
    }
    let pattern = q
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .map(|v| format!("%{}%", v.to_lowercase()))
        .unwrap_or_default();
    let visibility = "($4::text[] = '{}' OR EXISTS (SELECT 1 FROM iam_organization_membership om WHERE om.tenant_id = b.tenant_id AND om.user_id = b.user_id AND om.status = 'active' AND om.organization_id = ANY($4::text[])))";
    let total: i64 = sqlx::query_scalar(AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM iam_application_enterprise_seat_blacklist b WHERE b.tenant_id = $1 AND b.order_id = $2 AND ($3 = '' OR LOWER(b.display_name) LIKE $3 OR LOWER(COALESCE(b.one_id_id, '')) LIKE $3 OR LOWER(COALESCE(b.department_name, '')) LIKE $3 OR LOWER(COALESCE(b.reason, '')) LIKE $3) AND {visibility}"
    ))).bind(tenant_id).bind(order_id).bind(&pattern).bind(&scope.organization_ids)
        .fetch_one(pg).await.map_err(|e| internal("count seat blacklist failed", e))?;
    let rows = sqlx::query(AssertSqlSafe(format!(
        "SELECT {BLACKLIST_COLUMNS} FROM iam_application_enterprise_seat_blacklist b WHERE b.tenant_id = $1 AND b.order_id = $2 AND ($3 = '' OR LOWER(b.display_name) LIKE $3 OR LOWER(COALESCE(b.one_id_id, '')) LIKE $3 OR LOWER(COALESCE(b.department_name, '')) LIKE $3 OR LOWER(COALESCE(b.reason, '')) LIKE $3) AND {visibility} ORDER BY b.created_at DESC, b.id LIMIT $5 OFFSET $6"
    ))).bind(tenant_id).bind(order_id).bind(&pattern).bind(&scope.organization_ids).bind(limit).bind(offset)
        .fetch_all(pg).await.map_err(|e| internal("list seat blacklist failed", e))?;
    Ok((rows.iter().map(blacklist_from_row).collect(), total))
}

pub async fn create_enterprise_seat_blacklist(
    pg: &PgPool,
    tenant_id: &str,
    actor_id: &str,
    order_id: &str,
    command: &EnterpriseSeatBlacklistCommand,
) -> Result<EnterpriseSeatBlacklistEntry, String> {
    let (_, scope) = ensure_enterprise_order_scope(pg, tenant_id, actor_id, order_id, true).await?;
    if !scope.can_manage_order() {
        return Err(forbidden(
            "only tenant and organization administrators can manage the seat blacklist",
        ));
    }
    let reason = command
        .reason
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty());
    if reason.is_some_and(|v| v.chars().count() > 500) {
        return Err(invalid("reason must be at most 500 characters"));
    }
    let mut tx = pg
        .begin()
        .await
        .map_err(|e| internal("begin blacklist create failed", e))?;
    let order = lock_order(&mut tx, tenant_id, order_id).await?;
    active(&order)?;
    let user_id = command.user_id.trim();
    let identity: Option<(String, Option<String>, Option<String>)> = sqlx::query_as(
        "SELECT u.display_name, (SELECT subject FROM iam_user_identity ui WHERE ui.tenant_id = u.tenant_id AND ui.user_id = u.id AND ui.provider IN ('oneid', 'one_id') ORDER BY ui.created_at, ui.id LIMIT 1), \
         (SELECT d.name FROM iam_department_assignment da JOIN iam_department d ON d.tenant_id = da.tenant_id AND d.organization_id = da.organization_id AND d.id = da.department_id WHERE da.tenant_id = u.tenant_id AND da.user_id = u.id AND da.status = 'active' ORDER BY da.is_primary DESC, da.created_at, da.id LIMIT 1) \
         FROM iam_user u WHERE u.tenant_id = $1 AND u.id = $2",
    ).bind(tenant_id).bind(user_id).fetch_optional(&mut *tx).await.map_err(|e| internal("load blacklist user failed", e))?;
    let Some((display_name, one_id_id, department_name)) = identity else {
        return Err(not_found("enterprise user not found"));
    };
    if scope.kind == "organization" {
        let visible: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM iam_organization_membership om WHERE om.tenant_id = $1 AND om.user_id = $2 AND om.status = 'active' AND om.organization_id = ANY($3::text[]))")
            .bind(tenant_id).bind(user_id).bind(&scope.organization_ids).fetch_one(&mut *tx).await
            .map_err(|e| internal("check blacklist organization scope failed", e))?;
        if !visible {
            return Err(forbidden(
                "the user is outside the caller's organization scope",
            ));
        }
    }
    let entry_id = id("iaesb");
    sqlx::query("INSERT INTO iam_application_enterprise_seat_blacklist (id, tenant_id, order_id, application_id, user_id, display_name, one_id_id, department_name, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)")
        .bind(&entry_id).bind(tenant_id).bind(order_id).bind(&order.application_id).bind(user_id).bind(display_name).bind(&one_id_id).bind(&department_name).bind(reason).bind(actor_id)
        .execute(&mut *tx).await.map_err(|e| if e.as_database_error().is_some_and(|d| d.code().as_deref() == Some("23505")) { conflict("the user is already blacklisted") } else { internal("insert blacklist entry failed", e) })?;
    sqlx::query("UPDATE iam_application_enterprise_seat SET seat_status = 'released', released_by = $3, released_at = NOW(), updated_at = NOW(), version = version + 1 WHERE tenant_id = $1 AND order_id = $2 AND user_id = $4 AND seat_status = 'active'")
        .bind(tenant_id).bind(order_id).bind(actor_id).bind(user_id).execute(&mut *tx).await.map_err(|e| internal("release blacklisted seats failed", e))?;
    insert_event(
        &mut tx,
        &order.tenant_id,
        order_id,
        "seat_blacklist_added",
        "enterprise_admin",
        Some(actor_id),
        json!({"entryId": entry_id, "userId": user_id, "reason": reason}),
    )
    .await?;
    tx.commit()
        .await
        .map_err(|e| internal("commit blacklist create failed", e))?;
    retrieve_blacklist(pg, tenant_id, order_id, &entry_id).await
}

async fn retrieve_blacklist<'e, E: sqlx::Executor<'e, Database = sqlx::Postgres>>(
    executor: E,
    tenant_id: &str,
    order_id: &str,
    entry_id: &str,
) -> Result<EnterpriseSeatBlacklistEntry, String> {
    sqlx::query(AssertSqlSafe(format!("SELECT {BLACKLIST_COLUMNS} FROM iam_application_enterprise_seat_blacklist b WHERE b.tenant_id = $1 AND b.order_id = $2 AND b.id = $3")))
        .bind(tenant_id).bind(order_id).bind(entry_id).fetch_optional(executor).await.map_err(|e| internal("load blacklist entry failed", e))?
        .map(|row| blacklist_from_row(&row)).ok_or_else(|| not_found("blacklist entry not found"))
}

pub async fn delete_enterprise_seat_blacklist(
    pg: &PgPool,
    tenant_id: &str,
    actor_id: &str,
    order_id: &str,
    entry_id: &str,
) -> Result<(), String> {
    let (_, scope) = ensure_enterprise_order_scope(pg, tenant_id, actor_id, order_id, true).await?;
    if !scope.can_manage_order() {
        return Err(forbidden(
            "only tenant and organization administrators can manage the seat blacklist",
        ));
    }
    let mut tx = pg
        .begin()
        .await
        .map_err(|e| internal("begin blacklist delete failed", e))?;
    let order = lock_order(&mut tx, tenant_id, order_id).await?;
    active(&order)?;
    let entry = retrieve_blacklist(&mut *tx, tenant_id, order_id, entry_id).await?;
    if scope.kind == "organization" {
        let visible: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM iam_organization_membership om WHERE om.tenant_id = $1 AND om.user_id = $2 AND om.status = 'active' AND om.organization_id = ANY($3::text[]))")
            .bind(tenant_id).bind(&entry.user_id).bind(&scope.organization_ids).fetch_one(&mut *tx).await
            .map_err(|e| internal("check blacklist organization scope failed", e))?;
        if !visible {
            return Err(forbidden(
                "blacklist entry is outside the caller's organization scope",
            ));
        }
    }
    sqlx::query("DELETE FROM iam_application_enterprise_seat_blacklist WHERE tenant_id = $1 AND order_id = $2 AND id = $3")
        .bind(tenant_id).bind(order_id).bind(entry_id).execute(&mut *tx).await.map_err(|e| internal("delete blacklist entry failed", e))?;
    insert_event(
        &mut tx,
        &order.tenant_id,
        order_id,
        "seat_blacklist_removed",
        "enterprise_admin",
        Some(actor_id),
        json!({"entryId": entry_id, "userId": entry.user_id}),
    )
    .await?;
    tx.commit()
        .await
        .map_err(|e| internal("commit blacklist delete failed", e))
}

async fn ensure_seat_visible(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    tenant_id: &str,
    order_id: &str,
    seat_id: &str,
    scope: &EnterpriseManagementScope,
    actor_id: &str,
) -> Result<String, String> {
    let row: Option<(String, String, String, bool)> = sqlx::query_as(
        "SELECT s.user_id, s.allocation_method, s.organization_id, EXISTS ( \
           SELECT 1 FROM iam_application_enterprise_seat_blacklist b \
           WHERE b.tenant_id = s.tenant_id AND b.order_id = s.order_id AND b.user_id = s.user_id \
         ) AS blacklisted \
         FROM iam_application_enterprise_seat s \
         WHERE s.tenant_id = $1 AND s.order_id = $2 AND s.id = $3 AND s.seat_status = 'active' \
         FOR UPDATE OF s",
    )
    .bind(tenant_id)
    .bind(order_id)
    .bind(seat_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|e| internal("load bulk seat failed", e))?;
    let Some((user_id, method, organization_id, blacklisted)) = row else {
        return Err(not_found(format!("active seat {seat_id} not found")));
    };
    if blacklisted {
        return Err(conflict("blacklisted seats cannot be bulk released"));
    }
    if method != "manual" {
        return Err(conflict(
            "department-policy seats must be released through their policy",
        ));
    }
    match scope.kind.as_str() {
        "organization" if !scope.organization_ids.contains(&organization_id) => {
            return Err(forbidden("seat is outside the caller's organization scope"))
        }
        "department" | "department_and_children" => {
            let visible: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM iam_department_assignment da WHERE da.tenant_id = $1 AND da.user_id = $2 AND da.status = 'active' AND da.department_id = ANY($3::text[]))")
                .bind(tenant_id).bind(&user_id).bind(&scope.department_ids).fetch_one(&mut **tx).await.map_err(|e| internal("check bulk seat scope failed", e))?;
            if !visible {
                return Err(forbidden("seat is outside the caller's department scope"));
            }
        }
        "self" if user_id != actor_id => {
            return Err(forbidden("self scope only permits releasing your own seat"))
        }
        _ => {}
    }
    Ok(user_id)
}

fn validate_bulk_release(
    command: &EnterpriseSeatBulkReleaseCommand,
) -> Result<std::collections::BTreeSet<String>, String> {
    if command.items.is_empty() || command.items.len() > 200 {
        return Err(invalid("items must contain 1..=200 seats"));
    }
    if command
        .reason
        .as_deref()
        .is_some_and(|value| value.trim().chars().count() > 500)
    {
        return Err(invalid("reason must be at most 500 characters"));
    }
    let mut ids = std::collections::BTreeSet::new();
    for item in &command.items {
        let seat_id = item.seat_id.trim();
        if seat_id.is_empty() {
            return Err(invalid("seatId cannot be empty"));
        }
        if !ids.insert(seat_id.to_owned()) {
            return Err(invalid("seatId values must be unique"));
        }
    }
    Ok(ids)
}

pub async fn bulk_release_enterprise_seats(
    pg: &PgPool,
    tenant_id: &str,
    actor_id: &str,
    order_id: &str,
    command: &EnterpriseSeatBulkReleaseCommand,
) -> Result<EnterpriseSeatBulkReleaseResult, String> {
    let (_, scope) = ensure_enterprise_order_scope(pg, tenant_id, actor_id, order_id, true).await?;
    let ids = validate_bulk_release(command)?;
    let mut tx = pg
        .begin()
        .await
        .map_err(|e| internal("begin bulk release failed", e))?;
    let order = lock_order(&mut tx, tenant_id, order_id).await?;
    active(&order)?;
    let mut validated = Vec::with_capacity(ids.len());
    for seat_id in &ids {
        validated.push((
            seat_id.to_owned(),
            ensure_seat_visible(&mut tx, tenant_id, order_id, seat_id, &scope, actor_id).await?,
        ));
    }
    for (seat_id, user_id) in &validated {
        let updated = sqlx::query("UPDATE iam_application_enterprise_seat SET seat_status = 'released', released_by = $3, released_at = NOW(), updated_at = NOW(), version = version + 1 WHERE tenant_id = $1 AND order_id = $2 AND id = $4 AND seat_status = 'active' AND allocation_method = 'manual' AND NOT EXISTS (SELECT 1 FROM iam_application_enterprise_seat_blacklist b WHERE b.tenant_id = $1 AND b.order_id = $2 AND b.user_id = iam_application_enterprise_seat.user_id)")
            .bind(tenant_id).bind(order_id).bind(actor_id).bind(seat_id).execute(&mut *tx).await.map_err(|e| internal("bulk release seat failed", e))?;
        if updated.rows_affected() != 1 {
            return Err(conflict(format!("seat {seat_id} is no longer releasable")));
        }
        insert_event(
            &mut tx,
            &order.tenant_id,
            order_id,
            "seat_released",
            "enterprise_admin",
            Some(actor_id),
            json!({"seatId": seat_id, "userId": user_id, "reason": command.reason}),
        )
        .await?;
    }
    insert_event(
        &mut tx,
        &order.tenant_id,
        order_id,
        "seats_bulk_released",
        "enterprise_admin",
        Some(actor_id),
        json!({"seatIds": ids, "reason": command.reason}),
    )
    .await?;
    tx.commit()
        .await
        .map_err(|e| internal("commit bulk release failed", e))?;
    Ok(EnterpriseSeatBulkReleaseResult {
        items: ids
            .into_iter()
            .map(|seat_id| EnterpriseSeatBulkReleaseResultItem {
                seat_id: seat_id.to_owned(),
                success: true,
            })
            .collect(),
        all_or_nothing: true,
    })
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseSeatExportCommand {
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub q: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseSeatExportResult {
    pub file_name: String,
    pub csv: String,
}

fn csv_cell(value: Option<&str>) -> String {
    let value = value.unwrap_or("");
    let safe = if value.starts_with(['=', '+', '-', '@', '\t', '\r', '\n'])
        || value.trim_start().starts_with(['=', '+', '-', '@'])
    {
        format!("'{}", value)
    } else {
        value.to_owned()
    };
    format!("\"{}\"", safe.replace('"', "\"\""))
}

pub async fn export_enterprise_seats(
    pg: &PgPool,
    tenant_id: &str,
    actor_id: &str,
    order_id: &str,
    command: &EnterpriseSeatExportCommand,
) -> Result<EnterpriseSeatExportResult, String> {
    // Resolve the dedicated export permission before reading the target order or
    // any seat identity; route middleware alone is not the authorization boundary.
    let scope =
        resolve_enterprise_management_scope(pg, tenant_id, actor_id, "iam.enterprise_seats.export")
            .await?;
    let order = load_enterprise_order_for_scope(pg, tenant_id, order_id).await?;
    match scope.kind.as_str() {
        "organization"
            if order.enterprise_organization_id != "0"
                && !scope
                    .organization_ids
                    .contains(&order.enterprise_organization_id) =>
        {
            return Err(forbidden(
                "enterprise order is outside the caller's organization scope",
            ));
        }
        "department" | "department_and_children" => {
            let visible: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM iam_department d WHERE d.tenant_id = $1 AND d.organization_id = $2 AND d.status = 'active' AND d.id = ANY($3::text[]))")
                .bind(tenant_id).bind(&order.enterprise_organization_id).bind(&scope.department_ids).fetch_one(pg).await
                .map_err(|e| internal("check export order department scope failed", e))?;
            if !visible {
                return Err(forbidden(
                    "enterprise order is outside the caller's department scope",
                ));
            }
        }
        "self" => {
            let visible: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM iam_application_enterprise_seat s WHERE s.tenant_id = $1 AND s.order_id = $2 AND s.user_id = $3 AND s.seat_status = 'active') AND ($4 = '0' OR EXISTS (SELECT 1 FROM iam_organization_membership om WHERE om.tenant_id = $1 AND om.user_id = $3 AND om.organization_id = $4 AND om.status = 'active'))")
                .bind(tenant_id).bind(order_id).bind(actor_id).bind(&order.enterprise_organization_id).fetch_one(pg).await
                .map_err(|e| internal("check export order self scope failed", e))?;
            if !visible {
                return Err(forbidden(
                    "enterprise order is outside the caller's self scope",
                ));
            }
        }
        _ => {}
    }
    let status = command.status.as_deref().unwrap_or("");
    if !status.is_empty() && !matches!(status, "active" | "released") {
        return Err(invalid("status must be active or released"));
    }
    if command
        .q
        .as_deref()
        .is_some_and(|value| value.trim().chars().count() > 256)
    {
        return Err(invalid("q must be at most 256 characters"));
    }
    let pattern = command
        .q
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .map(|v| format!("%{}%", v.to_lowercase()))
        .unwrap_or_default();
    let filter = scope.seat_filter_sql(6, 7, 8);
    let rows = sqlx::query(AssertSqlSafe(format!(
        "SELECT u.display_name, d.name AS department_name, oneid.subject AS one_id_id, s.allocation_method, o.seat_name, s.assigned_at \
         FROM iam_application_enterprise_seat s JOIN iam_user u ON u.tenant_id = s.tenant_id AND u.id = s.user_id \
         JOIN iam_application_enterprise_order o ON o.id = s.order_id \
         LEFT JOIN LATERAL (SELECT subject FROM iam_user_identity ui WHERE ui.tenant_id = s.tenant_id AND ui.user_id = s.user_id AND ui.provider IN ('oneid', 'one_id') ORDER BY ui.created_at, ui.id LIMIT 1) oneid ON TRUE \
         LEFT JOIN LATERAL (SELECT dd.name FROM iam_department_assignment da JOIN iam_department dd ON dd.tenant_id = da.tenant_id AND dd.organization_id = da.organization_id AND dd.id = da.department_id WHERE da.tenant_id = s.tenant_id AND da.user_id = s.user_id AND da.status = 'active' ORDER BY da.is_primary DESC, da.created_at, da.id LIMIT 1) d ON TRUE \
         WHERE s.tenant_id = $1 AND s.order_id = $2 AND ($3 = '' OR s.seat_status = $3) \
           AND ($4 = '' OR LOWER(COALESCE(u.display_name, '')) LIKE $4 OR LOWER(COALESCE(oneid.subject, '')) LIKE $4 OR LOWER(COALESCE(d.name, '')) LIKE $4) AND ({filter}) \
         ORDER BY s.assigned_at DESC, s.id DESC"
    ))).bind(tenant_id).bind(order_id).bind(status).bind(&pattern).bind(&scope.kind).bind(actor_id)
        .bind(&scope.organization_ids).bind(&scope.department_ids).fetch_all(pg).await.map_err(|e| internal("export enterprise seats failed", e))?;
    let mut csv = "姓名,部门,OneID ID,获取席位方式,分配席位名称,分配时间\n".to_owned();
    let method_name = |method: &str| match method {
        "department_auto" => "部门自动分配",
        "department_login" => "部门登录分配",
        _ => "手动分配",
    };
    for row in &rows {
        let display: Option<String> = row.get("display_name");
        let department: Option<String> = row.get("department_name");
        let one_id: Option<String> = row.get("one_id_id");
        let method: String = row.get("allocation_method");
        let seat_name: Option<String> = row.get("seat_name");
        let assigned: chrono::DateTime<chrono::Utc> = row.get("assigned_at");
        csv.push_str(&format!(
            "{},{},{},{},{},{}\n",
            csv_cell(display.as_deref()),
            csv_cell(department.as_deref()),
            csv_cell(one_id.as_deref()),
            csv_cell(Some(method_name(&method))),
            csv_cell(seat_name.as_deref()),
            csv_cell(Some(&assigned.to_rfc3339()))
        ));
    }
    let mut tx = pg
        .begin()
        .await
        .map_err(|e| internal("begin export audit failed", e))?;
    let locked = lock_order(&mut tx, tenant_id, order_id).await?;
    insert_event(&mut tx, &locked.tenant_id, order_id, "seats_exported", "enterprise_admin", Some(actor_id), json!({"actorId": actor_id, "targetUserId": null, "scope": scope.kind, "status": status, "q": command.q, "rowCount": rows.len()})).await?;
    tx.commit()
        .await
        .map_err(|e| internal("commit export audit failed", e))?;
    Ok(EnterpriseSeatExportResult {
        file_name: format!("{}-seats.csv", order.order_no),
        csv,
    })
}

/// Called inside the token authorization check and by database reconciliation.
pub async fn reconcile_enterprise_authorization_seats(
    pg: &PgPool,
    tenant_id: &str,
    user_id: Option<&str>,
    include_login: bool,
    application_id: Option<&str>,
) -> Result<(), String> {
    sqlx::query("SELECT iam_reconcile_enterprise_seats($1, $2, $3, $4)")
        .bind(tenant_id)
        .bind(user_id)
        .bind(include_login)
        .bind(application_id)
        .execute(pg)
        .await
        .map_err(|e| internal("reconcile enterprise seats failed", e))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn csv_formula_injection_is_neutralized() {
        for prefix in ["=", "+", "-", "@", "\t", "\r", "\n"] {
            assert_eq!(
                csv_cell(Some(&format!("{prefix}SUM(A1)"))),
                format!("\"'{prefix}SUM(A1)\"")
            );
        }
        assert_eq!(csv_cell(Some("a\"b")), "\"a\"\"b\"");
        assert_eq!(csv_cell(Some("  =SUM(A1)")), "\"'  =SUM(A1)\"");
    }

    #[test]
    fn order_update_validates_trimmed_name_and_capacity_bounds() {
        let command = EnterpriseOrderUpdateCommand {
            seat_name: Some("  Standard seats  ".to_owned()),
            seat_count: Some(1_000_000),
        };
        assert!(validate_order_update(&command).is_ok());
        for name in ["", "   ", &"x".repeat(101)] {
            assert!(validate_order_update(&EnterpriseOrderUpdateCommand {
                seat_name: Some(name.to_owned()),
                seat_count: None,
            })
            .is_err());
        }
        for count in [0, -1, 1_000_001] {
            assert!(validate_order_update(&EnterpriseOrderUpdateCommand {
                seat_name: None,
                seat_count: Some(count),
            })
            .is_err());
        }
    }

    #[test]
    fn bulk_release_is_bounded_and_rejects_duplicate_or_blank_ids() {
        let command = |items: Vec<&str>| EnterpriseSeatBulkReleaseCommand {
            items: items
                .into_iter()
                .map(|seat_id| EnterpriseSeatBulkReleaseItem {
                    seat_id: seat_id.to_owned(),
                })
                .collect(),
            reason: None,
        };
        assert!(validate_bulk_release(&command(vec![])).is_err());
        assert!(validate_bulk_release(&command((0..201).map(|_| "seat").collect())).is_err());
        assert!(validate_bulk_release(&command(vec!["seat", " seat "])).is_err());
        assert!(validate_bulk_release(&command(vec![" "])).is_err());
        assert_eq!(
            validate_bulk_release(&command(vec![" seat "])).expect("valid"),
            ["seat"].into_iter().map(str::to_owned).collect()
        );
    }

    #[test]
    fn policy_update_preserves_omitted_fields() {
        let patch: EnterpriseSeatPolicyUpdateCommand =
            serde_json::from_value(json!({"allocationType": "login"}))
                .expect("deserialize allocation-only patch");
        assert_eq!(patch.allocation_type.as_deref(), Some("login"));
        assert!(patch.department_id.is_none());
        let empty: EnterpriseSeatPolicyUpdateCommand =
            serde_json::from_value(json!({})).expect("deserialize empty patch");
        assert!(empty.allocation_type.is_none());
        assert!(empty.department_id.is_none());
    }

    #[test]
    fn policy_disposition_is_a_closed_vocabulary() {
        assert_eq!(
            EnterpriseSeatPolicyDisposition::parse("release"),
            Ok(EnterpriseSeatPolicyDisposition::Release)
        );
        assert_eq!(
            EnterpriseSeatPolicyDisposition::parse("keep"),
            Ok(EnterpriseSeatPolicyDisposition::Keep)
        );
        assert!(EnterpriseSeatPolicyDisposition::parse("delete").is_err());
    }
}
