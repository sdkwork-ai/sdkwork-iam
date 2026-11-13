//! IAM-owned in-process organization directory read port.
//!
//! `DOMAIN_SPEC.md` §5 ("Cross-domain references `MUST` use stable IDs and
//! published read models or APIs, not direct table ownership leakage") and
//! `MODULE_SPEC.md` §4.2.1 ("reach a sibling module in-process, depend on its
//! contract/service/repository crate and call its public port") make IAM the
//! single owner of the organization, organization-membership, and user tables.
//!
//! Sibling modules (for example the membership seat-licensing module) `MUST NOT`
//! read `iam_*` tables directly. They depend on this crate and call
//! [`IamOrganizationDirectory`] in-process on the shared `sqlx::PgPool`, exactly
//! like the `AppMembershipStore` boxed-future style in the membership module.
//!
//! # Supporting index note
//!
//! Every query below filters `iam_organization_membership` by
//! `(tenant_id, organization_id)` plus the active-status predicate, and the
//! directory page orders by `(is_primary DESC, display_name, id)`. The canonical
//! IAM baseline (`database/ddl/baseline/postgres/0001_iam_baseline.sql`) only
//! declares `idx_iam_organization_membership_tenant_user
//! (tenant_id, user_id, organization_id, status)`, whose leading column is
//! `user_id`; it therefore does not cover the organization-scoped page/count as
//! a useful prefix. A follow-up IAM DDL change (out of scope for the refactor
//! that introduced this port) SHOULD add
//! `CREATE INDEX ... ON iam_organization_membership
//! (tenant_id, organization_id, status, is_primary, id)`
//! plus `(tenant_id, organization_id, user_id)` for the point lookups. No IAM
//! DDL is altered here.

use std::error::Error;
use std::fmt::{self, Display, Formatter};
use std::future::Future;
use std::pin::Pin;

use sqlx::{PgPool, Row};

/// Boxed, `Send` future returned by every [`IamOrganizationDirectory`] method.
///
/// Mirrors the membership module's `AppMembershipReadFuture` so both sides of
/// the in-process boundary use one async-trait-free style.
pub type IamDirectoryFuture<'a, T> =
    Pin<Box<dyn Future<Output = Result<T, IamDirectoryError>> + Send + 'a>>;

/// One IAM organization row projected for sibling modules.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IamOrganizationRecord {
    /// Raw IAM organization id (the stable cross-domain reference).
    pub organization_id: String,
    pub name: String,
    pub code: String,
    pub organization_kind: String,
    pub status: String,
}

/// One active IAM organization member projected for sibling modules.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IamOrganizationMemberRecord {
    /// IAM organization membership row id.
    pub membership_id: String,
    /// IAM user id (the stable cross-domain reference).
    pub user_id: String,
    /// IAM membership kind (`owner` | `admin` | `member`).
    pub membership_kind: String,
    /// Membership display name, falling back to the IAM user display name.
    pub display_name: Option<String>,
    pub username: Option<String>,
    pub email: Option<String>,
    pub status: String,
    pub is_primary: bool,
}

/// Offset/limit page request plus the optional free-text member search.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct IamOrganizationMemberQuery {
    /// Free-text match on username / display name / email, case-insensitive.
    ///
    /// The implementation owns the `LIKE` escaping, so callers pass the raw user
    /// input (`%` and `_` never widen the match).
    pub q: Option<String>,
    /// Non-negative row offset.
    pub offset: i64,
    /// Non-negative page size; `0` returns no rows.
    pub limit: i64,
}

/// Typed failure of the IAM directory port.
///
/// Never panics and never leaks SQL: the message carries the operation context
/// plus the underlying database error.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IamDirectoryError {
    message: String,
}

impl IamDirectoryError {
    /// Build an error with an operation-context message.
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }

    /// The operation-context message.
    pub fn message(&self) -> &str {
        &self.message
    }
}

impl Display for IamDirectoryError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.message)
    }
}

impl Error for IamDirectoryError {}

