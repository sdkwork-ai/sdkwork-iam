#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const databaseRoot = path.join(root, 'database');
const baselinePath = path.join(databaseRoot, 'ddl/baseline/postgres/0001_iam_baseline.sql');
const rustLibPath = path.join(root, 'crates/sdkwork-iam-directory-repository-sqlx/src/lib.rs');

function readYamlTableNames(schemaYaml) {
  return [...schemaYaml.matchAll(/- name: (iam_[a-z0-9_]+)/g)].map((match) => match[1]).sort();
}

function readRegistryTableNames(tableRegistry) {
  return tableRegistry.tables.map((entry) => entry.table_name).sort();
}

// P4 is complete: `0034_drop_iam_user_official_account` retired the legacy
// per-user table and `0038_retire_official_account_migration_orphan` retired the
// migration-only orphan ledger. Neither is an active contract table any more, so
// no table may be materialized without being owned by `IamTables`.
const NON_CATALOG_TABLES = [];

function readRustCatalogTableNames() {
  const source = fs.readFileSync(rustLibPath, 'utf8');
  return [...source.matchAll(/pub const [A-Z0-9_]+: &'static str =\s*"(iam_[a-z0-9_]+)";/g)]
    .map((match) => match[1])
    .sort();
}

function readIamContractsFoundationTableNames() {
  const contractsPath = path.join(
    root,
    'apps/sdkwork-iam-common/packages/sdkwork-iam-contracts/src/index.ts',
  );
  const source = fs.readFileSync(contractsPath, 'utf8');
  const tablesBlock = source.match(/export const SDKWORK_IAM_TABLES = \{([\s\S]*?)\} as const;/);
  assert.ok(tablesBlock, 'SDKWORK_IAM_TABLES must be declared in iam-contracts');
  return [...tablesBlock[1].matchAll(/:\s*"(iam_[a-z0-9_]+)"/g)]
    .map((match) => match[1])
    .sort();
}

function collectDdlTableNames() {
  const tableNames = [];
  const present = new Set();

  // Ordered replay: `CREATE TABLE` adds a name,
  // `ALTER TABLE ... RENAME TO ...` replaces it, `DROP TABLE` removes it. A
  // forward rename always leaves the original `CREATE` in the immutable
  // baseline, so a create-only scan would report the renamed table as missing.
  function ingestDirectory(relativeDir, suffix) {
    const absoluteDir = path.join(databaseRoot, relativeDir);
    if (!fs.existsSync(absoluteDir)) {
      return;
    }
    for (const entry of fs.readdirSync(absoluteDir).filter((name) => name.endsWith(suffix)).sort()) {
      const sql = fs.readFileSync(path.join(absoluteDir, entry), 'utf8');
      const statements =
        /CREATE TABLE(?: IF NOT EXISTS)?\s+([a-z0-9_]+)|ALTER TABLE(?: IF EXISTS)?\s+([a-z0-9_]+)\s+RENAME TO\s+([a-z0-9_]+)|DROP TABLE(?: IF EXISTS)?\s+([a-z0-9_]+)/gi;
      for (const match of sql.matchAll(statements)) {
        const [, created, renamedFrom, renamedTo, dropped] = match;
        if (created) {
          if (!present.has(created)) {
            present.add(created);
            tableNames.push(created);
          }
          continue;
        }
        if (renamedFrom) {
          const index = tableNames.indexOf(renamedFrom);
          present.delete(renamedFrom);
          present.add(renamedTo);
          if (index >= 0) {
            tableNames[index] = renamedTo;
          } else {
            tableNames.push(renamedTo);
          }
          continue;
        }
        if (dropped) {
          present.delete(dropped);
          const index = tableNames.indexOf(dropped);
          if (index >= 0) {
            tableNames.splice(index, 1);
          }
        }
      }
    }
  }

  ingestDirectory('ddl/baseline/postgres', '.sql');
  ingestDirectory('migrations/postgres', '.up.sql');
  // A migration folded into the baseline is replayed by both scans. Ordered
  // replay can therefore observe the same rename twice; the table set is what
  // the contract compares, so duplicate names collapse here.
  return [...new Set(tableNames)].sort();
}

const schemaYaml = fs.readFileSync(path.join(databaseRoot, 'contract/schema.yaml'), 'utf8');
const tableRegistry = JSON.parse(
  fs.readFileSync(path.join(databaseRoot, 'contract/table-registry.json'), 'utf8'),
);
const baselineSql = fs.readFileSync(baselinePath, 'utf8');
const rustLibSource = fs.readFileSync(rustLibPath, 'utf8');

const schemaTables = readYamlTableNames(schemaYaml);
const registryTables = readRegistryTableNames(tableRegistry);
const rustTables = readRustCatalogTableNames();
const ddlTables = collectDdlTableNames();
const foundationTables = readIamContractsFoundationTableNames();
const registrySet = new Set(registryTables);

assert.deepEqual(
  schemaTables,
  registryTables,
  'schema.yaml and table-registry.json must declare the same IAM tables',
);
for (const nonCatalogTable of NON_CATALOG_TABLES) {
  assert.ok(
    registrySet.has(nonCatalogTable),
    `${nonCatalogTable} must stay declared while it is still materialized`,
  );
  assert.ok(
    !rustTables.includes(nonCatalogTable),
    `${nonCatalogTable} must not be owned by the IamTables Rust catalog`,
  );
}
assert.deepEqual(
  rustTables,
  registryTables.filter((tableName) => !NON_CATALOG_TABLES.includes(tableName)),
  'IamTables Rust catalog must match the active database contract registries',
);
// Tables a historical folded block still creates so a replay of the migration
// history is faithful, but that a later approved migration drops. They must stay
// out of the active contract registries; the materialized set is compared after
// removing them because the DDL scan sees the historical CREATE.
const DROPPED_LEGACY_TABLES = [
  'iam_user_official_account',
  'iam_official_account_migration_orphan',
];

assert.deepEqual(
  ddlTables.filter((tableName) => !DROPPED_LEGACY_TABLES.includes(tableName)),
  registryTables,
  'baseline + postgres migrations must materialize the same IAM tables as contract registries',
);
assert.equal(registryTables.length, 73, 'IAM database contract must currently own 73 tables');

const enterpriseSeatUp = fs
  .readFileSync(
    path.join(databaseRoot, 'migrations/postgres/0056_iam_enterprise_seat_management.up.sql'),
    'utf8',
  )
  .replace(/\r+\n/g, '\n');
const enterpriseSeatDown = fs
  .readFileSync(
    path.join(databaseRoot, 'migrations/postgres/0056_iam_enterprise_seat_management.down.sql'),
    'utf8',
  )
  .replace(/\r+\n/g, '\n');
const normalizedBaseline = baselineSql.replace(/\r+\n/g, '\n');
const foldedMarker =
  '-- folded migration: migrations/postgres/0056_iam_enterprise_seat_management.up.sql';
const migrationBody = enterpriseSeatUp
  .slice(enterpriseSeatUp.indexOf('BEGIN;') + 'BEGIN;'.length, enterpriseSeatUp.lastIndexOf('COMMIT;'))
  .trim();
const foldedBody = normalizedBaseline
  .slice(normalizedBaseline.indexOf(foldedMarker) + foldedMarker.length)
  .trim();
assert.equal(foldedBody, migrationBody, '0056 baseline fold must exactly match the upgrade migration');

const roleIntegrityUp = fs
  .readFileSync(
    path.join(databaseRoot, 'migrations/postgres/0057_iam_role_relation_integrity.up.sql'),
    'utf8',
  )
  .replace(/\r+\n/g, '\n');
assert.match(
  normalizedBaseline,
  /CREATE TABLE IF NOT EXISTS iam_role \([\s\S]*?UNIQUE \(tenant_id, id\)[\s\S]*?\);/u,
  'tenant-scoped role identity must back the composite RBAC foreign key',
);
assert.match(
  normalizedBaseline,
  /CREATE TABLE IF NOT EXISTS iam_role_permission \([\s\S]*?UNIQUE \(tenant_id, role_id, permission_id\)[\s\S]*?FOREIGN KEY \(tenant_id, role_id\)[\s\S]*?REFERENCES iam_role \(tenant_id, id\) ON DELETE RESTRICT[\s\S]*?FOREIGN KEY \(permission_id\)[\s\S]*?REFERENCES iam_permission \(id\) ON DELETE RESTRICT/u,
  'role-permission grants must be unique and cannot dangle or cascade authorization history',
);
assert.match(
  normalizedBaseline,
  /CREATE TABLE IF NOT EXISTS iam_role_binding \([\s\S]*?UNIQUE \(tenant_id, role_id, principal_kind, principal_id, scope_kind, scope_id\)[\s\S]*?FOREIGN KEY \(tenant_id, role_id\)[\s\S]*?REFERENCES iam_role \(tenant_id, id\) ON DELETE RESTRICT/u,
  'role bindings must preserve one revocable relationship per principal and scope',
);
for (const tableName of ['iam_role_permission', 'iam_role_binding']) {
  assert.match(
    roleIntegrityUp,
    new RegExp(`ALTER TABLE ${tableName}[\\s\\S]*?FOREIGN KEY \\(tenant_id, role_id\\)[\\s\\S]*?REFERENCES iam_role \\(tenant_id, id\\)[\\s\\S]*?ON DELETE RESTRICT NOT VALID`, 'u'),
    `${tableName} upgrade must add a validated tenant-scoped role reference`,
  );
  assert.match(
    roleIntegrityUp,
    new RegExp(`ALTER TABLE ${tableName}[\\s\\S]*?VALIDATE CONSTRAINT`, 'u'),
    `${tableName} foreign keys must be validated before migration completion`,
  );
}
assert.match(
  roleIntegrityUp,
  /LEFT JOIN iam_role r ON r\.tenant_id = rp\.tenant_id AND r\.id = rp\.role_id[\s\S]*?RAISE EXCEPTION/u,
  'migration must refuse orphan role-permission rows instead of silently deleting them',
);
assert.doesNotMatch(
  roleIntegrityUp,
  /DELETE FROM|TRUNCATE|CASCADE/u,
  'integrity migration must not destroy or cascade existing authorization records',
);

const sqlScope = JSON.parse(
  fs.readFileSync(path.join(databaseRoot, 'contract/sql-scope.json'), 'utf8'),
);
assert.equal(sqlScope.tables.iam_application_enterprise_seat_policy, 'tenant');
assert.equal(sqlScope.tables.iam_application_enterprise_seat_blacklist, 'tenant');
assert.match(
  enterpriseSeatUp,
  /CREATE UNIQUE INDEX ux_iam_application_enterprise_seat_policy_department\s+ON iam_application_enterprise_seat_policy \(order_id, department_id\);/u,
  'one policy per order and department must not depend on auto/login mode',
);
assert.match(
  normalizedBaseline,
  /CREATE UNIQUE INDEX IF NOT EXISTS ux_iam_application_enterprise_seat_active\s+ON iam_application_enterprise_seat \(order_id, user_id\)\s+WHERE seat_status = 'active';/u,
  'the pre-existing partial unique index must keep one active seat per user and order',
);

const reconcileBody = enterpriseSeatUp.slice(
  enterpriseSeatUp.indexOf('CREATE OR REPLACE FUNCTION iam_reconcile_enterprise_seats('),
  enterpriseSeatUp.indexOf('$$;', enterpriseSeatUp.indexOf('CREATE OR REPLACE FUNCTION iam_reconcile_enterprise_seats(')),
);
assert.match(reconcileBody, /o\.order_status = 'active'/u);
assert.match(reconcileBody, /o\.deleted_at IS NULL/u);
assert.match(reconcileBody, /o\.authorization_mode = 'seat'/u);
assert.match(reconcileBody, /o\.expires_at IS NULL OR o\.expires_at > NOW\(\)/u);
assert.match(reconcileBody, /ORDER BY o\.id FOR UPDATE/u);
assert.doesNotMatch(
  reconcileBody,
  /sdkwork\.enterprise_seat_admin/u,
  'an admin conversion switch must never bypass capacity or blacklist reconciliation',
);
assert.match(reconcileBody, /p_include_login OR chosen\.allocation_type = 'auto'/u);
assert.match(reconcileBody, /NOT EXISTS \(SELECT 1 FROM iam_application_enterprise_seat_blacklist/u);
assert.match(reconcileBody, /AND s\.user_id = u\.id AND s\.seat_status = 'active'/u);
assert.match(
  reconcileBody,
  /s\.allocation_method <> 'manual' OR EXISTS \([\s\S]*?iam_application_enterprise_seat_blacklist/u,
  'department changes must preserve manual seats while blacklist reconciliation reclaims them',
);
assert.equal(
  (reconcileBody.match(/ORDER BY c\.depth, p\.id/g) ?? []).length,
  2,
  'allocation and release must share deterministic nearest-department/policy-id priority',
);
assert.equal(
  (reconcileBody.match(/da\.status = 'active' AND da\.is_primary = 1/g) ?? []).length,
  2,
  'allocation and release must use the active primary department assignment',
);
assert.match(reconcileBody, /om\.status = 'active'/u);
assert.match(reconcileBody, /org\.id = p\.organization_id AND org\.status = 'active'/u);
assert.match(reconcileBody, /dept\.id = p\.department_id\s+AND dept\.status = 'active'/u);
const policyReconcileBody = enterpriseSeatUp.slice(
  enterpriseSeatUp.indexOf('CREATE OR REPLACE FUNCTION iam_enterprise_policy_reconcile()'),
  enterpriseSeatUp.indexOf('$$;', enterpriseSeatUp.indexOf('CREATE OR REPLACE FUNCTION iam_enterprise_policy_reconcile()')),
);
assert.match(policyReconcileBody, /NEW\.application_id = OLD\.application_id AND NEW\.organization_id = OLD\.organization_id/u);

for (const trigger of [
  'trg_iam_tenant_member_enterprise_seats',
  'trg_iam_department_assignment_enterprise_seats',
  'trg_iam_organization_membership_enterprise_seats',
  'trg_iam_user_enterprise_seats',
]) {
  assert.match(enterpriseSeatUp, new RegExp(`CREATE TRIGGER ${trigger}`, 'u'));
}
assert.match(
  reconcileBody,
  /NOT EXISTS \(SELECT 1 FROM iam_user u WHERE u\.tenant_id = p_tenant_id\s+AND u\.id = v_seat\.user_id AND u\.status = 'active'\)/u,
  'user disablement or deletion must release department-policy seats',
);
const userReconcileBody = enterpriseSeatUp.slice(
  enterpriseSeatUp.indexOf('CREATE OR REPLACE FUNCTION iam_enterprise_user_reconcile()'),
  enterpriseSeatUp.indexOf('$$;', enterpriseSeatUp.indexOf('CREATE OR REPLACE FUNCTION iam_enterprise_user_reconcile()')),
);
assert.match(userReconcileBody, /OLD\.tenant_id, OLD\.id, FALSE/u);
assert.match(userReconcileBody, /NEW\.tenant_id, NEW\.id, FALSE/u);
assert.doesNotMatch(userReconcileBody, /\b(?:OLD|NEW)\.user_id\b/u, 'iam_user exposes id, not user_id');
const blacklistBody = enterpriseSeatUp.slice(
  enterpriseSeatUp.indexOf('CREATE OR REPLACE FUNCTION iam_enterprise_blacklist_reconcile()'),
  enterpriseSeatUp.indexOf('$$;', enterpriseSeatUp.indexOf('CREATE OR REPLACE FUNCTION iam_enterprise_blacklist_reconcile()')),
);
assert.match(
  enterpriseSeatUp,
  /CREATE TRIGGER trg_iam_enterprise_blacklist_reconcile AFTER INSERT OR UPDATE OR DELETE/u,
);
assert.match(blacklistBody, /WHERE tenant_id = NEW\.tenant_id AND order_id = NEW\.order_id\s+AND user_id = NEW\.user_id AND seat_status = 'active'/u);
assert.match(blacklistBody, /OLD\.tenant_id, OLD\.user_id, FALSE, OLD\.application_id/u);
assert.doesNotMatch(blacklistBody, /allocation_method/u, 'blacklist insertion must reclaim manual and policy seats alike');
assert.doesNotMatch(enterpriseSeatDown, /\bDELETE\s+FROM\b/iu, 'down migration must not delete append-only ledger events');
assert.match(enterpriseSeatDown, /RAISE EXCEPTION/u);
assert.ok(
  enterpriseSeatDown.indexOf('RAISE EXCEPTION') < enterpriseSeatDown.indexOf('DROP TRIGGER'),
  'data-preservation guards must run before any down-migration DDL',
);
assert.match(enterpriseSeatDown, /DROP FUNCTION IF EXISTS iam_reconcile_enterprise_seats\(TEXT, TEXT, BOOLEAN, TEXT\);/u);

for (const tableName of foundationTables.filter((name) => !DROPPED_LEGACY_TABLES.includes(name))) {
  assert.ok(
    registrySet.has(tableName),
    `SDKWORK_IAM_TABLES foundation table ${tableName} must exist in database contract registry`,
  );
}

for (const tableName of registryTables) {
  assert.match(tableName, /^iam_[a-z0-9_]+$/, `${tableName} must follow iam_ table prefix`);
}

assert.match(
  rustLibSource,
  /include_str!\("\.\.\/\.\.\/\.\.\/database\/ddl\/baseline\/postgres\/0001_iam_baseline\.sql"\)/,
  'iam_database_baseline_sql must embed application-root baseline DDL',
);
assert.doesNotMatch(
  baselineSql,
  /crates\/sdkwork-iam-directory-repository-sqlx\/migrations\//,
  'baseline must not reference removed crate-local migration paths',
);

const crateMigrationsDir = path.join(
  root,
  'crates/sdkwork-iam-directory-repository-sqlx/migrations',
);
assert.equal(
  fs.existsSync(crateMigrationsDir),
  false,
  'crate-local IAM migrations directory must not exist; database/ owns lifecycle SQL',
);

const databaseManifest = JSON.parse(
  fs.readFileSync(path.join(databaseRoot, 'database.manifest.json'), 'utf8'),
);
const seedManifest = JSON.parse(
  fs.readFileSync(path.join(databaseRoot, 'seeds/seed.manifest.json'), 'utf8'),
);

assert.equal(
  databaseManifest.lifecycle.seedOnBoot,
  true,
  'IAM reference data (default subject, platform application, role catalog, persona catalog) is startup-required; seedOnBoot must stay true so a fresh deployment initializes it',
);

const operationalSeeds = seedManifest.profiles[databaseManifest.lifecycle.defaultSeedProfile].common;
for (const seedFile of [
  '002_default_iam_subject.sql',
  '003_iam_application_bootstrap_seed.sql',
  '004_iam_role_catalog_seed.sql',
  '005_iam_persona_catalog_seed.sql',
]) {
  assert.ok(
    operationalSeeds.includes(seedFile),
    `${databaseManifest.lifecycle.defaultSeedProfile} seed profile must ship startup reference data ${seedFile}`,
  );
  assert.ok(
    fs.existsSync(path.join(databaseRoot, 'seeds/common', seedFile)),
    `startup reference seed ${seedFile} must exist`,
  );
}

const personaCatalogSeed = fs.readFileSync(
  path.join(databaseRoot, 'seeds/common/005_iam_persona_catalog_seed.sql'),
  'utf8',
);
for (const code of ['learner', 'employee', 'teacher', 'postgraduate', 'k12']) {
  assert.match(
    personaCatalogSeed,
    new RegExp(`'${code}'`),
    `persona catalog seed must ship the picker code ${code}`,
  );
}

for (const locale of databaseManifest.lifecycle.activeSeedLocales) {
  const localeFiles = seedManifest.profiles[databaseManifest.lifecycle.defaultSeedProfile].locales[locale] ?? [];
  assert.ok(
    localeFiles.some((file) => file.includes('persona_labels')),
    `active seed locale ${locale} must ship persona display labels`,
  );
}

process.stdout.write('iam-database-contract-alignment.test.mjs passed\n');
