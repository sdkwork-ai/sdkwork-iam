//! Release scope of an installation, executed against a real PostgreSQL instance.
//!
//! `APPLICATION_IDENTITY_SPEC.md` section 4.1 makes the release scope a stored,
//! immutable property of one installation, and `IAM_SPEC.md` section 3 makes the
//! database enforce the scope/pointer agreement. The pure rules are unit-tested in
//! `application_scope`; this file proves the parts only a database can prove:
//!
//! * provisioning defaults to `TENANT` and persists the requested level,
//! * a mismatched scope/organization/owner request is refused before any write,
//! * a re-provision cannot change the level (the row is immutable),
//! * the resolver returns the stored level for the token anchor,
//! * a public application access token binds a `USER` installation to its owner
//!   and keeps `TENANT`/`ORGANIZATION` tokens on the shared `system` subject,
//! * the CHECK constraints refuse a hand-written row that contradicts its scope.
//!
//! Run with a migrated database:
//!
//! ```text
//! SDKWORK_DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/db \
//!   cargo test -p sdkwork-iam-web-adapter --test installation_ownership_scope_postgres -- --ignored
//! ```
//!
//! Every test skips (returns) when `SDKWORK_DATABASE_URL` is unset, or when
//! migration 0044 has not been applied, so the suite reports the reason instead
//! of failing on provisioning.

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use sdkwork_iam_context_service::{AuthLevel, IamPrincipalKind, LoginScope};
use sdkwork_iam_web_adapter::{
    enable_tenant_application, issue_standalone_bootstrap_access_credential,
    provision_tenant_application, resolve_application_access_token_context,
    resolve_installation_ownership_scope, try_resolve_application_access_token_context,
    ApplicationOwnershipScope, TenantApplicationProvisionCommand,
};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::collections::HashMap;

fn database_url() -> Option<String> {
    std::env::var("SDKWORK_DATABASE_URL")
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

async fn connect() -> Option<PgPool> {
    let url = database_url()?;
    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect(&url)
        .await
        .ok()?;
    let migrated: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::BIGINT FROM information_schema.columns \
         WHERE table_name = 'iam_application_installation' AND column_name = 'ownership_scope'",
    )
    .fetch_one(&pool)
    .await
    .ok()?;
    if migrated == 0 {
        eprintln!("skipping: migration 0044 has not been applied");
        return None;
    }
    Some(pool)
}

fn unique_id(prefix: &str) -> String {
    format!("{prefix}_{}", uuid::Uuid::now_v7().simple())
}