/// IAM-owned in-process read port for the organization directory.
///
/// Implementations are `Send + Sync` so the port can live in an `Arc` inside a
/// sibling module's store and be shared by concurrent request handlers.
pub trait IamOrganizationDirectory: Send + Sync {
    /// Load one organization (name, code, kind, status) for a tenant.
    fn load_organization<'a>(
        &'a self,
        tenant_id: &'a str,
        organization_id: &'a str,
    ) -> IamDirectoryFuture<'a, Option<IamOrganizationRecord>>;

    /// Count the active members of one organization.
    fn count_active_members<'a>(
        &'a self,
        tenant_id: &'a str,
        organization_id: &'a str,
    ) -> IamDirectoryFuture<'a, i64>;

    /// List one page of active organization members.
    fn list_active_members<'a>(
        &'a self,
        tenant_id: &'a str,
        organization_id: &'a str,
        query: IamOrganizationMemberQuery,
    ) -> IamDirectoryFuture<'a, Vec<IamOrganizationMemberRecord>>;

    /// Count the active organization members matching the optional search.
    fn count_active_members_matching<'a>(
        &'a self,
        tenant_id: &'a str,
        organization_id: &'a str,
        q: Option<String>,
    ) -> IamDirectoryFuture<'a, i64>;

    /// Load one active organization member by IAM user id.
    fn load_active_member<'a>(
        &'a self,
        tenant_id: &'a str,
        organization_id: &'a str,
        user_id: &'a str,
    ) -> IamDirectoryFuture<'a, Option<IamOrganizationMemberRecord>>;

    /// Keep the user ids that are still active members of the organization.
    ///
    /// One set-based `= ANY($3)` query; an empty input returns an empty vector
    /// without touching the database (no N+1 per-id round trip).
    fn filter_active_member_ids<'a>(
        &'a self,
        tenant_id: &'a str,
        organization_id: &'a str,
        user_ids: &'a [String],
    ) -> IamDirectoryFuture<'a, Vec<String>>;
}

/// `sqlx`-PostgreSQL implementation of [`IamOrganizationDirectory`].
///
/// Holds the host connection pool; it never opens a second pool (`MODULE_SPEC.md`
/// §4.2.7 "The in-process path reuses the host connection pool").
#[derive(Debug, Clone)]
pub struct SqlxIamOrganizationDirectory {
    pool: PgPool,
}

