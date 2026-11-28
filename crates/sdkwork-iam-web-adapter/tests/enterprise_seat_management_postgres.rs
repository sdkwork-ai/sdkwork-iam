//! PostgreSQL contracts for WorkBuddy seat policies, blacklist and reconciliation.
//!
//! Run with `SDKWORK_DATABASE_URL=... cargo test -p sdkwork-iam-web-adapter \
//! --test enterprise_seat_management_postgres -- --ignored`.

use sdkwork_iam_web_adapter::{
    bulk_release_enterprise_seats, create_enterprise_seat_policy, delete_enterprise_seat_blacklist,
    delete_enterprise_seat_policy, export_enterprise_seats, list_enterprise_seat_blacklist,
    list_enterprise_seat_policies, reconcile_enterprise_authorization_seats,
    resolve_enterprise_management_scope, retrieve_enterprise_seat_policy, update_enterprise_order,
    update_enterprise_seat_policy, EnterpriseOrderUpdateCommand, EnterpriseSeatBlacklistCommand,
    EnterpriseSeatBulkReleaseCommand, EnterpriseSeatExportCommand, EnterpriseSeatPolicyCommand,
    EnterpriseSeatPolicyDisposition, EnterpriseSeatPolicyUpdateCommand,
};
use sqlx::{postgres::PgPoolOptions, PgPool};

const TENANT: &str = "enterprise";
const ORDER: &str = "order-1";
const APPLICATION: &str = "app-1";