/// Tenant plus the root organization and one scoped organization.
async fn seed_tenant(pg: &PgPool) -> (String, String, String, String) {
    let tenant_id = unique_id("tenant");
    let user_id = unique_id("user");
    let organization_id = "4200".to_owned();
    sqlx::query(
        "INSERT INTO iam_tenant (id, code, name, status, created_at, updated_at) \
         VALUES ($1, $1, 'Scope verify', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    )
    .bind(&tenant_id)
    .execute(pg)
    .await
    .expect("insert tenant");
    sqlx::query(
        "INSERT INTO iam_organization \
         (id, tenant_id, parent_organization_id, code, name, path, status, organization_kind, \
          tenant_boundary_kind, data_boundary_kind, app_boundary_enabled, verification_status, \
          created_at, updated_at) \
         VALUES ('0', $1, NULL, 'root', 'Root', '/0', 'active', 'team', 'exclusive', 'tenant', 0, \
                 'verified', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), \
                ($2, $1, '0', 'scoped', 'Scoped', '/0/4200', 'active', 'team', 'exclusive', \
                 'tenant', 0, 'verified', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    )
    .bind(&tenant_id)
    .bind(&organization_id)
    .execute(pg)
    .await
    .expect("insert organizations");
    sqlx::query(
        "INSERT INTO iam_user \
         (id, tenant_id, username, display_name, email, status, created_at, updated_at, locale, \
          timezone, source, is_deleted) \
         VALUES ($2, $1, $2, 'Owner', $3, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'en-US', \
                 'UTC', 'scope-verify', 0)",
    )
    .bind(&tenant_id)
    .bind(&user_id)
    .bind(format!("{user_id}@example.test"))
    .execute(pg)
    .await
    .expect("insert user");
    (tenant_id, user_id, organization_id, unique_id("cleanup"))
}

fn command(
    tenant_id: &str,
    organization_id: &str,
    scope: Option<&str>,
    owner_user_id: Option<&str>,
) -> TenantApplicationProvisionCommand {
    TenantApplicationProvisionCommand {
        tenant_id: tenant_id.to_owned(),
        organization_id: organization_id.to_owned(),
        app_id: None,
        instance_key: unique_id("instance"),
        display_name: "Scope verify".to_owned(),
        environment: "production".to_owned(),
        application_type: Some("pc".to_owned()),
        primary_domain: Some(format!("{}.example.test", unique_id("domain"))),
        access_permissions: vec!["iam.self".to_owned()],
        runtime_config: serde_json::json!({}),
        deploy_application_id: Some(unique_id("deploy")),
        ownership_scope: scope.map(str::to_owned),
        owner_user_id: owner_user_id.map(str::to_owned),
        provisioning_idempotency_key: Some(unique_id("idem")),
    }
}

/// A unique *numeric* user id: the public application token's `user_id` claim
/// must be a positive decimal snowflake (`IAM_SPEC.md` §5.2), so the fixtures for
/// that path cannot reuse [`unique_id`].
fn unique_numeric_user_id() -> String {
    let raw = (uuid::Uuid::now_v7().as_u128() % 9_000_000_000_000) + 1_000_000_000_000;
    raw.to_string()
}

async fn seed_user(pg: &PgPool, tenant_id: &str, user_id: &str) {
    sqlx::query(
        "INSERT INTO iam_user \
         (id, tenant_id, username, display_name, email, status, created_at, updated_at, locale, \
          timezone, source, is_deleted) \
         VALUES ($2, $1, $2, 'Owner', $3, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'en-US', \
                 'UTC', 'scope-verify', 0)",
    )
    .bind(tenant_id)
    .bind(user_id)
    .bind(format!("{user_id}@example.test"))
    .execute(pg)
    .await
    .expect("insert user");
}

/// Builds the public application access token the specs materializer emits for
/// one installation (`APP_ACCESS_TOKEN_SPEC.md` §3.2.1).
fn public_application_token(
    tenant_id: &str,
    deploy_application_id: &str,
    organization_id: &str,
    ownership_scope: &str,
    user_id: Option<&str>,
) -> String {
    let encode = |value: &serde_json::Value| {
        URL_SAFE_NO_PAD.encode(serde_json::to_vec(value).expect("json"))
    };
    let header = serde_json::json!({ "alg": "none", "kid": "public-app-token", "typ": "JWT" });
    let mut payload = serde_json::json!({
        "app_id": deploy_application_id,
        "aud": deploy_application_id,
        "deployment_mode": "private",
        "deployment_profile": "standalone",
        "environment": "production",
        "exp": 0,
        "iss": "sdkwork-iam-public",
        "login_scope": if organization_id == "0" { "TENANT" } else { "ORGANIZATION" },
        "organization_id": organization_id,
        "ownership_scope": ownership_scope,
        "session_id": format!("bootstrap-public-{deploy_application_id}-standalone.production"),
        "tenant_id": tenant_id,
        "token_class": "application",
        "token_type": "access",
        "token_version": 1,
    });
    match user_id {
        Some(value) => payload["user_id"] = serde_json::json!(value),
        None => {
            payload.as_object_mut().expect("object").remove("user_id");
        }
    }
    format!("{}.{}.public", encode(&header), encode(&payload))
}

async fn cleanup(pg: &PgPool, tenant_id: &str) {
    // Sessions first: they reference the tenant users the fixtures create, and
    // the synthetic `system` principal of the bootstrap path is global
    // (`iam_user.id` is the primary key), so a leftover row would block the next
    // run of this suite.
    let _ = sqlx::query("DELETE FROM iam_session WHERE tenant_id = $1")
        .bind(tenant_id)
        .execute(pg)
        .await;
    let _ = sqlx::query("DELETE FROM iam_tenant_signing_key WHERE tenant_id = $1")
        .bind(tenant_id)
        .execute(pg)
        .await;
    let _ = sqlx::query("DELETE FROM iam_application_installation WHERE tenant_id = $1")
        .bind(tenant_id)
        .execute(pg)
        .await;
    let _ = sqlx::query("DELETE FROM iam_user WHERE tenant_id = $1")
        .bind(tenant_id)
        .execute(pg)
        .await;
    let _ = sqlx::query("DELETE FROM iam_organization WHERE tenant_id = $1")
        .bind(tenant_id)
        .execute(pg)
        .await;
    let _ = sqlx::query("DELETE FROM iam_tenant WHERE id = $1")
        .bind(tenant_id)
        .execute(pg)
        .await;
}

#[tokio::test]
#[ignore = "requires a migrated PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn provisioning_defaults_to_tenant_and_persists_the_requested_level() {
    let Some(pg) = connect().await else {
        return;
    };
    let (tenant_id, user_id, organization_id, _) = seed_tenant(&pg).await;

    // No ownershipScope: the default is TENANT with the sentinel organization.
    let defaulted = provision_tenant_application(&pg, &command(&tenant_id, "0", None, None))
        .await
        .expect("default provisioning");
    assert_eq!(defaulted.ownership_scope, ApplicationOwnershipScope::Tenant);
    assert_eq!(defaulted.owner_user_id, None);
    assert_eq!(defaulted.organization_id, "0");

    let organization = provision_tenant_application(
        &pg,
        &command(&tenant_id, &organization_id, Some("ORGANIZATION"), None),
    )
    .await
    .expect("organization provisioning");
    assert_eq!(
        organization.ownership_scope,
        ApplicationOwnershipScope::Organization
    );

    let personal =
        provision_tenant_application(&pg, &command(&tenant_id, "0", Some("USER"), Some(&user_id)))
            .await
            .expect("personal provisioning");
    assert_eq!(personal.ownership_scope, ApplicationOwnershipScope::User);
    assert_eq!(personal.owner_user_id.as_deref(), Some(user_id.as_str()));

    // The resolver reads the stored level for the token anchor.
    for application in [&defaulted, &organization, &personal] {
        let resolved = resolve_installation_ownership_scope(
            &pg,
            &tenant_id,
            application
                .deploy_application_id
                .as_deref()
                .expect("anchor"),
        )
        .await
        .expect("resolve scope")
        .expect("installation found");
        assert_eq!(resolved, application.ownership_scope);
    }

    cleanup(&pg, &tenant_id).await;
}

#[tokio::test]
#[ignore = "requires a migrated PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn a_mismatched_scope_request_is_refused_before_any_write() {
    let Some(pg) = connect().await else {
        return;
    };
    let (tenant_id, user_id, organization_id, _) = seed_tenant(&pg).await;

    for (scope, organization, owner) in [
        (Some("TENANT"), organization_id.as_str(), None),
        (Some("ORGANIZATION"), "0", None),
        (Some("USER"), "0", None),
        (
            Some("USER"),
            organization_id.as_str(),
            Some(user_id.as_str()),
        ),
        (Some("PLATFORM"), "0", None),
        (Some("TENANT"), "0", Some(user_id.as_str())),
    ] {
        let error =
            provision_tenant_application(&pg, &command(&tenant_id, organization, scope, owner))
                .await
                .expect_err("a mismatched scope request must fail closed");
        assert!(
            !error.is_empty(),
            "the refusal must name its reason for {scope:?}"
        );
    }

    let written: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::BIGINT FROM iam_application_installation WHERE tenant_id = $1",
    )
    .bind(&tenant_id)
    .fetch_one(&pg)
    .await
    .expect("count installations");
    assert_eq!(written, 0, "a refused command must not write a row");

    cleanup(&pg, &tenant_id).await;
}

