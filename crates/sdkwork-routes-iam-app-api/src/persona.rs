//! Persona account profile for the IAM app-api.
//!
//! A persona is the account-level answer to "who am I and what do I follow":
//! one role code from the selectable-role catalog, an ordered list of interest
//! codes, and whether the first-run prompt was answered. It is account data,
//! not authorization data — the role catalog only *maps* onto the authorization
//! role catalog through `iam_persona_role.iam_role_code`, and selecting a
//! persona never grants a permission.
//!
//! Catalog rows are platform-owned (`owner_tenant_id = '0'`), so no seed pins a
//! tenant literal and every tenant reads the same taxonomy; a tenant-owned row
//! for the same code overrides the platform row. Labels are locale maps
//! (`{"zh-CN": "学员", "en-US": "Learner"}`) served verbatim, because IAM has no
//! request-locale negotiation and the client already knows its own locale.
//!
//! Every handler resolves the caller from the verified [`WebRequestContext`],
//! never from a header or query parameter, and scopes every row by the
//! session's `tenant_id` and `user_id`.

use std::collections::BTreeMap;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::{PgPool, Row};

use sdkwork_web_core::WebRequestContext;

use crate::handlers::postgres_pool_or_error;
use crate::responses::{appbase_error, appbase_ok, iam_session_required_error};
use crate::state::{LocalIamState, LocalSession};
use crate::tokens::resolve_session_from_context;
use crate::utils::stable_local_id;

/// `GET` — the selectable role and interest catalog.
pub(crate) const PERSONA_CATALOG_PATH: &str = "/app/v3/api/iam/persona_catalog";

/// `GET`, `PUT`, `DELETE` — the caller's persona.
pub(crate) const USER_PERSONA_PATH: &str = "/app/v3/api/iam/users/current/persona";

/// Upper bound on stored interest codes, so one request cannot fill the column.
pub(crate) const MAX_PERSONA_INTERESTS: usize = 24;

/// Maximum accepted length of one catalog code, matching the DDL check.
const MAX_CODE_LEN: usize = 64;

/// Binds the persona routes to the surface's shared state.
pub(crate) fn persona_routes() -> Router<LocalIamState> {
    Router::new()
        .route(PERSONA_CATALOG_PATH, get(retrieve_persona_catalog))
        .route(
            USER_PERSONA_PATH,
            get(retrieve_current_user_persona)
                .put(update_current_user_persona)
                .delete(delete_current_user_persona),
        )
}

/// Full-replace payload of `PUT /app/v3/api/iam/users/current/persona`.
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct UserPersonaUpdateCommand {
    /// Chosen role code; `null` (or omitted) clears the choice.
    #[serde(default)]
    pub(crate) role: Option<String>,
    /// Followed interest codes; omitted means an empty list.
    #[serde(default)]
    pub(crate) interests: Vec<String>,
    /// Whether the person answered the first-run prompt.
    #[serde(default)]
    pub(crate) prompt_dismissed: bool,
}

fn persona_storage_error(message: &str) -> Response {
    appbase_error(
        StatusCode::SERVICE_UNAVAILABLE,
        "iam_persona_unavailable",
        message,
    )
}

fn persona_invalid(field: &str, message: &str) -> Response {
    appbase_error(
        StatusCode::UNPROCESSABLE_ENTITY,
        "iam_persona_invalid",
        &format!("{field}: {message}"),
    )
}

/// Parses a locale-map column, falling back to an empty map for damaged values.
fn parse_i18n(raw: &str) -> Value {
    serde_json::from_str::<Value>(raw).unwrap_or_else(|_| json!({}))
}

fn parse_interests(raw: &str) -> Vec<String> {
    serde_json::from_str::<Vec<String>>(raw).unwrap_or_default()
}

/// Trims a catalog code and rejects blank or over-long values.
fn normalized_code(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed.chars().count() > MAX_CODE_LEN {
        return None;
    }
    Some(trimmed.to_owned())
}

async fn require_session(
    state: &LocalIamState,
    ctx: &WebRequestContext,
) -> Result<(PgPool, LocalSession), Response> {
    // Cloning the pool keeps the borrow of `state` out of the async body; the
    // pool itself is a cheap handle over the shared connections.
    let pool = postgres_pool_or_error(state)?.clone();
    match resolve_session_from_context(&pool, ctx).await {
        Some(session) => Ok((pool, session)),
        None => Err(iam_session_required_error()),
    }
}

