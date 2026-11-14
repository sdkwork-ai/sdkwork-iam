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
