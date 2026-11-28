#![allow(deprecated)]

use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use sdkwork_routes_iam_backend_api::{
    backend_routes, build_sdkwork_iam_backend_api_router, HttpMethod, HttpRoute, BACKEND_API_PREFIX,
};
use serde_json::{json, Value};
use tower::ServiceExt;

#[test]
fn exposes_standard_backend_prefix() {
    assert_eq!(BACKEND_API_PREFIX, "/backend/v3/api");
}

#[test]
fn exposes_surface_named_rust_integration_entrypoints() {
    let _backend_api_router = build_sdkwork_iam_backend_api_router();

    assert!(!backend_routes().is_empty());
}

#[test]
fn backend_routes_do_not_expose_login_or_session_creation() {
    let routes = backend_routes();

    assert!(routes
        .iter()
        .all(|route| !route.path.contains("/auth/sessions")));
    assert!(routes
        .iter()
        .all(|route| !route.path.contains("/auth/login")));
    assert!(routes.contains(&HttpRoute::dual_token(
        HttpMethod::Get,
        "/backend/v3/api/iam/users",
        "iam",
        "users.list",
    )));
    assert!(routes.contains(&HttpRoute::dual_token(
        HttpMethod::Get,
        "/backend/v3/api/iam/api_keys",
        "iam",
        "apiKeys.list",
    )));
    assert!(
        routes.iter().all(|route| {
            !route.operation_id.contains("sessions.create")
                && !route.operation_id.contains("miniProgramSessions.create")
                && !route.path.contains("/app/v3/api/oauth/sessions")
        }),
        "backend OAuth management routes must not create login sessions",
    );
}

#[test]
fn backend_routes_expose_standard_iam_oauth_management_surface() {
    let routes = backend_routes();

    assert!(
        routes.iter().all(|route| {
            !route.path.contains("client_secret") && !route.operation_id.contains("clientSecrets")
        }),
        "OAuth backend management must use iam.oauth.secrets, not clientSecrets",
    );

    for route in [
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/oauth/provider_catalog",
            "iam.oauth",
            "iam.oauth.providerCatalog.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Post,
            "/backend/v3/api/iam/oauth/integrations",
            "iam.oauth",
            "iam.oauth.integrations.create",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/oauth/clients",
            "iam.oauth",
            "iam.oauth.clients.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Post,
            "/backend/v3/api/iam/oauth/secrets",
            "iam.oauth",
            "iam.oauth.secrets.create",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/oauth/surfaces",
            "iam.oauth",
            "iam.oauth.surfaces.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/oauth/flow_configs",
            "iam.oauth",
            "iam.oauth.flowConfigs.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/oauth/scope_profiles",
            "iam.oauth",
            "iam.oauth.scopeProfiles.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/oauth/claim_mappings",
            "iam.oauth",
            "iam.oauth.claimMappings.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/oauth/policies",
            "iam.oauth",
            "iam.oauth.policies.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/oauth/tenant_bindings",
            "iam.oauth",
            "iam.oauth.tenantBindings.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/oauth/operator_platforms",
            "iam.oauth",
            "iam.oauth.operatorPlatforms.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Post,
            "/backend/v3/api/iam/oauth/operator_platforms/{operatorPlatformId}/pre_authorizations",
            "iam.oauth",
            "iam.oauth.operatorPlatforms.preAuthorizations.create",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/oauth/resource_accounts",
            "iam.oauth",
            "iam.oauth.resourceAccounts.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Post,
            "/backend/v3/api/iam/oauth/resource_accounts/{resourceAccountId}/mini_program_login_checks",
            "iam.oauth",
            "iam.oauth.resourceAccounts.miniProgramLoginChecks.create",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/oauth/resource_authorizations",
            "iam.oauth",
            "iam.oauth.resourceAuthorizations.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/oauth/webhook_configs",
            "iam.oauth",
            "iam.oauth.webhookConfigs.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/oauth/operational_resources",
            "iam.oauth",
            "iam.oauth.operationalResources.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/oauth/account_links",
            "iam.oauth",
            "iam.oauth.accountLinks.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/oauth/grants",
            "iam.oauth",
            "iam.oauth.grants.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/oauth/callback_events",
            "iam.oauth",
            "iam.oauth.callbackEvents.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Post,
            "/backend/v3/api/iam/oauth/diagnostic_runs",
            "iam.oauth",
            "iam.oauth.diagnosticRuns.create",
        ),
    ] {
        assert!(
            routes.contains(&route),
            "missing backend OAuth management route: {route:?}",
        );
    }
}

