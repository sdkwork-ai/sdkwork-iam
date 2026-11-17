/**
 * Unit and CLI tests for tools/backfill_installation_deploy_link.mjs.
 *
 * These tests never connect to a database. They cover the mapping contract, SQL
 * generation, the dry-run counters, the empty-mapping case, and conflict
 * detection (both mapping-internal and against an optional --current snapshot).
 *
 * Run: node --test tools/backfill_installation_deploy_link.test.mjs
 */

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildApplySql,
  buildPreflightSql,
  buildReportSql,
  buildUpdateStatements,
  classifyMapping,
  parseArguments,
  runCli,
  summarizePlan,
  validateCurrentSnapshot,
  validateMapping,
} from './backfill_installation_deploy_link.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, 'backfill_installation_deploy_link.mjs');
const TEMP_DIR = mkdtempSync(path.join(os.tmpdir(), 'iam-installation-backfill-'));
const TEMP_FILES = [];

function jsonFile(name, value) {
  const filePath = path.join(TEMP_DIR, name);
  writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
  TEMP_FILES.push(filePath);
  return filePath;
}

function runCliProcess(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

function captureIo() {
  let stdout = '';
  let stderr = '';
  return {
    io: {
      stdout: { write: (chunk) => (stdout += chunk) },
      stderr: { write: (chunk) => (stderr += chunk) },
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

after(() => {
  for (const filePath of TEMP_FILES) {
    rmSync(filePath, { force: true });
  }
  rmdirSync(TEMP_DIR);
});

const VALID_MAPPING = [
  { tenantId: '100001', installationAppId: 'app_100001', deployApplicationId: '410000000000000001' },
  { tenantId: '100001', installationAppId: 'sdkwork-drama', deployApplicationId: '410000000000000002' },
];

test('validateMapping accepts a well-formed mapping and trims values', () => {
  const result = validateMapping([
    { tenantId: ' 100001 ', installationAppId: ' app_100001 ', deployApplicationId: ' 410000000000000001 ' },
  ]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.entries, [
    { tenantId: '100001', appId: 'app_100001', deployApplicationId: '410000000000000001', index: 0 },
  ]);
});

test('validateMapping rejects a duplicate installation (same app_id twice)', () => {
  const result = validateMapping([
    { tenantId: '100001', installationAppId: 'app_100001', deployApplicationId: '410000000000000001' },
    { tenantId: '100001', installationAppId: 'app_100001', deployApplicationId: '410000000000000002' },
  ]);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /mapping\[1\]\.installationAppId "app_100001" duplicates mapping\[0\]/);
});

test('validateMapping rejects the same installation under a different tenant', () => {
  const result = validateMapping([
    { tenantId: '100001', installationAppId: 'app_shared', deployApplicationId: '410000000000000001' },
    { tenantId: '100002', installationAppId: 'app_shared', deployApplicationId: '410000000000000002' },
  ]);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /duplicates mapping\[0\].*one installation cannot be backfilled twice/);
});

test('validateMapping rejects a duplicate deployment application', () => {
  const result = validateMapping([
    { tenantId: '100001', installationAppId: 'app_a', deployApplicationId: '410000000000000009' },
    { tenantId: '100001', installationAppId: 'app_b', deployApplicationId: '410000000000000009' },
  ]);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /deployApplicationId "410000000000000009" duplicates mapping\[0\]/);
});

test('validateMapping reports missing, blank, and non-string fields together', () => {
  const result = validateMapping([
    { tenantId: '100001', installationAppId: 'app_a' },
    { tenantId: '   ', installationAppId: 'app_b', deployApplicationId: '410000000000000002' },
    { tenantId: 100001, installationAppId: 'app_c', deployApplicationId: '410000000000000003' },
  ]);
  assert.equal(result.entries.length, 0);
  assert.equal(result.errors.length, 3);
  assert.ok(result.errors.some((error) => /mapping\[0\]\.deployApplicationId is required/.test(error)));
  assert.ok(result.errors.some((error) => /mapping\[1\]\.tenantId must not be blank/.test(error)));
  assert.ok(result.errors.some((error) => /mapping\[2\]\.tenantId must be a non-empty string/.test(error)));
});

test('validateMapping rejects unknown fields to catch snake_case drift', () => {
  const result = validateMapping([
    { tenantId: '100001', installationAppId: 'app_a', deployApplicationId: '410000000000000001', tenant_id: 'x' },
  ]);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /unknown field "tenant_id"/);
});

