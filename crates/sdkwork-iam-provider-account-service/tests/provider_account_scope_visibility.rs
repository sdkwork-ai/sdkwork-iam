//! The four-level scope rules, executed against a real PostgreSQL instance.
//!
//! `CALLER_VISIBILITY_PREDICATE` is SQL text, and the unit tests in
//! `repository.rs` can only assert the *shape* of it (placeholder order, and that
//! the write paths bind the same three flags as the read paths). A predicate that
//! is spliced in correctly but drawn wrong — a missing `owner_user_id` clause, an
//! `OR` where an `AND` belongs — passes every one of those tests and still hands
//! one member another member's credentials. This file runs the predicate for
//! real, one scenario per ownership level:
//!
//! * tenant-wide default — resolvable by an ordinary member, never listed to one,
//!   and not editable by one even with the id in hand
//! * organization account — visible and editable only from inside the
//!   organization that keeps it
//! * personal account — visible and editable only by its owner
//! * platform account — hidden from a tenant console, still usable through a
//!   pinned reference from inside any tenant
//!
//! Run with `--test-threads 1` and alongside the other IAM PostgreSQL suites. If
//! the workspace profile names no database, or migration 0018 has not been
//! applied, each test reports the reason and returns instead of failing: the
//! suite is about the rules, not about provisioning a database.
//!
//! The fixtures themselves are independent, so the suite is safe to run with the
//! default thread count: every tenant, vendor and account code carries 64 random
//! bits, which is what keeps two concurrently built fixtures off each other's
//! unique keys.

use sdkwork_iam_provider_account_service::{
    create_account, find_account_for_caller, list_accounts, load_bound_account, resolve_account,
    update_account, AccountRequirement, AccountVisibility, NewProviderAccount,
    ProviderAccountError, ProviderAccountPatch, ScopeCaller, ACCOUNT_SCOPE_ORGANIZATION,
    ACCOUNT_SCOPE_PLATFORM, ACCOUNT_SCOPE_TENANT, ACCOUNT_SCOPE_USER, ACCOUNT_TYPE_LONG_TERM_KEY,
    CAPABILITY_OBJECT_STORAGE, DEFAULT_ORGANIZATION_ID, PLATFORM_TENANT_ID,
};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::path::PathBuf;
use uuid::Uuid;

/// The workspace PostgreSQL profile the IAM database host resolves, materialised
/// into `SDKWORK_DATABASE_URL`. `None` when nothing is configured.
fn database_url() -> Option<String> {
    let iam_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..");
    sdkwork_iam_database_host::unified_postgres_env::apply_workspace_postgres_env(&iam_root);
    std::env::var("SDKWORK_DATABASE_URL")
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

/// Whether the database carries the organization scope and the identity-kind
/// `account_type` check. Both arrive together in 0018; an un-migrated database
/// would reject every fixture row for an unrelated-looking reason.
async fn schema_supports_organization_scope(pg: &PgPool) -> bool {
    sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM pg_constraint \
         WHERE conname = 'ck_iam_provider_account_organization_scope_org'",
    )
    .fetch_one(pg)
    .await
    .map(|count| count > 0)
    .unwrap_or(false)
}

/// One tenant's worth of accounts, plus the identities that may (or may not)
/// reach them. Every id is unique per test run so two tests sharing a database
/// cannot see each other's rows, and the platform account — which necessarily
/// lands in the shared platform tenant — is identifiable by its vendor code.
struct Fixture {
    pg: PgPool,
    tenant: String,
    vendor: String,
    /// An ordinary member: holds a personal account, nothing else.
    member: String,
    /// A second ordinary member, to prove one member cannot reach another's.
    other_member: String,
    /// A member who has configured no personal account at all, so a resolution
    /// has to fall through to the wider levels.
    accountless_member: String,
    /// An administrator of `organization`, holding the shared-account rights.
    admin: String,
    organization: String,
    /// A second organization in the same tenant.
    other_organization: String,
    tenant_account_id: String,
    organization_account_id: String,
    member_account_id: String,
    other_member_account_id: String,
    platform_account_id: String,
}

impl Fixture {
    fn member_visibility(&self) -> AccountVisibility {
        AccountVisibility {
            tenant_id: self.tenant.clone(),
            user_id: Some(self.member.clone()),
            organization_id: None,
            include_platform: false,
            include_tenant_shared: false,
            include_organization_shared: false,
            scope_type: None,
            owner_user_id: None,
        }
    }

