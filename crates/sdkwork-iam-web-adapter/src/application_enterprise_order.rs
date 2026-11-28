//! Enterprise authorization orders: licensing one published application to one
//! enterprise tenant, with a one-time confirmation link, a seat pool and an
//! append-only lifecycle ledger.
//!
//! # Why this lives in IAM and not in the application module
//!
//! The order grants *access to an application* to an *enterprise* — a tenant
//! other than the publisher's. That is an authorization fact: it names a
//! grantee tenant, it must be confirmed by that tenant's administrator, it
//! expires, and it is what a token exchange later consults. The application
//! module owns what the application *is*; IAM owns who may open it.
//!
//! # Tenant planes
//!
//! Two tenant planes share one row:
//!
//! * `tenant_id` — the **publisher** (the tenant that owns the application).
//! * `enterprise_tenant_id` — the **grantee** enterprise.
//!
//! Publisher-scoped functions filter by `tenant_id`; enterprise-scoped ones
//! filter by `enterprise_tenant_id` and by the seat's own `tenant_id`, which is
//! the grantee (a seat is assigned by the enterprise against its own members).
//! `assign_enterprise_seat` refuses a seat whose tenant differs from the order's
//! enterprise, so the two planes can never drift.
//!
//! # One-time links
//!
//! Only `token_hash = sha256(token)` is stored. The plaintext token is returned
//! once by the issuing call and never again, so a database read cannot
//! reconstruct a working link. A replacement link revokes the previous one of
//! the same kind in the same transaction (`ux_..._link_active`).

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::{DateTime, Months, Utc};
use rand_core::{OsRng, RngCore};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{AssertSqlSafe, PgPool, Row};
use uuid::Uuid;

use crate::application_enterprise_seat_admin::reconcile_enterprise_authorization_seats;

/// Order status vocabulary (`ck_iam_application_enterprise_order_status`).
pub const ORDER_STATUS_PENDING_AUTHORIZATION: &str = "pending_authorization";
pub const ORDER_STATUS_ACTIVE: &str = "active";
pub const ORDER_STATUS_PENDING_TERMINATION: &str = "pending_termination";
pub const ORDER_STATUS_TERMINATED: &str = "terminated";
pub const ORDER_STATUS_CANCELLED: &str = "cancelled";

/// Authorization mode vocabulary.
pub const MODE_ALL_MEMBERS: &str = "all_members";
pub const MODE_SEAT: &str = "seat";

/// Link kind vocabulary.
pub const LINK_KIND_AUTHORIZE: &str = "authorize";
pub const LINK_KIND_TERMINATE: &str = "terminate";

const CONFLICT_PREFIX: &str = "enterprise_order_conflict:";
const NOT_FOUND_PREFIX: &str = "enterprise_order_not_found:";
const INVALID_PREFIX: &str = "enterprise_order_invalid:";
const FORBIDDEN_PREFIX: &str = "enterprise_order_forbidden:";

/// How an enterprise-order failure should map onto HTTP.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EnterpriseOrderErrorKind {
    Conflict,
    NotFound,
    Invalid,
    Forbidden,
    Internal,
}

/// Classifies an [`application_enterprise_order`] error message for HTTP mapping.
pub fn classify_enterprise_order_error(message: &str) -> EnterpriseOrderErrorKind {
    if message.starts_with(CONFLICT_PREFIX) {
        EnterpriseOrderErrorKind::Conflict
    } else if message.starts_with(NOT_FOUND_PREFIX) {
        EnterpriseOrderErrorKind::NotFound
    } else if message.starts_with(INVALID_PREFIX) {
        EnterpriseOrderErrorKind::Invalid
    } else if message.starts_with(FORBIDDEN_PREFIX) {
        EnterpriseOrderErrorKind::Forbidden
    } else {
        EnterpriseOrderErrorKind::Internal
    }
}

/// Strips the classification prefix so the response carries a readable detail.
pub fn enterprise_order_error_detail(message: &str) -> &str {
    message
        .strip_prefix(CONFLICT_PREFIX)
        .or_else(|| message.strip_prefix(NOT_FOUND_PREFIX))
        .or_else(|| message.strip_prefix(INVALID_PREFIX))
        .or_else(|| message.strip_prefix(FORBIDDEN_PREFIX))
        .unwrap_or(message)
}

pub(crate) fn conflict(message: impl Into<String>) -> String {
    format!("{CONFLICT_PREFIX}{}", message.into())
}

pub(crate) fn not_found(message: impl Into<String>) -> String {
    format!("{NOT_FOUND_PREFIX}{}", message.into())
}

pub(crate) fn invalid(message: impl Into<String>) -> String {
    format!("{INVALID_PREFIX}{}", message.into())
}

pub(crate) fn forbidden(message: impl Into<String>) -> String {
    format!("{FORBIDDEN_PREFIX}{}", message.into())
}

/// Actual server-resolved object scope; never trust the session's scope string.
#[derive(Debug, Clone)]
pub struct EnterpriseManagementScope {
    pub kind: String,
    pub organization_ids: Vec<String>,
    pub department_ids: Vec<String>,
}

impl EnterpriseManagementScope {
    pub fn can_manage_order(&self) -> bool {
        matches!(self.kind.as_str(), "tenant" | "organization")
    }

    /// SQL predicate over seat alias `s`; values are bound, never interpolated.
    pub fn seat_filter_sql(
        &self,
        actor_param: usize,
        org_param: usize,
        dept_param: usize,
    ) -> String {
        match self.kind.as_str() {
            "tenant" => "TRUE".to_owned(),
            "organization" => format!("s.organization_id = ANY(${org_param}::text[])"),
            "department" | "department_and_children" => format!(
                "EXISTS (SELECT 1 FROM iam_department_assignment sc_da \
                 WHERE sc_da.tenant_id = s.tenant_id AND sc_da.user_id = s.user_id \
                   AND sc_da.status = 'active' AND sc_da.department_id = ANY(${dept_param}::text[]))"
            ),
            _ => format!("s.user_id = ${actor_param}"),
        }
    }
}

pub async fn resolve_enterprise_management_scope(
    pg: &PgPool,
    tenant_id: &str,
    actor_id: &str,
    permission_code: &str,
) -> Result<EnterpriseManagementScope, String> {
    let rows = sqlx::query(
        "SELECT b.effect, b.scope_kind, b.scope_id, b.data_scope_kind \
           FROM iam_role_binding b \
           JOIN iam_role r ON r.id = b.role_id AND r.tenant_id = b.tenant_id AND r.status = 'active' \
           JOIN iam_role_permission rp ON rp.tenant_id = b.tenant_id AND rp.role_id = b.role_id \
           JOIN iam_permission p ON p.id = rp.permission_id \
          WHERE b.tenant_id = $1 AND b.status = 'active' AND p.code = $3 \
            AND EXISTS (SELECT 1 FROM iam_tenant_member tm WHERE tm.tenant_id = $1 AND tm.user_id = $2 AND tm.status = 'active') \
            AND ((b.principal_kind = 'user' AND b.principal_id = $2) \
                 OR (b.principal_kind = 'organization_membership' AND b.principal_id IN ( \
                     SELECT id FROM iam_organization_membership \
                     WHERE tenant_id = $1 AND user_id = $2 AND status = 'active')) \
                 OR (b.principal_kind = 'group' AND b.principal_id IN ( \
                     SELECT gm.group_id FROM iam_group_member gm \
                     JOIN iam_group g ON g.id = gm.group_id AND g.tenant_id = gm.tenant_id AND g.status = 'active' \
                     WHERE gm.tenant_id = $1 AND gm.principal_kind = 'user' AND gm.principal_id = $2 AND gm.status = 'active'))) \
            AND (b.effective_from IS NULL OR b.effective_from = '' OR (b.effective_from ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' AND b.effective_from::timestamptz <= NOW())) \
            AND (b.effective_to IS NULL OR b.effective_to = '' OR (b.effective_to ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' AND b.effective_to::timestamptz > NOW()))",
    )
    .bind(tenant_id)
    .bind(actor_id)
    .bind(permission_code)
    .fetch_all(pg)
    .await
    .map_err(|error| internal("resolve enterprise management scope failed", error))?;
    if rows
        .iter()
        .any(|row| row.get::<String, _>("effect") == "deny")
    {
        return Err(forbidden(
            "an active deny binding blocks enterprise seat management",
        ));
    }
    let actor_organizations: Vec<String> = sqlx::query_scalar(
        "SELECT organization_id FROM iam_organization_membership WHERE tenant_id = $1 AND user_id = $2 AND status = 'active' AND organization_id <> '0' ORDER BY organization_id",
    ).bind(tenant_id).bind(actor_id).fetch_all(pg).await
        .map_err(|error| internal("resolve enterprise organizations failed", error))?;
    let actor_departments: Vec<String> = sqlx::query_scalar(
        "SELECT DISTINCT c.descendant_department_id FROM iam_department_assignment da JOIN iam_department_closure c ON c.tenant_id = da.tenant_id AND c.organization_id = da.organization_id AND c.ancestor_department_id = da.department_id WHERE da.tenant_id = $1 AND da.user_id = $2 AND da.status = 'active' ORDER BY c.descendant_department_id",
    ).bind(tenant_id).bind(actor_id).fetch_all(pg).await
        .map_err(|error| internal("resolve enterprise departments failed", error))?;
    let mut scope = EnterpriseManagementScope {
        kind: "self".to_owned(),
        organization_ids: vec![],
        department_ids: vec![],
    };
    let mut rank = 0u8;
    let mut allowed = 0usize;
    for row in &rows {
        let binding_kind: String = row.get("scope_kind");
        let scope_id: String = row.get("scope_id");
        let data_kind: String = row.get("data_scope_kind");
        // A binding only grants its own bound object when the actor still belongs
        // to that object. Client-provided organization or department claims cannot
        // turn an unrelated binding into access.
        match binding_kind.as_str() {
            "organization" if !actor_organizations.contains(&scope_id) => continue,
            "department" => {
                let assigned: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM iam_department_assignment da WHERE da.tenant_id = $1 AND da.user_id = $2 AND da.status = 'active' AND da.department_id = $3)")
                    .bind(tenant_id).bind(actor_id).bind(&scope_id).fetch_one(pg).await
                    .map_err(|error| internal("validate department binding failed", error))?;
                if !assigned {
                    continue;
                }
            }
            _ => {}
        }
        allowed += 1;
        let (kind, next_rank) = match data_kind.as_str() {
            "tenant" => ("tenant", 4),
            "organization" => ("organization", 3),
            "department_and_children" => ("department_and_children", 2),
            "department" => ("department", 1),
            "self" => ("self", 0),
            "scope" | "" => match binding_kind.as_str() {
                "tenant" => ("tenant", 4),
                "organization" => ("organization", 3),
                "department" => ("department", 1),
                _ => ("self", 0),
            },
            _ => ("self", 0),
        };
        if next_rank >= rank {
            scope.kind = kind.to_owned();
            rank = next_rank;
        }
        match (binding_kind.as_str(), kind) {
            ("organization", "organization") if !scope_id.is_empty() && scope_id != "0" => {
                scope.organization_ids.push(scope_id)
            }
            ("department", "department" | "department_and_children")
                if !scope_id.is_empty() && scope_id != "0" =>
            {
                scope.department_ids.push(scope_id)
            }
            ("tenant", "organization") => scope
                .organization_ids
                .extend(actor_organizations.iter().cloned()),
            ("tenant", "department" | "department_and_children") => scope
                .department_ids
                .extend(actor_departments.iter().cloned()),
            _ => {}
        }
    }
    if allowed == 0 {
        return Err(forbidden(
            "no active permission binding for enterprise seat management",
        ));
    }
    scope.organization_ids.sort();
    scope.organization_ids.dedup();
    scope.department_ids.sort();
    scope.department_ids.dedup();
    if (scope.kind == "organization" && scope.organization_ids.is_empty())
        || (matches!(
            scope.kind.as_str(),
            "department" | "department_and_children"
        ) && scope.department_ids.is_empty())
    {
        return Err(forbidden(
            "enterprise management scope has no active directory object",
        ));
    }
    Ok(scope)
}