#[tokio::test]
#[ignore = "requires a migrated PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn a_provisioned_scope_is_immutable() {
    let Some(pg) = connect().await else {
        return;
    };
    let (tenant_id, user_id, organization_id, _) = seed_tenant(&pg).await;

    let personal =
        provision_tenant_application(&pg, &command(&tenant_id, "0", Some("USER"), Some(&user_id)))
            .await
            .expect("personal provisioning");

    let mut widen = command(&tenant_id, "0", Some("TENANT"), None);
    widen.deploy_application_id = personal.deploy_application_id.clone();
    widen.instance_key = personal.instance_key.clone();
    let error = provision_tenant_application(&pg, &widen)
        .await
        .expect_err("a scope change must be a conflict");
    assert!(error.contains("immutable"), "{error}");
    assert!(error.contains("USER"), "{error}");

    // Re-provisioning without a declared scope keeps the stored level.
    let mut repeat = command(&tenant_id, "0", None, None);
    repeat.deploy_application_id = personal.deploy_application_id.clone();
    repeat.instance_key = personal.instance_key.clone();
    let repeated = provision_tenant_application(&pg, &repeat)
        .await
        .expect("idempotent re-provision");
    assert_eq!(repeated.ownership_scope, ApplicationOwnershipScope::User);
    assert_eq!(repeated.owner_user_id.as_deref(), Some(user_id.as_str()));

    // A different owner also conflicts.
    let mut other_owner = command(&tenant_id, "0", Some("USER"), Some("999999"));
    other_owner.deploy_application_id = personal.deploy_application_id.clone();
    other_owner.instance_key = personal.instance_key.clone();
    assert!(
        provision_tenant_application(&pg, &other_owner)
            .await
            .is_err(),
        "a different owner needs a new installation"
    );

    let _ = organization_id;
    cleanup(&pg, &tenant_id).await;
}