    /// What the console builds for an administrator acting inside
    /// `organization`: the tenant-wide defaults and its own organization's
    /// accounts, but never the platform ones.
    fn admin_visibility(&self, organization: &str, admin: &str) -> AccountVisibility {
        AccountVisibility {
            tenant_id: self.tenant.clone(),
            user_id: Some(admin.to_owned()),
            organization_id: Some(organization.to_owned()),
            include_platform: false,
            include_tenant_shared: true,
            include_organization_shared: true,
            scope_type: None,
            owner_user_id: None,
        }
    }

    /// The ids this visibility reaches for the fixture's own vendor code.
    async fn listed_ids(&self, visibility: &AccountVisibility) -> Vec<String> {
        let (accounts, _total) = list_accounts(
            &self.pg,
            visibility,
            None,
            Some(self.vendor.as_str()),
            None,
            None,
            200,
            0,
        )
        .await
        .expect("list provider accounts against a migrated database");
        accounts.into_iter().map(|account| account.id).collect()
    }

    async fn cleanup(&self) {
        // Hard delete: the fixture is the test's own data, and leaving rows behind
        // would make a later `is_default` promotion in this tenant surprising.
        let _ = sqlx::query("DELETE FROM iam_provider_account WHERE tenant_id = $1 OR id = $2")
            .bind(&self.tenant)
            .bind(&self.platform_account_id)
            .execute(&self.pg)
            .await;
    }
}

fn account(
    tenant: &str,
    organization: &str,
    scope: &str,
    owner: Option<&str>,
    vendor: &str,
    account_code: &str,
    is_default: bool,
) -> NewProviderAccount {
    NewProviderAccount {
        tenant_id: tenant.to_owned(),
        organization_id: organization.to_owned(),
        scope_type: scope.to_owned(),
        owner_user_id: owner.map(str::to_owned),
        vendor_code: vendor.to_owned(),
        account_code: account_code.to_owned(),
        display_name: format!("fixture {scope} {account_code}"),
        account_type: ACCOUNT_TYPE_LONG_TERM_KEY.to_owned(),
        environment: "production".to_owned(),
        external_account_id: None,
        capability_codes: vec![CAPABILITY_OBJECT_STORAGE.to_owned()],
        region_code: None,
        is_default,
        actor_id: "scope-visibility-fixture".to_owned(),
    }
}