pub async fn ensure_enterprise_order_scope(
    pg: &PgPool,
    tenant_id: &str,
    actor_id: &str,
    order_id: &str,
    manage: bool,
) -> Result<(EnterpriseOrder, EnterpriseManagementScope), String> {
    let permission = if manage {
        "iam.enterprise_orders.manage"
    } else {
        "iam.enterprise_orders.read"
    };
    let scope = resolve_enterprise_management_scope(pg, tenant_id, actor_id, permission).await?;
    let order = load_enterprise_order_for_scope(pg, tenant_id, order_id).await?;
    if manage && !scope.can_manage_order() {
        return Err(forbidden(
            "only tenant and organization administrators can manage enterprise orders",
        ));
    }
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
                .map_err(|error| internal("check enterprise order department scope failed", error))?;
            if !visible {
                return Err(forbidden(
                    "enterprise order is outside the caller's department scope",
                ));
            }
        }
        "self" => {
            let visible: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM iam_application_enterprise_seat s WHERE s.tenant_id = $1 AND s.order_id = $2 AND s.user_id = $3 AND s.seat_status = 'active') AND ($4 = '0' OR EXISTS (SELECT 1 FROM iam_organization_membership om WHERE om.tenant_id = $1 AND om.user_id = $3 AND om.organization_id = $4 AND om.status = 'active'))")
                .bind(tenant_id).bind(order_id).bind(actor_id).bind(&order.enterprise_organization_id).fetch_one(pg).await
                .map_err(|error| internal("check enterprise order self scope failed", error))?;
            if !visible {
                return Err(forbidden(
                    "enterprise order is outside the caller's self scope",
                ));
            }
        }
        _ => {}
    }
    Ok((order, scope))
}

pub async fn load_enterprise_order_for_scope(
    pg: &PgPool,
    tenant_id: &str,
    order_id: &str,
) -> Result<EnterpriseOrder, String> {
    let row = sqlx::query(AssertSqlSafe(format!(
        "SELECT {ORDER_COLUMNS} FROM iam_application_enterprise_order \
         WHERE enterprise_tenant_id = $1 AND id = $2 AND deleted_at IS NULL"
    )))
    .bind(tenant_id)
    .bind(order_id)
    .fetch_optional(pg)
    .await
    .map_err(|error| internal("load enterprise order scope failed", error))?
    .ok_or_else(|| not_found("enterprise order not found"))?;
    Ok(order_from_row(&row))
}

pub(crate) fn internal(context: &str, error: impl std::fmt::Display) -> String {
    format!("{context}: {error}")
}

/// Create command.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseOrderCreateCommand {
    pub application_id: String,
    pub enterprise_tenant_id: String,
    #[serde(default)]
    pub enterprise_organization_id: Option<String>,
    pub enterprise_name: String,
    #[serde(default)]
    pub authorization_mode: Option<String>,
    #[serde(default)]
    pub seat_count: Option<i32>,
    #[serde(default)]
    pub seat_name: Option<String>,
    pub duration_months: i32,
    pub contact_name: String,
    pub contact_phone: String,
}

/// Termination request command.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseOrderTerminateCommand {
    pub reason: String,
    #[serde(default)]
    pub note: Option<String>,
}

/// Seat-pool resize command.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseOrderUpdateCommand {
    #[serde(default)]
    pub seat_name: Option<String>,
    #[serde(default)]
    pub seat_count: Option<i32>,
}

/// Seat assignment command.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseSeatAssignCommand {
    pub user_id: String,
    #[serde(default)]
    pub organization_id: Option<String>,
}

/// One enterprise order as the API returns it.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseOrder {
    pub id: String,
    pub order_no: String,
    pub tenant_id: String,
    pub organization_id: String,
    pub application_id: String,
    pub enterprise_tenant_id: String,
    pub enterprise_organization_id: String,
    pub enterprise_name: String,
    pub authorization_mode: String,
    pub seat_count: Option<i32>,
    pub seat_name: Option<String>,
    /// Filled by enterprise handlers after resolving the caller's actual RBAC scope.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub management_scope: Option<String>,
    pub duration_months: i32,
    pub order_status: String,
    pub contact_name: String,
    pub contact_phone: String,
    pub authorized_at: Option<String>,
    pub expires_at: Option<String>,
    pub terminated_at: Option<String>,
    pub termination_reason: Option<String>,
    pub termination_note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(serialize_with = "serialize_int64_as_string")]
    pub version: i64,
}

/// An order plus the one-time plaintext token of the link it just issued.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseOrderWithLink {
    #[serde(flatten)]
    pub order: EnterpriseOrder,
    /// Shown once. Never persisted; only its SHA-256 is stored.
    pub link_token: String,
}

/// One seat assignment.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseSeat {
    pub id: String,
    pub tenant_id: String,
    pub organization_id: String,
    pub order_id: String,
    pub application_id: String,
    pub user_id: String,
    pub display_name: Option<String>,
    pub one_id_id: Option<String>,
    pub department_id: Option<String>,
    pub department_name: Option<String>,
    pub allocation_method: String,
    pub policy_id: Option<String>,
    pub blacklisted: bool,
    pub seat_status: String,
    pub assigned_by: String,
    pub assigned_at: String,
    pub released_by: Option<String>,
    pub released_at: Option<String>,
    #[serde(serialize_with = "serialize_int64_as_string")]
    pub version: i64,
}

/// One lifecycle event.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseOrderEvent {
    pub id: String,
    pub order_id: String,
    pub event_type: String,
    pub actor_kind: String,
    pub actor_id: Option<String>,
    pub payload: Value,
    pub created_at: String,
}

fn prefixed_id(prefix: &str) -> String {
    format!("{prefix}_{}", Uuid::now_v7().simple())
}

fn random_token() -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    format!("iael_{}", URL_SAFE_NO_PAD.encode(bytes))
}

fn token_hash(token: &str) -> String {
    sdkwork_utils_rust::sha256_hash(token.trim().as_bytes())
}

fn order_no() -> String {
    let raw = Uuid::now_v7().simple().to_string();
    format!("EO-{}", raw[..10].to_ascii_uppercase())
}

fn now_rfc3339(value: Option<DateTime<Utc>>) -> Option<String> {
    value.map(|value| value.to_rfc3339())
}

fn enterprise_order_is_expired(order: &EnterpriseOrder) -> bool {
    enterprise_expiry_is_due(order.expires_at.as_deref(), Utc::now())
}

fn enterprise_expiry_is_due(expires_at: Option<&str>, now: DateTime<Utc>) -> bool {
    expires_at
        .and_then(|value| DateTime::parse_from_rfc3339(value).ok())
        .is_some_and(|expires_at| expires_at <= now)
}

/// Enforces enterprise grants for user credentials on applications that have orders.
/// Applications without orders retain their existing non-enterprise behavior.
pub async fn ensure_user_enterprise_authorization(
    pg: &PgPool,
    enterprise_tenant_id: &str,
    organization_id: &str,
    user_id: &str,
    deploy_application_id: &str,
) -> Result<(), String> {
    ensure_user_enterprise_authorization_with_login(
        pg,
        enterprise_tenant_id,
        organization_id,
        user_id,
        deploy_application_id,
        false,
    )
    .await
}

