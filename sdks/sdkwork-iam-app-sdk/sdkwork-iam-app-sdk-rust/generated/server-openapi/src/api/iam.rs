use std::sync::Arc;

use crate::api::paths::app_path;
use crate::api::paths::append_query_string;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{IamPersonaCatalog, IamUserPersona, IamUserPersonaUpdateCommand, SdkWorkPageData};

#[derive(Clone)]
pub struct IamApi {
    client: Arc<SdkworkHttpClient>,
}

impl IamApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Department Assignments list.
    pub async fn department_assignments_list(&self, page: Option<i64>, page_size: Option<i64>, cursor: Option<&str>, sort: Option<&str>, q: Option<&str>) -> Result<SdkWorkPageData, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page", page, "form", true, false, None),
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("cursor", cursor, "form", true, false, None),
            QueryParameterSpec::new("sort", sort, "form", true, false, None),
            QueryParameterSpec::new("q", q, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/iam/department_assignments".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Departments list.
    pub async fn departments_list(&self, page: Option<i64>, page_size: Option<i64>, cursor: Option<&str>, sort: Option<&str>, q: Option<&str>) -> Result<SdkWorkPageData, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page", page, "form", true, false, None),
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("cursor", cursor, "form", true, false, None),
            QueryParameterSpec::new("sort", sort, "form", true, false, None),
            QueryParameterSpec::new("q", q, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/iam/departments".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Departments tree retrieve.
    pub async fn departments_tree_retrieve(&self) -> Result<std::collections::HashMap<String, serde_json::Value>, SdkworkError> {
        let path = app_path(&"/iam/departments/tree".to_string());
        self.client.get(&path, None, None).await
    }

    /// Iam oauth official Account Settings retrieve.
    pub async fn oauth_official_account_settings_retrieve(&self) -> Result<std::collections::HashMap<String, serde_json::Value>, SdkworkError> {
        let path = app_path(&"/iam/oauth/official_account_settings".to_string());
        self.client.get(&path, None, None).await
    }

    /// Iam oauth official Accounts list.
    pub async fn oauth_official_accounts_list(&self, page: Option<i64>, page_size: Option<i64>, cursor: Option<&str>, sort: Option<&str>, q: Option<&str>) -> Result<SdkWorkPageData, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page", page, "form", true, false, None),
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("cursor", cursor, "form", true, false, None),
            QueryParameterSpec::new("sort", sort, "form", true, false, None),
            QueryParameterSpec::new("q", q, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/iam/oauth/official_accounts".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Iam oauth official Accounts create.
    pub async fn oauth_official_accounts_create(&self, body: &std::collections::HashMap<String, serde_json::Value>) -> Result<std::collections::HashMap<String, serde_json::Value>, SdkworkError> {
        let path = app_path(&"/iam/oauth/official_accounts".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    /// Iam oauth official Accounts delete.
    pub async fn oauth_official_accounts_delete(&self, official_account_id: &str) -> Result<(), SdkworkError> {
        let path = app_path(&format!("/iam/oauth/official_accounts/{}", serialize_path_parameter(official_account_id, PathParameterSpec::new("officialAccountId", "simple", false))));
        self.client.delete(&path, None, None).await
    }

    /// Iam oauth official Accounts retrieve.
    pub async fn oauth_official_accounts_retrieve(&self, official_account_id: &str) -> Result<std::collections::HashMap<String, serde_json::Value>, SdkworkError> {
        let path = app_path(&format!("/iam/oauth/official_accounts/{}", serialize_path_parameter(official_account_id, PathParameterSpec::new("officialAccountId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    /// Iam oauth official Accounts update.
    pub async fn oauth_official_accounts_update(&self, official_account_id: &str, body: &std::collections::HashMap<String, serde_json::Value>) -> Result<std::collections::HashMap<String, serde_json::Value>, SdkworkError> {
        let path = app_path(&format!("/iam/oauth/official_accounts/{}", serialize_path_parameter(official_account_id, PathParameterSpec::new("officialAccountId", "simple", false))));
        self.client.patch(&path, Some(body), None, None, Some("application/json")).await
    }

    /// Iam oauth official Accounts custom Menus publish.
    pub async fn oauth_official_accounts_custom_menus_publish(&self, official_account_id: &str, body: &std::collections::HashMap<String, serde_json::Value>) -> Result<std::collections::HashMap<String, serde_json::Value>, SdkworkError> {
        let path = app_path(&format!("/iam/oauth/official_accounts/{}/custom_menus/publish", serialize_path_parameter(official_account_id, PathParameterSpec::new("officialAccountId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    /// Iam oauth official Accounts custom Menus rollback.
    pub async fn oauth_official_accounts_custom_menus_rollback(&self, official_account_id: &str, body: &std::collections::HashMap<String, serde_json::Value>) -> Result<std::collections::HashMap<String, serde_json::Value>, SdkworkError> {
        let path = app_path(&format!("/iam/oauth/official_accounts/{}/custom_menus/rollback", serialize_path_parameter(official_account_id, PathParameterSpec::new("officialAccountId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    /// Iam oauth official Accounts custom Menus sync.
    pub async fn oauth_official_accounts_custom_menus_sync(&self, official_account_id: &str, body: &std::collections::HashMap<String, serde_json::Value>) -> Result<std::collections::HashMap<String, serde_json::Value>, SdkworkError> {
        let path = app_path(&format!("/iam/oauth/official_accounts/{}/custom_menus/sync", serialize_path_parameter(official_account_id, PathParameterSpec::new("officialAccountId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    /// Organization Memberships list.
    pub async fn organization_memberships_list(&self, page: Option<i64>, page_size: Option<i64>, cursor: Option<&str>, sort: Option<&str>, q: Option<&str>) -> Result<SdkWorkPageData, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page", page, "form", true, false, None),
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("cursor", cursor, "form", true, false, None),
            QueryParameterSpec::new("sort", sort, "form", true, false, None),
            QueryParameterSpec::new("q", q, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/iam/organization_memberships".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Organizations list.
    pub async fn organizations_list(&self, page: Option<i64>, page_size: Option<i64>, cursor: Option<&str>, sort: Option<&str>, q: Option<&str>) -> Result<SdkWorkPageData, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page", page, "form", true, false, None),
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("cursor", cursor, "form", true, false, None),
            QueryParameterSpec::new("sort", sort, "form", true, false, None),
            QueryParameterSpec::new("q", q, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/iam/organizations".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Organizations members list.
    pub async fn organizations_members_list(&self, organization_id: &str, page: Option<i64>, page_size: Option<i64>, cursor: Option<&str>, sort: Option<&str>, q: Option<&str>, role: Option<&str>) -> Result<serde_json::Value, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page", page, "form", true, false, None),
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("cursor", cursor, "form", true, false, None),
            QueryParameterSpec::new("sort", sort, "form", true, false, None),
            QueryParameterSpec::new("q", q, "form", true, false, None),
            QueryParameterSpec::new("role", role, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&format!("/iam/organizations/{}/members", serialize_path_parameter(organization_id, PathParameterSpec::new("organizationId", "simple", false)))), &query);
        self.client.get(&path, None, None).await
    }

    /// Organizations tree retrieve.
    pub async fn organizations_tree_retrieve(&self) -> Result<std::collections::HashMap<String, serde_json::Value>, SdkworkError> {
        let path = app_path(&"/iam/organizations/tree".to_string());
        self.client.get(&path, None, None).await
    }

    /// Persona Catalog retrieve.
    pub async fn persona_catalog_retrieve(&self) -> Result<IamPersonaCatalog, SdkworkError> {
        let path = app_path(&"/iam/persona_catalog".to_string());
        self.client.get(&path, None, None).await
    }

    /// Position Assignments list.
    pub async fn position_assignments_list(&self, page: Option<i64>, page_size: Option<i64>, cursor: Option<&str>, sort: Option<&str>, q: Option<&str>) -> Result<SdkWorkPageData, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page", page, "form", true, false, None),
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("cursor", cursor, "form", true, false, None),
            QueryParameterSpec::new("sort", sort, "form", true, false, None),
            QueryParameterSpec::new("q", q, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/iam/position_assignments".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Positions list.
    pub async fn positions_list(&self, page: Option<i64>, page_size: Option<i64>, cursor: Option<&str>, sort: Option<&str>, q: Option<&str>) -> Result<SdkWorkPageData, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page", page, "form", true, false, None),
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("cursor", cursor, "form", true, false, None),
            QueryParameterSpec::new("sort", sort, "form", true, false, None),
            QueryParameterSpec::new("q", q, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/iam/positions".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Role Bindings list.
    pub async fn role_bindings_list(&self, page: Option<i64>, page_size: Option<i64>, cursor: Option<&str>, sort: Option<&str>, q: Option<&str>, role_id: Option<&str>, principal_kind: Option<&str>, principal_id: Option<&str>, scope_kind: Option<&str>, scope_id: Option<&str>) -> Result<SdkWorkPageData, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page", page, "form", true, false, None),
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("cursor", cursor, "form", true, false, None),
            QueryParameterSpec::new("sort", sort, "form", true, false, None),
            QueryParameterSpec::new("q", q, "form", true, false, None),
            QueryParameterSpec::new("roleId", role_id, "form", true, false, None),
            QueryParameterSpec::new("principalKind", principal_kind, "form", true, false, None),
            QueryParameterSpec::new("principalId", principal_id, "form", true, false, None),
            QueryParameterSpec::new("scopeKind", scope_kind, "form", true, false, None),
            QueryParameterSpec::new("scopeId", scope_id, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/iam/role_bindings".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Users current retrieve.
    pub async fn users_current_retrieve(&self) -> Result<std::collections::HashMap<String, serde_json::Value>, SdkworkError> {
        let path = app_path(&"/iam/users/current".to_string());
        self.client.get(&path, None, None).await
    }

    /// Users current update.
    pub async fn users_current_update(&self, body: &std::collections::HashMap<String, serde_json::Value>) -> Result<std::collections::HashMap<String, serde_json::Value>, SdkworkError> {
        let path = app_path(&"/iam/users/current".to_string());
        self.client.patch(&path, Some(body), None, None, Some("application/json")).await
    }

    /// Users current email Bindings delete.
    pub async fn users_current_email_bindings_delete(&self) -> Result<(), SdkworkError> {
        let path = app_path(&"/iam/users/current/email_bindings".to_string());
        self.client.delete(&path, None, None).await
    }

    /// Users current email Bindings create.
    pub async fn users_current_email_bindings_create(&self, body: &std::collections::HashMap<String, serde_json::Value>) -> Result<std::collections::HashMap<String, serde_json::Value>, SdkworkError> {
        let path = app_path(&"/iam/users/current/email_bindings".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    /// Users current password update.
    pub async fn users_current_password_update(&self, body: &std::collections::HashMap<String, serde_json::Value>) -> Result<std::collections::HashMap<String, serde_json::Value>, SdkworkError> {
        let path = app_path(&"/iam/users/current/password".to_string());
        self.client.patch(&path, Some(body), None, None, Some("application/json")).await
    }

    /// Users current persona delete.
    pub async fn users_current_persona_delete(&self) -> Result<(), SdkworkError> {
        let path = app_path(&"/iam/users/current/persona".to_string());
        self.client.delete(&path, None, None).await
    }

    /// Users current persona retrieve.
    pub async fn users_current_persona_retrieve(&self) -> Result<IamUserPersona, SdkworkError> {
        let path = app_path(&"/iam/users/current/persona".to_string());
        self.client.get(&path, None, None).await
    }

    /// Users current persona update.
    pub async fn users_current_persona_update(&self, body: &IamUserPersonaUpdateCommand) -> Result<IamUserPersona, SdkworkError> {
        let path = app_path(&"/iam/users/current/persona".to_string());
        self.client.put(&path, Some(body), None, None, Some("application/json")).await
    }

    /// Users current phone Bindings delete.
    pub async fn users_current_phone_bindings_delete(&self) -> Result<(), SdkworkError> {
        let path = app_path(&"/iam/users/current/phone_bindings".to_string());
        self.client.delete(&path, None, None).await
    }

    /// Users current phone Bindings create.
    pub async fn users_current_phone_bindings_create(&self, body: &std::collections::HashMap<String, serde_json::Value>) -> Result<std::collections::HashMap<String, serde_json::Value>, SdkworkError> {
        let path = app_path(&"/iam/users/current/phone_bindings".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

}

struct PathParameterSpec<'a> {
    name: &'a str,
    style: &'a str,
    explode: bool,
}

impl<'a> PathParameterSpec<'a> {
    fn new(name: &'a str, style: &'a str, explode: bool) -> Self {
        Self { name, style, explode }
    }
}

fn serialize_path_parameter<T: serde::Serialize>(value: T, spec: PathParameterSpec<'_>) -> String {
    let value = serde_json::to_value(value).unwrap_or(serde_json::Value::Null);
    if value.is_null() {
        return String::new();
    }
    let style = if spec.style.is_empty() { "simple" } else { spec.style };
    match value {
        serde_json::Value::Array(values) => serialize_path_array(spec.name, &values, style, spec.explode),
        serde_json::Value::Object(values) => serialize_path_object(spec.name, &values, style, spec.explode),
        value => format!("{}{}", path_primitive_prefix(spec.name, style), percent_encode(&primitive_to_string(&value))),
    }
}

fn serialize_path_array(name: &str, values: &[serde_json::Value], style: &str, explode: bool) -> String {
    let serialized = values
        .iter()
        .filter(|value| !value.is_null())
        .map(|value| percent_encode(&primitive_to_string(value)))
        .collect::<Vec<_>>();
    if serialized.is_empty() {
        return path_prefix(name, style);
    }
    if style == "matrix" {
        if explode {
            return serialized.iter().map(|item| format!(";{}={}", name, item)).collect::<Vec<_>>().join("");
        }
        return format!(";{}={}", name, serialized.join(","));
    }
    let separator = if explode { "." } else { "," };
    format!("{}{}", path_prefix(name, style), serialized.join(separator))
}

fn serialize_path_object(
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    style: &str,
    explode: bool,
) -> String {
    let mut entries = Vec::new();
    let mut exploded = Vec::new();
    for (key, value) in values {
        if value.is_null() {
            continue;
        }
        let escaped_key = percent_encode(key);
        let escaped_value = percent_encode(&primitive_to_string(value));
        if explode {
            if style == "matrix" {
                exploded.push(format!(";{}={}", escaped_key, escaped_value));
            } else {
                exploded.push(format!("{}={}", escaped_key, escaped_value));
            }
        } else {
            entries.push(escaped_key);
            entries.push(escaped_value);
        }
    }
    if style == "matrix" {
        if explode {
            return exploded.join("");
        }
        return format!(";{}={}", name, entries.join(","));
    }
    if explode {
        let separator = if style == "label" { "." } else { "," };
        return format!("{}{}", path_prefix(name, style), exploded.join(separator));
    }
    format!("{}{}", path_prefix(name, style), entries.join(","))
}

fn path_prefix(name: &str, style: &str) -> String {
    match style {
        "label" => ".".to_string(),
        "matrix" => format!(";{}", name),
        _ => String::new(),
    }
}

fn path_primitive_prefix(name: &str, style: &str) -> String {
    if style == "matrix" {
        format!(";{}=", name)
    } else {
        path_prefix(name, style)
    }
}


struct QueryParameterSpec<'a> {
    name: &'a str,
    value: serde_json::Value,
    style: &'a str,
    explode: bool,
    allow_reserved: bool,
    content_type: Option<&'a str>,
}

impl<'a> QueryParameterSpec<'a> {
    fn new<T: serde::Serialize>(
        name: &'a str,
        value: T,
        style: &'a str,
        explode: bool,
        allow_reserved: bool,
        content_type: Option<&'a str>,
    ) -> Self {
        Self {
            name,
            value: serde_json::to_value(value).unwrap_or(serde_json::Value::Null),
            style,
            explode,
            allow_reserved,
            content_type,
        }
    }
}

fn build_query_string(parameters: &[QueryParameterSpec<'_>]) -> String {
    let mut pairs = Vec::new();
    for parameter in parameters {
        append_serialized_parameter(&mut pairs, parameter);
    }
    pairs.join("&")
}

fn append_serialized_parameter(pairs: &mut Vec<String>, parameter: &QueryParameterSpec<'_>) {
    if parameter.value.is_null() {
        return;
    }
    if parameter.content_type.is_some() {
        pairs.push(format!(
            "{}={}",
            percent_encode(parameter.name),
            encode_query_value(&parameter.value.to_string(), parameter.allow_reserved)
        ));
        return;
    }

    let style = if parameter.style.is_empty() { "form" } else { parameter.style };
    match &parameter.value {
        serde_json::Value::Array(values) => append_array_parameter(pairs, parameter.name, values, style, parameter.explode, parameter.allow_reserved),
        serde_json::Value::Object(values) if style == "deepObject" => append_deep_object_parameter(pairs, parameter.name, values, parameter.allow_reserved),
        serde_json::Value::Object(values) => append_object_parameter(pairs, parameter.name, values, style, parameter.explode, parameter.allow_reserved),
        value => pairs.push(format!("{}={}", percent_encode(parameter.name), encode_query_value(&primitive_to_string(value), parameter.allow_reserved))),
    }
}

fn append_array_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &[serde_json::Value],
    style: &str,
    explode: bool,
    allow_reserved: bool,
) {
    let serialized = values.iter().filter(|value| !value.is_null()).map(primitive_to_string).collect::<Vec<_>>();
    if serialized.is_empty() {
        return;
    }
    if style == "form" && explode {
        for item in serialized {
            pairs.push(format!("{}={}", percent_encode(name), encode_query_value(&item, allow_reserved)));
        }
        return;
    }
    pairs.push(format!("{}={}", percent_encode(name), encode_query_value(&serialized.join(","), allow_reserved)));
}

fn append_object_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    style: &str,
    explode: bool,
    allow_reserved: bool,
) {
    let mut serialized = Vec::new();
    for (key, value) in values {
        if value.is_null() {
            continue;
        }
        if style == "form" && explode {
            pairs.push(format!("{}={}", percent_encode(key), encode_query_value(&primitive_to_string(value), allow_reserved)));
        } else {
            serialized.push(key.clone());
            serialized.push(primitive_to_string(value));
        }
    }
    if !serialized.is_empty() {
        pairs.push(format!("{}={}", percent_encode(name), encode_query_value(&serialized.join(","), allow_reserved)));
    }
}

fn append_deep_object_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    allow_reserved: bool,
) {
    for (key, value) in values {
        if !value.is_null() {
            pairs.push(format!("{}={}", percent_encode(&format!("{}[{}]", name, key)), encode_query_value(&primitive_to_string(value), allow_reserved)));
        }
    }
}

fn encode_query_value(value: &str, allow_reserved: bool) -> String {
    let mut encoded = percent_encode(value);
    if !allow_reserved {
        return encoded;
    }
    for (escaped, reserved) in [
        ("%3A", ":"), ("%2F", "/"), ("%3F", "?"), ("%23", "#"),
        ("%5B", "["), ("%5D", "]"), ("%40", "@"), ("%21", "!"),
        ("%24", "$"), ("%26", "&"), ("%27", "'"), ("%28", "("),
        ("%29", ")"), ("%2A", "*"), ("%2B", "+"), ("%2C", ","),
        ("%3B", ";"), ("%3D", "="),
    ] {
        encoded = encoded.replace(escaped, reserved);
    }
    encoded
}

fn primitive_to_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(value) => value.clone(),
        serde_json::Value::Number(value) => value.to_string(),
        serde_json::Value::Bool(value) => value.to_string(),
        other => other.to_string(),
    }
}

fn percent_encode(value: &str) -> String {
    value
        .bytes()
        .flat_map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                vec![byte as char]
            }
            _ => format!("%{:02X}", byte).chars().collect(),
        })
        .collect()
}