/// Build every level of the model, or `None` when the environment cannot host
/// the test (no database, or no 0018).
async fn fixture(label: &str) -> Option<Fixture> {
    let Some(database_url) = database_url() else {
        eprintln!("SKIP {label}: no workspace PostgreSQL profile is configured");
        return None;
    };
    let pg = PgPoolOptions::new()
        .max_connections(2)
        .connect(&database_url)
        .await
        .expect("connect PostgreSQL for provider account scope visibility");

    if !schema_supports_organization_scope(&pg).await {
        eprintln!("SKIP {label}: migration 0018 is not applied to this database");
        return None;
    }

    // 23 characters keeps the vendor code inside `^[a-z][a-z0-9_]{1,31}$`.
    //
    // The *tail* of a UUIDv7, not its head: the leading 16 hex characters are the
    // 48-bit timestamp plus only 12 bits of `rand_a`, so two fixtures built in the
    // same millisecond — which is exactly what happens when the suite runs with the
    // default thread count — share them and then collide on the platform account
    // code, since that key does not include the vendor. The trailing 16 characters
    // are `rand_b`, 64 bits of real randomness.
    let uuid = Uuid::now_v7().simple().to_string();
    let run = &uuid[16..];
    let tenant = format!("test-pa-scope-{label}-{run}");
    let vendor = format!("testpa_{label}_{run}");
    let organization = format!("test-org-a-{run}");
    let other_organization = format!("test-org-b-{run}");
    let member = format!("test-user-a-{run}");
    let other_member = format!("test-user-b-{run}");
    let accountless_member = format!("test-user-c-{run}");
    let admin = format!("test-admin-a-{run}");

    // `ux_iam_provider_account_shared_code` keys on scope, tenant, organization
    // and `account_code` — **not** on `vendor_code` — so an account code is one
    // namespace per scope per tenant per organization, shared by every vendor.
    // The run suffix is therefore not decoration: an aborted earlier run leaves
    // rows behind, and a fixed code would make the next run fail as a conflict
    // rather than as the rule under test.
    let code = |base: &str| format!("{base}-{run}");

    let shared = ScopeCaller::new(&tenant, None, None).managing_shared(true);

    let tenant_account = create_account(
        &pg,
        &account(
            &tenant,
            DEFAULT_ORGANIZATION_ID,
            ACCOUNT_SCOPE_TENANT,
            None,
            &vendor,
            &code("tenant-default"),
            true,
        ),
        &shared,
    )
    .await
    .expect("create the tenant-wide default");

    // The body claims a *different* organization than the one the caller acts
    // inside. The account must still be pinned to the caller's own organization,
    // or a member could publish an account for another organization to
    // administer.
    let admin_caller =
        ScopeCaller::new(&tenant, Some(&admin), Some(&organization)).managing_shared(true);
    let organization_account = create_account(
        &pg,
        &account(
            &tenant,
            &other_organization,
            ACCOUNT_SCOPE_ORGANIZATION,
            None,
            &vendor,
            &code("org-a-shared"),
            false,
        ),
        &admin_caller,
    )
    .await
    .expect("create the organization-scoped account");

    let member_account = create_account(
        &pg,
        &account(
            &tenant,
            DEFAULT_ORGANIZATION_ID,
            ACCOUNT_SCOPE_USER,
            Some(&member),
            &vendor,
            &code("member-a-personal"),
            false,
        ),
        &ScopeCaller::new(&tenant, Some(&member), None),
    )
    .await
    .expect("create the first member's personal account");

    let other_member_account = create_account(
        &pg,
        &account(
            &tenant,
            DEFAULT_ORGANIZATION_ID,
            ACCOUNT_SCOPE_USER,
            Some(&other_member),
            &vendor,
            &code("member-b-personal"),
            false,
        ),
        &ScopeCaller::new(&tenant, Some(&other_member), None),
    )
    .await
    .expect("create the second member's personal account");

    let platform_caller = ScopeCaller::new(PLATFORM_TENANT_ID, None, None).managing_shared(true);
    let platform_account = create_account(
        &pg,
        &account(
            PLATFORM_TENANT_ID,
            DEFAULT_ORGANIZATION_ID,
            ACCOUNT_SCOPE_PLATFORM,
            None,
            &vendor,
            &code("platform-default"),
            false,
        ),
        &platform_caller,
    )
    .await
    .expect("create the platform-wide default");

    Some(Fixture {
        pg,
        tenant,
        vendor,
        member,
        other_member,
        accountless_member,
        admin,
        organization,
        other_organization,
        tenant_account_id: tenant_account.id,
        organization_account_id: organization_account.id,
        member_account_id: member_account.id,
        other_member_account_id: other_member_account.id,
        platform_account_id: platform_account.id,
    })
}

#[tokio::test]
async fn a_plain_member_lists_only_its_own_account_yet_still_resolves_the_tenant_default() {
    let Some(fixture) = fixture("reads").await else {
        return;
    };
    let visibility = fixture.member_visibility();

    let ids = fixture.listed_ids(&visibility).await;
    assert_eq!(
        ids,
        vec![fixture.member_account_id.clone()],
        "an ordinary member must see exactly their own personal account: the tenant-wide \
         default is not theirs to browse"
    );
    assert!(
        !ids.contains(&fixture.other_member_account_id),
        "the personal layer is owner-scoped, so a sibling member's account must not leak in"
    );

    // The gate is the two `include_*_shared` flags and nothing else. Turning on
    // platform visibility alone must surface the platform account and leave the
    // tenant default hidden, which is what proves the flags — not the scope walk
    // — are what the console's permission decides.
    // The member's *own* account is never a shared one, so it stays visible
    // throughout; what the flag adds is the platform default, and what must stay
    // absent is the tenant-wide default.
    let platform_only = AccountVisibility {
        include_platform: true,
        ..fixture.member_visibility()
    };
    let mut ids = fixture.listed_ids(&platform_only).await;
    ids.sort();
    let mut expected = vec![
        fixture.member_account_id.clone(),
        fixture.platform_account_id.clone(),
    ];
    expected.sort();
    assert_eq!(
        ids, expected,
        "turning on platform visibility must add the platform default and still leave the \
         tenant-wide default out of view"
    );

    // Hidden from browsing, still usable: a member who has configured no personal
    // account of their own resolves through the tenant-wide default, which is the
    // whole point of keeping it shared.
    let resolution = resolve_account(
        &fixture.pg,
        &AccountRequirement {
            tenant_id: fixture.tenant.clone(),
            user_id: Some(fixture.accountless_member.clone()),
            vendor_code: fixture.vendor.clone(),
            capability_code: Some(CAPABILITY_OBJECT_STORAGE.to_owned()),
            environment: None,
            organization_id: None,
        },
    )
    .await
    .expect("resolve a provider account for a member with no personal account");
    assert_eq!(ACCOUNT_SCOPE_TENANT, resolution.matched_scope);
    assert_eq!(fixture.tenant_account_id, resolution.account.id);
    assert!(
        resolution.matched_by_default,
        "the tenant-wide default must be chosen as the default, not as a lone candidate"
    );

    // A member who *does* keep a personal account still resolves their own: the
    // walk is narrowest-first, so the shared default never shadows a narrower
    // account that exists.
    let resolution = resolve_account(
        &fixture.pg,
        &AccountRequirement {
            tenant_id: fixture.tenant.clone(),
            user_id: Some(fixture.member.clone()),
            vendor_code: fixture.vendor.clone(),
            capability_code: Some(CAPABILITY_OBJECT_STORAGE.to_owned()),
            environment: None,
            organization_id: None,
        },
    )
    .await
    .expect("resolve a provider account for a member with a personal account");
    assert_eq!(ACCOUNT_SCOPE_USER, resolution.matched_scope);
    assert_eq!(fixture.member_account_id, resolution.account.id);

    // Reading by id is subject to the same rule as listing: knowing the id of a
    // shared account is not a reason to be able to read it.
    for hidden in [&fixture.tenant_account_id, &fixture.organization_account_id] {
        let fetched = find_account_for_caller(&fixture.pg, hidden, &visibility)
            .await
            .expect("read a provider account through the caller visibility");
        assert!(
            fetched.is_none(),
            "a shared account must not be readable by id without the shared-account right: {hidden}"
        );
    }

    fixture.cleanup().await;
}