#[tokio::test]
#[ignore = "requires a migrated PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn bootstrap_issuance_signs_the_installation_scope_in_all_three_states() {
    let Some(pg) = connect().await else {
        return;
    };
    let (tenant_id, user_id, organization_id, _) = seed_tenant(&pg).await;

    let cases = [
        (None, "0", None, "TENANT", "0", None),
        (
            Some("ORGANIZATION"),
            organization_id.as_str(),
            None,
            "ORGANIZATION",
            organization_id.as_str(),
            None,
        ),
        (
            Some("USER"),
            "0",
            Some(user_id.as_str()),
            "USER",
            "0",
            Some(user_id.as_str()),
        ),
    ];

    for (scope, organization, owner, claim, claim_organization, claim_user) in cases {
        // A shared release is served by the tenant-scoped synthetic principal;
        // a personal release by the installation owner.
        let expected_user = claim_user
            .map(str::to_owned)
            .unwrap_or_else(|| format!("system:{tenant_id}"));
        let application =
            provision_tenant_application(&pg, &command(&tenant_id, organization, scope, owner))
                .await
                .expect("provision installation");
        enable_tenant_application(&pg, &tenant_id, &application.id)
            .await
            .expect("enable installation");

        let issued = issue_standalone_bootstrap_access_credential(
            &pg,
            &tenant_id,
            application
                .deploy_application_id
                .as_deref()
                .expect("deploy anchor"),
            None,
        )
        .await
        .expect("bootstrap issuance");

        assert_eq!(issued.ownership_scope.as_str(), claim);
        assert_eq!(issued.organization_id, claim_organization);

        let payload_segment = issued
            .access_credential
            .split('.')
            .nth(1)
            .expect("jwt payload segment");
        let claims: serde_json::Value = serde_json::from_slice(
            &URL_SAFE_NO_PAD
                .decode(payload_segment)
                .expect("payload decodes"),
        )
        .expect("payload parses");
        assert_eq!(claims["ownership_scope"], claim);
        assert_eq!(claims["organization_id"], claim_organization);
        assert_eq!(claims["user_id"], expected_user);
        // The synthetic principal row is tenant-scoped and stored exactly once
        // per tenant, even across the three issuances of this loop.
        let system_rows: i64 = sqlx::query_scalar(
            "SELECT COUNT(*)::bigint FROM iam_user WHERE tenant_id = $1 AND id = $2",
        )
        .bind(&tenant_id)
        .bind(&expected_user)
        .fetch_one(&pg)
        .await
        .expect("count the synthetic principal");
        assert_eq!(system_rows, 1, "the synthetic principal is stored once");
        assert_eq!(claims["app_id"], claims["aud"], "aud == app_id");
        assert_eq!(
            claims["app_id"],
            serde_json::json!(application.deploy_application_id.clone())
        );
        // The persisted session carries the same projection: the tenant key is
        // always present, and only an organization-level installation adds its
        // organization key (`APP_ACCESS_TOKEN_SPEC.md` §5,
        // `DATABASE_SPEC.md` §16).
        let stored_scope: String =
            sqlx::query_scalar("SELECT data_scope_json FROM iam_session WHERE id = $1")
                .bind(&issued.session_id)
                .fetch_one(&pg)
                .await
                .expect("the issued session persists its data scope");
        let stored_scope: Vec<String> =
            serde_json::from_str(&stored_scope).expect("the data scope is a string array");
        assert!(
            stored_scope.contains(&format!("tenant:{tenant_id}")),
            "every bootstrap credential keeps its tenant key: {stored_scope:?}"
        );
        let organization_scope = format!("organization:{claim_organization}");
        if claim == "ORGANIZATION" {
            assert!(
                stored_scope.contains(&organization_scope),
                "an organization credential must bind its organization: {stored_scope:?}"
            );
        } else {
            assert!(
                !stored_scope
                    .iter()
                    .any(|scope| scope.starts_with("organization:")),
                "a shared tenant or personal credential must not claim an organization: {stored_scope:?}"
            );
        }
    }

    cleanup(&pg, &tenant_id).await;
}

