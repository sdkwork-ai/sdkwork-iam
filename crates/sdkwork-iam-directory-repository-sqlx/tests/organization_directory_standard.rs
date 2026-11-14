//! Contract and ownership guards for the IAM in-process organization directory.
//!
//! `DOMAIN_SPEC.md` §5 and `MODULE_SPEC.md` §4.2.1 put the organization,
//! organization-membership, and user SQL in IAM. These checks keep that
//! ownership visible in every workspace test run without a database; the
//! `#[ignore]`d test at the bottom is the optional live-PostgreSQL check.

use std::sync::Arc;

use sdkwork_iam_directory_repository_sqlx::{
    organization_capability, organization_role_allows, IamDirectoryError, IamOrganizationDirectory,
    IamOrganizationMemberQuery, IamOrganizationMemberRecord, IamOrganizationRecord,
    SqlxIamOrganizationDirectory,
};

const DIRECTORY_SOURCE: &str = include_str!("../src/organization_directory.rs");
const LIB_SOURCE: &str = include_str!("../src/lib.rs");

const LIVE_TENANT_ID: &str = "100001";
const LIVE_ORGANIZATION_ID: &str = "iamorg_backend_integration";
const LIVE_DEFAULT_DATABASE_URL: &str =
    "postgresql://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:55432/sdkwork_ai_dev";

#[test]
fn member_query_struct_carries_search_and_offset_window() {
    let default_query = IamOrganizationMemberQuery::default();
    assert_eq!(None, default_query.q);
    assert_eq!(0, default_query.offset);
    assert_eq!(0, default_query.limit);

    let query = IamOrganizationMemberQuery {
        q: Some("ada".to_owned()),
        offset: 20,
        limit: 10,
    };
    assert_eq!(Some("ada".to_owned()), query.clone().q);
    assert_eq!(20, query.clone().offset);
    assert_eq!(10, query.limit);
}

#[test]
fn directory_error_is_a_displayable_std_error_without_panicking() {
    fn assert_std_error<E: std::error::Error + Send + Sync + 'static>() {}
    assert_std_error::<IamDirectoryError>();

    let error = IamDirectoryError::new("failed to list active organization members: boom");
    assert_eq!(
        "failed to list active organization members: boom",
        error.to_string(),
    );
    assert_eq!(
        "failed to list active organization members: boom",
        error.message(),
    );
    assert!(std::error::Error::source(&error).is_none());
}

#[test]
fn organization_and_member_records_expose_the_port_contract() {
    let organization = IamOrganizationRecord {
        organization_id: "iamorg_1".to_owned(),
        name: "Backend Integration".to_owned(),
        code: "backend-integration".to_owned(),
        organization_kind: "enterprise".to_owned(),
        status: "active".to_owned(),
    };
    assert_eq!("iamorg_1", organization.organization_id);
    assert_eq!("enterprise", organization.organization_kind);

    let member = IamOrganizationMemberRecord {
        membership_id: "iamom_1".to_owned(),
        user_id: "1001".to_owned(),
        membership_kind: "owner".to_owned(),
        display_name: Some("Ada Lovelace".to_owned()),
        username: Some("ada".to_owned()),
        email: Some("ada@example.com".to_owned()),
        status: "active".to_owned(),
        is_primary: true,
    };
    assert!(member.is_primary);
    assert_eq!("owner", member.membership_kind);
    assert_eq!(Some("ada"), member.username.as_deref());
}

#[test]
fn directory_port_is_object_safe_and_send_sync() {
    fn assert_send_sync<T: Send + Sync + ?Sized>() {}
    assert_send_sync::<dyn IamOrganizationDirectory>();

    fn assert_send_sync_value<T: Send + Sync>(_value: &T) {}

    let directory: Arc<dyn IamOrganizationDirectory> = Arc::new(StubDirectory);
    assert_send_sync_value(&directory);
}