#[tokio::test]
async fn an_organization_account_belongs_to_one_organization_inside_the_tenant() {
    let Some(fixture) = fixture("org").await else {
        return;
    };

    // The account was requested with another organization in the body; the model
    // pins it to the organization the caller acted inside.
    let admin_caller = ScopeCaller::new(
        &fixture.tenant,
        Some(&fixture.admin),
        Some(&fixture.organization),
    )
    .managing_shared(true);
    let pinned = find_account_for_caller(
        &fixture.pg,
        &fixture.organization_account_id,
        &fixture.admin_visibility(&fixture.organization, &fixture.admin),
    )
    .await
    .expect("read the organization-scoped account")
    .expect("an administrator must read their own organization's account");
    assert_eq!(fixture.organization, pinned.organization_id);

    // Inside the organization: the tenant default and the organization's own
    // account, and only those.
    let inside = fixture
        .listed_ids(&fixture.admin_visibility(&fixture.organization, &fixture.admin))
        .await;
    assert_eq!(
        inside,
        vec![
            fixture.organization_account_id.clone(),
            fixture.tenant_account_id.clone()
        ],
        "an organization administrator sees their own organization's account plus the \
         tenant-wide default, and nothing else"
    );

    // From the sibling organization: the tenant default still applies (it is
    // tenant-wide by design), but the other organization's account is gone.
    let sibling_admin = fixture.other_member.clone();
    let mut outside = fixture
        .listed_ids(&fixture.admin_visibility(&fixture.other_organization, &sibling_admin))
        .await;
    outside.sort();
    // The sibling administrator's own personal account travels with them, so the
    // only shared account in view is the tenant-wide default.
    let mut expected = vec![
        fixture.other_member_account_id.clone(),
        fixture.tenant_account_id.clone(),
    ];
    expected.sort();
    assert_eq!(
        outside, expected,
        "an account kept by one organization must not be listed to a sibling organization"
    );

    let denied = find_account_for_caller(
        &fixture.pg,
        &fixture.organization_account_id,
        &fixture.admin_visibility(&fixture.other_organization, &sibling_admin),
    )
    .await
    .expect("read across organizations");
    assert!(
        denied.is_none(),
        "an out-of-organization id must answer as absent, so the endpoint cannot be used to \
         probe which accounts exist"
    );

    // And it must not be writable from there either.
    let patch = ProviderAccountPatch {
        display_name: Some("reached across organizations".to_owned()),
        ..ProviderAccountPatch::default()
    };
    let sibling_caller = ScopeCaller::new(
        &fixture.tenant,
        Some(&sibling_admin),
        Some(&fixture.other_organization),
    )
    .managing_shared(true);
    let outcome = update_account(
        &fixture.pg,
        &fixture.organization_account_id,
        &patch,
        &sibling_caller,
    )
    .await
    .expect("update across organizations");
    assert!(
        outcome.is_none(),
        "an organization-scope account must not be editable from a sibling organization"
    );

    // The owning organization can still edit it, which is what keeps the
    // previous assertion about confinement rather than about a broken write path.
    let outcome = update_account(
        &fixture.pg,
        &fixture.organization_account_id,
        &patch,
        &admin_caller,
    )
    .await
    .expect("update inside the owning organization");
    assert!(
        outcome.is_some(),
        "the organization that keeps the account must be able to edit it"
    );

    fixture.cleanup().await;
}