async fn connect() -> Option<PgPool> {
    let url = std::env::var("SDKWORK_DATABASE_URL").ok()?;
    let pg = PgPoolOptions::new()
        .max_connections(1)
        .connect(url.trim())
        .await
        .ok()?;
    sqlx::raw_sql(
        r#"
        CREATE TEMP TABLE iam_user (
            id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, display_name TEXT NOT NULL,
            status TEXT NOT NULL);
        CREATE TEMP TABLE iam_tenant_member (
            tenant_id TEXT NOT NULL, user_id TEXT NOT NULL, status TEXT NOT NULL);
        CREATE TEMP TABLE iam_organization (
            id TEXT NOT NULL, tenant_id TEXT NOT NULL, status TEXT NOT NULL,
            PRIMARY KEY (tenant_id, id));
        CREATE TEMP TABLE iam_organization_membership (
            id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, organization_id TEXT NOT NULL,
            user_id TEXT NOT NULL, is_primary INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL);
        CREATE TEMP TABLE iam_department (
            id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, organization_id TEXT NOT NULL,
            name TEXT NOT NULL, status TEXT NOT NULL);
        CREATE TEMP TABLE iam_department_closure (
            tenant_id TEXT NOT NULL, organization_id TEXT NOT NULL,
            ancestor_department_id TEXT NOT NULL, descendant_department_id TEXT NOT NULL,
            depth INTEGER NOT NULL);
        CREATE TEMP TABLE iam_department_assignment (
            id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, organization_id TEXT NOT NULL,
            organization_membership_id TEXT NOT NULL, department_id TEXT NOT NULL,
            user_id TEXT NOT NULL, is_primary INTEGER NOT NULL DEFAULT 0,
            effective_from TEXT NOT NULL, effective_to TEXT, status TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT '2026-01-01');
        CREATE TEMP TABLE iam_group (
            id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, status TEXT NOT NULL);
        CREATE TEMP TABLE iam_group_member (
            tenant_id TEXT NOT NULL, group_id TEXT NOT NULL, principal_kind TEXT NOT NULL,
            principal_id TEXT NOT NULL, status TEXT NOT NULL);
        CREATE TEMP TABLE iam_role (
            id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, status TEXT NOT NULL);
        CREATE TEMP TABLE iam_permission (id TEXT PRIMARY KEY, code TEXT NOT NULL);
        CREATE TEMP TABLE iam_role_permission (
            tenant_id TEXT NOT NULL, role_id TEXT NOT NULL, permission_id TEXT NOT NULL);
        CREATE TEMP TABLE iam_role_binding (
            tenant_id TEXT NOT NULL, role_id TEXT NOT NULL, principal_kind TEXT NOT NULL,
            principal_id TEXT NOT NULL, scope_kind TEXT NOT NULL, scope_id TEXT NOT NULL,
            effect TEXT NOT NULL, data_scope_kind TEXT NOT NULL, status TEXT NOT NULL,
            effective_from TEXT, effective_to TEXT);
        CREATE TEMP TABLE iam_user_identity (
            tenant_id TEXT NOT NULL, user_id TEXT NOT NULL, provider TEXT NOT NULL,
            subject TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TEMP TABLE iam_application_enterprise_order (
            id TEXT PRIMARY KEY, order_no TEXT NOT NULL, tenant_id TEXT NOT NULL,
            organization_id TEXT NOT NULL, application_id TEXT NOT NULL,
            enterprise_tenant_id TEXT NOT NULL, enterprise_organization_id TEXT NOT NULL,
            enterprise_name TEXT NOT NULL, authorization_mode TEXT NOT NULL,
            seat_count INTEGER, seat_name TEXT, duration_months INTEGER NOT NULL,
            order_status TEXT NOT NULL, contact_name TEXT NOT NULL, contact_phone TEXT NOT NULL,
            authorized_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, terminated_at TIMESTAMPTZ,
            termination_reason TEXT, termination_note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by TEXT,
            version BIGINT NOT NULL DEFAULT 0, deleted_at TIMESTAMPTZ);
        CREATE TEMP TABLE iam_application_enterprise_seat (
            id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, organization_id TEXT NOT NULL,
            order_id TEXT NOT NULL, application_id TEXT NOT NULL, user_id TEXT NOT NULL,
            seat_status TEXT NOT NULL, assigned_by TEXT NOT NULL, assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            released_by TEXT, released_at TIMESTAMPTZ, allocation_method TEXT NOT NULL DEFAULT 'manual',
            policy_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), version BIGINT NOT NULL DEFAULT 0);
        CREATE UNIQUE INDEX ux_seat_active ON iam_application_enterprise_seat(order_id, user_id)
            WHERE seat_status = 'active';
        CREATE TEMP TABLE iam_application_enterprise_seat_policy (
            id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, order_id TEXT NOT NULL,
            application_id TEXT NOT NULL, organization_id TEXT NOT NULL,
            department_id TEXT NOT NULL, department_name TEXT NOT NULL, allocation_type TEXT NOT NULL,
            created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), version BIGINT NOT NULL DEFAULT 0,
            UNIQUE (order_id, department_id));
        CREATE TEMP TABLE iam_application_enterprise_seat_blacklist (
            id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, order_id TEXT NOT NULL,
            application_id TEXT NOT NULL, user_id TEXT NOT NULL, display_name TEXT NOT NULL,
            one_id_id TEXT, department_name TEXT, reason TEXT, created_by TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (order_id, user_id));
        CREATE TEMP TABLE iam_application_enterprise_order_event (
            id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, order_id TEXT NOT NULL,
            event_type TEXT NOT NULL, actor_kind TEXT NOT NULL, actor_id TEXT,
            payload_json TEXT NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
        "#,
    )
    .execute(&pg)
    .await
    .expect("create temporary seat-management schema");

    // Execute the canonical migration-owned function and lifecycle triggers against
    // the focused fixture instead of maintaining a second handwritten implementation.
    let migration = include_str!(
        "../../../database/migrations/postgres/0056_iam_enterprise_seat_management.up.sql"
    );
    let start = migration
        .find("CREATE OR REPLACE FUNCTION iam_reconcile_enterprise_seats(")
        .expect("reconcile function");
    let end = migration
        .find("\nCREATE OR REPLACE FUNCTION iam_enterprise_membership_reconcile(")
        .expect("membership trigger follows reconcile function");
    let triggers_start = migration
        .find("CREATE OR REPLACE FUNCTION iam_enterprise_membership_reconcile(")
        .expect("membership trigger");
    let triggers_end = migration.rfind("\nCOMMIT;").expect("migration commit");
    sqlx::raw_sql(&migration[start..end])
        .execute(&pg)
        .await
        .expect("install canonical reconcile function");
    sqlx::raw_sql(&migration[triggers_start..triggers_end])
        .execute(&pg)
        .await
        .expect("install canonical lifecycle triggers");
    Some(pg)
}

