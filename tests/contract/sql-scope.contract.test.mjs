#!/usr/bin/env node
/**
 * Self-test for the repository-local SQL scope gate
 * (`scripts/check-sql-tenant-scope.mjs`, `database/contract/sql-scope.json`).
 *
 * Proves the gate fails an unscoped tenant read/write/delete, accepts a scoped
 * statement, enforces both predicates for an organization-scoped table, and
 * honours a reviewed exception — then runs the same gate over this repository so
 * a regression in the contract or in a statement fails `check:database`.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { checkSqlTenantScope } from '../../scripts/check-sql-tenant-scope.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../..');

function write(root, relative, contents) {
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, contents, 'utf8');
}

function createFixture({ source, tables, exceptions = [] }) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'iam-sql-scope-'));
  write(root, 'database/ddl/baseline/postgres/0001_iam_baseline.sql', [
    'CREATE TABLE iam_widget (',
    '  id text PRIMARY KEY,',
    '  tenant_id text NOT NULL,',
    '  organization_id text NOT NULL DEFAULT \'0\',',
    '  name text',
    ');',
    '',
  ].join('\n'));
  write(root, 'crates/demo/src/lib.rs', source);
  write(root, 'database/contract/sql-scope.json', `${JSON.stringify({
    schemaVersion: 1,
    kind: 'sdkwork.database.sql-scope',
    module_id: 'iam',
    tables,
    exceptions,
  }, null, 2)}\n`);
  return root;
}

assert.equal(
  (() => {
    const root = createFixture({
      source: 'pub const Q: &str = "UPDATE iam_widget SET name = $2 WHERE id = $1";\n',
      tables: { iam_widget: 'tenant' },
    });
    try {
      return checkSqlTenantScope({ root }).violations.length;
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  })(),
  1,
  'an unscoped UPDATE of a tenant-owned table must be a violation',
);

assert.equal(
  (() => {
    const root = createFixture({
      source: 'pub const Q: &str = "UPDATE iam_widget SET name = $2 WHERE id = $1 AND tenant_id = $3";\n',
      tables: { iam_widget: 'tenant' },
    });
    try {
      return checkSqlTenantScope({ root }).violations.length;
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  })(),
  0,
  'a tenant-bound UPDATE passes',
);

assert.equal(
  (() => {
    const root = createFixture({
      source: 'pub const Q: &str = "DELETE FROM iam_widget WHERE tenant_id = $1";\n',
      tables: { iam_widget: 'organization' },
    });
    try {
      return checkSqlTenantScope({ root }).violations.length;
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  })(),
  1,
  'an organization-scoped DELETE must bind both tenant_id and organization_id',
);

assert.equal(
  (() => {
    const root = createFixture({
      source: 'pub const Q: &str = "SELECT id FROM iam_widget WHERE id = $1";\n',
      tables: { iam_widget: 'tenant' },
      exceptions: [{
        file: 'crates/demo/src/lib.rs',
        table: 'iam_widget',
        verbs: ['SELECT'],
        reason: 'fixture: opaque selector',
      }],
    });
    try {
      return checkSqlTenantScope({ root }).violations.length;
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  })(),
  0,
  'a reviewed exception suppresses exactly the matching statement',
);

const repository = checkSqlTenantScope({ root: repoRoot });
assert.deepEqual(
  repository.violations,
  [],
  `the IAM repository must satisfy its own SQL scope contract:\n${
    repository.violations.map((violation) =>
      `${violation.file}:${violation.line} ${violation.verb} ${violation.table} ${violation.reason}`,
    ).join('\n')}`,
);
assert.ok(repository.scanned > 0, 'the gate must scan scoped statements');
process.stdout.write(
  `sql scope contract ok (${repository.scanned} scoped statement(s), `
  + `${repository.exceptions} approved exception(s))\n`,
);