impl SqlxIamOrganizationDirectory {
    /// Wrap an existing host pool.
    #[must_use]
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl IamOrganizationDirectory for SqlxIamOrganizationDirectory {
    fn load_organization<'a>(
        &'a self,
        tenant_id: &'a str,
        organization_id: &'a str,
    ) -> IamDirectoryFuture<'a, Option<IamOrganizationRecord>> {
        Box::pin(async move {
            let row = sqlx::query(
                r#"
                SELECT
                    id AS organization_id,
                    name,
                    code,
                    organization_kind,
                    CAST(status AS TEXT) AS organization_status
                FROM iam_organization
                WHERE tenant_id = CAST($1 AS TEXT)
                  AND id = CAST($2 AS TEXT)
                LIMIT 1
                "#,
            )
            .bind(tenant_id)
            .bind(organization_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|error| {
                directory_error("failed to load the organization directory row", error)
            })?;
            row.as_ref().map(organization_record).transpose()
        })
    }

    fn count_active_members<'a>(
        &'a self,
        tenant_id: &'a str,
        organization_id: &'a str,
    ) -> IamDirectoryFuture<'a, i64> {
        Box::pin(async move {
            let total = sqlx::query_scalar(
                r#"
                SELECT COUNT(*)
                FROM iam_organization_membership m
                WHERE m.tenant_id = CAST($1 AS TEXT)
                  AND m.organization_id = CAST($2 AS TEXT)
                  AND (m.status = 'active' OR CAST(m.status AS TEXT) = '1')
                "#,
            )
            .bind(tenant_id)
            .bind(organization_id)
            .fetch_one(&self.pool)
            .await
            .map_err(|error| {
                directory_error("failed to count active organization members", error)
            })?;
            Ok(total)
        })
    }

    fn list_active_members<'a>(
        &'a self,
        tenant_id: &'a str,
        organization_id: &'a str,
        query: IamOrganizationMemberQuery,
    ) -> IamDirectoryFuture<'a, Vec<IamOrganizationMemberRecord>> {
        Box::pin(async move {
            let pattern = like_pattern(query.q.as_deref());
            let rows = sqlx::query(
                r#"
                SELECT
                    m.id AS membership_id,
                    m.user_id AS user_id,
                    m.membership_kind AS membership_kind,
                    COALESCE(NULLIF(m.display_name, ''), u.display_name, u.username) AS display_name,
                    u.username AS username,
                    u.email AS email,
                    CAST(m.status AS TEXT) AS member_status,
                    CAST(COALESCE(m.is_primary, 0) AS INTEGER) AS is_primary
                FROM iam_organization_membership m
                LEFT JOIN iam_user u
                  ON u.tenant_id = m.tenant_id
                 AND u.id = m.user_id
                WHERE m.tenant_id = CAST($1 AS TEXT)
                  AND m.organization_id = CAST($2 AS TEXT)
                  AND (m.status = 'active' OR CAST(m.status AS TEXT) = '1')
                  AND ($3::text IS NULL OR (
                        LOWER(COALESCE(m.display_name, '')) LIKE $3 ESCAPE '\'
                     OR LOWER(COALESCE(u.username, '')) LIKE $3 ESCAPE '\'
                     OR LOWER(COALESCE(u.display_name, '')) LIKE $3 ESCAPE '\'
                     OR LOWER(COALESCE(u.email, '')) LIKE $3 ESCAPE '\'
                  ))
                ORDER BY m.is_primary DESC,
                         u.display_name ASC,
                         m.id ASC
                LIMIT $4 OFFSET $5
                "#,
            )
            .bind(tenant_id)
            .bind(organization_id)
            .bind(pattern.as_deref())
            .bind(query.limit.max(0))
            .bind(query.offset.max(0))
            .fetch_all(&self.pool)
            .await
            .map_err(|error| {
                directory_error("failed to list active organization members", error)
            })?;
            rows.iter().map(member_record).collect()
        })
    }

    fn count_active_members_matching<'a>(
        &'a self,
        tenant_id: &'a str,
        organization_id: &'a str,
        q: Option<String>,
    ) -> IamDirectoryFuture<'a, i64> {
        Box::pin(async move {
            let pattern = like_pattern(q.as_deref());
            let total = sqlx::query_scalar(
                r#"
                SELECT COUNT(*)
                FROM iam_organization_membership m
                LEFT JOIN iam_user u
                  ON u.tenant_id = m.tenant_id
                 AND u.id = m.user_id
                WHERE m.tenant_id = CAST($1 AS TEXT)
                  AND m.organization_id = CAST($2 AS TEXT)
                  AND (m.status = 'active' OR CAST(m.status AS TEXT) = '1')
                  AND ($3::text IS NULL OR (
                        LOWER(COALESCE(m.display_name, '')) LIKE $3 ESCAPE '\'
                     OR LOWER(COALESCE(u.username, '')) LIKE $3 ESCAPE '\'
                     OR LOWER(COALESCE(u.display_name, '')) LIKE $3 ESCAPE '\'
                     OR LOWER(COALESCE(u.email, '')) LIKE $3 ESCAPE '\'
                  ))
                "#,
            )
            .bind(tenant_id)
            .bind(organization_id)
            .bind(pattern.as_deref())
            .fetch_one(&self.pool)
            .await
            .map_err(|error| {
                directory_error(
                    "failed to count organization members matching the search",
                    error,
                )
            })?;
            Ok(total)
        })
    }

    fn load_active_member<'a>(
        &'a self,
        tenant_id: &'a str,
        organization_id: &'a str,
        user_id: &'a str,
    ) -> IamDirectoryFuture<'a, Option<IamOrganizationMemberRecord>> {
        Box::pin(async move {
            let row = sqlx::query(
                r#"
                SELECT
                    m.id AS membership_id,
                    m.user_id AS user_id,
                    m.membership_kind AS membership_kind,
                    COALESCE(NULLIF(m.display_name, ''), u.display_name, u.username) AS display_name,
                    u.username AS username,
                    u.email AS email,
                    CAST(m.status AS TEXT) AS member_status,
                    CAST(COALESCE(m.is_primary, 0) AS INTEGER) AS is_primary
                FROM iam_organization_membership m
                LEFT JOIN iam_user u
                  ON u.tenant_id = m.tenant_id
                 AND u.id = m.user_id
                WHERE m.tenant_id = CAST($1 AS TEXT)
                  AND m.organization_id = CAST($2 AS TEXT)
                  AND m.user_id = CAST($3 AS TEXT)
                  AND (m.status = 'active' OR CAST(m.status AS TEXT) = '1')
                ORDER BY m.is_primary DESC,
                         m.id ASC
                LIMIT 1
                "#,
            )
            .bind(tenant_id)
            .bind(organization_id)
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|error| directory_error("failed to load the active organization member", error))?;
            row.as_ref().map(member_record).transpose()
        })
    }

    fn filter_active_member_ids<'a>(
        &'a self,
        tenant_id: &'a str,
        organization_id: &'a str,
        user_ids: &'a [String],
    ) -> IamDirectoryFuture<'a, Vec<String>> {
        Box::pin(async move {
            if user_ids.is_empty() {
                return Ok(Vec::new());
            }
            let rows = sqlx::query(
                r#"
                SELECT DISTINCT m.user_id AS user_id
                FROM iam_organization_membership m
                WHERE m.tenant_id = CAST($1 AS TEXT)
                  AND m.organization_id = CAST($2 AS TEXT)
                  AND m.user_id = ANY(CAST($3 AS TEXT[]))
                  AND (m.status = 'active' OR CAST(m.status AS TEXT) = '1')
                ORDER BY m.user_id ASC
                "#,
            )
            .bind(tenant_id)
            .bind(organization_id)
            .bind(user_ids.to_vec())
            .fetch_all(&self.pool)
            .await
            .map_err(|error| {
                directory_error("failed to filter active organization member ids", error)
            })?;
            rows.iter()
                .map(|row| {
                    row.try_get::<Option<String>, _>("user_id")
                        .map_err(|error| {
                            IamDirectoryError::new(format!(
                                "failed to decode the iam membership user id: {error}"
                            ))
                        })
                        .map(|value| value.unwrap_or_default())
                })
                .collect()
        })
    }
}