#[test]
fn backend_routes_expose_admin_organization_directory_reads() {
    let routes = backend_routes();

    for route in [
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/organizations",
            "iam",
            "organizations.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/organizations/tree",
            "iam",
            "organizations.tree.retrieve",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/organization_memberships",
            "iam",
            "organizationMemberships.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/departments",
            "iam",
            "departments.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/departments/tree",
            "iam",
            "departments.tree.retrieve",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/department_assignments",
            "iam",
            "departmentAssignments.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/positions",
            "iam",
            "positions.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/position_assignments",
            "iam",
            "positionAssignments.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/role_bindings",
            "iam",
            "roleBindings.list",
        ),
    ] {
        assert!(
            routes.contains(&route),
            "missing backend IAM directory read route: {route:?}"
        );
    }
}

#[test]
fn backend_routes_expose_installation_readiness_and_reconcile() {
    let routes = backend_routes();

    for route in [
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/installations/{installationId}/readiness",
            "iam",
            "installations.readiness.retrieve",
        ),
        HttpRoute::bootstrap_body(
            HttpMethod::Post,
            "/backend/v3/api/iam/installations/{installationId}/reconcile",
            "iam",
            "installations.reconcile",
        )
        .with_required_permission("iam.installations.reconcile"),
    ] {
        assert!(
            routes.contains(&route),
            "missing installation readiness/reconcile route: {route:?}"
        );
    }
}

#[test]
fn backend_routes_expose_installation_environment_and_credential_management() {
    let routes = backend_routes();

    for route in [
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/environments",
            "iam",
            "installations.environments.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Put,
            "/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/environments/{environmentKey}",
            "iam",
            "installations.environments.update",
        ),
        HttpRoute::dual_token(
            HttpMethod::Delete,
            "/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/environments/{environmentKey}",
            "iam",
            "installations.environments.delete",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/credentials",
            "iam",
            "installations.credentials.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Post,
            "/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/credentials",
            "iam",
            "installations.credentials.create",
        ),
        HttpRoute::dual_token(
            HttpMethod::Post,
            "/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/credentials/{credentialId}/rotate",
            "iam",
            "installations.credentials.rotate",
        ),
        HttpRoute::dual_token(
            HttpMethod::Post,
            "/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/credentials/{credentialId}/revoke",
            "iam",
            "installations.credentials.revoke",
        ),
    ] {
        assert!(
            routes.contains(&route),
            "missing installation environment/credential route: {route:?}"
        );
    }
}

#[test]
fn permission_resource_route_precedes_the_permission_detail_route() {
    let routes = backend_routes();
    let resource_route = HttpRoute::dual_token(
        HttpMethod::Get,
        "/backend/v3/api/iam/permissions/resources",
        "iam",
        "permissions.resources.list",
    );
    let detail_route = HttpRoute::dual_token(
        HttpMethod::Get,
        "/backend/v3/api/iam/permissions/{permissionId}",
        "iam",
        "permissions.retrieve",
    );
    let resource_index = routes
        .iter()
        .position(|route| route == &resource_route)
        .expect("permission resource list route");
    let detail_index = routes
        .iter()
        .position(|route| route == &detail_route)
        .expect("permission detail route");

    assert!(
        resource_index < detail_index,
        "the static /permissions/resources route must precede /permissions/{{permissionId}}"
    );
    assert_eq!(
        routes
            .iter()
            .filter(|route| route.operation_id == "permissions.resources.list")
            .count(),
        1,
        "permission resource list must be registered exactly once"
    );

    let management_source = include_str!("../src/management.rs");
    let runtime_resource_index = management_source
        .find("\"/backend/v3/api/iam/permissions/resources\"")
        .expect("runtime permission resource route");
    let runtime_detail_index = management_source
        .find("\"/backend/v3/api/iam/permissions/{permissionId}\"")
        .expect("runtime permission detail route");
    assert!(
        runtime_resource_index < runtime_detail_index,
        "the executable router must also register the static resource route first"
    );
}

