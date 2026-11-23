import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { validateDatabaseFramework } from "../../../../sdkwork-specs/tools/check-database-framework-standard.mjs";

const iamRoot = path.resolve(import.meta.dirname, "../../..");

function readText(relativePath) {
  return fs.readFileSync(path.join(iamRoot, relativePath), "utf8");
}

const REQUIRED_DB_SCRIPTS = [
  "db:validate",
  "db:plan",
  "db:init",
  "db:migrate",
  "db:seed",
  "db:status",
  "db:drift",
  "db:drift:check",
  "db:materialize:contract",
  "db:bootstrap",
];

test("IAM database module satisfies DATABASE_FRAMEWORK_SPEC layout and lifecycle scripts", () => {
  const result = validateDatabaseFramework(iamRoot);
  assert.equal(result.skipped, false, "sdkwork-iam must own database/");
  assert.equal(result.ok, true, result.failures.join("; "));
});

test("IAM workspace exposes governed database lifecycle entrypoints", () => {
  const packageJson = JSON.parse(readText("package.json"));
  for (const scriptName of REQUIRED_DB_SCRIPTS) {
    assert.ok(packageJson.scripts?.[scriptName], `package.json must define ${scriptName}`);
  }
  assert.equal(
    packageJson.scripts?.["check:database"],
    "node scripts/run-database-contract-check.mjs",
  );
  assert.equal(
    packageJson.scripts?.["test:contract:database"],
    "node --test tests/contract/database-framework.contract.test.mjs tests/contract/iam-database-contract-alignment.test.mjs",
  );
});

test("IAM database contract check runs framework validation and table alignment", async () => {
  const module = await import(
    pathToFileURL(path.join(iamRoot, "scripts/run-database-contract-check.mjs")).href
  );
  const plan = module.createDatabaseContractCheckPlan({ cwd: iamRoot });
  assert.equal(plan.length, 2);
  assert.match(plan[0].args.join(" "), /check-database-framework-standard\.mjs/u);
  assert.match(plan[1].args[0], /iam-database-contract-alignment\.test\.mjs/u);
});

test("IAM database host integrates sdkwork-database lifecycle orchestrator", () => {
  const rootCargo = readText("Cargo.toml");
  // The workspace key follows the dependency package name (NAMING_SPEC section
  // 3.1: kebab-case on the package/dependency plane), while consumers import the
  // snake_case lib target. Accept either spelling so a rename between the planes
  // does not read as a missing dependency.
  assert.match(rootCargo, /sdkwork[-_]database[-_]config/u);
  assert.match(rootCargo, /sdkwork[-_]database[-_]sqlx/u);
  assert.match(rootCargo, /sdkwork_database_lifecycle/u);
  assert.match(rootCargo, /sdkwork_database_spi/u);

  const databaseHostCargo = readText("crates/sdkwork-iam-database-host/Cargo.toml");
  assert.match(databaseHostCargo, /sdkwork_database_lifecycle/u);
  assert.match(databaseHostCargo, /sdkwork_database_spi/u);

  const databaseHostLib = readText("crates/sdkwork-iam-database-host/src/lib.rs");
  assert.match(databaseHostLib, /bootstrap_iam_database_from_env/u);
  assert.match(databaseHostLib, /LifecycleOrchestrator/u);
  assert.match(databaseHostLib, /\.init\(\)/u);
  assert.match(databaseHostLib, /\.migrate\(\)/u);
  assert.match(databaseHostLib, /SDKWORK_IAM_APP_ROOT/u);

  const databaseHostBin = readText("crates/sdkwork-iam-database-host/src/bin/sdkwork-iam-db.rs");
  assert.match(databaseHostBin, /Commands::Init/u);
  assert.match(databaseHostBin, /Commands::Bootstrap/u);
  assert.match(databaseHostBin, /apply_workspace_postgres_env/u);
  assert.doesNotMatch(databaseHostBin, /SDKWork Appbase IAM database/u);
});

test("IAM database host loads unified postgres profile before pool creation", () => {
  const databaseHostLib = readText("crates/sdkwork-iam-database-host/src/lib.rs");
  assert.match(databaseHostLib, /apply_workspace_postgres_env\(&app_root\)/u);
  assert.ok(
    fs.existsSync(
      path.join(iamRoot, "crates/sdkwork-iam-database-host/src/unified_postgres_env.rs"),
    ),
  );
});