pub async fn ensure_user_enterprise_authorization_on_login(
    pg: &PgPool,
    enterprise_tenant_id: &str,
    organization_id: &str,
    user_id: &str,
    deploy_application_id: &str,
) -> Result<(), String> {
    ensure_user_enterprise_authorization_with_login(
        pg,
        enterprise_tenant_id,
        organization_id,
        user_id,
        deploy_application_id,
        true,
    )
    .await
}

async fn ensure_user_enterprise_authorization_with_login(
    pg: &PgPool,
    enterprise_tenant_id: &str,
    organization_id: &str,
    user_id: &str,
    deploy_application_id: &str,
    include_login: bool,
) -> Result<(), String> {
    reconcile_enterprise_authorization_seats(
        pg,
        enterprise_tenant_id,
        Some(user_id),
        include_login,
        Some(deploy_application_id),
    )
    .await?;
    let decision: (bool, bool) = sqlx::query_as(
        "SELECT \
           EXISTS ( \
             SELECT 1 FROM iam_application_enterprise_order o \
             JOIN iam_tenant_application i \
               ON i.deploy_application_id = o.application_id \
            WHERE i.tenant_id = $1 AND i.deploy_application_id = $2 \
              AND i.deleted_at IS NULL AND o.deleted_at IS NULL \
              AND o.enterprise_tenant_id = $1 \
           ), \
           EXISTS ( \
             SELECT 1 FROM iam_application_enterprise_order o \
             JOIN iam_tenant_application i \
               ON i.deploy_application_id = o.application_id \
            WHERE i.tenant_id = $1 AND i.deploy_application_id = $2 \
              AND i.deleted_at IS NULL AND o.deleted_at IS NULL \
              AND o.enterprise_tenant_id = $1 \
              AND o.enterprise_tenant_id = $1 AND o.order_status = 'active' \
              AND (o.expires_at IS NULL OR o.expires_at > NOW()) \
              AND (o.enterprise_organization_id = '0' \
                   OR o.enterprise_organization_id = $3) \
              AND (o.authorization_mode = 'all_members' OR EXISTS ( \
                SELECT 1 FROM iam_application_enterprise_seat s \
                 WHERE s.tenant_id = $1 AND s.order_id = o.id \
                   AND s.user_id = $4 AND s.seat_status = 'active' \
                   AND (s.organization_id = '0' OR s.organization_id = $3) \
              )) \
           )",
    )
    .bind(enterprise_tenant_id)
    .bind(deploy_application_id)
    .bind(organization_id)
    .bind(user_id)
    .fetch_one(pg)
    .await
    .map_err(|error| internal("check enterprise authorization failed", error))?;
    if decision.0 && !decision.1 {
        return Err("active enterprise authorization or seat required".to_string());
    }
    Ok(())
}

fn serialize_int64_as_string<S>(value: &i64, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    serializer.serialize_str(&value.to_string())
}

fn validate_create(
    command: &EnterpriseOrderCreateCommand,
) -> Result<(String, Option<i32>), String> {
    let mode = command
        .authorization_mode
        .as_deref()
        .unwrap_or(MODE_ALL_MEMBERS)
        .trim();
    if mode != MODE_ALL_MEMBERS && mode != MODE_SEAT {
        return Err(invalid("authorizationMode must be `all_members` or `seat`"));
    }
    let seat_count = match (mode, command.seat_count) {
        (MODE_SEAT, Some(count)) if count > 0 => Some(count),
        (MODE_SEAT, _) => {
            return Err(invalid(
                "seatCount is required and must be positive for a seat-mode order",
            ))
        }
        (MODE_ALL_MEMBERS, Some(_)) => {
            return Err(invalid(
                "seatCount must be omitted for an all-members order",
            ))
        }
        (MODE_ALL_MEMBERS, None) => None,
        _ => None,
    };
    if !matches!(command.duration_months, 3 | 6 | 12) {
        return Err(invalid("durationMonths must be 3, 6 or 12"));
    }
    for (field, value) in [
        ("applicationId", command.application_id.as_str()),
        ("enterpriseTenantId", command.enterprise_tenant_id.as_str()),
        ("enterpriseName", command.enterprise_name.as_str()),
        ("contactName", command.contact_name.as_str()),
        ("contactPhone", command.contact_phone.as_str()),
    ] {
        let value = value.trim();
        if value.is_empty() || value.chars().count() > 200 {
            return Err(invalid(format!("{field} must be 1..=200 characters")));
        }
    }
    Ok((mode.to_owned(), seat_count))
}

fn order_from_row(row: &sqlx::postgres::PgRow) -> EnterpriseOrder {
    let read_ts = |column: &str| -> Option<String> {
        row.try_get::<Option<DateTime<Utc>>, _>(column)
            .ok()
            .flatten()
            .map(|value| value.to_rfc3339())
    };
    EnterpriseOrder {
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
        management_scope: None,
        duration_months: row.get("duration_months"),
        order_status: row.get("order_status"),
        contact_name: row.get("contact_name"),
        contact_phone: row.get("contact_phone"),
        authorized_at: read_ts("authorized_at"),
        expires_at: read_ts("expires_at"),
        terminated_at: read_ts("terminated_at"),
        termination_reason: row.get("termination_reason"),
        termination_note: row.get("termination_note"),
        created_at: read_ts("created_at").unwrap_or_default(),
        updated_at: read_ts("updated_at").unwrap_or_default(),
        version: row.get("version"),
    }
}

const ORDER_COLUMNS: &str = "id, order_no, tenant_id, organization_id, application_id, \
     enterprise_tenant_id, enterprise_organization_id, enterprise_name, authorization_mode, \
     seat_count, seat_name, duration_months, order_status, contact_name, contact_phone, authorized_at, \
     expires_at, terminated_at, termination_reason, termination_note, created_at, updated_at, \
     version";

pub(crate) async fn insert_event(
    transaction: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    tenant_id: &str,
    order_id: &str,
    event_type: &str,
    actor_kind: &str,
    actor_id: Option<&str>,
    payload: Value,
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO iam_application_enterprise_order_event \
         (id, tenant_id, order_id, event_type, actor_kind, actor_id, payload_json, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())",
    )
    .bind(prefixed_id("iaeev"))
    .bind(tenant_id)
    .bind(order_id)
    .bind(event_type)
    .bind(actor_kind)
    .bind(actor_id)
    .bind(serde_json::to_string(&payload).unwrap_or_else(|_| "{}".to_owned()))
    .execute(&mut **transaction)
    .await
    .map_err(|error| internal("insert enterprise order event failed", error))?;
    Ok(())
}

/// Creates an order and issues its one-time authorization link.
pub async fn create_enterprise_order(
    pg: &PgPool,
    tenant_id: &str,
    organization_id: &str,
    actor_id: &str,
    command: &EnterpriseOrderCreateCommand,
) -> Result<EnterpriseOrderWithLink, String> {
    let (mode, seat_count) = validate_create(command)?;
    let enterprise_organization_id = command
        .enterprise_organization_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("0")
        .to_owned();
    let order_id = prefixed_id("iaeord");
    let token = random_token();
    let now = Utc::now();

    let mut transaction = pg
        .begin()
        .await
        .map_err(|error| internal("begin enterprise order create failed", error))?;

    let claimed: Option<String> = sqlx::query_scalar(
        "SELECT id FROM iam_application_enterprise_order \
         WHERE tenant_id = $1 AND application_id = $2 AND enterprise_tenant_id = $3 \
           AND order_status IN ('pending_authorization', 'active', 'pending_termination') \
           AND deleted_at IS NULL LIMIT 1",
    )
    .bind(tenant_id)
    .bind(command.application_id.trim())
    .bind(command.enterprise_tenant_id.trim())
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| internal("check live enterprise order failed", error))?;
    if claimed.is_some() {
        return Err(conflict(
            "this application already has a live enterprise order for that enterprise",
        ));
    }

    sqlx::query(
        "INSERT INTO iam_application_enterprise_order \
         (id, order_no, tenant_id, organization_id, application_id, enterprise_tenant_id, \
          enterprise_organization_id, enterprise_name, authorization_mode, seat_count, seat_name, \
          duration_months, order_status, contact_name, contact_phone, metadata_json, \
          created_by, updated_by, created_at, updated_at, version) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending_authorization', \
                 $13, $14, '{}', $15, $15, $16, $16, 0)",
    )
    .bind(&order_id)
    .bind(order_no())
    .bind(tenant_id)
    .bind(organization_id)
    .bind(command.application_id.trim())
    .bind(command.enterprise_tenant_id.trim())
    .bind(&enterprise_organization_id)
    .bind(command.enterprise_name.trim())
    .bind(&mode)
    .bind(seat_count)
    .bind(
        command
            .seat_name
            .as_deref()
            .map(str::trim)
            .filter(|v| !v.is_empty()),
    )
    .bind(command.duration_months)
    .bind(command.contact_name.trim())
    .bind(command.contact_phone.trim())
    .bind(actor_id)
    .bind(now)
    .execute(&mut *transaction)
    .await
    .map_err(|error| internal("insert enterprise order failed", error))?;

    sqlx::query(
        "INSERT INTO iam_application_enterprise_order_link \
         (id, tenant_id, order_id, link_kind, token_hash, link_status, issued_by, issued_at, \
          created_at, updated_at, version) \
         VALUES ($1, $2, $3, 'authorize', $4, 'active', $5, NOW(), NOW(), NOW(), 0)",
    )
    .bind(prefixed_id("iaelk"))
    .bind(tenant_id)
    .bind(&order_id)
    .bind(token_hash(&token))
    .bind(actor_id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| internal("insert enterprise order link failed", error))?;

    insert_event(
        &mut transaction,
        tenant_id,
        &order_id,
        "created",
        "publisher",
        Some(actor_id),
        json!({ "authorizationMode": mode, "durationMonths": command.duration_months }),
    )
    .await?;
    insert_event(
        &mut transaction,
        tenant_id,
        &order_id,
        "link_issued",
        "publisher",
        Some(actor_id),
        json!({ "linkKind": LINK_KIND_AUTHORIZE }),
    )
    .await?;

    let row = sqlx::query(AssertSqlSafe(format!(
        "SELECT {ORDER_COLUMNS} FROM iam_application_enterprise_order \
         WHERE tenant_id = $1 AND id = $2"
    )))
    .bind(tenant_id)
    .bind(&order_id)
    .fetch_one(&mut *transaction)
    .await
    .map_err(|error| internal("load created enterprise order failed", error))?;

    transaction
        .commit()
        .await
        .map_err(|error| internal("commit enterprise order create failed", error))?;

    Ok(EnterpriseOrderWithLink {
        order: order_from_row(&row),
        link_token: token,
    })
}