#[tokio::test]
async fn writes_are_confined_by_the_same_predicate_the_listing_uses() {
    let Some(fixture) = fixture("writes").await else {
        return;
    };
    let patch = ProviderAccountPatch {
        display_name: Some("taken over".to_owned()),
        ..ProviderAccountPatch::default()
    };

    let member_caller = ScopeCaller::new(&fixture.tenant, Some(&fixture.member), None);

    // Requirement (1): the tenant-wide default is administrator territory. A
    // member without the shared-account right cannot change it even holding the
    // id, and the refusal is `None` rather than an error, so the id cannot be
    // confirmed by watching which failure comes back.
    let outcome = update_account(
        &fixture.pg,
        &fixture.tenant_account_id,
        &patch,
        &member_caller,
    )
    .await
    .expect("update the tenant-wide default as a plain member");
    assert!(
        outcome.is_none(),
        "a plain member must not be able to reconfigure the tenant-wide default"
    );

    // The platform default is not even in the member's tenant.
    let outcome = update_account(
        &fixture.pg,
        &fixture.platform_account_id,
        &patch,
        &member_caller,
    )
    .await
    .expect("update the platform default as a plain member");
    assert!(
        outcome.is_none(),
        "a plain member must not be able to reconfigure the platform-wide default"
    );

    // Requirement (3): a member owns their own account ...
    let outcome = update_account(
        &fixture.pg,
        &fixture.member_account_id,
        &patch,
        &member_caller,
    )
    .await
    .expect("update the caller's own personal account");
    assert!(
        outcome.is_some(),
        "a member must be able to edit their own cloud account"
    );

    // ... and only their own: the sibling's account differs by `owner_user_id`
    // alone, so this is what proves the personal layer is really owner-scoped.
    let other_caller = ScopeCaller::new(&fixture.tenant, Some(&fixture.other_member), None);
    let outcome = update_account(
        &fixture.pg,
        &fixture.member_account_id,
        &patch,
        &other_caller,
    )
    .await
    .expect("update another member's personal account");
    assert!(
        outcome.is_none(),
        "a member must not be able to edit another member's personal account"
    );

    // Requirement (2): an administered organization's account is reachable by its
    // administrator, and the administrator is exactly the caller carrying
    // `may_manage_shared`.
    let admin_caller = ScopeCaller::new(
        &fixture.tenant,
        Some(&fixture.admin),
        Some(&fixture.organization),
    )
    .managing_shared(true);
    let outcome = update_account(
        &fixture.pg,
        &fixture.tenant_account_id,
        &patch,
        &admin_caller,
    )
    .await
    .expect("update the tenant-wide default as an administrator");
    assert!(
        outcome.is_some(),
        "an administrator holding the shared-account right must be able to reconfigure the \
         tenant-wide default"
    );

    fixture.cleanup().await;
}