async fn seed_base(pg: &PgPool, capacity: i32) {
    sqlx::raw_sql(
        r#"
        INSERT INTO iam_organization VALUES ('org-1', 'enterprise', 'active');
        INSERT INTO iam_role VALUES ('admin-role', 'enterprise', 'active');
        INSERT INTO iam_permission VALUES
            ('read', 'iam.enterprise_orders.read'), ('manage', 'iam.enterprise_orders.manage'),
            ('export', 'iam.enterprise_seats.export');
        INSERT INTO iam_role_permission VALUES
            ('enterprise', 'admin-role', 'read'), ('enterprise', 'admin-role', 'manage'),
            ('enterprise', 'admin-role', 'export');
        INSERT INTO iam_role_binding VALUES
            ('enterprise', 'admin-role', 'user', 'admin', 'tenant', '0', 'allow', 'tenant', 'active', NULL, NULL);
        INSERT INTO iam_tenant_member VALUES ('enterprise', 'admin', 'active');
        INSERT INTO iam_application_enterprise_order
            (id, order_no, tenant_id, organization_id, application_id, enterprise_tenant_id,
             enterprise_organization_id, enterprise_name, authorization_mode, seat_count, seat_name,
             duration_months, order_status, contact_name, contact_phone, authorized_at, expires_at)
        VALUES ('order-1', 'EO-1', 'publisher', '0', 'app-1', 'enterprise', 'org-1',
                'Enterprise', 'seat', $1, 'Professional', 12, 'active', 'Admin', '100', NOW(), NOW() + INTERVAL '1 year');
        "#,
    )
    .bind(capacity)
    .execute(pg)
    .await
    .expect("seed base fixture");
}

async fn seed_department_user(pg: &PgPool, user: &str, department: &str, name: &str) {
    sqlx::query("INSERT INTO iam_user VALUES ($1, 'enterprise', $1, 'active')")
        .bind(user)
        .execute(pg)
        .await
        .expect("seed user");
    sqlx::query("INSERT INTO iam_tenant_member VALUES ('enterprise', $1, 'active')")
        .bind(user)
        .execute(pg)
        .await
        .expect("seed member");
    sqlx::query("INSERT INTO iam_organization_membership VALUES ($1, 'enterprise', 'org-1', $2, 1, 'active')")
        .bind(format!("membership-{user}"))
        .bind(user)
        .execute(pg)
        .await
        .expect("seed organization membership");
    sqlx::query("INSERT INTO iam_department VALUES ($1, 'enterprise', 'org-1', $2, 'active')")
        .bind(department)
        .bind(name)
        .execute(pg)
        .await
        .expect("seed department");
    sqlx::query("INSERT INTO iam_department_closure VALUES ('enterprise', 'org-1', $1, $1, 0)")
        .bind(department)
        .execute(pg)
        .await
        .expect("seed closure");
    sqlx::query("INSERT INTO iam_department_assignment VALUES ($1, 'enterprise', 'org-1', $2, $3, $4, 1, '2026-01-01', NULL, 'active')")
        .bind(format!("assignment-{user}"))
        .bind(format!("membership-{user}"))
        .bind(department)
        .bind(user)
        .execute(pg)
        .await
        .expect("seed assignment");
}

async fn seed_policy(pg: &PgPool, id: &str, department: &str, name: &str, allocation: &str) {
    sqlx::query("INSERT INTO iam_application_enterprise_seat_policy VALUES ($1, 'enterprise', 'order-1', 'app-1', 'org-1', $2, $3, $4, 'admin')")
        .bind(id)
        .bind(department)
        .bind(name)
        .bind(allocation)
        .execute(pg)
        .await
        .expect("seed policy");
}

async fn active_count(pg: &PgPool, user: &str) -> i64 {
    sqlx::query_scalar("SELECT COUNT(*) FROM iam_application_enterprise_seat WHERE order_id = 'order-1' AND user_id = $1 AND seat_status = 'active'")
        .bind(user)
        .fetch_one(pg)
        .await
        .expect("count active seats")
}

async fn seed_manual_seat(pg: &PgPool, seat_id: &str, user_id: &str) {
    sqlx::query(
        "INSERT INTO iam_application_enterprise_seat \
         (id, tenant_id, organization_id, order_id, application_id, user_id, seat_status, assigned_by) \
         VALUES ($1, 'enterprise', 'org-1', 'order-1', 'app-1', $2, 'active', 'admin')",
    )
    .bind(seat_id)
    .bind(user_id)
    .execute(pg)
    .await
    .expect("seed manual seat");
}

fn bulk_release_command(
    seat_ids: &[&str],
    reason: Option<&str>,
) -> EnterpriseSeatBulkReleaseCommand {
    serde_json::from_value(serde_json::json!({
        "items": seat_ids.iter().map(|seat_id| serde_json::json!({ "seatId": seat_id })).collect::<Vec<_>>(),
        "reason": reason,
    }))
    .expect("deserialize bulk release command")
}