/// One selectable-code catalog table plus the optional columns it actually owns.
///
/// The two catalog tables are deliberately not identical: `iam_persona_role`
/// carries a description map and an optional authorization-role mapping, while
/// `iam_persona_interest` carries only its label map. A reader that selects a
/// column the table does not declare fails the whole statement, which is how a
/// single absent column once turned every catalog read into a `503`.
#[derive(Clone, Copy)]
struct CatalogTable {
    table: &'static str,
    /// Whether the table owns `description_i18n`.
    descriptions: bool,
    /// Whether the table owns `iam_role_code`.
    iam_role_code: bool,
}

impl CatalogTable {
    /// Selectable persona roles, with descriptions and the optional role mapping.
    const ROLES: Self = Self {
        table: "iam_persona_role",
        descriptions: true,
        iam_role_code: true,
    };

    /// Selectable interest directions, which own no description and no role.
    const INTERESTS: Self = Self {
        table: "iam_persona_interest",
        descriptions: false,
        iam_role_code: false,
    };

    /// The column list this table can serve; identifiers are static, so the
    /// formatted statement never carries request data.
    fn select_list(&self) -> String {
        let mut columns = String::from("code, sort_order, label_i18n");
        if self.descriptions {
            columns.push_str(", description_i18n");
        }
        if self.iam_role_code {
            columns.push_str(", iam_role_code");
        }
        columns
    }
}

/// Builds one catalog entry from the columns the table actually provides, so the
/// response never advertises a field the storage contract does not own.
fn catalog_entry(
    code: String,
    sort_order: i32,
    labels: Value,
    descriptions: Option<Value>,
    iam_role_code: Option<String>,
) -> Value {
    let mut entry = json!({
        "code": code,
        "sortOrder": sort_order,
        "labels": labels,
    });
    if let Some(descriptions) = descriptions {
        entry["descriptions"] = descriptions;
    }
    if let Some(iam_role_code) = iam_role_code {
        entry["iamRoleCode"] = json!(iam_role_code);
    }
    entry
}

/// Reads one catalog table with tenant-over-platform precedence and returns the
/// entries in display order.
///
/// Tenant rows sort after platform rows, so inserting into the code map in row
/// order lets a tenant row replace the platform row for the same code.
async fn load_catalog_values(
    pg: &PgPool,
    tenant_id: &str,
    catalog: CatalogTable,
) -> Result<Vec<Value>, Response> {
    let sql = format!(
        "SELECT {} FROM {} \
         WHERE (owner_tenant_id = '0' OR owner_tenant_id = $1) AND status = 'active' \
         ORDER BY (owner_tenant_id <> '0'), sort_order, code",
        catalog.select_list(),
        catalog.table,
    );
    // The only interpolated values are this module's static table and column
    // identifiers; the tenant id stays a bind parameter.
    let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(tenant_id)
        .fetch_all(pg)
        .await
        .map_err(|_| persona_storage_error("persona catalog could not be read"))?;

    let mut by_code: BTreeMap<String, (i32, Value)> = BTreeMap::new();
    for row in rows {
        let Ok(code) = row.try_get::<String, _>("code") else {
            continue;
        };
        let sort_order = row.try_get::<i32, _>("sort_order").unwrap_or(0);
        let labels = row
            .try_get::<String, _>("label_i18n")
            .map(|raw| parse_i18n(&raw))
            .unwrap_or_else(|_| json!({}));
        let descriptions = catalog.descriptions.then(|| {
            row.try_get::<String, _>("description_i18n")
                .map(|raw| parse_i18n(&raw))
                .unwrap_or_else(|_| json!({}))
        });
        let iam_role_code = if catalog.iam_role_code {
            row.try_get::<Option<String>, _>("iam_role_code")
                .ok()
                .flatten()
        } else {
            None
        };
        let entry = catalog_entry(
            code.clone(),
            sort_order,
            labels,
            descriptions,
            iam_role_code,
        );
        by_code.insert(code, (sort_order, entry));
    }

    let mut ordered: Vec<(i32, String, Value)> = by_code
        .into_iter()
        .map(|(code, (sort_order, value))| (sort_order, code, value))
        .collect();
    ordered.sort_by(|left, right| left.0.cmp(&right.0).then_with(|| left.1.cmp(&right.1)));
    Ok(ordered.into_iter().map(|(_, _, value)| value).collect())
}

