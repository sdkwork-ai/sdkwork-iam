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

function readRustCatalogTableNames() {
  const source = fs.readFileSync(rustLibPath, 'utf8');
  return [...source.matchAll(/pub const [A-Z0-9_]+: &'static str = "(iam_[a-z0-9_]+)";/g)]
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
  const seen = new Set();

  function ingestDirectory(relativeDir, suffix) {
    const absoluteDir = path.join(databaseRoot, relativeDir);
    if (!fs.existsSync(absoluteDir)) {
      return;
    }
    for (const entry of fs.readdirSync(absoluteDir).filter((name) => name.endsWith(suffix)).sort()) {
      const sql = fs.readFileSync(path.join(absoluteDir, entry), 'utf8');
      for (const match of sql.matchAll(/CREATE TABLE IF NOT EXISTS (iam_[a-z0-9_]+)/gi)) {
        const tableName = match[1];
        if (seen.has(tableName)) {
          continue;
        }
        seen.add(tableName);
        tableNames.push(tableName);
      }
    }
  }

  ingestDirectory('ddl/baseline/postgres', '.sql');
  ingestDirectory('migrations/postgres', '.up.sql');
  return tableNames.sort();
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
assert.deepEqual(
  rustTables,
  registryTables,
  'IamTables Rust catalog must match database contract registries',
);
assert.deepEqual(
  ddlTables,
  registryTables,
  'baseline + postgres migrations must materialize the same IAM tables as contract registries',
);
assert.equal(registryTables.length, 65, 'IAM database contract must currently own 65 tables');

for (const tableName of foundationTables) {
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