/// Lists the publisher's orders for one application, newest first.
pub async fn list_enterprise_orders(
    pg: &PgPool,
    tenant_id: &str,
    application_id: Option<&str>,
    status: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<(Vec<EnterpriseOrder>, i64), String> {
    expire_due_enterprise_orders(pg, 100).await?;
    let application_id = application_id.unwrap_or_default();
    let status = status.unwrap_or_default();
    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM iam_application_enterprise_order \
         WHERE tenant_id = $1 AND deleted_at IS NULL \
           AND ($2 = '' OR application_id = $2) \
           AND ($3 = '' OR order_status = $3)",
    )
    .bind(tenant_id)
    .bind(application_id)
    .bind(status)
    .fetch_one(pg)
    .await
    .map_err(|error| internal("count enterprise orders failed", error))?;
    let rows = sqlx::query(AssertSqlSafe(format!(
        "SELECT {ORDER_COLUMNS} FROM iam_application_enterprise_order \
         WHERE tenant_id = $1 AND deleted_at IS NULL \
           AND ($2 = '' OR application_id = $2) \
           AND ($3 = '' OR order_status = $3) \
         ORDER BY created_at DESC, id DESC LIMIT $4 OFFSET $5"
    )))
    .bind(tenant_id)
    .bind(application_id)
    .bind(status)
    .bind(limit)
    .bind(offset)
    .fetch_all(pg)
    .await
    .map_err(|error| internal("list enterprise orders failed", error))?;
    Ok((rows.iter().map(order_from_row).collect(), total))
}

/// Lists the orders granted to one enterprise tenant.
pub async fn list_enterprise_orders_for_enterprise(
    pg: &PgPool,
    enterprise_tenant_id: &str,
    status: Option<&str>,
    query: Option<&str>,
    authorization_mode: Option<&str>,
    actor_id: &str,
    scope: &EnterpriseManagementScope,
    limit: i64,
    offset: i64,
) -> Result<(Vec<EnterpriseOrder>, i64), String> {
    expire_due_enterprise_orders(pg, 100).await?;
    let status = status.unwrap_or_default();
    let query = query.unwrap_or_default().trim().to_lowercase();
    let authorization_mode = authorization_mode.unwrap_or_default();
    if !authorization_mode.is_empty()
        && authorization_mode != "all_members"
        && authorization_mode != "seat"
    {
        return Err(invalid("authorization_mode must be all_members or seat"));
    }
    // Enterprise plane: the row is selected by the *grantee* tenant. `tenant_id`
    // on this table is the publisher, so binding it here would return the wrong
    // side of the contract; the reviewed exception in `sql-scope.json` records
    // that decision.
    let visibility = match scope.kind.as_str() {
        "tenant" => "TRUE".to_owned(),
        "organization" => "o.enterprise_organization_id = ANY($4::text[])".to_owned(),
        "department" | "department_and_children" => "EXISTS (SELECT 1 FROM iam_application_enterprise_seat ss JOIN iam_department_assignment sda ON sda.tenant_id = ss.tenant_id AND sda.user_id = ss.user_id AND sda.status = 'active' WHERE ss.tenant_id = o.enterprise_tenant_id AND ss.order_id = o.id AND sda.organization_id = ss.organization_id AND sda.department_id = ANY($5::text[])) OR EXISTS (SELECT 1 FROM iam_application_enterprise_seat_policy spp JOIN iam_department_assignment sda ON sda.tenant_id = spp.tenant_id AND sda.department_id = spp.department_id AND sda.status = 'active' WHERE spp.order_id = o.id AND sda.department_id = ANY($5::text[]))".to_owned(),
        _ => "EXISTS (SELECT 1 FROM iam_application_enterprise_seat ss WHERE ss.tenant_id = $1 AND ss.order_id = o.id AND ss.user_id = $3)".to_owned(),
    };
    let total: i64 = sqlx::query_scalar(AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM iam_application_enterprise_order o \
         WHERE o.enterprise_tenant_id = $1 AND o.deleted_at IS NULL \
           AND ($2 = '' OR o.order_status = $2) AND ({visibility}) \
           AND ($7 = '' OR o.authorization_mode = $7) \
           AND ($6 = '' OR strpos(lower(o.order_no), $6) > 0 \
                OR strpos(lower(COALESCE(o.enterprise_name, '')), $6) > 0 \
                OR strpos(lower(COALESCE(o.seat_name, '')), $6) > 0)"
    )))
    .bind(enterprise_tenant_id)
    .bind(status)
    .bind(actor_id)
    .bind(&scope.organization_ids)
    .bind(&scope.department_ids)
    .bind(&query)
    .bind(authorization_mode)
    .fetch_one(pg)
    .await
    .map_err(|error| internal("count granted enterprise orders failed", error))?;
    let rows = sqlx::query(AssertSqlSafe(format!(
        "SELECT {ORDER_COLUMNS} FROM iam_application_enterprise_order o \
         WHERE o.enterprise_tenant_id = $1 AND o.deleted_at IS NULL \
           AND ($2 = '' OR o.order_status = $2) AND ({visibility}) \
           AND ($9 = '' OR o.authorization_mode = $9) \
           AND ($8 = '' OR strpos(lower(o.order_no), $8) > 0 \
                OR strpos(lower(COALESCE(o.enterprise_name, '')), $8) > 0 \
                OR strpos(lower(COALESCE(o.seat_name, '')), $8) > 0) \
         ORDER BY o.created_at DESC, o.id DESC LIMIT $6 OFFSET $7"
    )))
    .bind(enterprise_tenant_id)
    .bind(status)
    .bind(actor_id)
    .bind(&scope.organization_ids)
    .bind(&scope.department_ids)
    .bind(limit)
    .bind(offset)
    .bind(&query)
    .bind(authorization_mode)
    .fetch_all(pg)
    .await
    .map_err(|error| internal("list granted enterprise orders failed", error))?;
    Ok((rows.iter().map(order_from_row).collect(), total))
}

async fn load_order(
    pg: &PgPool,
    tenant_id: &str,
    order_id: &str,
) -> Result<EnterpriseOrder, String> {
    let row = sqlx::query(AssertSqlSafe(format!(
        "SELECT {ORDER_COLUMNS} FROM iam_application_enterprise_order \
         WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL"
    )))
    .bind(tenant_id)
    .bind(order_id)
    .fetch_optional(pg)
    .await
    .map_err(|error| internal("load enterprise order failed", error))?;
    row.map(|row| order_from_row(&row))
        .ok_or_else(|| not_found("enterprise order not found"))
}

/// Reads one order in the publisher plane.
pub async fn retrieve_enterprise_order(
    pg: &PgPool,
    tenant_id: &str,
    order_id: &str,
) -> Result<EnterpriseOrder, String> {
    load_order(pg, tenant_id, order_id).await
}

/// Cancels an order that the enterprise has not authorized yet.
pub async fn cancel_enterprise_order(
    pg: &PgPool,
    tenant_id: &str,
    actor_id: &str,
    order_id: &str,
) -> Result<EnterpriseOrder, String> {
    let mut transaction = pg
        .begin()
        .await
        .map_err(|error| internal("begin enterprise order cancel failed", error))?;
    let row = sqlx::query(AssertSqlSafe(format!(
        "SELECT {ORDER_COLUMNS} FROM iam_application_enterprise_order \
         WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL FOR UPDATE"
    )))
    .bind(tenant_id)
    .bind(order_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| internal("lock enterprise order for cancel failed", error))?;
    let Some(row) = row else {
        return Err(not_found("enterprise order not found"));
    };
    let order = order_from_row(&row);
    if order.order_status != ORDER_STATUS_PENDING_AUTHORIZATION {
        return Err(conflict(
            "only a pending_authorization order can be cancelled",
        ));
    }
    sqlx::query(
        "UPDATE iam_application_enterprise_order \
         SET order_status = 'cancelled', updated_by = $3, updated_at = NOW(), version = version + 1 \
         WHERE tenant_id = $1 AND id = $2",
    )
    .bind(tenant_id)
    .bind(order_id)
    .bind(actor_id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| internal("cancel enterprise order failed", error))?;
    sqlx::query(
        "UPDATE iam_application_enterprise_order_link \
         SET link_status = 'revoked', revoked_at = NOW(), updated_at = NOW(), version = version + 1 \
         WHERE tenant_id = $1 AND order_id = $2 AND link_status = 'active'",
    )
    .bind(tenant_id)
    .bind(order_id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| internal("revoke enterprise order links failed", error))?;
    insert_event(
        &mut transaction,
        tenant_id,
        order_id,
        "cancelled",
        "publisher",
        Some(actor_id),
        json!({}),
    )
    .await?;
    transaction
        .commit()
        .await
        .map_err(|error| internal("commit enterprise order cancel failed", error))?;
    load_order(pg, tenant_id, order_id).await
}