#[test]
fn permission_resource_openapi_uses_the_typed_string_int64_response() {
    let document = backend_openapi();
    let operation = &document["paths"]["/backend/v3/api/iam/permissions/resources"]["get"];
    assert_eq!(operation["operationId"], "permissions.resources.list");
    assert_eq!(
        operation["responses"]["200"]["content"]["application/json"]["schema"]["$ref"],
        "#/components/schemas/IamPermissionResourceListResponse"
    );

    let response = &document["components"]["schemas"]["IamPermissionResourceListResponse"];
    assert_eq!(
        response["allOf"][0]["$ref"],
        "#/components/schemas/SdkWorkApiResponse"
    );
    let data = &response["allOf"][1]["properties"]["data"];
    assert_eq!(data["type"], "object");
    assert_eq!(data["required"], json!(["items", "pageInfo"]));
    assert_eq!(
        data["properties"]["items"]["items"]["$ref"],
        "#/components/schemas/IamPermissionResource"
    );
    assert_eq!(
        data["properties"]["pageInfo"]["$ref"],
        "#/components/schemas/PageInfo"
    );

    let permission_count = &document["components"]["schemas"]["IamPermissionResource"]
        ["properties"]["permissionCount"];
    assert_eq!(permission_count["type"], "string");
    assert_eq!(permission_count["format"], "int64");
    assert_eq!(permission_count["pattern"], "^[0-9]+$");
    assert_eq!(permission_count["x-sdkwork-int64-string"], true);
}

#[test]
fn permission_list_openapi_filters_use_snake_case_without_pagination_aliases() {
    let document = backend_openapi();

    for (path, operation_id, expected_query_names) in [
        (
            "/backend/v3/api/iam/permissions/resources",
            "permissions.resources.list",
            vec!["cursor", "page", "page_size", "q", "sort"],
        ),
        (
            "/backend/v3/api/iam/permissions",
            "permissions.list",
            vec![
                "assigned",
                "cursor",
                "page",
                "page_size",
                "q",
                "resource",
                "role_id",
                "sort",
            ],
        ),
        (
            "/backend/v3/api/iam/roles/{roleId}/permissions",
            "roles.permissions.list",
            vec!["cursor", "page", "page_size", "q", "resource", "sort"],
        ),
    ] {
        let operation = &document["paths"][path]["get"];
        assert_eq!(operation["operationId"], operation_id);
        let parameters = operation["parameters"]
            .as_array()
            .unwrap_or_else(|| panic!("{operation_id} parameters"));
        let mut query_names = parameters
            .iter()
            .filter(|parameter| parameter["in"] == "query")
            .filter_map(|parameter| parameter["name"].as_str())
            .collect::<Vec<_>>();
        query_names.sort_unstable();
        assert_eq!(
            query_names, expected_query_names,
            "{operation_id} must expose only canonical HTTP query names"
        );

        let page_size = parameters
            .iter()
            .find(|parameter| parameter["name"] == "page_size")
            .unwrap_or_else(|| panic!("{operation_id} page_size parameter"));
        assert_eq!(page_size["in"], "query");
        assert_eq!(page_size["schema"]["type"], "integer");
        assert_eq!(page_size["schema"]["minimum"], 1);
        assert_eq!(page_size["schema"]["maximum"], 200);
        assert_eq!(page_size["schema"]["default"], 20);
    }

    let role_permission_parameters = document["paths"]
        ["/backend/v3/api/iam/roles/{roleId}/permissions"]["get"]["parameters"]
        .as_array()
        .expect("role permission list parameters");
    let role_resource = role_permission_parameters
        .iter()
        .find(|parameter| parameter["name"] == "resource")
        .expect("roles.permissions.list resource filter");
    assert_eq!(role_resource["in"], "query");
    assert_eq!(role_resource["schema"]["type"], "string");

    let permission_parameters = document["paths"]["/backend/v3/api/iam/permissions"]["get"]
        ["parameters"]
        .as_array()
        .expect("permission list parameters");
    for (name, schema_type) in [
        ("resource", "string"),
        ("role_id", "string"),
        ("assigned", "boolean"),
    ] {
        let parameter = permission_parameters
            .iter()
            .find(|parameter| parameter["name"] == name)
            .unwrap_or_else(|| panic!("permissions.list {name} filter"));
        assert_eq!(parameter["in"], "query");
        assert_eq!(parameter["schema"]["type"], schema_type);
    }
}

fn backend_openapi() -> Value {
    serde_json::from_str(include_str!(
        "../../../apis/backend-api/iam/sdkwork-iam-backend-api.openapi.yaml"
    ))
    .expect("the IAM backend-api OpenAPI authority is JSON content despite its .yaml extension")
}