test('validateMapping rejects a non-array document', () => {
  const result = validateMapping({ mapping: VALID_MAPPING });
  assert.equal(result.entries.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /must be a JSON array/);
});

test('validateMapping accepts a non-decimal deploy id but warns about it', () => {
  const result = validateMapping([
    { tenantId: '100001', installationAppId: 'app_a', deployApplicationId: 'deploy-platform' },
  ]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /not a decimal deployment application id/);
});

test('validateCurrentSnapshot treats a null export as an empty snapshot', () => {
  const result = validateCurrentSnapshot(null);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.rows, []);
});

test('validateCurrentSnapshot allows null links and rejects duplicate app ids', () => {
  const result = validateCurrentSnapshot([
    { tenantId: '100001', installationAppId: 'app_a', deployApplicationId: null },
    { tenantId: '100001', installationAppId: 'app_b', deployApplicationId: '410000000000000002' },
  ]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.rows, [
    { tenantId: '100001', appId: 'app_a', deployApplicationId: null },
    { tenantId: '100001', appId: 'app_b', deployApplicationId: '410000000000000002' },
  ]);

  const duplicate = validateCurrentSnapshot([
    { tenantId: '100001', installationAppId: 'app_a', deployApplicationId: '410000000000000002' },
    { tenantId: '100002', installationAppId: 'app_a', deployApplicationId: null },
  ]);
  assert.equal(duplicate.errors.length, 1);
  assert.match(duplicate.errors[0], /duplicates current\[0\]/);
});

test('buildApplySql guards every UPDATE with tenant_id, app_id, and IS NULL', () => {
  const entries = validateMapping(VALID_MAPPING).entries;
  const sql = buildApplySql(entries);
  assert.match(sql, /^-- Apply:/);
  assert.match(sql, /\nBEGIN;\n/);
  assert.match(sql, /\nCOMMIT;\n/);
  assert.equal((sql.match(/UPDATE iam_tenant_application/g) ?? []).length, 2);
  for (const entry of entries) {
    assert.ok(
      sql.includes(
        `WHERE tenant_id = '${entry.tenantId}'\n   AND app_id = '${entry.appId}'\n   AND deploy_application_id IS NULL;`,
      ),
    );
  }
  assert.ok(sql.includes("SET deploy_application_id = '410000000000000001'"));
  assert.ok(sql.includes('updated_at = NOW()'));
});

test('buildApplySql escapes quotes so a mapping value cannot break out of the literal', () => {
  const entries = validateMapping([
    { tenantId: "O'Brien", installationAppId: "app'a", deployApplicationId: '410000000000000001' },
  ]).entries;
  const sql = buildApplySql(entries);
  assert.ok(sql.includes("WHERE tenant_id = 'O''Brien'"));
  assert.ok(sql.includes("AND app_id = 'app''a'"));
  assert.ok(!sql.includes("'O'Brien'"));
});

test('buildApplySql emits an E-string when a value contains a backslash', () => {
  const entries = validateMapping([
    { tenantId: '100001', installationAppId: 'app\\segment', deployApplicationId: '410000000000000001' },
  ]).entries;
  const sql = buildApplySql(entries);
  assert.ok(sql.includes("WHERE tenant_id = '100001'"));
  assert.ok(sql.includes("AND app_id = E'app\\\\segment'"));
});

test('buildApplySql emits only would_update rows when a snapshot is supplied', () => {
  const entries = validateMapping(VALID_MAPPING).entries;
  const snapshot = [
    { tenantId: '100001', appId: 'app_100001', deployApplicationId: '410000000000000001' },
    { tenantId: '100001', appId: 'sdkwork-drama', deployApplicationId: null },
  ];
  const classifications = classifyMapping(entries, snapshot);
  const sql = buildApplySql(entries, classifications);
  assert.equal((sql.match(/UPDATE iam_tenant_application/g) ?? []).length, 1);
  assert.ok(sql.includes("AND app_id = 'sdkwork-drama'"));
});

test('buildApplySql produces a valid empty batch for an empty mapping', () => {
  const sql = buildApplySql([]);
  assert.match(sql, /No UPDATE statement is generated for this mapping/);
  assert.ok(!sql.includes('UPDATE iam_tenant_application'));
  assert.match(sql, /\nBEGIN;\n/);
  assert.match(sql, /\nCOMMIT;\n/);
});