/// Requests early termination of an active order and issues the one-time
/// termination link the enterprise administrator must confirm.
pub async fn request_enterprise_order_termination(
    pg: &PgPool,
    tenant_id: &str,
    actor_id: &str,
    order_id: &str,
    command: &EnterpriseOrderTerminateCommand,
) -> Result<EnterpriseOrderWithLink, String> {
    let reason = command.reason.trim();
    if reason.is_empty() || reason.chars().count() > 200 {
        return Err(invalid("reason must be 1..=200 characters"));
    }
    let token = random_token();
    let mut transaction = pg
        .begin()
        .await
        .map_err(|error| internal("begin enterprise order termination failed", error))?;
    let row = sqlx::query(AssertSqlSafe(format!(
        "SELECT {ORDER_COLUMNS} FROM iam_application_enterprise_order \
         WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL FOR UPDATE"
    )))
    .bind(tenant_id)
    .bind(order_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| internal("lock enterprise order for termination failed", error))?;
    let Some(row) = row else {
        return Err(not_found("enterprise order not found"));
    };
    let order = order_from_row(&row);
    if order.order_status != ORDER_STATUS_ACTIVE {
        return Err(conflict("only an active order can be terminated"));
    }
    sqlx::query(
        "UPDATE iam_application_enterprise_order \
         SET order_status = 'pending_termination', termination_reason = $3, \
             termination_note = $4, updated_by = $5, updated_at = NOW(), version = version + 1 \
         WHERE tenant_id = $1 AND id = $2",
    )
    .bind(tenant_id)
    .bind(order_id)
    .bind(reason)
    .bind(
        command
            .note
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty()),
    )
    .bind(actor_id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| internal("mark enterprise order pending termination failed", error))?;
    // A replacement link revokes the previous one of the same kind.
    sqlx::query(
        "UPDATE iam_application_enterprise_order_link \
         SET link_status = 'revoked', revoked_at = NOW(), updated_at = NOW(), version = version + 1 \
         WHERE tenant_id = $1 AND order_id = $2 AND link_kind = 'terminate' AND link_status = 'active'",
    )
    .bind(tenant_id)
    .bind(order_id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| internal("revoke previous termination link failed", error))?;
    sqlx::query(
        "INSERT INTO iam_application_enterprise_order_link \
         (id, tenant_id, order_id, link_kind, token_hash, link_status, issued_by, issued_at, \
          created_at, updated_at, version) \
         VALUES ($1, $2, $3, 'terminate', $4, 'active', $5, NOW(), NOW(), NOW(), 0)",
    )
    .bind(prefixed_id("iaelk"))
    .bind(tenant_id)
    .bind(order_id)
    .bind(token_hash(&token))
    .bind(actor_id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| internal("insert termination link failed", error))?;
    insert_event(
        &mut transaction,
        tenant_id,
        order_id,
        "termination_requested",
        "publisher",
        Some(actor_id),
        json!({ "reason": reason }),
    )
    .await?;
    transaction
        .commit()
        .await
        .map_err(|error| internal("commit enterprise order termination failed", error))?;
    let order = load_order(pg, tenant_id, order_id).await?;
    Ok(EnterpriseOrderWithLink {
        order,
        link_token: token,
    })
}

struct LockedLink {
    tenant_id: String,
    order_id: String,
    link_kind: String,
    link_status: String,
    expires_at: Option<DateTime<Utc>>,
}

async fn lock_link_by_token(
    transaction: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    token: &str,
) -> Result<LockedLink, String> {
    let row = sqlx::query(
        "SELECT tenant_id, order_id, link_kind, link_status, expires_at \
         FROM iam_application_enterprise_order_link \
         WHERE token_hash = $1 FOR UPDATE",
    )
    .bind(token_hash(token))
    .fetch_optional(&mut **transaction)
    .await
    .map_err(|error| internal("load enterprise order link failed", error))?;
    let Some(row) = row else {
        return Err(not_found("authorization link is not valid"));
    };
    Ok(LockedLink {
        tenant_id: row.get("tenant_id"),
        order_id: row.get("order_id"),
        link_kind: row.get("link_kind"),
        link_status: row.get("link_status"),
        expires_at: row
            .try_get::<Option<DateTime<Utc>>, _>("expires_at")
            .ok()
            .flatten(),
    })
}

fn assert_link_usable(link: &LockedLink, expected_kind: &str) -> Result<(), String> {
    if link.link_status != "active" {
        return Err(conflict("this authorization link has already been used"));
    }
    if link.link_kind != expected_kind {
        return Err(conflict("this authorization link has a different purpose"));
    }
    if let Some(expires_at) = link.expires_at {
        if expires_at <= Utc::now() {
            return Err(conflict("this authorization link has expired"));
        }
    }
    Ok(())
}

async fn consume_link(
    transaction: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    link_owner_tenant: &str,
    order_id: &str,
    link_kind: &str,
    actor_id: &str,
) -> Result<(), String> {
    sqlx::query(
        "UPDATE iam_application_enterprise_order_link \
         SET link_status = 'consumed', consumed_at = NOW(), consumed_by = $4, \
             updated_at = NOW(), version = version + 1 \
         WHERE tenant_id = $1 AND order_id = $2 AND link_kind = $3 AND link_status = 'active'",
    )
    .bind(link_owner_tenant)
    .bind(order_id)
    .bind(link_kind)
    .bind(actor_id)
    .execute(&mut **transaction)
    .await
    .map_err(|error| internal("consume authorization link failed", error))?;
    Ok(())
}

/// Confirms an authorization link. The enterprise administrator calls this; it
/// activates the order and computes the expiry from the fixed duration ladder.
pub async fn authorize_enterprise_order(
    pg: &PgPool,
    enterprise_tenant_id: &str,
    token: &str,
    actor_id: &str,
) -> Result<EnterpriseOrder, String> {
    let mut transaction = pg
        .begin()
        .await
        .map_err(|error| internal("begin enterprise authorization failed", error))?;
    let link = lock_link_by_token(&mut transaction, token).await?;
    assert_link_usable(&link, LINK_KIND_AUTHORIZE)?;

    let row = sqlx::query(AssertSqlSafe(format!(
        "SELECT {ORDER_COLUMNS} FROM iam_application_enterprise_order \
         WHERE tenant_id = $2 AND id = $1 FOR UPDATE"
    )))
    .bind(&link.order_id)
    .bind(&link.tenant_id)
    .fetch_one(&mut *transaction)
    .await
    .map_err(|error| internal("lock enterprise order for authorization failed", error))?;
    let order = order_from_row(&row);
    if order.enterprise_tenant_id != enterprise_tenant_id {
        return Err(not_found("enterprise order not found for this tenant"));
    }
    if order.order_status != ORDER_STATUS_PENDING_AUTHORIZATION {
        return Err(conflict(
            "this enterprise order is no longer awaiting authorization",
        ));
    }
    let authorized_at = Utc::now();
    let expires_at =
        authorized_at + Months::new(u32::try_from(order.duration_months).unwrap_or(12));
    sqlx::query(
        "UPDATE iam_application_enterprise_order \
         SET order_status = 'active', authorized_at = $2, expires_at = $3, \
             updated_by = $4, updated_at = NOW(), version = version + 1 \
         WHERE tenant_id = $5 AND id = $1",
    )
    .bind(&order.id)
    .bind(authorized_at)
    .bind(expires_at)
    .bind(actor_id)
    .bind(&link.tenant_id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| internal("activate enterprise order failed", error))?;
    consume_link(
        &mut transaction,
        &link.tenant_id,
        &link.order_id,
        LINK_KIND_AUTHORIZE,
        actor_id,
    )
    .await?;
    insert_event(
        &mut transaction,
        &link.tenant_id,
        &link.order_id,
        "authorized",
        "enterprise_admin",
        Some(actor_id),
        json!({ "expiresAt": expires_at.to_rfc3339() }),
    )
    .await?;
    transaction
        .commit()
        .await
        .map_err(|error| internal("commit enterprise authorization failed", error))?;
    load_order(pg, &link.tenant_id, &link.order_id).await
}