test("IAM database README documents init and bootstrap lifecycle commands", () => {
  const readme = readText("database/README.md");
  for (const command of ["pnpm run db:init", "pnpm run db:bootstrap", "pnpm run check:database"]) {
    assert.match(readme, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"));
  }
  assert.match(readme, /sdkwork-iam-database-host/u);
});

test("IAM database contract declares sdkwork-iam ownership", () => {
  const manifest = JSON.parse(readText("database/database.manifest.json"));
  const prefixRegistry = JSON.parse(readText("database/contract/prefix-registry.json"));
  const schemaYaml = readText("database/contract/schema.yaml");

  assert.equal(manifest.owner, "sdkwork-iam");
  assert.equal(manifest.spi?.provider, "sdkwork-iam");
  assert.doesNotMatch(JSON.stringify(manifest), /appbase-platform|appbase-iam/u);
  assert.ok(prefixRegistry.prefixes.every((entry) => entry.owner === "sdkwork-iam"));
  assert.match(schemaYaml, /owner_team: sdkwork-iam/u);
  assert.doesNotMatch(schemaYaml, /appbase-platform|appbase-iam/u);
});

test("operational seed profile loads IAM subject and application bootstrap data", () => {
  const seedManifest = JSON.parse(readText("database/seeds/seed.manifest.json"));
  const common = seedManifest.profiles.operational.common;
  const defaultLocaleFiles = seedManifest.profiles.operational.locales["zh-CN"];

  // Assert membership rather than an exact array: the operational profile grows
  // with each governed catalog seed, and an equality assertion here turned every
  // such addition into a false regression.
  assert.ok(common.includes("002_default_iam_subject.sql"));
  assert.ok(common.includes("003_iam_application_bootstrap_seed.sql"));
  assert.ok(common.includes("004_iam_role_catalog_seed.sql"));
  assert.ok(defaultLocaleFiles.includes("001_iam_locale_display.sql"));
});

test("every declared seed locale file exists and belongs to its own locale directory", () => {
  const seedManifest = JSON.parse(readText("database/seeds/seed.manifest.json"));

  for (const [locale, localeSet] of Object.entries(seedManifest.localeSets)) {
    assert.ok(seedManifest.activeLocales.includes(locale) || localeSet.required === false);
    assert.ok(Array.isArray(localeSet.files));
    for (const file of localeSet.files) {
      assert.ok(
        file.startsWith(`locales/${locale}/`),
        `localeSets.${locale} must only reference its own locale directory, saw ${file}`,
      );
      assert.ok(
        fs.existsSync(path.join(iamRoot, "database/seeds", file)),
        `localeSets.${locale} references a missing seed file: ${file}`,
      );
    }
  }

  for (const [profileName, profile] of Object.entries(seedManifest.profiles)) {
    for (const file of profile.common) {
      assert.ok(
        fs.existsSync(path.join(iamRoot, "database/seeds/common", file)),
        `profiles.${profileName}.common references a missing seed file: ${file}`,
      );
    }
    for (const [locale, files] of Object.entries(profile.locales)) {
      assert.ok(localeSetIsDeclared(seedManifest, locale), `profiles.${profileName} uses undeclared locale ${locale}`);
      for (const file of files) {
        assert.ok(
          (seedManifest.localeSets[locale]?.files ?? []).includes(`locales/${locale}/${file}`),
          `profiles.${profileName}.locales.${locale} references ${file} outside the declared locale set`,
        );
      }
    }
  }
});

test("role catalog keeps language-neutral columns in common and display copy in locale seeds", () => {
  const commonSeed = readText("database/seeds/common/004_iam_role_catalog_seed.sql");
  const insertStart = commonSeed.indexOf("INSERT INTO iam_role");
  assert.ok(insertStart >= 0, "the common role catalog seed must insert the role catalog");
  const insertColumns = commonSeed.slice(insertStart, commonSeed.indexOf("VALUES", insertStart));
  assert.doesNotMatch(
    insertColumns,
    /label_i18n|description_i18n/u,
    "the common role catalog seed must not author localized display columns",
  );

  const seedManifest = JSON.parse(readText("database/seeds/seed.manifest.json"));
  for (const locale of ["zh-CN", "en-US"]) {
    const roleLabelFile = locale === "zh-CN" ? "003_iam_role_labels.sql" : "002_iam_role_labels.sql";
    assert.ok(
      seedManifest.localeSets[locale].files.includes(`locales/${locale}/${roleLabelFile}`),
      `localeSets.${locale} must declare the role label seed`,
    );
    const roleLabels = readText(`database/seeds/locales/${locale}/${roleLabelFile}`);
    assert.match(roleLabels, /UPDATE iam_role AS r/u);
    assert.match(roleLabels, new RegExp(`jsonb_build_object\\('${locale}',`, "u"));
    assert.match(roleLabels, /WHERE r\.standard = 1/u);
    assert.match(roleLabels, /r\.code = v\.code/u);
  }
});

test("locale set checksums and versions track the seed content they declare", () => {
  const seedManifest = JSON.parse(readText("database/seeds/seed.manifest.json"));

  for (const [locale, localeSet] of Object.entries(seedManifest.localeSets)) {
    if (localeSet.files.length === 0) {
      continue;
    }
    // DATABASE_FRAMEWORK_SPEC section 8.1: a locale set's version and checksum
    // MUST change when its seed content changes. The set checksum covers the
    // declared files' bytes in declaration order, so a silent edit to a locale
    // seed without a manifest update fails here instead of shipping stale
    // initialization data.
    const hash = createHash("sha256");
    for (const file of localeSet.files) {
      hash.update(fs.readFileSync(path.join(iamRoot, "database/seeds", file)));
    }
    assert.equal(
      localeSet.checksum,
      `sha256:${hash.digest("hex")}`,
      `localeSets.${locale} checksum does not match its declared seed files`,
    );
    assert.match(localeSet.version, /^\d+\.\d+\.\d+$/u, `localeSets.${locale}.version must be semantic`);
  }
});

test("role localization columns are declared by the baseline and the forward migration", () => {
  const baseline = readText("database/ddl/baseline/postgres/0001_iam_baseline.sql");
  const migration = readText(
    "database/migrations/postgres/0032_iam_role_catalog_localization.up.sql",
  );

  for (const source of [baseline, migration]) {
    assert.match(source, /ALTER TABLE iam_role/u);
    assert.match(source, /ADD COLUMN IF NOT EXISTS label_i18n TEXT NOT NULL DEFAULT '\{\}'/u);
    assert.match(source, /ADD COLUMN IF NOT EXISTS description_i18n TEXT NOT NULL DEFAULT '\{\}'/u);
    assert.match(source, /CHECK \(jsonb_typeof\(label_i18n::jsonb\) = 'object'\)/u);
    assert.match(source, /CHECK \(jsonb_typeof\(description_i18n::jsonb\) = 'object'\)/u);
  }

  assert.match(baseline, /-- folded migration: migrations\/postgres\/0032_iam_role_catalog_localization\.up\.sql/u);
  assert.match(migration, /^-- reversible: false$/mu);
  assert.match(migration, /^-- rollback: forward-fix/mu);
});

function localeSetIsDeclared(seedManifest, locale) {
  return Object.hasOwn(seedManifest.localeSets ?? {}, locale);
}

test("official-account unification migration is folded, irreversible, and forward-fix only", () => {
  const baseline = readText("database/ddl/baseline/postgres/0001_iam_baseline.sql");
  const migration = readText(
    "database/migrations/postgres/0033_official_account_unification.up.sql",
  );

  assert.match(migration, /^-- reversible: false$/mu);
  assert.match(migration, /^-- rollback: forward-fix/mu);
  assert.match(
    baseline,
    /-- folded migration: migrations\/postgres\/0033_official_account_unification\.up\.sql/u,
  );

  for (const source of [baseline, migration]) {
    assert.match(source, /ADD COLUMN IF NOT EXISTS maintainer_user_id TEXT/u);
    assert.match(source, /idx_iam_oauth_resource_account_maintainer/u);
    assert.match(source, /uk_iam_oauth_resource_account_provider_id/u);
    assert.match(source, /access_mode = 'self_managed_account'|'self_managed_account'/u);
  }

  // The legacy aggregate is retired in two steps: 0033 never drops it, and the
  // DROP only exists inside the separately approved 0034 block (which must stay
  // irreversible + forward-fix, exactly like 0033).
  assert.doesNotMatch(migration, /DROP\s+TABLE/iu);
  const dropMigration = readText(
    "database/migrations/postgres/0034_drop_iam_user_official_account.up.sql",
  );
  assert.match(dropMigration, /^-- reversible: false$/mu);
  assert.match(dropMigration, /^-- rollback: forward-fix/mu);
  assert.match(dropMigration, /DROP TABLE IF EXISTS iam_user_official_account/u);
  assert.match(
    baseline,
    /-- folded migration: migrations\/postgres\/0034_drop_iam_user_official_account\.up\.sql/u,
  );

  // The 0033 defect the real-database rehearsal exposed: it created the WeChat
  // client (and its web surface) before isolating a provider-identity conflict,
  // leaving an enabled client no account references. 0035 is the forward fix;
  // it must stay irreversible and forward-fix, and never drop a table.
  const cleanupMigration = readText(
    "database/migrations/postgres/0035_official_account_orphan_client_cleanup.up.sql",
  );
  assert.match(cleanupMigration, /^-- reversible: false$/mu);
  assert.match(cleanupMigration, /^-- rollback: forward-fix/mu);
  assert.doesNotMatch(cleanupMigration, /DROP\s+TABLE/iu);
  assert.match(cleanupMigration, /DELETE FROM iam_oauth_surface/u);
  assert.match(cleanupMigration, /DELETE FROM iam_oauth_client/u);
  assert.match(
    cleanupMigration,
    /NOT EXISTS \(\s*SELECT 1 FROM iam_oauth_resource_account ra\s*WHERE ra\.oauth_client_id = c\.id\s*\)/u,
    "0035 must only delete clients no resource account references",
  );
  assert.match(
    baseline,
    /-- folded migration: migrations\/postgres\/0035_official_account_orphan_client_cleanup\.up\.sql/u,
  );
});

test("oauth resource-account access mode is canonicalized and constrained (0036)", () => {
  const baseline = readText("database/ddl/baseline/postgres/0001_iam_baseline.sql");
  const migration = readText(
    "database/migrations/postgres/0036_iam_oauth_resource_account_access_mode_canonical.up.sql",
  );

  assert.match(migration, /^-- reversible: false$/mu);
  assert.match(migration, /^-- rollback: forward-fix/mu);
  // The retired spelling is rewritten in place, never dropped or coalesced to a
  // different posture.
  assert.match(migration, /SET access_mode = 'operator_authorized_account'/u);
  assert.match(migration, /WHERE access_mode = 'operator_managed'/u);
  // The canonical pair is enforced by the database, not only by readers.
  assert.match(migration, /ADD CONSTRAINT ck_iam_oauth_resource_account_access_mode/u);
  assert.match(
    migration,
    /CHECK \(access_mode IN \('self_managed_account', 'operator_authorized_account'\)\)/u,
  );
  assert.match(
    baseline,
    /-- folded migration: migrations\/postgres\/0036_iam_oauth_resource_account_access_mode_canonical\.up\.sql/u,
  );

  // The write boundary must canonicalize before the insert, or older admin
  // clients would trip the new constraint.
  const backend = readText("crates/sdkwork-routes-iam-backend-api/src/oauth_handlers.impl.rs");
  assert.match(backend, /fn canonical_access_mode\(value: &str\) -> Option<&'static str>/u);
  assert.match(backend, /"operator_authorized_account" \| "operator_managed"/u);
});

test("official-account migration orphan ledger is written by 0033 and retired by 0038", () => {
  const ledgerTable = "iam_official_account_migration_orphan";
  const migrationName = "0033_official_account_unification.up.sql";
  const migrationDir = "database/migrations/postgres";
  const baseline = readText("database/ddl/baseline/postgres/0001_iam_baseline.sql");

  // Every legacy row the unification cannot carry over is isolated, not silently
  // skipped: 0033 must create the ledger, insert into it, and report the count.
  const migration = readText(`${migrationDir}/${migrationName}`);
  assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${ledgerTable}`, "u"));
  assert.match(migration, new RegExp(`INSERT INTO ${ledgerTable}`, "u"));
  assert.match(migration, /reason/u);
  assert.match(migration, /RAISE NOTICE/u);
  assert.match(migration, /provider_account_conflict/u);

  // No other migration may know about it.
  for (const file of fs.readdirSync(path.join(iamRoot, migrationDir)).filter((name) => name.endsWith(".up.sql"))) {
    // 0033 writes the ledger; 0034 and 0038 retire the second official-account
    // system. No other migration may know about a table the runtime never owns.
    if (file === migrationName || file.startsWith("0034_") || file.startsWith("0038_")) {
      continue;
    }
    assert.doesNotMatch(
      readText(`${migrationDir}/${file}`),
      new RegExp(ledgerTable, "u"),
      `${file} must not reference the migration orphan ledger`,
    );
  }

  // 0038 retires the ledger with the same fail-closed rule 0034 documents for the
  // legacy table: it never drops unreviewed evidence.
  const retirement = readText(
    `${migrationDir}/0038_retire_official_account_migration_orphan.up.sql`,
  );
  assert.match(retirement, new RegExp(`DROP TABLE IF EXISTS ${ledgerTable}`, "u"));
  assert.match(retirement, /RAISE EXCEPTION/u);

  // The baseline only carries it inside the folded 0033 block.
  const foldedMarker = baseline.indexOf(`-- folded migration: migrations/postgres/${migrationName}`);
  assert.ok(foldedMarker >= 0, "baseline must carry the folded 0033 block");
  assert.ok(
    baseline.indexOf(ledgerTable) > foldedMarker,
    "the orphan ledger may only appear in the baseline through the folded 0033 block",
  );

  // No runtime handler may read or write it: it is migration evidence.
  const runtimeDirs = [
    "crates/sdkwork-routes-iam-app-api/src",
    "crates/sdkwork-routes-iam-backend-api/src",
    "crates/sdkwork-routes-iam-open-api/src",
    "crates/sdkwork-iam-web-adapter/src",
    "crates/sdkwork-iam-directory-repository-sqlx/src",
  ];
  for (const dir of runtimeDirs) {
    for (const file of fs.readdirSync(path.join(iamRoot, dir)).filter((name) => name.endsWith(".rs"))) {
      assert.doesNotMatch(
        readText(`${dir}/${file}`),
        new RegExp(ledgerTable, "u"),
        `${dir}/${file} must not read or write the migration orphan ledger`,
      );
    }
  }
});


test("IAM database seed hooks always provision the bootstrap admin and gate only its credential", () => {
  const databaseModule = readText("crates/sdkwork-iam-database-host/src/iam_database_module.rs");
  const databaseHostLib = readText("crates/sdkwork-iam-database-host/src/lib.rs");
  const bootstrapOperator = readText("crates/sdkwork-iam-bootstrap/src/bootstrap_operator.rs");

  assert.match(databaseModule, /ensure_postgres_bootstrap_admin_user/u);
  assert.match(databaseHostLib, /ensure_postgres_bootstrap_admin_user/u);
  assert.match(bootstrapOperator, /DEFAULT_BOOTSTRAP_ADMIN_USERNAME/u);
  assert.match(bootstrapOperator, /DEFAULT_BOOTSTRAP_ADMIN_EMAIL/u);
  assert.match(bootstrapOperator, /PLATFORM_SUPER_ADMIN_ROLE_CODE/u);
  assert.match(bootstrapOperator, /bootstrap_admin_is_fully_provisioned/u);
  assert.match(bootstrapOperator, /rb\.principal_kind = 'user'/u);
  assert.match(bootstrapOperator, /rb\.scope_kind = 'tenant'/u);
  assert.match(bootstrapOperator, /p\.code = '\*'/u);
  assert.match(bootstrapOperator, /SDKWORK_IAM_BOOTSTRAP_PASSWORD_ENV/u);
  assert.match(bootstrapOperator, /if let Some\(password\) = password\.as_deref\(\)/u);
});

test("IAM database seed hooks provision the operations administrator from its own password env", () => {
  const databaseModule = readText("crates/sdkwork-iam-database-host/src/iam_database_module.rs");
  const databaseHostLib = readText("crates/sdkwork-iam-database-host/src/lib.rs");
  const bootstrapOperator = readText("crates/sdkwork-iam-bootstrap/src/bootstrap_operator.rs");

  for (const source of [databaseModule, databaseHostLib]) {
    assert.match(source, /ensure_postgres_bootstrap_operator_user/u);
  }
  assert.match(bootstrapOperator, /DEFAULT_BOOTSTRAP_OPERATOR_USERNAME/u);
  assert.match(bootstrapOperator, /DEFAULT_BOOTSTRAP_OPERATOR_EMAIL/u);
  assert.match(bootstrapOperator, /PLATFORM_SYSTEM_ADMIN_ROLE_CODE/u);
  assert.match(bootstrapOperator, /SDKWORK_IAM_OPERATOR_PASSWORD_ENV/u);
  // The operations administrator must never inherit the super-admin bootstrap secret.
  assert.doesNotMatch(
    bootstrapOperator,
    /read_env_trimmed\(SDKWORK_IAM_OPERATOR_PASSWORD_ENV\)\s*\.or_else/u,
  );
});

test("IAM component spec declares DATABASE_FRAMEWORK_SPEC and database verification", () => {
  const componentSpec = JSON.parse(readText("specs/component.spec.json"));
  const canonicalFiles = (componentSpec.canonicalSpecs ?? []).map((entry) => entry.file);
  assert.ok(canonicalFiles.includes("DATABASE_FRAMEWORK_SPEC.md"));
  assert.match(componentSpec.integration?.database ?? "", /sdkwork-iam-database-host/u);
  assert.ok((componentSpec.verification?.commands ?? []).includes("pnpm run check:database"));
});

/**
 * Folded-block ledger.
 *
 * `DATABASE_FRAMEWORK_SPEC.md` section 7.5 keeps the primary baseline as the
 * bootstrap anchor while the ordered migration set stays the upgrade path. The
 * legacy pre-template model is retired completely: `iam_application` and
 * `iam_application_package` are neither declared nor dropped by the baseline,
 * and the whole folded `0006` block is gone - it only re-declared index
 * statements the canonical section already declares, so removing it changes no
 * schema.
 *
 * Decided consequence: an install created before the template model is no
 * longer converged by the baseline, and a `0006` source migration restored
 * from history would re-introduce both the legacy drops and the duplicate
 * index declarations. Restore it only with a deliberate review, not by copying
 * the old bytes back.
 *
 * The ordered block list is pinned on purpose. Ten blocks are dangling (their
 * source migrations were deleted while the folded blocks stayed), which
 * `tools/fold-migration-into-baseline.mjs` reports as `[missing-source]` and
 * calls a lifecycle defect to repair. Repairing it is a reviewed change that
 * updates this ledger; until then the ledger turns a silent block deletion,
 * reorder, or duplicate into a failing test.
 */
const FOLDED_BLOCK_ORDER = [
  "migrations/postgres/0010_iam_api_key_runtime_context.up.sql",
  "migrations/postgres/0011_iam_tenant_application_org_template_unique.up.sql",
  "migrations/postgres/0012_iam_service_account_credentials.up.sql",
  "migrations/postgres/0013_iam_session_principal_compatibility.up.sql",
  "migrations/postgres/0008_iam_query_performance_indexes.up.sql",
  "migrations/postgres/0009_wechat_identity_scope.up.sql",
  "migrations/postgres/0012_iam_service_account_credentials.up.sql",
  "migrations/postgres/0014_iam_scan_login_config.up.sql",
  "migrations/postgres/0015_iam_scan_login_modes.up.sql",
  "migrations/postgres/0016_iam_provider_accounts.up.sql",
  "migrations/postgres/0017_iam_provider_account_scopes.up.sql",
  "migrations/postgres/0018_iam_provider_account_organization_scope_and_identity_kind.up.sql",
  "migrations/postgres/0024_iam_user_official_account.up.sql",
  "migrations/postgres/0031_iam_user_official_account_domains.up.sql",
  "migrations/postgres/0032_iam_role_catalog_localization.up.sql",
  "migrations/postgres/0033_official_account_unification.up.sql",
  "migrations/postgres/0034_drop_iam_user_official_account.up.sql",
  "migrations/postgres/0035_official_account_orphan_client_cleanup.up.sql",
  "migrations/postgres/0036_iam_oauth_resource_account_access_mode_canonical.up.sql",
  "migrations/postgres/0049_iam_department_ordering_and_member_scope.up.sql",
  "migrations/postgres/0050_iam_department_version.up.sql",
];

const FOLDED_BLOCKS_WITHOUT_SOURCE = [
  "migrations/postgres/0008_iam_query_performance_indexes.up.sql",
  "migrations/postgres/0009_wechat_identity_scope.up.sql",
  "migrations/postgres/0010_iam_api_key_runtime_context.up.sql",
  "migrations/postgres/0011_iam_tenant_application_org_template_unique.up.sql",
  "migrations/postgres/0012_iam_service_account_credentials.up.sql",
  "migrations/postgres/0013_iam_session_principal_compatibility.up.sql",
  "migrations/postgres/0014_iam_scan_login_config.up.sql",
  "migrations/postgres/0015_iam_scan_login_modes.up.sql",
];

function foldedBlocks() {
  const lf = readText("database/ddl/baseline/postgres/0001_iam_baseline.sql").replace(/\r\n/g, "\n");
  const markers = [...lf.matchAll(/^-- folded migration: (\S+)$/gm)].map((match) => ({
    path: match[1],
    lineStart: match.index,
  }));
  return markers.map((marker, index) => {
    const start = marker.lineStart + `-- folded migration: ${marker.path}`.length + 1;
    const next = markers[index + 1];
    const end = next ? next.lineStart : lf.length;
    return { path: marker.path, body: lf.slice(start, end) };
  });
}

test("baseline carries no legacy application residue", () => {
  const baseline = readText("database/ddl/baseline/postgres/0001_iam_baseline.sql");

  // The retired tables are neither declared nor dropped nor referenced in any
  // other form. `(?![_a-z])` keeps the live `iam_application_template*` tables
  // and their indexes out of the check.
  assert.equal(
    (baseline.match(/iam_application(?:_package)?(?![_a-z])/gu) ?? []).length,
    0,
    "the retired iam_application / iam_application_package tables must not appear in the baseline at all",
  );

  // The whole folded 0006 block is gone: all six statements in it only
  // re-declared indexes that the canonical section already declares.
  assert.ok(
    !baseline.includes("0006_iam_application_standard"),
    "the folded 0006 block must not come back: its statements are already canonical",
  );
  assert.equal(
    foldedBlocks().filter((block) => block.path.includes("0006_iam_application_standard")).length,
    0,
  );

  // The retired Studio catalog and the legacy personnel table are retired as
  // debt too: no declaration, no retirement DDL, no mention may survive.
  assert.equal(
    (baseline.match(/studio_/gu) ?? []).length,
    0,
    "baseline must not mention the retired studio_* catalog",
  );
  assert.equal(
    (baseline.match(/iam_organization_member\b/gu) ?? []).length,
    0,
    "baseline must not mention the retired iam_organization_member table",
  );
});

test("baseline folded-block ledger pins the known dangling upgrade path", () => {
  const blocks = foldedBlocks();
  assert.deepEqual(
    blocks.map((block) => block.path),
    FOLDED_BLOCK_ORDER,
    "folded block set, order, and multiplicity are pinned; repairing the lifecycle must update this ledger",
  );

  const dangling = [
    ...new Set(
      FOLDED_BLOCK_ORDER.filter(
        (blockPath) => !fs.existsSync(path.join(iamRoot, "database", blockPath)),
      ),
    ),
  ].sort();
  assert.deepEqual(
    dangling,
    FOLDED_BLOCKS_WITHOUT_SOURCE,
    "the dangling folded-block set is pinned; restoring a source migration must update this ledger",
  );
});

test("folded 0012 replay is split around 0013 and currently overrides it", () => {
  const blocks = foldedBlocks();
  const positionsOf0012 = blocks
    .map((block, index) => ({ path: block.path, index }))
    .filter((entry) => entry.path.includes("0012_iam_service_account_credentials"));
  const indexOf0013 = blocks.findIndex((block) =>
    block.path.includes("0013_iam_session_principal_compatibility"),
  );

  // Known defect, pinned rather than blessed: migration 0013 drops NOT NULL on
  // `iam_session.principal_id`, but a second, partial replay of 0012 sits after
  // it and sets NOT NULL back. The effective end state therefore contradicts the
  // migration order. Merging the two 0012 blocks or moving the second one before
  // 0013 silently flips `principal_id` to nullable - fix that deliberately (and
  // re-run the lifecycle against a real database), then update this test.
  assert.equal(
    positionsOf0012.length,
    2,
    "0012_iam_service_account_credentials is folded twice; see the note above before changing that",
  );
  assert.ok(
    positionsOf0012[0].index < indexOf0013 && indexOf0013 < positionsOf0012[1].index,
    "the second 0012 block must stay after 0013 until the contradiction is resolved deliberately",
  );
  assert.match(blocks[indexOf0013].body, /ALTER COLUMN principal_id DROP NOT NULL;/u);
  assert.match(blocks[positionsOf0012[1].index].body, /ALTER COLUMN principal_id SET NOT NULL;/u);
});