#[test]
fn backend_route_manifest_matches_the_standard_management_operation_surface() {
    let mut operation_ids: Vec<&str> = backend_routes()
        .iter()
        .filter(|route| !route.operation_id.starts_with("iam.oauth."))
        .map(|route| route.operation_id)
        .collect();
    operation_ids.sort();

    assert_eq!(
        operation_ids,
        vec![
            "accessCredentials.create",
            "accountBindingPolicy.retrieve",
            "accountBindingPolicy.update",
            "apiKeys.create",
            "apiKeys.list",
            "apiKeys.revoke",
            "apiKeys.rotate",
            "auditEvents.list",
            "auditEvents.retrieve",
            "departmentAssignments.create",
            "departmentAssignments.list",
            "departmentAssignments.update",
            "departments.create",
            "departments.delete",
            "departments.list",
            "departments.retrieve",
            "departments.tree.retrieve",
            "departments.update",
            "enterpriseGrants.list",
            "enterpriseOrderAuthorizations.create",
            "enterpriseOrderTerminations.create",
            "enterpriseOrders.cancel",
            "enterpriseOrders.create",
            "enterpriseOrders.events.list",
            "enterpriseOrders.list",
            "enterpriseOrders.retrieve",
            "enterpriseOrders.terminate",
            "enterpriseOrders.update",
            "enterpriseSeatBlacklist.create",
            "enterpriseSeatBlacklist.delete",
            "enterpriseSeatBlacklist.list",
            "enterpriseSeatPolicies.create",
            "enterpriseSeatPolicies.delete",
            "enterpriseSeatPolicies.list",
            "enterpriseSeatPolicies.retrieve",
            "enterpriseSeatPolicies.update",
            "enterpriseSeats.bulkRelease",
            "enterpriseSeats.create",
            "enterpriseSeats.delete",
            "enterpriseSeats.export",
            "enterpriseSeats.list",
            "groups.create",
            "groups.delete",
            "groups.list",
            "groups.members.create",
            "groups.members.delete",
            "groups.members.list",
            "groups.retrieve",
            "groups.update",
            "installations.create",
            "installations.credentials.create",
            "installations.credentials.list",
            "installations.credentials.policy.update",
            "installations.credentials.revoke",
            "installations.credentials.rotate",
            "installations.enable",
            "installations.environments.delete",
            "installations.environments.list",
            "installations.environments.update",
            "installations.list",
            "installations.management.byDeployApplication.disable",
            "installations.management.create",
            "installations.management.disable",
            "installations.management.enable",
            "installations.management.update",
            "installations.readiness.retrieve",
            "installations.reconcile",
            "installations.retrieve",
            "installations.summary.retrieve",
            "installations.update",
            "organizationMemberships.create",
            "organizationMemberships.departments.update",
            "organizationMemberships.list",
            "organizationMemberships.roster.list",
            "organizationMemberships.update",
            "organizations.create",
            "organizations.delete",
            "organizations.list",
            "organizations.retrieve",
            "organizations.tree.retrieve",
            "organizations.update",
            "permissions.create",
            "permissions.delete",
            "permissions.list",
            "permissions.resources.list",
            "permissions.retrieve",
            "permissions.update",
            "policies.create",
            "policies.delete",
            "policies.list",
            "policies.retrieve",
            "policies.update",
            "positionAssignments.create",
            "positionAssignments.list",
            "positionAssignments.update",
            "positions.create",
            "positions.delete",
            "positions.list",
            "positions.update",
            "providerAccounts.create",
            "providerAccounts.credentials.create",
            "providerAccounts.credentials.list",
            "providerAccounts.credentials.reveal.retrieve",
            "providerAccounts.default",
            "providerAccounts.delete",
            "providerAccounts.list",
            "providerAccounts.resolve.retrieve",
            "providerAccounts.retrieve",
            "providerAccounts.update",
            "providerCredentials.revoke",
            "publisherEnterpriseOrders.retrieve",
            "roleBindings.create",
            "roleBindings.delete",
            "roleBindings.list",
            "roleBindings.update",
            "roles.create",
            "roles.delete",
            "roles.list",
            "roles.permissions.create",
            "roles.permissions.delete",
            "roles.permissions.list",
            "roles.retrieve",
            "roles.update",
            "securityEvents.list",
            "securityEvents.retrieve",
            "serviceAccountCredentials.revoke",
            "serviceAccountTokens.create",
            "serviceAccounts.create",
            "serviceAccounts.credentials.create",
            "serviceAccounts.delete",
            "serviceAccounts.list",
            "serviceAccounts.retrieve",
            "serviceAccounts.update",
            "tenants.create",
            "tenants.delete",
            "tenants.list",
            "tenants.members.create",
            "tenants.members.delete",
            "tenants.members.list",
            "tenants.members.update",
            "tenants.retrieve",
            "tenants.update",
            "users.ban",
            "users.create",
            "users.delete",
            "users.list",
            "users.retrieve",
            "users.unban",
            "users.update",
        ]
    );
    assert!(!operation_ids.contains(&"users.current.retrieve"));
    assert!(!operation_ids.contains(&"users.roles.create"));
    assert!(!operation_ids.contains(&"users.roles.delete"));
    assert!(!operation_ids.contains(&"users.roles.list"));
    // Application templates are retired, so registering a template is not an
    // operation any more: an installation is provisioned from the deploy
    // application it serves.
    assert!(
        !operation_ids.contains(&"applications.register"),
        "applications.register must stay retired; provision a tenant application instead"
    );
    assert!(
        backend_routes()
            .iter()
            .all(|route| !route.path.contains("/iam/applications/register")),
        "the retired application-template register route must not be served"
    );
    assert!(
        backend_routes()
            .iter()
            .all(|route| !route.path.contains("/users/{userId}/roles")),
        "direct user-role backend routes must be retired; use /iam/role_bindings"
    );
}