/// Confirms a termination link. The order ends immediately and every active seat
/// is released, so no seat outlives the license it was drawn from.
pub async fn confirm_enterprise_order_termination(
    pg: &PgPool,
    enterprise_tenant_id: &str,
    token: &str,
    actor_id: &str,
) -> Result<EnterpriseOrder, String> {
    let mut transaction = pg
        .begin()
        .await
        .map_err(|error| internal("begin enterprise termination confirm failed", error))?;
    let link = lock_link_by_token(&mut transaction, token).await?;
    assert_link_usable(&link, LINK_KIND_TERMINATE)?;
    let row = sqlx::query(AssertSqlSafe(format!(
        "SELECT {ORDER_COLUMNS} FROM iam_application_enterprise_order \
         WHERE tenant_id = $2 AND id = $1 FOR UPDATE"
    )))
    .bind(&link.order_id)
    .bind(&link.tenant_id)
    .fetch_one(&mut *transaction)
    .await
    .map_err(|error| {
        internal(
            "lock enterprise order for termination confirm failed",
            error,
        )
    })?;
    let order = order_from_row(&row);
    if order.enterprise_tenant_id != enterprise_tenant_id {
        return Err(not_found("enterprise order not found for this tenant"));
    }
    if order.order_status != ORDER_STATUS_PENDING_TERMINATION {
        return Err(conflict(
            "this enterprise order is not awaiting termination",
        ));
    }
    sqlx::query(
        "UPDATE iam_application_enterprise_order \
         SET order_status = 'terminated', terminated_at = NOW(), updated_by = $2, \
             updated_at = NOW(), version = version + 1 \
         WHERE tenant_id = $3 AND id = $1",
    )
    .bind(&order.id)
    .bind(actor_id)
    .bind(&link.tenant_id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| internal("terminate enterprise order failed", error))?;
    sqlx::query(
        "UPDATE iam_application_enterprise_seat \
         SET seat_status = 'released', released_by = $2, released_at = NOW(), \
             updated_at = NOW(), version = version + 1 \
         WHERE tenant_id = $3 AND order_id = $1 AND seat_status = 'active'",
    )
    .bind(&order.id)
    .bind(actor_id)
    .bind(enterprise_tenant_id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| internal("release seats on termination failed", error))?;
    consume_link(
        &mut transaction,
        &link.tenant_id,
        &link.order_id,
        LINK_KIND_TERMINATE,
        actor_id,
    )
    .await?;
    insert_event(
        &mut transaction,
        &link.tenant_id,
        &link.order_id,
        "termination_confirmed",
        "enterprise_admin",
        Some(actor_id),
        json!({}),
    )
    .await?;
    transaction
        .commit()
        .await
        .map_err(|error| internal("commit enterprise termination confirm failed", error))?;
    load_order(pg, &link.tenant_id, &link.order_id).await
}

/// Expiry sweep: terminates active orders whose term has elapsed.
///
/// Returns the number of orders terminated. The caller decides how often to run
/// it; the operation is idempotent because the predicate only matches `active`.
pub async fn expire_due_enterprise_orders(pg: &PgPool, limit: i64) -> Result<u64, String> {
    let rows = sqlx::query(
        "SELECT id, tenant_id, enterprise_tenant_id FROM iam_application_enterprise_order \
         WHERE order_status = 'active' AND expires_at IS NOT NULL AND expires_at <= NOW() \
           AND deleted_at IS NULL \
         ORDER BY expires_at ASC, id ASC LIMIT $1",
    )
    .bind(limit)
    .fetch_all(pg)
    .await
    .map_err(|error| internal("select expired enterprise orders failed", error))?;
    let mut terminated = 0u64;
    for row in rows {
        let order_id: String = row.get("id");
        let tenant_id: String = row.get("tenant_id");
        let enterprise_tenant_id: String = row.get("enterprise_tenant_id");
        let mut transaction = pg
            .begin()
            .await
            .map_err(|error| internal("begin enterprise order expiry failed", error))?;
        let updated = sqlx::query(
            "UPDATE iam_application_enterprise_order \
             SET order_status = 'terminated', termination_reason = COALESCE(termination_reason, 'expired'), \
                 terminated_at = NOW(), updated_by = 'system', updated_at = NOW(), \
                 version = version + 1 \
             WHERE tenant_id = $2 AND id = $1 AND order_status = 'active'",
        )
        .bind(&order_id)
        .bind(&tenant_id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| internal("expire enterprise order failed", error))?;
        if updated.rows_affected() == 0 {
            transaction
                .rollback()
                .await
                .map_err(|error| internal("rollback enterprise order expiry failed", error))?;
            continue;
        }
        sqlx::query(
            "UPDATE iam_application_enterprise_seat \
             SET seat_status = 'released', released_by = 'system', released_at = NOW(), \
                 updated_at = NOW(), version = version + 1 \
             WHERE tenant_id = $2 AND order_id = $1 AND seat_status = 'active'",
        )
        .bind(&order_id)
        .bind(&enterprise_tenant_id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| internal("release seats on expiry failed", error))?;
        insert_event(
            &mut transaction,
            &tenant_id,
            &order_id,
            "expired",
            "system",
            None,
            json!({}),
        )
        .await?;
        transaction
            .commit()
            .await
            .map_err(|error| internal("commit enterprise order expiry failed", error))?;
        terminated += 1;
    }
    Ok(terminated)
}

/// Lists seats of one order in the enterprise plane.
pub async fn list_enterprise_seats(
    pg: &PgPool,
    enterprise_tenant_id: &str,
    actor_id: &str,
    order_id: &str,
    status: Option<&str>,
    q: Option<&str>,
    scope: &EnterpriseManagementScope,
    limit: i64,
    offset: i64,
) -> Result<(Vec<EnterpriseSeat>, i64), String> {
    expire_due_enterprise_orders(pg, 100).await?;
    let status = status.unwrap_or_default();
    if !status.is_empty() && status != "active" && status != "released" {
        return Err(invalid("status must be `active` or `released`"));
    }
    let pattern = q
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .map(|v| format!("%{}%", v.to_lowercase()))
        .unwrap_or_default();
    let filter = scope.seat_filter_sql(8, 9, 10);
    let rows = sqlx::query(AssertSqlSafe(format!(
        "SELECT s.id, s.tenant_id, s.organization_id, s.order_id, s.application_id, s.user_id, \
                u.display_name, oneid.subject AS one_id_id, d.id AS department_id, d.name AS department_name, \
                s.allocation_method, s.policy_id, EXISTS (SELECT 1 FROM iam_application_enterprise_seat_blacklist bl \
                  WHERE bl.tenant_id = s.tenant_id AND bl.order_id = s.order_id AND bl.user_id = s.user_id) AS blacklisted, \
                s.seat_status, s.assigned_by, s.assigned_at, s.released_by, s.released_at, s.version, \
                COUNT(*) OVER() AS total \
         FROM iam_application_enterprise_seat s \
         JOIN iam_user u ON u.tenant_id = s.tenant_id AND u.id = s.user_id \
         LEFT JOIN LATERAL (SELECT subject FROM iam_user_identity ui \
            WHERE ui.tenant_id = s.tenant_id AND ui.user_id = s.user_id \
              AND ui.provider IN ('oneid', 'one_id') ORDER BY ui.created_at, ui.id LIMIT 1) oneid ON TRUE \
         LEFT JOIN LATERAL (SELECT da.department_id, d.name FROM iam_department_assignment da \
            JOIN iam_department d ON d.tenant_id = da.tenant_id AND d.organization_id = da.organization_id AND d.id = da.department_id \
            WHERE da.tenant_id = s.tenant_id AND da.user_id = s.user_id AND da.status = 'active' \
            ORDER BY da.is_primary DESC, da.created_at, da.id LIMIT 1) d ON TRUE \
         WHERE s.tenant_id = $1 AND s.order_id = $2 AND ($3 = '' OR s.seat_status = $3) \
           AND ($4 = '' OR LOWER(COALESCE(u.display_name, '')) LIKE $4 OR LOWER(COALESCE(oneid.subject, '')) LIKE $4 \
                OR LOWER(COALESCE(d.name, '')) LIKE $4) AND ({filter}) \
         ORDER BY s.assigned_at DESC, s.id DESC LIMIT $5 OFFSET $6"
    )))
    .bind(enterprise_tenant_id).bind(order_id).bind(status).bind(&pattern)
    .bind(limit).bind(offset).bind(&scope.kind).bind(actor_id)
    .bind(&scope.organization_ids).bind(&scope.department_ids)
    .fetch_all(pg).await
    .map_err(|error| internal("list enterprise seats failed", error))?;
    let total = rows
        .first()
        .map(|row| row.get::<i64, _>("total"))
        .unwrap_or(0);
    Ok((rows.iter().map(seat_from_row).collect(), total))
}

fn seat_columns(alias: &str) -> String {
    format!(
        "{a}.id, {a}.tenant_id, {a}.organization_id, {a}.order_id, {a}.application_id, {a}.user_id, \
         (SELECT u.display_name FROM iam_user u WHERE u.tenant_id = {a}.tenant_id AND u.id = {a}.user_id) AS display_name, \
         (SELECT ui.subject FROM iam_user_identity ui WHERE ui.tenant_id = {a}.tenant_id AND ui.user_id = {a}.user_id \
            AND ui.provider IN ('oneid', 'one_id') ORDER BY ui.created_at, ui.id LIMIT 1) AS one_id_id, \
         (SELECT da.department_id FROM iam_department_assignment da WHERE da.tenant_id = {a}.tenant_id \
            AND da.user_id = {a}.user_id AND da.status = 'active' ORDER BY da.is_primary DESC, da.created_at, da.id LIMIT 1) AS department_id, \
         (SELECT d.name FROM iam_department_assignment da JOIN iam_department d ON d.tenant_id = da.tenant_id \
            AND d.organization_id = da.organization_id AND d.id = da.department_id \
            WHERE da.tenant_id = {a}.tenant_id AND da.user_id = {a}.user_id AND da.status = 'active' \
            ORDER BY da.is_primary DESC, da.created_at, da.id LIMIT 1) AS department_name, \
         {a}.allocation_method, {a}.policy_id, \
         EXISTS (SELECT 1 FROM iam_application_enterprise_seat_blacklist bl WHERE bl.tenant_id = {a}.tenant_id \
                 AND bl.order_id = {a}.order_id AND bl.user_id = {a}.user_id) AS blacklisted, \
         {a}.seat_status, {a}.assigned_by, {a}.assigned_at, {a}.released_by, {a}.released_at, {a}.version",
        a = alias
    )
}