#[tokio::test]
#[ignore = "requires a migrated PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn every_tenant_gets_its_own_bootstrap_principal() {
    let Some(pg) = connect().await else {
        return;
    };
    let (first_tenant, ..) = seed_tenant(&pg).await;
    let (second_tenant, ..) = seed_tenant(&pg).await;
    let mut principals = Vec::new();
    for tenant_id in [&first_tenant, &second_tenant] {
        let application = provision_tenant_application(&pg, &command(tenant_id, "0", None, None))
            .await
            .expect("provision installation");
        enable_tenant_application(&pg, tenant_id, &application.id)
            .await
            .expect("enable installation");
        let issued = issue_standalone_bootstrap_access_credential(
            &pg,
            tenant_id,
            application
                .deploy_application_id
                .as_deref()
                .expect("deploy anchor"),
            None,
        )
        .await
        .expect("every tenant must be able to issue its bootstrap credential");
        let claims: serde_json::Value = serde_json::from_slice(
            &URL_SAFE_NO_PAD
                .decode(issued.access_credential.split('.').nth(1).expect("payload"))
                .expect("payload decodes"),
        )
        .expect("payload parses");
        principals.push(
            claims["user_id"]
                .as_str()
                .expect("bootstrap principal claim")
                .to_owned(),
        );
    }
    assert_eq!(principals[0], format!("system:{first_tenant}"));
    assert_eq!(principals[1], format!("system:{second_tenant}"));
    assert_ne!(
        principals[0], principals[1],
        "each tenant's synthetic principal is independent"
    );
    cleanup(&pg, &first_tenant).await;
    cleanup(&pg, &second_tenant).await;
}

#[tokio::test]
#[ignore = "requires a migrated PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn personal_issuance_fails_closed_when_the_owner_is_not_active() {
    let Some(pg) = connect().await else {
        return;
    };
    let (tenant_id, user_id, _, _) = seed_tenant(&pg).await;

    let application =
        provision_tenant_application(&pg, &command(&tenant_id, "0", Some("USER"), Some(&user_id)))
            .await
            .expect("personal installation");
    enable_tenant_application(&pg, &tenant_id, &application.id)
        .await
        .expect("enable installation");
    sqlx::query("UPDATE iam_user SET status = 'disabled' WHERE id = $1 AND tenant_id = $2")
        .bind(&user_id)
        .bind(&tenant_id)
        .execute(&pg)
        .await
        .expect("disable owner");

    let error = issue_standalone_bootstrap_access_credential(
        &pg,
        &tenant_id,
        application
            .deploy_application_id
            .as_deref()
            .expect("deploy anchor"),
        None,
    )
    .await
    .expect_err("a personal release must not credential a disabled owner");
    assert!(error.contains("owner"), "{error}");
    assert!(error.contains("not active"), "{error}");

    cleanup(&pg, &tenant_id).await;
}