#[test]
fn service_account_token_exchange_is_a_credential_entry_route() {
    use sdkwork_web_contract::RouteAuth;

    let routes = backend_routes();
    let route = routes
        .iter()
        .find(|route| route.operation_id == "serviceAccountTokens.create")
        .expect("service account token exchange route");
    assert!(route.auth.skips_credential_resolution());
    assert_eq!(RouteAuth::BootstrapBody, route.auth);
    assert!(route.forbid_credential_headers);
}

#[test]
fn role_binding_update_route_requires_the_dedicated_update_permission() {
    use sdkwork_routes_iam_backend_api::iam_backend_enriched_routes;

    let route = iam_backend_enriched_routes()
        .into_iter()
        .find(|route| route.operation_id == "roleBindings.update")
        .expect("role binding update route");
    assert_eq!(route.method, HttpMethod::Patch);
    assert_eq!(
        route.path,
        "/backend/v3/api/iam/role_bindings/{roleBindingId}"
    );
    assert_eq!(route.required_permission, Some("iam.role_bindings.update"));
    assert!(!route.auth.skips_credential_resolution());
}

#[test]
fn enterprise_seat_management_routes_use_their_server_side_permission_boundary() {
    use sdkwork_routes_iam_backend_api::iam_backend_enriched_routes;

    let routes = iam_backend_enriched_routes();
    for operation_id in [
        "enterpriseOrders.update",
        "enterpriseSeatPolicies.list",
        "enterpriseSeatPolicies.retrieve",
        "enterpriseSeatPolicies.create",
        "enterpriseSeatPolicies.update",
        "enterpriseSeatPolicies.delete",
        "enterpriseSeatBlacklist.list",
        "enterpriseSeatBlacklist.create",
        "enterpriseSeatBlacklist.delete",
        "enterpriseSeats.bulkRelease",
    ] {
        let route = routes
            .iter()
            .find(|route| route.operation_id == operation_id)
            .unwrap_or_else(|| panic!("missing route {operation_id}"));
        assert_eq!(
            route.required_permission,
            Some("iam.enterprise_orders.manage"),
            "{operation_id}"
        );
    }
    let export = routes
        .iter()
        .find(|route| route.operation_id == "enterpriseSeats.export")
        .expect("seat export route");
    assert_eq!(
        export.required_permission,
        Some("iam.enterprise_seats.export")
    );
}

#[test]
fn enriched_backend_routes_declare_required_permissions_for_protected_operations() {
    use sdkwork_routes_iam_backend_api::{
        iam_backend_enriched_routes, iam_backend_permission_for_operation,
    };

    for route in iam_backend_enriched_routes() {
        if route.auth.skips_credential_resolution() {
            continue;
        }
        // A `None` mapping is deliberate for tenant-owned account maintenance:
        // the route then requires only an authenticated principal.
        let expected = iam_backend_permission_for_operation(route.operation_id);
        assert_eq!(
            route.required_permission, expected,
            "route {} must declare the mapped required_permission",
            route.operation_id
        );
    }
}