test('buildPreflightSql exposes the four required counters and the classification', () => {
  const entries = validateMapping(VALID_MAPPING).entries;
  const sql = buildPreflightSql(entries);
  for (const metric of ['will_update', 'already_consistent', 'conflict', 'still_unmapped']) {
    assert.ok(sql.includes(metric), `missing metric ${metric}`);
  }
  assert.ok(sql.includes("('100001', 'app_100001', '410000000000000001')"));
  assert.ok(sql.includes('LEFT JOIN iam_tenant_application ta'));
  assert.ok(sql.includes('installation_missing'));
  assert.ok(sql.includes('linked_elsewhere'));
  assert.ok(sql.includes('deploy_application_claimed'));
});

test('buildPreflightSql handles an empty mapping without emitting an empty VALUES', () => {
  const sql = buildPreflightSql([]);
  assert.match(sql, /WHERE FALSE/);
  assert.ok(!sql.includes('VALUES'));
  assert.ok(sql.includes('still_unmapped'));
});

test('buildReportSql lists unlinked installations and marks rows covered by the mapping', () => {
  const entries = validateMapping(VALID_MAPPING).entries;
  const sql = buildReportSql(entries);
  assert.ok(sql.includes('WHERE ta.deploy_application_id IS NULL'));
  assert.ok(sql.includes('pending_deploy_application_id'));
  assert.ok(sql.includes('LEFT JOIN mapping m'));
  assert.ok(!sql.includes('UPDATE iam_tenant_application'));
});

test('summarizePlan classifies would_update, consistent, conflicts, and unmapped', () => {
  const entries = validateMapping([
    { tenantId: '100001', installationAppId: 'app_update', deployApplicationId: '410000000000000001' },
    { tenantId: '100001', installationAppId: 'app_consistent', deployApplicationId: '410000000000000002' },
    { tenantId: '100001', installationAppId: 'app_linked_elsewhere', deployApplicationId: '410000000000000003' },
    { tenantId: '100001', installationAppId: 'app_claimed', deployApplicationId: '410000000000000005' },
    { tenantId: '100001', installationAppId: 'app_missing', deployApplicationId: '410000000000000006' },
  ]).entries;
  const snapshot = [
    { tenantId: '100001', appId: 'app_update', deployApplicationId: null },
    { tenantId: '100001', appId: 'app_consistent', deployApplicationId: '410000000000000002' },
    { tenantId: '100001', appId: 'app_linked_elsewhere', deployApplicationId: '410000000000000099' },
    { tenantId: '100001', appId: 'app_claimed', deployApplicationId: null },
    { tenantId: '100001', appId: 'app_other_claimant', deployApplicationId: '410000000000000005' },
    { tenantId: '100001', appId: 'app_unmapped', deployApplicationId: null },
  ];
  const classifications = classifyMapping(entries, snapshot);
  const summary = summarizePlan(entries, snapshot, classifications);
  assert.equal(summary.verified, true);
  assert.equal(summary.willUpdate, 1);
  assert.equal(summary.alreadyConsistent, 1);
  assert.equal(summary.conflicts, 3);
  assert.equal(summary.installationMissing, 1);
  assert.equal(summary.linkedElsewhere, 1);
  assert.equal(summary.deployApplicationClaimed, 1);
  // app_update is covered by the mapping (pending), so only app_unmapped remains.
  assert.equal(summary.stillUnmapped, 1);
});

test('summarizePlan reports unknown M/K/U without a snapshot', () => {
  const entries = validateMapping(VALID_MAPPING).entries;
  const classifications = classifyMapping(entries, null);
  const summary = summarizePlan(entries, null, classifications);
  assert.equal(summary.verified, false);
  assert.equal(summary.willUpdate, 2);
  assert.equal(summary.alreadyConsistent, 0);
  assert.equal(summary.conflicts, 0);
  assert.equal(summary.stillUnmapped, null);
});

test('parseArguments accepts --flag=value and rejects --out without --apply/--report', () => {
  const parsed = parseArguments(['--mapping=map.json', '--apply', '--out=out.sql']);
  assert.equal(parsed.mappingPath, 'map.json');
  assert.equal(parsed.outPath, 'out.sql');
  assert.equal(parsed.apply, true);
  assert.throws(() => parseArguments(['--mapping', 'map.json', '--out', 'out.sql']), /--out is only valid/);
  assert.throws(() => parseArguments(['--mapping', 'map.json', '--apply', '--report']), /cannot be combined/);
  assert.throws(() => parseArguments(['--mapping']), /requires a value/);
});

