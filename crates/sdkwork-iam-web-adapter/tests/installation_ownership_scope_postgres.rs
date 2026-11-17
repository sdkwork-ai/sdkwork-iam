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

use sdkwork_iam_web_adapter::{
    enable_tenant_application, issue_standalone_bootstrap_access_credential,
    provision_tenant_application, resolve_installation_ownership_scope, ApplicationOwnershipScope,
    TenantApplicationProvisionCommand,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
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

    let personal = provision_tenant_application(
        &pg,
        &command(&tenant_id, "0", Some("USER"), Some(&user_id)),
    )
    .await
    .expect("personal provisioning");
    assert_eq!(personal.ownership_scope, ApplicationOwnershipScope::User);
    assert_eq!(personal.owner_user_id.as_deref(), Some(user_id.as_str()));

    // The resolver reads the stored level for the token anchor.
    for application in [&defaulted, &organization, &personal] {
        let resolved = resolve_installation_ownership_scope(
            &pg,
            &tenant_id,
            application.deploy_application_id.as_deref().expect("anchor"),
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
        (Some("USER"), organization_id.as_str(), Some(user_id.as_str())),
        (Some("PLATFORM"), "0", None),
        (Some("TENANT"), "0", Some(user_id.as_str())),
    ] {
        let error = provision_tenant_application(
            &pg,
            &command(&tenant_id, organization, scope, owner),
        )
        .await
        .expect_err("a mismatched scope request must fail closed");
        assert!(
            !error.is_empty(),
            "the refusal must name its reason for {scope:?}"
        );
    }

    let written: i64 =
        sqlx::query_scalar("SELECT COUNT(*)::BIGINT FROM iam_application_installation WHERE tenant_id = $1")
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

    let personal = provision_tenant_application(
        &pg,
        &command(&tenant_id, "0", Some("USER"), Some(&user_id)),
    )
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
        provision_tenant_application(&pg, &other_owner).await.is_err(),
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
        (None, "0", None, "TENANT", "0", "system"),
        (
            Some("ORGANIZATION"),
            organization_id.as_str(),
            None,
            "ORGANIZATION",
            organization_id.as_str(),
            "system",
        ),
        (Some("USER"), "0", Some(user_id.as_str()), "USER", "0", user_id.as_str()),
    ];

    for (scope, organization, owner, claim, claim_organization, claim_user) in cases {
        let application = provision_tenant_application(
            &pg,
            &command(&tenant_id, organization, scope, owner),
        )
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
        assert_eq!(claims["user_id"], claim_user);
        assert_eq!(claims["app_id"], claims["aud"], "aud == app_id");
        assert_eq!(
            claims["app_id"],
            serde_json::json!(application.deploy_application_id.clone())
        );
    }

    cleanup(&pg, &tenant_id).await;
}

#[tokio::test]
#[ignore = "requires a migrated PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn personal_issuance_fails_closed_when_the_owner_is_not_active() {
    let Some(pg) = connect().await else {
        return;
    };
    let (tenant_id, user_id, _, _) = seed_tenant(&pg).await;

    let application = provision_tenant_application(
        &pg,
        &command(&tenant_id, "0", Some("USER"), Some(&user_id)),
    )
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