#[tokio::test]
#[ignore = "requires PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn pagination_keep_release_blacklist_restore_and_export_are_enforced() {
    let Some(pg) = connect().await else {
        eprintln!("skipping: SDKWORK_DATABASE_URL is not configured");
        return;
    };
    seed_base(&pg, 10).await;
    for (user, department, name) in [
        ("alice", "eng-a", "Engineering A"),
        ("bob", "eng-b", "Engineering B"),
        ("carol", "sales", "Sales"),
    ] {
        seed_department_user(&pg, user, department, name).await;
    }
    seed_policy(&pg, "policy-a", "eng-a", "Engineering A", "auto").await;
    seed_policy(&pg, "policy-b", "eng-b", "Engineering B", "auto").await;
    seed_policy(&pg, "policy-c", "sales", "Sales", "auto").await;

    let (page, total) = list_enterprise_seat_policies(&pg, TENANT, "admin", ORDER, None, 2, 1)
        .await
        .expect("paginated policies");
    assert_eq!((page.len(), total), (2, 3));
    let (search, total) =
        list_enterprise_seat_policies(&pg, TENANT, "admin", ORDER, Some("engineering"), 20, 0)
            .await
            .expect("searched policies");
    assert_eq!((search.len(), total), (2, 2));

    delete_enterprise_seat_policy(
        &pg,
        TENANT,
        "admin",
        ORDER,
        "policy-a",
        EnterpriseSeatPolicyDisposition::Keep,
    )
    .await
    .expect("keep policy seats");
    let kept: Option<(String, Option<String>)> = sqlx::query_as(
        "SELECT allocation_method, policy_id FROM iam_application_enterprise_seat WHERE user_id = 'alice' AND seat_status = 'active'",
    )
    .fetch_optional(&pg)
    .await
    .expect("load kept seat");
    assert_eq!(kept, Some(("manual".to_owned(), None)));
    assert_eq!(active_count(&pg, "alice").await, 1);

    delete_enterprise_seat_policy(
        &pg,
        TENANT,
        "admin",
        ORDER,
        "policy-b",
        EnterpriseSeatPolicyDisposition::Release,
    )
    .await
    .expect("release policy seats");
    assert_eq!(active_count(&pg, "bob").await, 0);

    sdkwork_iam_web_adapter::create_enterprise_seat_blacklist(
        &pg,
        TENANT,
        "admin",
        ORDER,
        &EnterpriseSeatBlacklistCommand {
            user_id: "carol".to_owned(),
            reason: Some("review".to_owned()),
        },
    )
    .await
    .expect("blacklist user");
    assert_eq!(active_count(&pg, "carol").await, 0);
    let (entries, total) =
        list_enterprise_seat_blacklist(&pg, TENANT, "admin", ORDER, Some("carol"), 20, 0)
            .await
            .expect("paginated blacklist");
    assert_eq!((entries.len(), total), (1, 1));
    delete_enterprise_seat_blacklist(&pg, TENANT, "admin", ORDER, &entries[0].id)
        .await
        .expect("restore blacklisted user");
    assert_eq!(active_count(&pg, "carol").await, 1);

    let exported = export_enterprise_seats(
        &pg,
        TENANT,
        "admin",
        ORDER,
        &EnterpriseSeatExportCommand {
            status: None,
            q: None,
        },
    )
    .await
    .expect("export seats");
    assert!(exported.csv.contains("alice"));
    assert!(exported.csv.contains("carol"));
    assert!(!exported.csv.contains("bob"));
}