test('CLI dry-run prints statistics, preflight, apply SQL, and report SQL', () => {
  const mappingPath = jsonFile('mapping-dry-run.json', VALID_MAPPING);
  const result = runCliProcess('--mapping', mappingPath);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /mode: dry-run \(no database connection, no writes\)/);
  assert.match(result.stdout, /will update \(N\):\s+2/);
  assert.match(result.stdout, /already consistent \(M\):\s+unknown/);
  assert.match(result.stdout, /conflict \(K\):\s+0/);
  assert.match(result.stdout, /still unmapped \(U\):\s+unknown/);
  assert.match(result.stdout, /-- preflight \(read-only\)/);
  assert.match(result.stdout, /-- apply \(review only; execute with psql\)/);
  assert.match(result.stdout, /-- report \(read-only; installations still unlinked\)/);
  assert.match(result.stdout, /AND deploy_application_id IS NULL/);
});

test('CLI dry-run without --current does not claim rows are held back', () => {
  const mappingPath = jsonFile('mapping-no-current.json', VALID_MAPPING);
  const result = runCliProcess('--mapping', mappingPath);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(!result.stdout.includes('rows held back'));
});

test('CLI dry-run with --current prints exact N/M/K/U counters', () => {
  const mappingPath = jsonFile('mapping-current.json', VALID_MAPPING);
  const currentPath = jsonFile('current.json', [
    { tenantId: '100001', installationAppId: 'app_100001', deployApplicationId: null },
    { tenantId: '100001', installationAppId: 'sdkwork-drama', deployApplicationId: '410000000000000002' },
    { tenantId: '100001', installationAppId: 'app_unmapped', deployApplicationId: null },
  ]);
  const result = runCliProcess('--mapping', mappingPath, '--current', currentPath);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /current: .*\(exact counters\)/);
  assert.match(result.stdout, /will update \(N\):\s+1\b/);
  assert.match(result.stdout, /already consistent \(M\):\s+1\b/);
  assert.match(result.stdout, /conflict \(K\):\s+0\b/);
  assert.match(result.stdout, /still unmapped \(U\):\s+1\b/);
});

test('CLI dry-run prints warnings for non-decimal deploy ids', () => {
  const mappingPath = jsonFile('mapping-warning.json', [
    { tenantId: '100001', installationAppId: 'app_a', deployApplicationId: 'deploy-platform' },
  ]);
  const result = runCliProcess('--mapping', mappingPath);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /validation: 1 warning/);
  assert.match(result.stdout, /not a decimal deployment application id/);
});

test('CLI empty mapping is a valid no-op', () => {
  const mappingPath = jsonFile('mapping-empty.json', []);
  const result = runCliProcess('--mapping', mappingPath);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /mapping: .* \(0 rows\)/);
  assert.match(result.stdout, /will update \(N\):\s+0/);
  assert.match(result.stdout, /No UPDATE statement is generated for this mapping/);
  assert.match(result.stdout, /WHERE FALSE/);
});

test('CLI --apply refuses when --current proves a conflict and writes no SQL', () => {
  const mappingPath = jsonFile('mapping-conflict.json', VALID_MAPPING);
  const currentPath = jsonFile('current-conflict.json', [
    { tenantId: '100001', installationAppId: 'app_100001', deployApplicationId: '410000000000000099' },
    { tenantId: '100001', installationAppId: 'sdkwork-drama', deployApplicationId: null },
  ]);
  const result = runCliProcess('--mapping', mappingPath, '--current', currentPath, '--apply');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /refusing --apply: 1 mapping row\(s\) conflict/);
  assert.match(result.stderr, /app_100001: linked_elsewhere/);
  assert.equal(result.stdout, '');
});

test('CLI --apply emits pure SQL to stdout and a summary to stderr', () => {
  const mappingPath = jsonFile('mapping-apply.json', VALID_MAPPING);
  const currentPath = jsonFile('current-apply.json', [
    { tenantId: '100001', installationAppId: 'app_100001', deployApplicationId: null },
    { tenantId: '100001', installationAppId: 'sdkwork-drama', deployApplicationId: null },
  ]);
  const result = runCliProcess('--mapping', mappingPath, '--current', currentPath, '--apply');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^-- Apply:/);
  assert.match(result.stdout, /BEGIN;/);
  assert.equal((result.stdout.match(/UPDATE iam_tenant_application/g) ?? []).length, 2);
  assert.match(result.stderr, /2 UPDATE statement\(s\) to stdout/);
});