fn directory_error(context: &str, error: sqlx::Error) -> IamDirectoryError {
    IamDirectoryError::new(format!("{context}: {error}"))
}

/// Escape LIKE metacharacters and lower-case the free-text member search.
fn like_pattern(q: Option<&str>) -> Option<String> {
    let q = q?.trim();
    if q.is_empty() {
        return None;
    }
    let escaped = q
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_");
    Some(format!("%{}%", escaped.to_lowercase()))
}

fn organization_record(
    row: &sqlx::postgres::PgRow,
) -> Result<IamOrganizationRecord, IamDirectoryError> {
    Ok(IamOrganizationRecord {
        organization_id: text_cell(row, "organization_id")?,
        name: text_cell(row, "name")?,
        code: text_cell(row, "code")?,
        organization_kind: text_cell(row, "organization_kind")?,
        status: text_cell(row, "organization_status")?,
    })
}

fn member_record(
    row: &sqlx::postgres::PgRow,
) -> Result<IamOrganizationMemberRecord, IamDirectoryError> {
    Ok(IamOrganizationMemberRecord {
        membership_id: text_cell(row, "membership_id")?,
        user_id: text_cell(row, "user_id")?,
        membership_kind: text_cell(row, "membership_kind")?,
        display_name: optional_text_cell(row, "display_name")?,
        username: optional_text_cell(row, "username")?,
        email: optional_text_cell(row, "email")?,
        status: text_cell(row, "member_status")?,
        is_primary: integer_cell(row, "is_primary")? != 0,
    })
}

fn text_cell(row: &sqlx::postgres::PgRow, column: &str) -> Result<String, IamDirectoryError> {
    optional_text_cell(row, column).map(|value| value.unwrap_or_default())
}

fn optional_text_cell(
    row: &sqlx::postgres::PgRow,
    column: &str,
) -> Result<Option<String>, IamDirectoryError> {
    row.try_get::<Option<String>, _>(column).map_err(|error| {
        IamDirectoryError::new(format!("failed to decode iam column {column}: {error}"))
    })
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> Result<i64, IamDirectoryError> {
    if let Ok(value) = row.try_get::<Option<i32>, _>(column) {
        return Ok(i64::from(value.unwrap_or(0)));
    }
    row.try_get::<Option<i64>, _>(column)
        .map(|value| value.unwrap_or(0))
        .map_err(|error| {
            IamDirectoryError::new(format!(
                "failed to decode iam integer column {column}: {error}"
            ))
        })
}