#[test]
fn iam_repository_crate_owns_the_organization_directory_sql() {
    // The SQL lives in the IAM persistence owner, not in a consumer module.
    assert!(DIRECTORY_SOURCE.contains("FROM iam_organization"));
    assert!(DIRECTORY_SOURCE.contains("iam_organization_membership"));
    assert!(DIRECTORY_SOURCE.contains("LEFT JOIN iam_user"));

    // Tenant / organization / id parameters are bound as explicit TEXT casts.
    assert!(DIRECTORY_SOURCE.contains("tenant_id = CAST($1 AS TEXT)"));
    assert!(DIRECTORY_SOURCE.contains("id = CAST($2 AS TEXT)"));
    assert!(DIRECTORY_SOURCE.contains("ANY(CAST($3 AS TEXT[]))"));

    // Active membership supports both the canonical and the legacy status.
    assert!(DIRECTORY_SOURCE.contains("m.status = 'active'"));
    assert!(DIRECTORY_SOURCE.contains("CAST(m.status AS TEXT) = '1'"));

    // Deterministic directory ordering from the port contract.
    assert!(DIRECTORY_SOURCE.contains("ORDER BY m.is_primary DESC"));
    assert!(DIRECTORY_SOURCE.contains("m.id ASC"));

    // Free-text search escapes LIKE metacharacters and is case-insensitive.
    assert!(DIRECTORY_SOURCE.contains(".replace('%', \"\\\\%\")"));
    assert!(DIRECTORY_SOURCE.contains(".replace('_', \"\\\\_\")"));
    assert!(DIRECTORY_SOURCE.contains("ESCAPE '\\'"));
    assert!(DIRECTORY_SOURCE.contains("to_lowercase()"));

    // No second pool, no panic surface in the library path.
    for forbidden in ["panic!", "unimplemented!", "todo!", ".unwrap()"] {
        assert!(
            !DIRECTORY_SOURCE.contains(forbidden),
            "the IAM directory port must not contain {forbidden}",
        );
    }
}

#[test]
fn organization_capability_catalog_is_iam_owned() {
    assert_eq!(
        "membership.team.seat.manage",
        organization_capability::TEAM_SEAT_MANAGE,
        "the seat-management capability id is a stable IAM-published contract",
    );
}

#[test]
fn organization_role_matrix_allows_owner_and_admin_only() {
    let capability = organization_capability::TEAM_SEAT_MANAGE;

    // IAM policy: owner and admin allow the capability.
    assert!(organization_role_allows("owner", capability));
    assert!(organization_role_allows("admin", capability));

    // IAM policy: a plain member is denied.
    assert!(!organization_role_allows("member", capability));

    // The role is normalized, never matched case-sensitively.
    assert!(organization_role_allows(" Owner ", capability));
    assert!(organization_role_allows("ADMIN", capability));
    assert!(!organization_role_allows("Member", capability));

    // Unknown role denies (fail closed).
    for role in ["", "  ", "guest", "superuser", "OWNER-ADMIN", "billing"] {
        assert!(
            !organization_role_allows(role, capability),
            "unknown organization role {role:?} must be denied",
        );
    }

    // Unknown capability denies for every role, including the most privileged.
    for unknown in [
        "",
        "membership.team.seat.read",
        "membership.team.seat.manage.all",
        "IAM_OWNER",
        "organization.owner",
    ] {
        for role in ["owner", "admin", "member"] {
            assert!(
                !organization_role_allows(role, unknown),
                "unknown capability {unknown:?} must be denied for role {role:?}",
            );
        }
    }
}

#[test]
fn authorize_organization_action_stays_an_iam_decision_on_the_port() {
    // The trait exposes the decision; membership never re-derives the policy.
    assert!(
        DIRECTORY_SOURCE.contains("fn authorize_organization_action<'a>"),
        "the directory port must expose authorize_organization_action",
    );
    assert!(
        DIRECTORY_SOURCE.contains("organization_role_allows(&role, capability)"),
        "the port must apply the IAM-owned role matrix, not an inline role list",
    );

    // The decision is resolved from the caller's active organization roles.
    // Both the trait declaration and the sqlx implementation use this name, so
    // take the last occurrence (the implementation).
    let authorize_block = DIRECTORY_SOURCE
        .rsplit("fn authorize_organization_action<'a>")
        .next()
        .and_then(|rest| rest.split("fn directory_error(").next())
        .expect("authorize_organization_action implementation");
    assert!(
        authorize_block.contains("FROM iam_organization_membership m"),
        "the decision must read the IAM-owned organization membership table",
    );
    assert!(
        authorize_block.contains("m.user_id = CAST($3 AS TEXT)"),
        "the decision must be scoped to the calling user",
    );
    assert!(
        authorize_block.contains("m.organization_id = CAST($2 AS TEXT)"),
        "the decision must be scoped to the organization",
    );
    assert!(
        authorize_block.contains("m.status = 'active'")
            && authorize_block.contains("CAST(m.status AS TEXT) = '1'"),
        "only an active organization membership may grant a capability",
    );
    assert!(
        !authorize_block.contains("return Err("),
        "a missing or unprivileged membership is a denial (Ok(false)), never a port error",
    );
    assert!(
        authorize_block.contains("Ok(granted)"),
        "the decision is returned as a plain bool",
    );
}