test('CLI --apply --out writes the SQL file', () => {
  const mappingPath = jsonFile('mapping-out.json', VALID_MAPPING);
  const outPath = path.join(TEMP_DIR, 'generated-backfill.sql');
  TEMP_FILES.push(outPath);
  const result = runCliProcess('--mapping', mappingPath, '--apply', '--out', outPath);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /wrote the apply SQL to/);
  const written = readFileSync(outPath, 'utf8');
  assert.match(written, /^-- Apply:/);
  assert.equal((written.match(/UPDATE iam_tenant_application/g) ?? []).length, 2);
});

test('CLI --report emits only the read-only report query', () => {
  const mappingPath = jsonFile('mapping-report.json', VALID_MAPPING);
  const result = runCliProcess('--mapping', mappingPath, '--report');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^-- Report \(read-only\)/);
  assert.match(result.stdout, /pending_deploy_application_id/);
  assert.ok(!result.stdout.includes('BEGIN;'));
  assert.ok(!result.stdout.includes('UPDATE iam_tenant_application'));
});

test('CLI validation failures exit 2 and print every error', () => {
  const mappingPath = jsonFile('mapping-invalid.json', [
    { tenantId: '100001', installationAppId: 'app_a', deployApplicationId: '410000000000000001' },
    { tenantId: '100001', installationAppId: 'app_a' },
  ]);
  const result = runCliProcess('--mapping', mappingPath);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /mapping validation failed with 2 error\(s\)/);
  assert.match(result.stderr, /deployApplicationId is required/);
  assert.match(result.stderr, /duplicates mapping\[0\]/);
  assert.equal(result.stdout, '');
});

test('CLI rejects malformed JSON, a missing file, and unknown arguments with exit 2', () => {
  const malformedPath = path.join(TEMP_DIR, 'malformed.json');
  writeFileSync(malformedPath, '{ not json', 'utf8');
  TEMP_FILES.push(malformedPath);

  const malformed = runCliProcess('--mapping', malformedPath);
  assert.equal(malformed.status, 2);
  assert.match(malformed.stderr, /is not valid JSON/);

  const missing = runCliProcess('--mapping', path.join(TEMP_DIR, 'does-not-exist.json'));
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /cannot read mapping file/);

  const unknown = runCliProcess('--mapping', malformedPath, '--nope');
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /unknown argument: --nope/);
});

test('CLI --help exits 0 and documents the contract', () => {
  const result = runCliProcess('--help');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /--mapping <path>/);
  assert.match(result.stdout, /never connects to a database/);
});

test('runCli returns exit codes and writes to the injected streams', () => {
  const mappingPath = jsonFile('mapping-injected.json', VALID_MAPPING);
  const capture = captureIo();
  const code = runCli(['--mapping', mappingPath, '--report'], capture.io);
  assert.equal(code, 0);
  assert.match(capture.stdout(), /^-- Report \(read-only\)/);
  assert.equal(capture.stderr(), '');
});

test('buildUpdateStatements preserves mapping order and comments each row', () => {
  const entries = validateMapping(VALID_MAPPING).entries;
  const statements = buildUpdateStatements(entries);
  assert.equal(statements.length, 2);
  assert.match(statements[0], /mapping\[0\] tenantId=100001 installationAppId=app_100001/);
  assert.match(statements[1], /mapping\[1\] tenantId=100001 installationAppId=sdkwork-drama/);
});

test('classification does not match an installation under a different tenant', () => {
  const entries = validateMapping([
    { tenantId: '100001', installationAppId: 'app_a', deployApplicationId: '410000000000000001' },
  ]).entries;
  const snapshot = [
    { tenantId: '100002', appId: 'app_a', deployApplicationId: null },
  ];
  const classifications = classifyMapping(entries, snapshot);
  assert.equal(classifications.get(0).outcome, 'installation_missing');
  const summary = summarizePlan(entries, snapshot, classifications);
  // The snapshot row is a different installation, so it is still unmapped.
  assert.equal(summary.stillUnmapped, 1);
});

test('classification keeps installation_missing distinct from linked_elsewhere', () => {
  const entries = validateMapping([
    { tenantId: '100001', installationAppId: 'app_a', deployApplicationId: '410000000000000001' },
    { tenantId: '100001', installationAppId: 'app_b', deployApplicationId: '410000000000000002' },
  ]).entries;
  const classifications = classifyMapping(entries, [
    { tenantId: '100001', appId: 'app_b', deployApplicationId: '410000000000000099' },
  ]);
  assert.equal(classifications.get(0).outcome, 'installation_missing');
  assert.equal(classifications.get(1).outcome, 'linked_elsewhere');
});