#[tokio::test]
#[ignore = "requires PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn primary_assignment_policy_priority_login_and_membership_changes_reconcile() {
    let Some(pg) = connect().await else {
        eprintln!("skipping: SDKWORK_DATABASE_URL is not configured");
        return;
    };
    seed_base(&pg, 1).await;
    seed_department_user(&pg, "alice", "child", "Child").await;
    seed_department_user(&pg, "bob", "other", "Other").await;
    sqlx::query(
        "INSERT INTO iam_department VALUES ('parent', 'enterprise', 'org-1', 'Parent', 'active')",
    )
    .execute(&pg)
    .await
    .expect("seed parent");
    sqlx::query(
        "INSERT INTO iam_department_closure VALUES ('enterprise', 'org-1', 'parent', 'child', 1)",
    )
    .execute(&pg)
    .await
    .expect("seed parent closure");
    seed_policy(&pg, "parent-auto", "parent", "Parent", "auto").await;
    seed_policy(&pg, "child-login", "child", "Child", "login").await;
    seed_policy(&pg, "other-auto", "other", "Other", "auto").await;

    // The nearest child login policy beats the parent auto policy. Non-authorization
    // lifecycle reconciliation therefore leaves Alice unallocated; Bob consumes cap.
    reconcile_enterprise_authorization_seats(&pg, TENANT, None, false, Some(APPLICATION))
        .await
        .expect("auto reconciliation");
    assert_eq!(active_count(&pg, "alice").await, 0);
    assert_eq!(active_count(&pg, "bob").await, 1);
    reconcile_enterprise_authorization_seats(&pg, TENANT, None, true, Some(APPLICATION))
        .await
        .expect("authorization reconciliation");
    assert_eq!(
        active_count(&pg, "alice").await,
        0,
        "capacity remains enforced"
    );

    sqlx::query("UPDATE iam_tenant_member SET status = 'inactive' WHERE user_id = 'bob'")
        .execute(&pg)
        .await
        .expect("remove tenant member");
    assert_eq!(
        active_count(&pg, "bob").await,
        0,
        "tenant removal releases policy seat"
    );
    reconcile_enterprise_authorization_seats(&pg, TENANT, None, true, Some(APPLICATION))
        .await
        .expect("login allocation after capacity frees");
    assert_eq!(active_count(&pg, "alice").await, 1);
    let method: String = sqlx::query_scalar(
        "SELECT allocation_method FROM iam_application_enterprise_seat WHERE user_id = 'alice' AND seat_status = 'active'",
    ).fetch_one(&pg).await.expect("load allocation method");
    assert_eq!(method, "department_login");

    sqlx::query(
        "UPDATE iam_organization_membership SET status = 'inactive' WHERE user_id = 'alice'",
    )
    .execute(&pg)
    .await
    .expect("remove organization membership");
    assert_eq!(
        active_count(&pg, "alice").await,
        0,
        "organization removal releases policy seat"
    );
    sqlx::query("UPDATE iam_organization_membership SET status = 'active' WHERE user_id = 'alice'")
        .execute(&pg)
        .await
        .expect("restore organization membership");
    sqlx::query("UPDATE iam_department_assignment SET is_primary = 0 WHERE user_id = 'alice'")
        .execute(&pg)
        .await
        .expect("clear primary assignment");
    reconcile_enterprise_authorization_seats(&pg, TENANT, None, true, Some(APPLICATION))
        .await
        .expect("authorization reconciliation");
    assert_eq!(active_count(&pg, "alice").await, 1);
    sqlx::query("UPDATE iam_department_assignment SET is_primary = 1 WHERE user_id = 'alice'")
        .execute(&pg)
        .await
        .expect("restore primary assignment");
    reconcile_enterprise_authorization_seats(&pg, TENANT, None, true, Some(APPLICATION))
        .await
        .expect("reallocate after primary assignment restore");
    assert_eq!(active_count(&pg, "alice").await, 1);
    sqlx::query("UPDATE iam_department_assignment SET status = 'inactive' WHERE user_id = 'alice'")
        .execute(&pg)
        .await
        .expect("remove department assignment");
    assert_eq!(
        active_count(&pg, "alice").await,
        0,
        "assignment removal releases policy seat"
    );
}