#[tokio::test]
#[ignore = "requires a migrated PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn the_database_refuses_a_row_that_contradicts_its_scope() {
    let Some(pg) = connect().await else {
        return;
    };
    let (tenant_id, _, _, _) = seed_tenant(&pg).await;

    let mut violations: HashMap<&str, String> = HashMap::new();
    for (label, organization, scope, owner) in [
        ("tenant_with_organization", "4200", "TENANT", None::<&str>),
        ("organization_with_sentinel", "0", "ORGANIZATION", None),
        ("user_without_owner", "0", "USER", None),
        ("unknown_level", "0", "PLATFORM", None),
        ("tenant_with_owner", "0", "TENANT", Some("1")),
    ] {
        let result = sqlx::query(
            "INSERT INTO iam_application_installation \
             (id, app_id, tenant_id, organization_id, instance_key, display_name, environment, \
              application_type, status, created_at, updated_at, ownership_scope, owner_user_id) \
             VALUES ($1, $1, $2, $3, $1, 'x', 'production', 'pc', 'enabled', \
                     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $4, $5)",
        )
        .bind(unique_id("bad"))
        .bind(&tenant_id)
        .bind(organization)
        .bind(scope)
        .bind(owner)
        .execute(&pg)
        .await;
        if let Err(error) = result {
            violations.insert(label, error.to_string());
        }
    }
    assert_eq!(
        violations.len(),
        5,
        "every contradictory row must be refused: {violations:?}"
    );

    cleanup(&pg, &tenant_id).await;
}