async fn load_roles(pg: &PgPool, tenant_id: &str) -> Result<Vec<Value>, Response> {
    load_catalog_values(pg, tenant_id, CatalogTable::ROLES).await
}

async fn load_interests(pg: &PgPool, tenant_id: &str) -> Result<Vec<Value>, Response> {
    load_catalog_values(pg, tenant_id, CatalogTable::INTERESTS).await
}

/// Stable catalog version derived from the newest catalog row, so a client can
/// cache the taxonomy and refresh when the value changes.
async fn load_catalog_version(pg: &PgPool, tenant_id: &str) -> Result<String, Response> {
    let row = sqlx::query(
        "SELECT to_char(COALESCE(MAX(updated_at), CURRENT_TIMESTAMP) AT TIME ZONE 'UTC', \
                'YYYYMMDDHH24MISS') AS catalog_version \
         FROM ( \
             SELECT updated_at FROM iam_persona_role \
             WHERE (owner_tenant_id = '0' OR owner_tenant_id = $1) AND status = 'active' \
             UNION ALL \
             SELECT updated_at FROM iam_persona_interest \
             WHERE (owner_tenant_id = '0' OR owner_tenant_id = $1) AND status = 'active' \
         ) catalog",
    )
    .bind(tenant_id)
    .fetch_one(pg)
    .await
    .map_err(|_| persona_storage_error("persona catalog version could not be read"))?;
    Ok(row
        .try_get::<String, _>("catalog_version")
        .unwrap_or_else(|_| "0".to_owned()))
}

fn persona_item(
    role: Option<&str>,
    interests: &[String],
    prompt_dismissed: bool,
    catalog_version: Option<&str>,
    updated_at: Option<&str>,
) -> Value {
    json!({
        "item": {
            "role": role,
            "interests": interests,
            "promptDismissed": prompt_dismissed,
            "hasSelection": role.is_some(),
            "catalogVersion": catalog_version,
            "updatedAt": updated_at,
        }
    })
}

fn catalog_codes(values: &[Value]) -> BTreeMap<String, usize> {
    values
        .iter()
        .enumerate()
        .filter_map(|(index, entry)| entry["code"].as_str().map(|code| (code.to_owned(), index)))
        .collect()
}

/// `GET /app/v3/api/iam/persona_catalog`
pub(crate) async fn retrieve_persona_catalog(
    State(state): State<LocalIamState>,
    ctx: WebRequestContext,
) -> Response {
    let (pg, session) = match require_session(&state, &ctx).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let tenant_id = session.user.tenant_id.as_str();

    let roles = match load_roles(&pg, tenant_id).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let interests = match load_interests(&pg, tenant_id).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let version = match load_catalog_version(&pg, tenant_id).await {
        Ok(value) => value,
        Err(response) => return response,
    };

    appbase_ok(json!({
        "item": {
            "version": version,
            "roles": roles,
            "interests": interests,
        }
    }))
}

/// `GET /app/v3/api/iam/users/current/persona`
///
/// A person who never chose returns an empty persona with `role: null`; the
/// endpoint never reports 404 for "not chosen yet".
pub(crate) async fn retrieve_current_user_persona(
    State(state): State<LocalIamState>,
    ctx: WebRequestContext,
) -> Response {
    let (pg, session) = match require_session(&state, &ctx).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let tenant_id = session.user.tenant_id.as_str();
    let user_id = session.user.id.as_str();

    let current_version = match load_catalog_version(&pg, tenant_id).await {
        Ok(value) => value,
        Err(response) => return response,
    };

    let stored = sqlx::query(
        "SELECT role_code, interests, prompt_dismissed, catalog_version, \
                to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS updated_at \
         FROM iam_user_persona WHERE tenant_id = $1 AND user_id = $2",
    )
    .bind(tenant_id)
    .bind(user_id)
    .fetch_optional(&pg)
    .await;

    match stored {
        Ok(Some(row)) => {
            let role = row.try_get::<Option<String>, _>("role_code").ok().flatten();
            let interests = row
                .try_get::<String, _>("interests")
                .map(|raw| parse_interests(&raw))
                .unwrap_or_default();
            let dismissed = row.try_get::<i32, _>("prompt_dismissed").unwrap_or(0) != 0;
            let version = row
                .try_get::<Option<String>, _>("catalog_version")
                .ok()
                .flatten();
            let updated_at = row.try_get::<String, _>("updated_at").ok();
            appbase_ok(persona_item(
                role.as_deref(),
                &interests,
                dismissed,
                version.as_deref().or(Some(current_version.as_str())),
                updated_at.as_deref(),
            ))
        }
        Ok(None) => appbase_ok(persona_item(
            None,
            &[],
            false,
            Some(current_version.as_str()),
            None,
        )),
        Err(_) => persona_storage_error("persona could not be read"),
    }
}