#[tokio::test]
#[ignore = "requires PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn policy_department_uniqueness_and_hierarchy_are_enforced() {
    let Some(pg) = connect().await else {
        eprintln!("skipping: SDKWORK_DATABASE_URL is not configured");
        return;
    };
    seed_base(&pg, 10).await;
    for (user, department, name) in [
        ("parent-user", "parent", "Parent"),
        ("child-user", "child", "Child"),
        ("leaf-user", "leaf", "Leaf"),
    ] {
        seed_department_user(&pg, user, department, name).await;
    }
    sqlx::query(
        "INSERT INTO iam_department_closure VALUES \
         ('enterprise', 'org-1', 'parent', 'child', 1), \
         ('enterprise', 'org-1', 'child', 'leaf', 1)",
    )
    .execute(&pg)
    .await
    .expect("seed department hierarchy");

    create_enterprise_seat_policy(
        &pg,
        TENANT,
        "admin",
        ORDER,
        &EnterpriseSeatPolicyCommand {
            department_id: "child".to_owned(),
            allocation_type: "auto".to_owned(),
        },
    )
    .await
    .expect("create child policy");
    let duplicate = create_enterprise_seat_policy(
        &pg,
        TENANT,
        "admin",
        ORDER,
        &EnterpriseSeatPolicyCommand {
            department_id: " child ".to_owned(),
            allocation_type: "login".to_owned(),
        },
    )
    .await
    .expect_err("same department cannot have a second allocation type");
    assert!(duplicate.contains("already has a seat policy"));

    let descendant = create_enterprise_seat_policy(
        &pg,
        TENANT,
        "admin",
        ORDER,
        &EnterpriseSeatPolicyCommand {
            department_id: "leaf".to_owned(),
            allocation_type: "login".to_owned(),
        },
    )
    .await
    .expect_err("child policy forbids a descendant policy");
    assert!(descendant.contains("parent department"));

    let parent = create_enterprise_seat_policy(
        &pg,
        TENANT,
        "admin",
        ORDER,
        &EnterpriseSeatPolicyCommand {
            department_id: "parent".to_owned(),
            allocation_type: "login".to_owned(),
        },
    )
    .await
    .expect("parent may use a different type from its child");
    let conflicting_parent = create_enterprise_seat_policy(
        &pg,
        TENANT,
        "admin",
        ORDER,
        &EnterpriseSeatPolicyCommand {
            department_id: "parent".to_owned(),
            allocation_type: "auto".to_owned(),
        },
    )
    .await
    .expect_err("same-type child conflicts with parent");
    assert!(conflicting_parent.contains("already has a seat policy"));

    update_enterprise_seat_policy(
        &pg,
        TENANT,
        "admin",
        ORDER,
        &parent.id,
        &EnterpriseSeatPolicyUpdateCommand {
            department_id: None,
            allocation_type: Some("login".to_owned()),
        },
    )
    .await
    .expect("policy update excludes itself");
    let conflicting_update = update_enterprise_seat_policy(
        &pg,
        TENANT,
        "admin",
        ORDER,
        &parent.id,
        &EnterpriseSeatPolicyUpdateCommand {
            department_id: None,
            allocation_type: Some("auto".to_owned()),
        },
    )
    .await
    .expect_err("parent cannot change to the child's allocation type");
    assert!(conflicting_update.contains("child department"));
}

#[tokio::test]
#[ignore = "requires PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn bulk_release_is_atomic_and_rejects_blacklisted_or_policy_seats() {
    let Some(pg) = connect().await else {
        eprintln!("skipping: SDKWORK_DATABASE_URL is not configured");
        return;
    };
    seed_base(&pg, 10).await;
    for user in ["alice", "bob", "carol"] {
        seed_department_user(&pg, user, user, user).await;
    }
    seed_manual_seat(&pg, "seat-a", "alice").await;
    seed_manual_seat(&pg, "seat-b", "bob").await;
    seed_manual_seat(&pg, "seat-c", "carol").await;

    // Simulate an inconsistent legacy row to prove the service independently
    // enforces the blacklist boundary rather than relying on its trigger.
    sqlx::query("DROP TRIGGER trg_iam_enterprise_blacklist_reconcile ON iam_application_enterprise_seat_blacklist")
        .execute(&pg)
        .await
        .expect("disable fixture blacklist trigger");
    sqlx::query(
        "INSERT INTO iam_application_enterprise_seat_blacklist \
         (id, tenant_id, order_id, application_id, user_id, display_name, created_by) \
         VALUES ('blacklist-carol', 'enterprise', 'order-1', 'app-1', 'carol', 'carol', 'admin')",
    )
    .execute(&pg)
    .await
    .expect("seed active blacklisted seat");

    let blacklisted = bulk_release_enterprise_seats(
        &pg,
        TENANT,
        "admin",
        ORDER,
        &bulk_release_command(&["seat-a", "seat-c"], Some("batch")),
    )
    .await
    .expect_err("blacklisted seat rejects the entire batch");
    assert!(blacklisted.contains("blacklisted"));
    assert_eq!(
        active_count(&pg, "alice").await,
        1,
        "first update rolls back"
    );

    sqlx::query("UPDATE iam_application_enterprise_seat SET allocation_method = 'department_auto', policy_id = 'policy-bob' WHERE id = 'seat-b'")
        .execute(&pg)
        .await
        .expect("seed policy-managed seat");
    let policy_seat = bulk_release_enterprise_seats(
        &pg,
        TENANT,
        "admin",
        ORDER,
        &bulk_release_command(&["seat-a", "seat-b"], None),
    )
    .await
    .expect_err("policy seat rejects the entire batch");
    assert!(policy_seat.contains("department-policy"));
    assert_eq!(active_count(&pg, "alice").await, 1);

    sqlx::query("UPDATE iam_application_enterprise_seat SET allocation_method = 'manual', policy_id = NULL WHERE id = 'seat-b'")
        .execute(&pg)
        .await
        .expect("restore manual seat");
    let released = bulk_release_enterprise_seats(
        &pg,
        TENANT,
        "admin",
        ORDER,
        &bulk_release_command(&["seat-a", "seat-b"], Some("offboarding")),
    )
    .await
    .expect("release valid manual seats");
    assert!(released.all_or_nothing);
    assert_eq!(released.items.len(), 2);
    assert_eq!(active_count(&pg, "alice").await, 0);
    assert_eq!(active_count(&pg, "bob").await, 0);
    let audit: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM iam_application_enterprise_order_event \
         WHERE event_type IN ('seat_released', 'seats_bulk_released')",
    )
    .fetch_one(&pg)
    .await
    .expect("count bulk audit events");
    assert_eq!(audit, 3);
}