/// `APPLICATION_IDENTITY_SPEC.md` §4.1 rule 10 and `APP_ACCESS_TOKEN_SPEC.md`
/// §3.2.1: a public application token of a `USER`-scoped installation must carry
/// the installation owner's `user_id`, and that owner becomes the credential's
/// subject. `TENANT` and `ORGANIZATION` releases keep the isolation-only
/// `system` subject and do not need the claim.
#[tokio::test]
#[ignore = "requires a migrated PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn a_public_token_binds_a_personal_installation_to_its_owner() {
    let Some(pg) = connect().await else {
        return;
    };
    let (tenant_id, _, organization_id, _) = seed_tenant(&pg).await;
    let owner_user_id = unique_numeric_user_id();
    seed_user(&pg, &tenant_id, &owner_user_id).await;

    // Tenant release: no `user_id` claim, historical `system` subject.
    let tenant_application =
        provision_tenant_application(&pg, &command(&tenant_id, "0", None, None))
            .await
            .expect("tenant provisioning");
    enable_tenant_application(&pg, &tenant_id, &tenant_application.id)
        .await
        .expect("enable tenant installation");
    let tenant_anchor = tenant_application
        .deploy_application_id
        .as_deref()
        .expect("tenant deploy anchor");
    let tenant_token = public_application_token(&tenant_id, tenant_anchor, "0", "TENANT", None);
    let tenant_context = try_resolve_application_access_token_context(&pg, &tenant_token)
        .await
        .expect("a tenant token without user_id stays accepted")
        .expect("tenant context");
    assert_eq!(tenant_context.user_id, "system");
    assert_eq!(
        tenant_context.principal_kind,
        IamPrincipalKind::ServiceAccount
    );
    assert_eq!(tenant_context.app_id, tenant_anchor);
    assert_eq!(tenant_context.organization_scope(), "0");
    assert!(tenant_context.permission_scope.is_empty());

    // Organization release: no `user_id` claim, unchanged as well.
    let organization_application = provision_tenant_application(
        &pg,
        &command(&tenant_id, &organization_id, Some("ORGANIZATION"), None),
    )
    .await
    .expect("organization provisioning");
    enable_tenant_application(&pg, &tenant_id, &organization_application.id)
        .await
        .expect("enable organization installation");
    let organization_anchor = organization_application
        .deploy_application_id
        .as_deref()
        .expect("organization deploy anchor");
    let organization_token = public_application_token(
        &tenant_id,
        organization_anchor,
        &organization_id,
        "ORGANIZATION",
        None,
    );
    let organization_context =
        try_resolve_application_access_token_context(&pg, &organization_token)
            .await
            .expect("an organization token without user_id stays accepted")
            .expect("organization context");
    assert_eq!(organization_context.user_id, "system");
    assert_eq!(
        organization_context.principal_kind,
        IamPrincipalKind::ServiceAccount
    );
    assert_eq!(organization_context.organization_scope(), organization_id);
    // Organization isolation reaches downstream filtering: an organization-level
    // token carries `organization:<id>` beside the tenant key, exactly like a
    // session token, and the tenant-level token above carries no organization key.
    assert!(
        organization_context
            .data_scope
            .contains(&format!("organization:{organization_id}")),
        "the organization scope must reach downstream filtering: {:?}",
        organization_context.data_scope
    );
    assert!(
        !tenant_context
            .data_scope
            .iter()
            .any(|scope| scope.starts_with("organization:")),
        "a tenant-level token must not claim an organization scope: {:?}",
        tenant_context.data_scope
    );

    // The two levels are not interchangeable. A credential whose claims name the
    // wrong level, or another organization, must not resolve the installation.
    let tenant_claim_on_org_anchor =
        public_application_token(&tenant_id, organization_anchor, "0", "TENANT", None);
    assert!(
        try_resolve_application_access_token_context(&pg, &tenant_claim_on_org_anchor)
            .await
            .expect("a scope contradiction is reported as unresolved, not as an error")
            .is_none(),
        "a tenant-level token must not resolve an organization installation"
    );
    let organization_claim_on_tenant_anchor = public_application_token(
        &tenant_id,
        tenant_anchor,
        &organization_id,
        "ORGANIZATION",
        None,
    );
    assert!(
        try_resolve_application_access_token_context(&pg, &organization_claim_on_tenant_anchor)
            .await
            .expect("a scope contradiction is reported as unresolved, not as an error")
            .is_none(),
        "an organization-level token must not resolve a tenant installation"
    );
    let foreign_organization_token = public_application_token(
        &tenant_id,
        organization_anchor,
        "4201",
        "ORGANIZATION",
        None,
    );
    assert!(
        try_resolve_application_access_token_context(&pg, &foreign_organization_token)
            .await
            .expect("a foreign organization is reported as unresolved, not as an error")
            .is_none(),
        "an organization token must not resolve another organization's installation"
    );

    // Personal release: the owner's claim is the subject.
    let personal_application = provision_tenant_application(
        &pg,
        &command(&tenant_id, "0", Some("USER"), Some(&owner_user_id)),
    )
    .await
    .expect("personal provisioning");
    enable_tenant_application(&pg, &tenant_id, &personal_application.id)
        .await
        .expect("enable personal installation");
    let personal_anchor = personal_application
        .deploy_application_id
        .as_deref()
        .expect("personal deploy anchor");
    let owner_token = public_application_token(
        &tenant_id,
        personal_anchor,
        "0",
        "USER",
        Some(&owner_user_id),
    );
    let personal_context = try_resolve_application_access_token_context(&pg, &owner_token)
        .await
        .expect("the owner's token is accepted")
        .expect("personal context");
    assert_eq!(personal_context.user_id, owner_user_id);
    assert_eq!(personal_context.principal_id, owner_user_id);
    assert_eq!(personal_context.principal_kind, IamPrincipalKind::User);
    assert_eq!(personal_context.login_scope, LoginScope::Tenant);
    assert_eq!(personal_context.auth_level, AuthLevel::System);
    assert_eq!(personal_context.app_id, personal_anchor);
    assert!(personal_context.permission_scope.is_empty());
    assert!(
        personal_context
            .data_scope
            .contains(&format!("user:{owner_user_id}")),
        "the personal scope must reach downstream filtering: {:?}",
        personal_context.data_scope
    );
    // The infallible wrapper the framework wiring uses agrees.
    let projected = resolve_application_access_token_context(&pg, &owner_token)
        .await
        .expect("infallible wrapper resolves the owner token");
    assert_eq!(projected.user_id, owner_user_id);

    // A different (still legal) subject is refused, naming the installation, the
    // claim, and the expected owner.
    let other_user_id = unique_numeric_user_id();
    let foreign_token = public_application_token(
        &tenant_id,
        personal_anchor,
        "0",
        "USER",
        Some(&other_user_id),
    );
    let error = try_resolve_application_access_token_context(&pg, &foreign_token)
        .await
        .expect_err("a personal token must not name another subject");
    assert!(
        error.contains(&personal_application.id),
        "the rejection must name the installation: {error}"
    );
    assert!(
        error.contains("user_id"),
        "the rejection must name the claim: {error}"
    );
    assert!(
        error.contains(&other_user_id),
        "the rejection must name the claimed subject: {error}"
    );
    assert!(
        error.contains(&owner_user_id),
        "the rejection must name the expected owner: {error}"
    );
    assert!(
        resolve_application_access_token_context(&pg, &foreign_token)
            .await
            .is_none()
    );

    // A missing subject claim is refused before any identity comparison.
    let missing_subject_token =
        public_application_token(&tenant_id, personal_anchor, "0", "USER", None);
    let error = try_resolve_application_access_token_context(&pg, &missing_subject_token)
        .await
        .expect_err("a personal token without user_id must fail closed");
    assert!(error.contains("user_id"), "{error}");
    assert!(error.contains("USER"), "{error}");

    // An unknown release scope is refused as well.
    let unknown_scope_token = public_application_token(
        &tenant_id,
        personal_anchor,
        "0",
        "PLATFORM",
        Some(&owner_user_id),
    );
    let error = try_resolve_application_access_token_context(&pg, &unknown_scope_token)
        .await
        .expect_err("an unknown release scope must fail closed");
    assert!(error.contains("ownership_scope"), "{error}");

    cleanup(&pg, &tenant_id).await;
}