/// `PUT /app/v3/api/iam/users/current/persona`
///
/// Full replace: the payload is the complete persona, so a retry is idempotent
/// and two concurrent writes settle on one stored value.
pub(crate) async fn update_current_user_persona(
    State(state): State<LocalIamState>,
    ctx: WebRequestContext,
    Json(body): Json<UserPersonaUpdateCommand>,
) -> Response {
    let (pg, session) = match require_session(&state, &ctx).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let tenant_id = session.user.tenant_id.as_str();
    let user_id = session.user.id.as_str();

    let roles = match load_roles(&pg, tenant_id).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let interests = match load_interests(&pg, tenant_id).await {
        Ok(value) => value,
        Err(response) => return response,
    };

    let role: Option<String> = match body.role.as_deref() {
        None => None,
        Some(raw) => match normalized_code(raw) {
            None => return persona_invalid("role", "must not be blank"),
            Some(code) => Some(code),
        },
    };
    if let Some(code) = role.as_deref() {
        if !catalog_codes(&roles).contains_key(code) {
            return persona_invalid("role", "is not an active persona role");
        }
    }

    if body.interests.len() > MAX_PERSONA_INTERESTS {
        return persona_invalid(
            "interests",
            &format!("must contain at most {MAX_PERSONA_INTERESTS} entries"),
        );
    }
    let active_interests = catalog_codes(&interests);
    let mut selected: Vec<String> = Vec::with_capacity(body.interests.len());
    for raw in &body.interests {
        let Some(code) = normalized_code(raw) else {
            return persona_invalid("interests", "contains a blank entry");
        };
        if !active_interests.contains_key(&code) {
            return persona_invalid("interests", "contains an unknown or disabled code");
        }
        if !selected.contains(&code) {
            selected.push(code);
        }
    }
    // Store in catalog order so two clients that pick the same set agree on the
    // stored value.
    selected.sort_by_key(|code| active_interests.get(code).copied().unwrap_or(usize::MAX));

    let catalog_version = match load_catalog_version(&pg, tenant_id).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let serialized = match serde_json::to_string(&selected) {
        Ok(value) => value,
        Err(_) => return persona_storage_error("persona could not be serialized"),
    };

    let id = stable_local_id("iam-user-persona", &[tenant_id, user_id]);
    let prompt_dismissed = i32::from(u8::from(body.prompt_dismissed));
    let stored = sqlx::query(
        "INSERT INTO iam_user_persona \
             (id, tenant_id, user_id, role_code, interests, prompt_dismissed, catalog_version, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) \
         ON CONFLICT (tenant_id, user_id) DO UPDATE \
         SET role_code = EXCLUDED.role_code, \
             interests = EXCLUDED.interests, \
             prompt_dismissed = EXCLUDED.prompt_dismissed, \
             catalog_version = EXCLUDED.catalog_version, \
             updated_at = CURRENT_TIMESTAMP",
    )
    .bind(&id)
    .bind(tenant_id)
    .bind(user_id)
    .bind(role.as_deref())
    .bind(&serialized)
    .bind(prompt_dismissed)
    .bind(&catalog_version)
    .execute(&pg)
    .await;

    if stored.is_err() {
        return persona_storage_error("persona could not be stored");
    }

    let updated_at = sqlx::query(
        "SELECT to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS updated_at \
         FROM iam_user_persona WHERE tenant_id = $1 AND user_id = $2",
    )
    .bind(tenant_id)
    .bind(user_id)
    .fetch_optional(&pg)
    .await
    .ok()
    .flatten()
    .and_then(|row| row.try_get::<String, _>("updated_at").ok());

    appbase_ok(persona_item(
        role.as_deref(),
        &selected,
        body.prompt_dismissed,
        Some(catalog_version.as_str()),
        updated_at.as_deref(),
    ))
}