#[test]
fn iam_repository_crate_reexports_the_whole_port_surface() {
    for item in [
        "pub mod organization_directory;",
        "organization_capability",
        "organization_role_allows",
        "IamDirectoryError",
        "IamDirectoryFuture",
        "IamOrganizationDirectory",
        "IamOrganizationMemberQuery",
        "IamOrganizationMemberRecord",
        "IamOrganizationRecord",
        "SqlxIamOrganizationDirectory",
    ] {
        assert!(
            LIB_SOURCE.contains(item),
            "crate root must re-export {item}",
        );
    }
}

#[test]
fn directory_trait_declares_send_sync_and_boxed_futures() {
    let trait_block = DIRECTORY_SOURCE
        .split("pub trait IamOrganizationDirectory")
        .nth(1)
        .and_then(|rest| rest.split("\n}").next())
        .expect("IamOrganizationDirectory trait block");

    assert!(
        trait_block.starts_with(": Send + Sync {"),
        "the directory port must be Send + Sync so it can be shared behind Arc",
    );
    assert_eq!(
        7,
        trait_block.matches("IamDirectoryFuture<'a,").count(),
        "all seven directory methods must return a boxed IamDirectoryFuture",
    );
    for method in [
        "fn load_organization",
        "fn count_active_members",
        "fn list_active_members",
        "fn count_active_members_matching",
        "fn load_active_member",
        "fn filter_active_member_ids",
        "fn authorize_organization_action",
    ] {
        assert!(trait_block.contains(method), "missing port method {method}");
    }
    assert!(
        DIRECTORY_SOURCE.contains("+ Send + 'a>"),
        "IamDirectoryFuture must be Send so it can cross an await point in a Send task",
    );
    assert!(
        DIRECTORY_SOURCE.contains("pub struct SqlxIamOrganizationDirectory"),
        "the sqlx implementation must be exported by this crate",
    );
    assert!(
        DIRECTORY_SOURCE.contains("pool: PgPool"),
        "the sqlx implementation holds the shared host pool",
    );
}

struct StubDirectory;

impl IamOrganizationDirectory for StubDirectory {
    fn load_organization<'a>(
        &'a self,
        tenant_id: &'a str,
        organization_id: &'a str,
    ) -> sdkwork_iam_directory_repository_sqlx::IamDirectoryFuture<'a, Option<IamOrganizationRecord>>
    {
        let organization_id = organization_id.to_owned();
        let tenant_id = tenant_id.to_owned();
        Box::pin(async move {
            Ok(Some(IamOrganizationRecord {
                organization_id,
                name: tenant_id,
                code: String::new(),
                organization_kind: "enterprise".to_owned(),
                status: "active".to_owned(),
            }))
        })
    }

    fn count_active_members<'a>(
        &'a self,
        _tenant_id: &'a str,
        _organization_id: &'a str,
    ) -> sdkwork_iam_directory_repository_sqlx::IamDirectoryFuture<'a, i64> {
        Box::pin(async move { Ok(0) })
    }

    fn list_active_members<'a>(
        &'a self,
        _tenant_id: &'a str,
        _organization_id: &'a str,
        _query: IamOrganizationMemberQuery,
    ) -> sdkwork_iam_directory_repository_sqlx::IamDirectoryFuture<
        'a,
        Vec<IamOrganizationMemberRecord>,
    > {
        Box::pin(async move { Ok(Vec::new()) })
    }

    fn count_active_members_matching<'a>(
        &'a self,
        _tenant_id: &'a str,
        _organization_id: &'a str,
        _q: Option<String>,
    ) -> sdkwork_iam_directory_repository_sqlx::IamDirectoryFuture<'a, i64> {
        Box::pin(async move { Ok(0) })
    }

    fn load_active_member<'a>(
        &'a self,
        _tenant_id: &'a str,
        _organization_id: &'a str,
        _user_id: &'a str,
    ) -> sdkwork_iam_directory_repository_sqlx::IamDirectoryFuture<
        'a,
        Option<IamOrganizationMemberRecord>,
    > {
        Box::pin(async move { Ok(None) })
    }

    fn filter_active_member_ids<'a>(
        &'a self,
        _tenant_id: &'a str,
        _organization_id: &'a str,
        user_ids: &'a [String],
    ) -> sdkwork_iam_directory_repository_sqlx::IamDirectoryFuture<'a, Vec<String>> {
        let user_ids = user_ids.to_vec();
        Box::pin(async move { Ok(user_ids) })
    }

    fn authorize_organization_action<'a>(
        &'a self,
        _tenant_id: &'a str,
        _organization_id: &'a str,
        user_id: &'a str,
        capability: &'a str,
    ) -> sdkwork_iam_directory_repository_sqlx::IamDirectoryFuture<'a, bool> {
        // The stub mirrors the IAM matrix without touching a database.
        let role = if user_id == "1001" { "owner" } else { "member" };
        Box::pin(async move { Ok(organization_role_allows(role, capability)) })
    }
}