#[tokio::test]
#[ignore = "requires PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn order_resize_preserves_assignments_and_enforces_active_capacity() {
    let Some(pg) = connect().await else {
        eprintln!("skipping: SDKWORK_DATABASE_URL is not configured");
        return;
    };
    seed_base(&pg, 10).await;
    seed_department_user(&pg, "alice", "eng", "Engineering").await;
    seed_department_user(&pg, "bob", "eng-b", "Engineering B").await;
    seed_manual_seat(&pg, "seat-a", "alice").await;
    seed_manual_seat(&pg, "seat-b", "bob").await;

    let too_small = update_enterprise_order(
        &pg,
        TENANT,
        "admin",
        ORDER,
        &EnterpriseOrderUpdateCommand {
            seat_name: Some("Too small".to_owned()),
            seat_count: Some(1),
        },
    )
    .await
    .expect_err("capacity cannot fall below active assignments");
    assert!(too_small.contains("smaller than 2 active seats"));
    let unchanged: (Option<String>, Option<i32>) = sqlx::query_as(
        "SELECT seat_name, seat_count FROM iam_application_enterprise_order WHERE id = 'order-1'",
    )
    .fetch_one(&pg)
    .await
    .expect("load unchanged order");
    assert_eq!(unchanged, (Some("Professional".to_owned()), Some(10)));

    update_enterprise_order(
        &pg,
        TENANT,
        "admin",
        ORDER,
        &EnterpriseOrderUpdateCommand {
            seat_name: Some("  Professional Plus  ".to_owned()),
            seat_count: Some(3),
        },
    )
    .await
    .expect("resize order");
    let resized: (Option<String>, Option<i32>) = sqlx::query_as(
        "SELECT seat_name, seat_count FROM iam_application_enterprise_order WHERE id = 'order-1'",
    )
    .fetch_one(&pg)
    .await
    .expect("load resized order");
    assert_eq!(resized, (Some("Professional Plus".to_owned()), Some(3)));
    let assignments: Vec<(String, String)> = sqlx::query_as(
        "SELECT id, user_id FROM iam_application_enterprise_seat \
         WHERE seat_status = 'active' ORDER BY id",
    )
    .fetch_all(&pg)
    .await
    .expect("load preserved assignments");
    assert_eq!(
        assignments,
        vec![
            ("seat-a".to_owned(), "alice".to_owned()),
            ("seat-b".to_owned(), "bob".to_owned())
        ]
    );
}