fn seat_from_row(row: &sqlx::postgres::PgRow) -> EnterpriseSeat {
    let read_ts = |column: &str| -> Option<String> {
        row.try_get::<Option<DateTime<Utc>>, _>(column)
            .ok()
            .flatten()
            .map(|value| value.to_rfc3339())
    };
    EnterpriseSeat {
        id: row.get("id"),
        tenant_id: row.get("tenant_id"),
        organization_id: row.get("organization_id"),
        order_id: row.get("order_id"),
        application_id: row.get("application_id"),
        user_id: row.get("user_id"),
        display_name: row.get("display_name"),
        one_id_id: row.get("one_id_id"),
        department_id: row.get("department_id"),
        department_name: row.get("department_name"),
        allocation_method: row.get("allocation_method"),
        policy_id: row.get("policy_id"),
        blacklisted: row.get("blacklisted"),
        seat_status: row.get("seat_status"),
        assigned_by: row.get("assigned_by"),
        assigned_at: read_ts("assigned_at").unwrap_or_default(),
        released_by: row.get("released_by"),
        released_at: read_ts("released_at"),
        version: row.get("version"),
    }
}

fn enterprise_seat_organization_id(
    order_organization_id: &str,
    command: &EnterpriseSeatAssignCommand,
) -> Result<String, String> {
    let requested = command
        .organization_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let scoped = order_organization_id != "0";
    if scoped && requested.is_some_and(|value| value != order_organization_id) {
        return Err(invalid(
            "organizationId is outside the order's organization scope",
        ));
    }
    Ok(if scoped {
        order_organization_id.to_owned()
    } else {
        requested.unwrap_or("0").to_owned()
    })
}

/// Assigns one seat. The enterprise may never exceed the order's seat cap; the
/// cap is enforced here under a row lock because no database constraint can
/// express an aggregate limit.
pub async fn assign_enterprise_seat(
    pg: &PgPool,
    enterprise_tenant_id: &str,
    actor_id: &str,
    order_id: &str,
    command: &EnterpriseSeatAssignCommand,
    scope: &EnterpriseManagementScope,
) -> Result<EnterpriseSeat, String> {
    let user_id = command.user_id.trim();
    if user_id.is_empty() {
        return Err(invalid("userId is required"));
    }
    let mut transaction = pg
        .begin()
        .await
        .map_err(|error| internal("begin enterprise seat assignment failed", error))?;
    let row = sqlx::query(AssertSqlSafe(format!(
        "SELECT {ORDER_COLUMNS} FROM iam_application_enterprise_order \
         WHERE enterprise_tenant_id = $1 AND id = $2 AND deleted_at IS NULL FOR UPDATE"
    )))
    .bind(enterprise_tenant_id)
    .bind(order_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| internal("lock enterprise order for seat failed", error))?;
    let Some(row) = row else {
        return Err(not_found("enterprise order not found"));
    };
    let order = order_from_row(&row);
    if order.order_status != ORDER_STATUS_ACTIVE || enterprise_order_is_expired(&order) {
        return Err(conflict("seats can only be assigned on an active order"));
    }
    if order.authorization_mode != MODE_SEAT {
        return Err(conflict(
            "this order grants all members; there are no seats to assign",
        ));
    }
    let member: Option<String> = sqlx::query_scalar(
        "SELECT id FROM iam_tenant_member \
         WHERE tenant_id = $1 AND user_id = $2 AND status = 'active' LIMIT 1",
    )
    .bind(enterprise_tenant_id)
    .bind(user_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| internal("check enterprise membership failed", error))?;
    if member.is_none() {
        return Err(invalid(
            "the user is not an active member of the enterprise tenant",
        ));
    }
    let blacklisted: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM iam_application_enterprise_seat_blacklist \
         WHERE tenant_id = $1 AND order_id = $2 AND user_id = $3)",
    )
    .bind(enterprise_tenant_id)
    .bind(order_id)
    .bind(user_id)
    .fetch_one(&mut *transaction)
    .await
    .map_err(|error| internal("check enterprise blacklist failed", error))?;
    if blacklisted {
        return Err(conflict("the user is blacklisted from this seat pool"));
    }
    let mut organization_id =
        enterprise_seat_organization_id(&order.enterprise_organization_id, command)?;
    if organization_id == "0" {
        organization_id = sqlx::query_scalar(
            "SELECT organization_id FROM iam_organization_membership \
             WHERE tenant_id = $1 AND user_id = $2 AND status = 'active' ORDER BY is_primary DESC, id LIMIT 1",
        ).bind(enterprise_tenant_id).bind(user_id).fetch_optional(&mut *transaction).await
            .map_err(|error| internal("resolve seat organization failed", error))?.unwrap_or_else(|| "0".to_owned());
    }
    match scope.kind.as_str() {
        "organization" if !scope.organization_ids.contains(&organization_id) => {
            return Err(forbidden(
                "the user is outside the caller's organization scope",
            ));
        }
        "department" | "department_and_children" => {
            let visible: bool = sqlx::query_scalar(
                "SELECT EXISTS (SELECT 1 FROM iam_department_assignment da \
                 WHERE da.tenant_id = $1 AND da.user_id = $2 AND da.status = 'active' \
                   AND da.department_id = ANY($3::text[]))",
            )
            .bind(enterprise_tenant_id)
            .bind(user_id)
            .bind(&scope.department_ids)
            .fetch_one(&mut *transaction)
            .await
            .map_err(|error| internal("check seat scope failed", error))?;
            if !visible {
                return Err(forbidden(
                    "the user is outside the caller's department scope",
                ));
            }
        }
        "self" if user_id != actor_id => {
            return Err(forbidden("self scope only permits assigning your own seat"))
        }
        _ => {}
    }
    if organization_id != "0" {
        let membership: Option<String> = sqlx::query_scalar(
            "SELECT o.id FROM iam_organization o \
             JOIN iam_organization_membership m \
               ON m.tenant_id = o.tenant_id AND m.organization_id = o.id \
              AND m.user_id = $3 AND m.status = 'active' \
             WHERE o.tenant_id = $1 AND o.id = $2 AND o.status = 'active' LIMIT 1",
        )
        .bind(enterprise_tenant_id)
        .bind(&organization_id)
        .bind(user_id)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(|error| internal("check enterprise organization membership failed", error))?;
        if membership.is_none() {
            return Err(invalid(
                "the user is not an active member of the selected organization",
            ));
        }
    }
    let active: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM iam_application_enterprise_seat \
         WHERE tenant_id = $2 AND order_id = $1 AND seat_status = 'active'",
    )
    .bind(order_id)
    .bind(enterprise_tenant_id)
    .fetch_one(&mut *transaction)
    .await
    .map_err(|error| internal("count active enterprise seats failed", error))?;
    let cap = i64::from(order.seat_count.unwrap_or(0));
    if active >= cap {
        return Err(conflict(format!(
            "seat quota exceeded: {active} of {cap} seats are already assigned"
        )));
    }
    let seat_id = prefixed_id("iaest");
    let inserted = sqlx::query(
        "INSERT INTO iam_application_enterprise_seat \
         (id, tenant_id, organization_id, order_id, application_id, user_id, seat_status, \
          assigned_by, assigned_at, created_at, updated_at, version) \
         VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, NOW(), NOW(), NOW(), 0)",
    )
    .bind(&seat_id)
    .bind(enterprise_tenant_id)
    .bind(&organization_id)
    .bind(order_id)
    .bind(&order.application_id)
    .bind(user_id)
    .bind(actor_id)
    .execute(&mut *transaction)
    .await;
    if let Err(error) = inserted {
        if error
            .as_database_error()
            .is_some_and(|db| db.code().as_deref() == Some("23505"))
        {
            return Err(conflict("the user already holds an active seat"));
        }
        return Err(internal("insert enterprise seat failed", error));
    }
    insert_event(
        &mut transaction,
        &order.tenant_id,
        order_id,
        "seat_assigned",
        "enterprise_admin",
        Some(actor_id),
        json!({ "userId": user_id }),
    )
    .await?;
    transaction
        .commit()
        .await
        .map_err(|error| internal("commit enterprise seat assignment failed", error))?;
    let row = sqlx::query(AssertSqlSafe(format!(
        "SELECT {} FROM iam_application_enterprise_seat s WHERE s.tenant_id = $2 AND s.id = $1",
        seat_columns("s")
    )))
    .bind(&seat_id)
    .bind(enterprise_tenant_id)
    .fetch_one(pg)
    .await
    .map_err(|error| internal("load assigned enterprise seat failed", error))?;
    Ok(seat_from_row(&row))
}