#[tokio::test]
async fn an_organization_scope_account_requires_a_real_organization() {
    let Some(fixture) = fixture("root").await else {
        return;
    };
    let request = account(
        &fixture.tenant,
        DEFAULT_ORGANIZATION_ID,
        ACCOUNT_SCOPE_ORGANIZATION,
        None,
        &fixture.vendor,
        "root-org-attempt",
        false,
    );

    // The root organization is the sentinel for "no particular organization", so
    // an organization-scope row pinned to it would compete with the tenant-wide
    // default for the same slot while looking like a distinct level.
    let root_caller = ScopeCaller::new(
        &fixture.tenant,
        Some(&fixture.admin),
        Some(DEFAULT_ORGANIZATION_ID),
    )
    .managing_shared(true);
    let error = create_account(&fixture.pg, &request, &root_caller)
        .await
        .expect_err("the root organization must not host an organization-scope account");
    assert!(
        matches!(error, ProviderAccountError::Validation(_)),
        "a bad scope request must be a validation failure, not a database error: {error:?}"
    );

    // Nor may a caller with no organization at all keep one.
    let tenant_caller =
        ScopeCaller::new(&fixture.tenant, Some(&fixture.admin), None).managing_shared(true);
    let error = create_account(&fixture.pg, &request, &tenant_caller)
        .await
        .expect_err("an organization-scope account requires the caller to act inside one");
    assert!(
        matches!(error, ProviderAccountError::Validation(_)),
        "a bad scope request must be a validation failure, not a database error: {error:?}"
    );

    // Without the shared-account right the level is closed regardless of
    // organization, which is the rule that keeps it an administrator act.
    let plain_caller = ScopeCaller::new(
        &fixture.tenant,
        Some(&fixture.member),
        Some(&fixture.organization),
    );
    let error = create_account(&fixture.pg, &request, &plain_caller)
        .await
        .expect_err("a plain member must not keep a shared account");
    assert!(
        matches!(error, ProviderAccountError::Validation(_)),
        "a member without the shared-account right must be refused before any write: {error:?}"
    );

    fixture.cleanup().await;
}

#[tokio::test]
async fn a_pinned_account_reference_crosses_tenants_for_platform_but_not_for_a_person() {
    let Some(fixture) = fixture("pinned").await else {
        return;
    };
    let stranger_tenant = format!("test-pa-scope-stranger-{}", &fixture.vendor);

    // A resource in another tenant may be configured against the platform-wide
    // default: the choice was made when the resource was set up, so the audience
    // is the resource, not the caller's own organization.
    let pinned = load_bound_account(
        &fixture.pg,
        &stranger_tenant,
        Some(&fixture.member),
        &fixture.platform_account_id,
    )
    .await
    .expect("a pinned platform account must stay usable from any tenant");
    assert_eq!(fixture.platform_account_id, pinned.id);

    // A personal account is the one case that stays closed: the pinned reference
    // does not turn another member's credentials into a shared resource.
    let error = load_bound_account(
        &fixture.pg,
        &fixture.tenant,
        Some(&fixture.other_member),
        &fixture.member_account_id,
    )
    .await
    .expect_err("a pinned reference must not expose another member's personal account");
    assert!(
        matches!(error, ProviderAccountError::NotFound(_)),
        "an unreachable pinned account must be reported as absent: {error:?}"
    );

    // The owner reaches their own, so the previous refusal is about ownership and
    // not about the pinned path being closed.
    let owned = load_bound_account(
        &fixture.pg,
        &fixture.tenant,
        Some(&fixture.member),
        &fixture.member_account_id,
    )
    .await
    .expect("the owner must reach their own pinned account");
    assert_eq!(fixture.member_account_id, owned.id);

    fixture.cleanup().await;
}

/// Remove fixture rows an aborted earlier run left behind.
///
/// Ignored by default because it deletes rows rather than asserting anything —
/// and because a test that runs as a side effect of `cargo test` would let one
/// test delete another's fixture. Every tenant, vendor and account code this
/// suite mints carries a random run suffix, so the rows are inert on their own;
/// this is DB hygiene, run on purpose:
///
/// ```text
/// cargo test -p sdkwork-iam-provider-account-service \
///   --test provider_account_scope_visibility -- --ignored reap
/// ```
#[tokio::test]
#[ignore = "deletes fixture rows: run explicitly, never as part of the suite"]
async fn reap_abandoned_fixtures() {
    let Some(database_url) = database_url() else {
        eprintln!("SKIP reap_abandoned_fixtures: no workspace PostgreSQL profile is configured");
        return;
    };
    let pg = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .expect("connect PostgreSQL for fixture reaping");

    // Two disjoint groups: every tenant this suite mints is named after it, and
    // every platform-scope row it mints uses a `testpa...` vendor code. The
    // tenant predicate would also reach the platform rows, but keeping both makes
    // the intent readable and survives a future change to the tenant naming.
    let removed = sqlx::query(
        "DELETE FROM iam_provider_account \
         WHERE tenant_id LIKE 'test-pa-scope-%' \
            OR (scope_type = 'platform' AND vendor_code LIKE 'testpa%')",
    )
    .execute(&pg)
    .await
    .expect("reap abandoned provider account fixtures");
    eprintln!(
        "reaped {} abandoned provider account fixture row(s)",
        removed.rows_affected()
    );
}