#[tokio::test]
#[ignore = "requires PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn patch_scope_and_dedicated_export_permission_are_enforced() {
    let Some(pg) = connect().await else {
        eprintln!("skipping: SDKWORK_DATABASE_URL is not configured");
        return;
    };
    seed_base(&pg, 10).await;
    seed_department_user(&pg, "alice", "eng", "Engineering").await;
    seed_policy(&pg, "policy-eng", "eng", "Engineering", "auto").await;

    update_enterprise_seat_policy(
        &pg,
        TENANT,
        "admin",
        ORDER,
        "policy-eng",
        &EnterpriseSeatPolicyUpdateCommand {
            department_id: None,
            allocation_type: Some("login".to_owned()),
        },
    )
    .await
    .expect("allocation-only PATCH");
    assert_eq!(active_count(&pg, "alice").await, 0);
    reconcile_enterprise_authorization_seats(&pg, TENANT, None, true, Some(APPLICATION))
        .await
        .expect("authorization login allocation");
    assert_eq!(active_count(&pg, "alice").await, 1);
    update_enterprise_order(
        &pg,
        TENANT,
        "admin",
        ORDER,
        &EnterpriseOrderUpdateCommand {
            seat_name: Some("Professional Plus".to_owned()),
            seat_count: Some(12),
        },
    )
    .await
    .expect("seat pool PATCH");

    for (user, scope_kind, scope_id, data_scope) in [
        ("org-admin", "organization", "org-1", "organization"),
        ("dept-admin", "department", "eng", "department_and_children"),
        ("self-admin", "tenant", "0", "self"),
    ] {
        sqlx::query("INSERT INTO iam_user VALUES ($1, 'enterprise', $1, 'active')")
            .bind(user)
            .execute(&pg)
            .await
            .expect("seed scoped actor");
        sqlx::query("INSERT INTO iam_tenant_member VALUES ('enterprise', $1, 'active')")
            .bind(user)
            .execute(&pg)
            .await
            .expect("seed scoped member");
        sqlx::query("INSERT INTO iam_organization_membership VALUES ($1, 'enterprise', 'org-1', $2, 0, 'active')")
            .bind(format!("membership-{user}"))
            .bind(user)
            .execute(&pg)
            .await
            .expect("seed scoped organization membership");
        sqlx::query("INSERT INTO iam_role_binding VALUES ('enterprise', 'admin-role', 'user', $1, $2, $3, 'allow', $4, 'active', NULL, NULL)")
            .bind(user).bind(scope_kind).bind(scope_id).bind(data_scope)
            .execute(&pg).await.expect("seed scoped binding");
        let resolved = resolve_enterprise_management_scope(
            &pg,
            TENANT,
            user,
            if user == "self-admin" {
                "iam.enterprise_seats.export"
            } else {
                "iam.enterprise_orders.manage"
            },
        )
        .await
        .expect("resolve scoped binding");
        if user == "self-admin" {
            assert_eq!(resolved.kind, "self");
        } else {
            assert_eq!(resolved.kind, data_scope);
        }
    }

    sqlx::query("INSERT INTO iam_organization VALUES ('org-2', 'enterprise', 'active')")
        .execute(&pg)
        .await
        .expect("seed other organization");
    sqlx::query("INSERT INTO iam_department VALUES ('other-dept', 'enterprise', 'org-2', 'Other', 'active')")
        .execute(&pg).await.expect("seed other department");
    sqlx::query("INSERT INTO iam_application_enterprise_seat_policy VALUES ('other-policy', 'enterprise', 'order-1', 'app-1', 'org-2', 'other-dept', 'Other', 'auto', 'admin')")
        .execute(&pg).await.expect("seed out-of-scope policy");
    let (visible, total) =
        list_enterprise_seat_policies(&pg, TENANT, "org-admin", ORDER, None, 20, 0)
            .await
            .expect("organization-scoped policy list");
    assert_eq!((visible.len(), total), (1, 1));
    assert!(
        retrieve_enterprise_seat_policy(&pg, TENANT, "org-admin", ORDER, "other-policy")
            .await
            .is_err(),
        "out-of-scope policy retrieval must fail closed"
    );
    assert!(
        list_enterprise_seat_policies(&pg, TENANT, "dept-admin", ORDER, None, 20, 0)
            .await
            .is_err(),
        "department scope cannot manage policies"
    );

    // Managing orders does not imply the separate export permission.
    sqlx::query("DELETE FROM iam_role_permission WHERE permission_id = 'export'")
        .execute(&pg)
        .await
        .expect("remove export permission");
    assert!(
        export_enterprise_seats(
            &pg,
            TENANT,
            "admin",
            ORDER,
            &EnterpriseSeatExportCommand {
                status: None,
                q: None
            },
        )
        .await
        .is_err(),
        "manage permission must not authorize export"
    );
    let own = export_enterprise_seats(
        &pg,
        TENANT,
        "self-admin",
        ORDER,
        &EnterpriseSeatExportCommand {
            status: None,
            q: None,
        },
    )
    .await
    .expect("self-scoped export");
    assert!(own.csv.contains("alice"));

    delete_enterprise_seat_policy(
        &pg,
        TENANT,
        "admin",
        ORDER,
        "policy-eng",
        EnterpriseSeatPolicyDisposition::Keep,
    )
    .await
    .expect("keep before bulk release");
    let seat_id: String = sqlx::query_scalar(
        "SELECT id FROM iam_application_enterprise_seat WHERE user_id = 'alice' AND seat_status = 'active'",
    )
    .fetch_one(&pg)
    .await
    .expect("active seat id");
    let released = bulk_release_enterprise_seats(
        &pg,
        TENANT,
        "admin",
        ORDER,
        &bulk_release_command(&[seat_id.as_str()], None),
    )
    .await
    .expect("bulk release kept manual seat");
    assert!(released.all_or_nothing);
}