/// Releases one seat.
pub async fn release_enterprise_seat(
    pg: &PgPool,
    enterprise_tenant_id: &str,
    actor_id: &str,
    order_id: &str,
    seat_id: &str,
    scope: &EnterpriseManagementScope,
) -> Result<EnterpriseSeat, String> {
    let mut transaction = pg
        .begin()
        .await
        .map_err(|error| internal("begin enterprise seat release failed", error))?;
    let order_row = sqlx::query(AssertSqlSafe(format!(
        "SELECT {ORDER_COLUMNS} FROM iam_application_enterprise_order \
         WHERE enterprise_tenant_id = $1 AND id = $2 AND deleted_at IS NULL FOR UPDATE"
    )))
    .bind(enterprise_tenant_id)
    .bind(order_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| internal("lock enterprise order for release failed", error))?
    .ok_or_else(|| not_found("enterprise order not found"))?;
    let order = order_from_row(&order_row);
    if order.order_status != ORDER_STATUS_ACTIVE {
        return Err(conflict("seats can only be released on an active order"));
    }
    let target: Option<(String, String, String)> = sqlx::query_as(
        "SELECT user_id, allocation_method, organization_id FROM iam_application_enterprise_seat \
         WHERE tenant_id = $1 AND order_id = $2 AND id = $3 AND seat_status = 'active'",
    )
    .bind(enterprise_tenant_id)
    .bind(order_id)
    .bind(seat_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| internal("load enterprise seat for release failed", error))?;
    let Some((user_id, method, organization_id)) = target else {
        return Err(not_found("active seat not found"));
    };
    if method != "manual" {
        return Err(conflict(
            "department-policy seats must be moved to the blacklist",
        ));
    }
    match scope.kind.as_str() {
        "organization" if !scope.organization_ids.contains(&organization_id) => {
            return Err(forbidden("seat is outside the caller's organization scope"))
        }
        "department" | "department_and_children" => {
            let visible: bool = sqlx::query_scalar(
                "SELECT EXISTS (SELECT 1 FROM iam_department_assignment da WHERE da.tenant_id = $1 \
                 AND da.user_id = $2 AND da.status = 'active' AND da.department_id = ANY($3::text[]))",
            ).bind(enterprise_tenant_id).bind(&user_id).bind(&scope.department_ids).fetch_one(&mut *transaction).await
                .map_err(|error| internal("check release scope failed", error))?;
            if !visible {
                return Err(forbidden("seat is outside the caller's department scope"));
            }
        }
        "self" if user_id != actor_id => {
            return Err(forbidden("self scope only permits releasing your own seat"))
        }
        _ => {}
    }
    let updated = sqlx::query(
        "UPDATE iam_application_enterprise_seat \
         SET seat_status = 'released', released_by = $3, released_at = NOW(), \
             updated_at = NOW(), version = version + 1 \
         WHERE tenant_id = $1 AND order_id = $2 AND id = $4 AND seat_status = 'active'",
    )
    .bind(enterprise_tenant_id)
    .bind(order_id)
    .bind(actor_id)
    .bind(seat_id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| internal("release enterprise seat failed", error))?;
    if updated.rows_affected() == 0 {
        return Err(not_found("active seat not found"));
    }
    insert_event(
        &mut transaction,
        &order.tenant_id,
        order_id,
        "seat_released",
        "enterprise_admin",
        Some(actor_id),
        json!({ "seatId": seat_id }),
    )
    .await?;
    transaction
        .commit()
        .await
        .map_err(|error| internal("commit enterprise seat release failed", error))?;
    let row = sqlx::query(AssertSqlSafe(format!(
        "SELECT {} FROM iam_application_enterprise_seat s WHERE s.tenant_id = $1 AND s.id = $2",
        seat_columns("s")
    )))
    .bind(enterprise_tenant_id)
    .bind(seat_id)
    .fetch_one(pg)
    .await
    .map_err(|error| internal("load released enterprise seat failed", error))?;
    Ok(seat_from_row(&row))
}

/// Lists the lifecycle events of one order, oldest first.
pub async fn list_enterprise_order_events(
    pg: &PgPool,
    tenant_id: &str,
    order_id: &str,
) -> Result<Vec<EnterpriseOrderEvent>, String> {
    let rows = sqlx::query(
        "SELECT id, order_id, event_type, actor_kind, actor_id, payload_json, created_at \
         FROM iam_application_enterprise_order_event \
         WHERE tenant_id = $1 AND order_id = $2 ORDER BY created_at ASC, id ASC",
    )
    .bind(tenant_id)
    .bind(order_id)
    .fetch_all(pg)
    .await
    .map_err(|error| internal("list enterprise order events failed", error))?;
    Ok(rows
        .iter()
        .map(|row| EnterpriseOrderEvent {
            id: row.get("id"),
            order_id: row.get("order_id"),
            event_type: row.get("event_type"),
            actor_kind: row.get("actor_kind"),
            actor_id: row.get("actor_id"),
            payload: row
                .try_get::<Option<String>, _>("payload_json")
                .ok()
                .flatten()
                .and_then(|raw| serde_json::from_str::<Value>(&raw).ok())
                .unwrap_or_else(|| json!({})),
            created_at: row
                .try_get::<Option<DateTime<Utc>>, _>("created_at")
                .ok()
                .flatten()
                .map(|value| value.to_rfc3339())
                .unwrap_or_default(),
        })
        .collect())
}

/// The order as the wire JSON, matching the OpenAPI component.
pub fn enterprise_order_to_json(order: &EnterpriseOrder) -> Value {
    serde_json::to_value(order).unwrap_or_else(|_| json!({}))
}

/// The order plus its one-time link token.
pub fn enterprise_order_with_link_to_json(issued: &EnterpriseOrderWithLink) -> Value {
    let mut value = enterprise_order_to_json(&issued.order);
    if let Some(object) = value.as_object_mut() {
        object.insert("linkToken".to_owned(), json!(issued.link_token));
    }
    value
}

/// Parses a `EnterpriseOrderCreateCommand` from the request body.
pub fn parse_enterprise_order_create_command(
    body: &Value,
) -> Result<EnterpriseOrderCreateCommand, String> {
    serde_json::from_value(body.clone()).map_err(|error| invalid(format!("invalid body: {error}")))
}

/// Parses a `EnterpriseOrderTerminateCommand` from the request body.
pub fn parse_enterprise_order_terminate_command(
    body: &Value,
) -> Result<EnterpriseOrderTerminateCommand, String> {
    serde_json::from_value(body.clone()).map_err(|error| invalid(format!("invalid body: {error}")))
}

/// Parses a `EnterpriseSeatAssignCommand` from the request body.
pub fn parse_enterprise_seat_assign_command(
    body: &Value,
) -> Result<EnterpriseSeatAssignCommand, String> {
    serde_json::from_value(body.clone()).map_err(|error| invalid(format!("invalid body: {error}")))
}

/// Helper used by the routes layer to keep the `Option<DateTime>` mapping in one
/// place.
pub fn optional_timestamp(value: Option<DateTime<Utc>>) -> Option<String> {
    now_rfc3339(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_command(mode: Option<&str>, seat_count: Option<i32>) -> EnterpriseOrderCreateCommand {
        EnterpriseOrderCreateCommand {
            application_id: "app_demo".to_owned(),
            enterprise_tenant_id: "100002".to_owned(),
            enterprise_organization_id: None,
            enterprise_name: "示例集团".to_owned(),
            authorization_mode: mode.map(str::to_owned),
            seat_count,
            seat_name: None,
            duration_months: 12,
            contact_name: "张三".to_owned(),
            contact_phone: "13800138000".to_owned(),
        }
    }

    #[test]
    fn enterprise_expiry_requires_a_valid_past_timestamp() {
        let now = Utc::now();
        assert!(!enterprise_expiry_is_due(None, now));
        assert!(enterprise_expiry_is_due(Some("2020-01-01T00:00:00Z"), now));
        assert!(!enterprise_expiry_is_due(Some("2999-01-01T00:00:00Z"), now));
        assert!(!enterprise_expiry_is_due(Some("invalid"), now));
    }

    #[test]
    fn an_all_members_order_rejects_a_seat_cap() {
        let error = validate_create(&create_command(None, Some(10))).expect_err("seat cap");
        assert!(error.starts_with(INVALID_PREFIX));
    }

    #[test]
    fn a_seat_order_requires_a_positive_cap() {
        assert!(validate_create(&create_command(Some(MODE_SEAT), None)).is_err());
        assert!(validate_create(&create_command(Some(MODE_SEAT), Some(0))).is_err());
        let (mode, cap) =
            validate_create(&create_command(Some(MODE_SEAT), Some(25))).expect("valid");
        assert_eq!(mode, MODE_SEAT);
        assert_eq!(cap, Some(25));
    }

    #[test]
    fn the_duration_ladder_is_closed() {
        let mut command = create_command(None, None);
        command.duration_months = 9;
        assert!(validate_create(&command).is_err());
        command.duration_months = 6;
        assert!(validate_create(&command).is_ok());
    }

    #[test]
    fn tokens_are_hashed_and_never_stored_in_plaintext() {
        let token = random_token();
        assert!(token.starts_with("iael_"));
        let hash = token_hash(&token);
        assert_eq!(hash.len(), 64);
        assert!(!hash.contains(&token));
    }

    fn seat_command(organization_id: Option<&str>) -> EnterpriseSeatAssignCommand {
        EnterpriseSeatAssignCommand {
            user_id: "iamu_demo".to_owned(),
            organization_id: organization_id.map(str::to_owned),
        }
    }

    #[test]
    fn seat_assignment_respects_order_organization_scope() {
        assert_eq!(
            enterprise_seat_organization_id("0", &seat_command(None)).expect("tenant scope"),
            "0"
        );
        assert_eq!(
            enterprise_seat_organization_id("0", &seat_command(Some(" org_1 ")))
                .expect("tenant member organization"),
            "org_1"
        );
        assert_eq!(
            enterprise_seat_organization_id("org_1", &seat_command(None))
                .expect("order organization default"),
            "org_1"
        );
        assert!(enterprise_seat_organization_id("org_1", &seat_command(Some("org_2"))).is_err());
    }

    #[test]
    fn seat_version_uses_the_int64_string_wire_contract() {
        let seat = EnterpriseSeat {
            id: "iaest_demo".to_owned(),
            tenant_id: "tenant_demo".to_owned(),
            organization_id: "0".to_owned(),
            order_id: "order_demo".to_owned(),
            application_id: "app_demo".to_owned(),
            user_id: "user_demo".to_owned(),
            display_name: Some("Demo".to_owned()),
            one_id_id: None,
            department_id: None,
            department_name: None,
            allocation_method: "manual".to_owned(),
            policy_id: None,
            blacklisted: false,
            seat_status: "active".to_owned(),
            assigned_by: "admin_demo".to_owned(),
            assigned_at: "2026-11-28T00:00:00Z".to_owned(),
            released_by: None,
            released_at: None,
            version: i64::MAX,
        };
        let value = serde_json::to_value(seat).expect("seat JSON");
        assert_eq!(value["version"], json!(i64::MAX.to_string()));
    }
}