/// The API-key channel accepts a login `authToken` on the same header as an API
/// key, and resolves it to the signed-in user's session principal.
///
/// Open-api surfaces publish one credential header; a signed-in client may put
/// its session's login token there instead of a gateway API key. That split is
/// owned by `IamDatabaseWebRequestContextResolver::resolve_api_key`, so every
/// host composition that mounts the resolver answers the same request the same
/// way. Only a database can prove the session lookup, which is why this test
/// lives in the PostgreSQL suite.
#[tokio::test]
#[ignore = "requires a migrated PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn the_api_key_channel_resolves_a_login_auth_token_to_a_session_principal() {
    use sdkwork_iam_web_adapter::IamWebRequestContextResolver;
    use sdkwork_web_core::{WebFrameworkErrorKind, WebRequestContextResolver as _};

    let Some(pg) = connect().await else {
        return;
    };
    let (tenant_id, user_id, organization_id, _) = seed_tenant(&pg).await;
    let application =
        provision_tenant_application(&pg, &command(&tenant_id, &organization_id, None, None))
            .await
            .expect("provision installation");
    enable_tenant_application(&pg, &tenant_id, &application.id)
        .await
        .expect("enable installation");
    let deploy_application_id = application
        .deploy_application_id
        .as_deref()
        .expect("deploy anchor");
    let issued = issue_standalone_bootstrap_access_credential(
        &pg,
        &tenant_id,
        deploy_application_id,
        Some(600),
    )
    .await
    .expect("bootstrap issuance");

    let resolver = IamWebRequestContextResolver::new(Some(std::sync::Arc::new(pg.clone())));

    // The login auth token arrives in the API key's header and resolves to the
    // same tenant/user/app the session was issued for.
    let principal = resolver
        .resolve_api_key(&issued.auth_token)
        .await
        .expect("the login auth token authenticates on the api-key channel");
    assert_eq!(issued.tenant_id, principal.tenant_id());
    assert_eq!(Some(issued.app_id.as_str()), Some(principal.app_id()));
    assert_eq!(Some(user_id.as_str()), Some(principal.user_id()));
    assert!(
        principal.api_key_id().is_none(),
        "a session principal is not an API key record"
    );

    // A prefixed credential belongs to the API key store and must never be
    // looked up as a session, even when no such key exists.
    let error = resolver
        .resolve_api_key("sk-definitely-not-an-iam-api-key")
        .await
        .expect_err("a prefixed credential stays on the api key channel");
    assert_eq!(WebFrameworkErrorKind::InvalidCredentials, error.kind);

    cleanup(&pg, &tenant_id).await;
}