/// `DELETE /app/v3/api/iam/users/current/persona`
///
/// Clears the stored selection. The next launch sees the first-run gate again,
/// which is the honest state after a reset.
pub(crate) async fn delete_current_user_persona(
    State(state): State<LocalIamState>,
    ctx: WebRequestContext,
) -> Response {
    let (pg, session) = match require_session(&state, &ctx).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let deleted = sqlx::query("DELETE FROM iam_user_persona WHERE tenant_id = $1 AND user_id = $2")
        .bind(session.user.tenant_id.as_str())
        .bind(session.user.id.as_str())
        .execute(&pg)
        .await;
    match deleted {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(_) => persona_storage_error("persona could not be cleared"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalized_code_trims_and_rejects_invalid_values() {
        assert_eq!(normalized_code("  learner  ").as_deref(), Some("learner"));
        assert_eq!(normalized_code("   "), None);
        assert_eq!(normalized_code(""), None);
        assert_eq!(normalized_code(&"a".repeat(MAX_CODE_LEN + 1)), None);
    }

    #[test]
    fn parse_interests_keeps_order_and_tolerates_damage() {
        assert_eq!(
            parse_interests(r#"["postgraduate","k12"]"#),
            vec!["postgraduate".to_owned(), "k12".to_owned()]
        );
        assert!(parse_interests("not-json").is_empty());
    }

    #[test]
    fn catalog_codes_reports_catalog_positions() {
        let catalog = vec![json!({ "code": "learner" }), json!({ "code": "teacher" })];
        let codes = catalog_codes(&catalog);
        assert_eq!(codes.get("learner"), Some(&0));
        assert_eq!(codes.get("teacher"), Some(&1));
        assert_eq!(codes.get("missing"), None);
    }

    #[test]
    fn role_catalog_selects_its_description_and_role_mapping() {
        let select = CatalogTable::ROLES.select_list();
        assert!(select.contains("label_i18n"));
        assert!(select.contains("description_i18n"));
        assert!(select.contains("iam_role_code"));
    }

    #[test]
    fn interest_catalog_never_selects_columns_the_table_does_not_own() {
        // `iam_persona_interest` declares only code/sort_order/label_i18n; a
        // projection naming `description_i18n` fails the statement and makes
        // every catalog read (and therefore the persona save) a 503.
        let select = CatalogTable::INTERESTS.select_list();
        assert!(!select.contains("description_i18n"));
        assert!(!select.contains("iam_role_code"));
        assert_eq!("iam_persona_interest", CatalogTable::INTERESTS.table);
    }

    #[test]
    fn catalog_entry_reports_only_the_columns_the_table_owns() {
        let interest = catalog_entry("k12".to_owned(), 80, json!({ "zh-CN": "K12" }), None, None);
        assert_eq!(interest["code"], json!("k12"));
        assert_eq!(interest["labels"]["zh-CN"], json!("K12"));
        assert_eq!(interest.get("descriptions"), None);
        assert_eq!(interest.get("iamRoleCode"), None);

        let role = catalog_entry(
            "learner".to_owned(),
            10,
            json!({ "en-US": "Learner" }),
            Some(json!({ "en-US": "Learning for a course" })),
            Some("course_learner".to_owned()),
        );
        assert_eq!(
            role["descriptions"]["en-US"],
            json!("Learning for a course")
        );
        assert_eq!(role["iamRoleCode"], json!("course_learner"));
    }

    #[test]
    fn persona_item_marks_selection_only_with_a_role() {
        let empty = persona_item(None, &[], false, Some("20260101000000"), None);
        assert_eq!(empty["item"]["role"], Value::Null);
        assert_eq!(empty["item"]["hasSelection"], json!(false));
        assert_eq!(empty["item"]["interests"], json!([]));

        let chosen = persona_item(
            Some("learner"),
            &["postgraduate".to_owned()],
            true,
            Some("20260101000000"),
            Some("2026-01-01T00:00:00Z"),
        );
        assert_eq!(chosen["item"]["role"], json!("learner"));
        assert_eq!(chosen["item"]["hasSelection"], json!(true));
        assert_eq!(chosen["item"]["promptDismissed"], json!(true));
    }
}