#[tokio::test]
async fn stub_directory_round_trips_through_the_trait_object() {
    let directory: Arc<dyn IamOrganizationDirectory> = Arc::new(StubDirectory);

    let organization = directory
        .load_organization("100001", "iamorg_backend_integration")
        .await
        .expect("stub organization");
    assert_eq!(
        Some("iamorg_backend_integration"),
        organization
            .as_ref()
            .map(|value| value.organization_id.as_str()),
    );

    let filtered = directory
        .filter_active_member_ids("100001", "iamorg_backend_integration", &["1".to_owned()])
        .await
        .expect("stub filter");
    assert_eq!(vec!["1".to_owned()], filtered);

    assert!(
        directory
            .authorize_organization_action(
                "100001",
                "iamorg_backend_integration",
                "1001",
                organization_capability::TEAM_SEAT_MANAGE,
            )
            .await
            .expect("stub authorization"),
        "an owner must be authorized through the port",
    );
    assert!(
        !directory
            .authorize_organization_action(
                "100001",
                "iamorg_backend_integration",
                "2002",
                organization_capability::TEAM_SEAT_MANAGE,
            )
            .await
            .expect("stub authorization"),
        "a non-owner must be denied through the port",
    );
}

#[tokio::test]
#[ignore = "requires a local PostgreSQL database with the IAM schema migrated"]
async fn live_postgres_reads_the_backend_integration_organization_directory() {
    let database_url = std::env::var("SDKWORK_DATABASE_URL")
        .unwrap_or_else(|_| LIVE_DEFAULT_DATABASE_URL.to_owned());
    let pool = sqlx::PgPool::connect(&database_url)
        .await
        .expect("connect the live IAM database");
    let directory = SqlxIamOrganizationDirectory::new(pool);

    let organization = directory
        .load_organization(LIVE_TENANT_ID, LIVE_ORGANIZATION_ID)
        .await
        .expect("load the live organization");
    let organization = organization.expect("iamorg_backend_integration must be seeded");
    assert_eq!(LIVE_ORGANIZATION_ID, organization.organization_id);

    let total = directory
        .count_active_members(LIVE_TENANT_ID, LIVE_ORGANIZATION_ID)
        .await
        .expect("count the live organization members");
    assert!(total >= 0, "the live member count must be returned");

    let members = directory
        .list_active_members(
            LIVE_TENANT_ID,
            LIVE_ORGANIZATION_ID,
            IamOrganizationMemberQuery {
                q: None,
                offset: 0,
                limit: 50,
            },
        )
        .await
        .expect("list the live organization members");
    assert_eq!(
        members.len() as i64,
        total.min(50),
        "the first directory page must agree with the active member count",
    );

    let matching = directory
        .count_active_members_matching(LIVE_TENANT_ID, LIVE_ORGANIZATION_ID, None)
        .await
        .expect("count the live organization members without a search");
    assert_eq!(total, matching);

    if let Some(member) = members.first() {
        let loaded = directory
            .load_active_member(LIVE_TENANT_ID, LIVE_ORGANIZATION_ID, &member.user_id)
            .await
            .expect("load one live organization member");
        assert!(
            loaded.is_some(),
            "an active member must be loadable by user id"
        );

        let filtered = directory
            .filter_active_member_ids(
                LIVE_TENANT_ID,
                LIVE_ORGANIZATION_ID,
                std::slice::from_ref(&member.user_id),
            )
            .await
            .expect("filter one live organization member id");
        assert_eq!(vec![member.user_id.clone()], filtered);
    }
}