#[test]
fn oauth_account_maintenance_routes_need_only_a_principal() {
    use sdkwork_routes_iam_backend_api::iam_backend_enriched_routes;

    let routes = iam_backend_enriched_routes();
    for operation_id in [
        "iam.oauth.resourceAccounts.list",
        "iam.oauth.resourceAccounts.create",
        "iam.oauth.resourceAccounts.update",
        "iam.oauth.resourceAccounts.delete",
        "iam.oauth.integrations.list",
        "iam.oauth.integrations.retrieve",
        "iam.oauth.integrations.create",
        "iam.oauth.integrations.update",
    ] {
        let route = routes
            .iter()
            .find(|route| route.operation_id == operation_id)
            .unwrap_or_else(|| panic!("missing route {operation_id}"));
        assert_eq!(
            route.required_permission, None,
            "{operation_id} must be reachable by any signed-in member"
        );
    }

    // Deleting a login integration remains privileged: it is tenant-wide
    // login plumbing, not account maintenance.
    let delete = routes
        .iter()
        .find(|route| route.operation_id == "iam.oauth.integrations.delete")
        .expect("integration delete route");
    assert_eq!(delete.required_permission, Some("iam.oauth.manage"));

    // Enterprise OAuth configuration (policies, provider catalog, secrets,
    // tenants) keeps its seeded permission codes.
    let gated = routes
        .iter()
        .find(|route| route.operation_id == "iam.oauth.policies.list")
        .expect("policies route");
    assert_eq!(gated.required_permission, Some("iam.oauth.read"));
}

#[test]
fn backend_router_source_does_not_embed_demo_iam_data() {
    let source = include_str!("../src/routes.rs");

    for forbidden in [
        "t_demo",
        "org_demo",
        "dept_demo",
        "membership_demo",
        "Local Admin",
        "sk-local-admin",
    ] {
        assert!(
            !source.contains(forbidden),
            "backend IAM router source must not embed demo data token {forbidden}"
        );
    }
}

#[tokio::test]
async fn backend_router_does_not_serve_demo_management_data_without_real_backend() {
    let router = build_sdkwork_iam_backend_api_router();

    for (method, path, body) in [
        (Method::GET, "/backend/v3/api/iam/organizations/tree", None),
        (Method::GET, "/backend/v3/api/iam/departments/tree", None),
        (Method::GET, "/backend/v3/api/iam/roles", None),
        (Method::GET, "/backend/v3/api/iam/permissions", None),
        (Method::GET, "/backend/v3/api/iam/users", None),
        (
            Method::POST,
            "/backend/v3/api/iam/users",
            Some(r#"{"email":"new-user@example.com"}"#),
        ),
        (
            Method::PATCH,
            "/backend/v3/api/iam/users/user_new_user_example_com",
            Some(r#"{"displayName":"Updated User"}"#),
        ),
        (
            Method::POST,
            "/backend/v3/api/iam/organizations",
            Some(r#"{"name":"New Organization"}"#),
        ),
        (
            Method::PATCH,
            "/backend/v3/api/iam/organizations/org-real",
            Some(r#"{"name":"Updated Organization"}"#),
        ),
        (
            Method::PATCH,
            "/backend/v3/api/iam/role_bindings/iamrb-real",
            Some(r#"{"effect":"deny","effectiveTo":null}"#),
        ),
        (
            Method::DELETE,
            "/backend/v3/api/iam/role_bindings/iamrb-real",
            None,
        ),
        (
            Method::DELETE,
            "/backend/v3/api/iam/organizations/org-real",
            None,
        ),
    ] {
        let (status, body_text, payload) =
            request_backend_route(router.clone(), method.clone(), path, body).await;

        assert_ne!(
            StatusCode::OK,
            status,
            "{method} {path} must not be served by appbase demo backend: {body_text}"
        );
        assert_ne!(
            Some(0),
            payload["code"].as_i64(),
            "{method} {path} must not return a success envelope without a real backend"
        );
        for forbidden in [
            "t_demo",
            "org_demo",
            "dept_demo",
            "membership_demo",
            "Local Admin",
            "sk-local-admin",
        ] {
            assert!(
                !body_text.contains(forbidden),
                "{method} {path} must not expose demo IAM token {forbidden}: {body_text}"
            );
        }
    }
}

async fn request_backend_route(
    router: axum::Router,
    method: Method,
    path: &str,
    body: Option<&str>,
) -> (StatusCode, String, Value) {
    let response = router
        .oneshot(
            Request::builder()
                .method(method)
                .uri(path)
                .header("content-type", "application/json")
                .body(Body::from(body.unwrap_or_default().to_owned()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let body_text = String::from_utf8(bytes.to_vec()).unwrap();
    let payload = serde_json::from_str(&body_text).unwrap_or(Value::Null);
    (status, body_text, payload)
}
