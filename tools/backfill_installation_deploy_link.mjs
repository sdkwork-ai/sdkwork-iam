#!/usr/bin/env node
/**
 * Generation tool for the IAM installation -> deployment application backfill.
 *
 * `iam_application_installation.deploy_application_id` is nullable on purpose
 * (migration 0040): an installation created before the column existed has no
 * link, and a missing link fails token issuance and the gateway closed. The
 * value cannot be derived from IAM's own columns -- the deployment inventory
 * (`deploy_app`) is owned by sdkwork-deployments and is reached by value, not
 * by a foreign key -- so the link is supplied as an explicit mapping produced
 * by the two owners. This tool turns that mapping into reviewable SQL.
 *
 * It never connects to a database and never executes a write. Its output is:
 *
 *   1. a dry-run report (default): plan statistics, a read-only PREFLIGHT
 *      query, the guarded UPDATE statements, and the read-only REPORT query;
 *   2. with `--apply`, the executable SQL only (stdout or `--out`), to be run
 *      by the caller with psql;
 *   3. with `--report`, the read-only "still unmapped" query only.
 *
 * Mapping format (`--mapping`):
 *
 *   [
 *     { "tenantId": "100001", "installationAppId": "app_100001", "deployApplicationId": "410000000000000001" },
 *     ...
 *   ]
 *
 * For an installation provisioned by `sdkwork-deployments`, `deployApplicationId`
 * is the deployment application's `deploy_app.id` rendered as a decimal string --
 * not the uuid. The deployment provisioning adapter sends exactly that value
 * (`sdkwork-intelligence-deploy-service` repository
 * `AppIdentityProvisioningTarget`), so a uuid in this field silently links to
 * nothing. A platform installation may instead carry the explicitly configured
 * `SDKWORK_DEPLOY_APPLICATION_ID` anchor; the tool warns when the value is not a
 * decimal id so the operator confirms it with the deployment owner.
 *
 * Every generated UPDATE carries
 *
 *   WHERE tenant_id = '...' AND app_id = '...' AND deploy_application_id IS NULL
 *
 * so an existing link is never overwritten and a re-run is idempotent. The
 * partial unique index `uk_iam_application_installation_deploy` remains the final
 * authority against two installations claiming one deployment application: a
 * collision aborts the whole psql transaction.
 *
 * Usage:
 *
 *   node tools/backfill_installation_deploy_link.mjs --mapping mapping.json
 *   node tools/backfill_installation_deploy_link.mjs --mapping mapping.json --current current.json
 *   node tools/backfill_installation_deploy_link.mjs --mapping mapping.json --apply --out backfill.sql
 *   node tools/backfill_installation_deploy_link.mjs --mapping mapping.json --report
 *
 * `--current` is an optional, read-only export of the target table in the same
 * shape as the mapping (`deployApplicationId` may be null). Because the tool
 * cannot query the database itself, this snapshot is what turns the dry-run's
 * "already consistent / conflict / still unmapped" counters into exact numbers.
 * Without it those counters are reported as unknown and the PREFLIGHT query
 * (printed in the dry-run) remains the authoritative source.
 *
 * Exit codes: 0 success, 1 refused (--apply found conflicts), 2 unusable input.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const EXIT_OK = 0;
const EXIT_REFUSED = 1;
const EXIT_USAGE = 2;

const MAPPING_FIELDS = ['tenantId', 'installationAppId', 'deployApplicationId'];
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/** A user-facing failure that maps to a documented exit code. */
class CliError extends Error {
  constructor(message, exitCode = EXIT_USAGE) {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
  }
}

function usage() {
  return `Usage:
  node tools/backfill_installation_deploy_link.mjs --mapping <path.json> [options]

Required:
  --mapping <path>   Confirmed mapping rows:
                     [{ "tenantId", "installationAppId", "deployApplicationId" }]

Options:
  --current <path>   Optional read-only snapshot of iam_application_installation in the
                     same shape, with deployApplicationId null for unlinked rows.
                     Supplies exact already-consistent / conflict / unmapped counts.
  --apply            Emit executable SQL (BEGIN; UPDATE ...; COMMIT;) to stdout,
                     or to --out. Refuses when --current proves a conflict.
  --report           Emit only the read-only "still unmapped installations" query.
  --out <path>       Write the --apply or --report SQL to this file.
  --help, -h         Show this help.

The tool never connects to a database and never executes a write.`;
}

function takeValue(argv, index, flag) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new CliError(`${flag} requires a value`);
  }
  return value;
}

/**
 * Parse the command line. Throws CliError for usage problems so the caller can
 * report them with exit code 2.
 */
export function parseArguments(argv) {
  const options = {
    mappingPath: null,
    currentPath: null,
    outPath: null,
    apply: false,
    report: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    if (argument === '--apply') {
      options.apply = true;
      continue;
    }
    if (argument === '--report') {
      options.report = true;
      continue;
    }
    if (argument === '--mapping' || argument.startsWith('--mapping=')) {
      options.mappingPath = argument.includes('=')
        ? argument.slice('--mapping='.length)
        : takeValue(argv, index++, '--mapping');
      continue;
    }
    if (argument === '--current' || argument.startsWith('--current=')) {
      options.currentPath = argument.includes('=')
        ? argument.slice('--current='.length)
        : takeValue(argv, index++, '--current');
      continue;
    }
    if (argument === '--out' || argument.startsWith('--out=')) {
      options.outPath = argument.includes('=')
        ? argument.slice('--out='.length)
        : takeValue(argv, index++, '--out');
      continue;
    }
    throw new CliError(`unknown argument: ${argument}`);
  }
  if (options.help) {
    return options;
  }
  if (!options.mappingPath) {
    throw new CliError('--mapping <path.json> is required');
  }
  if (options.apply && options.report) {
    throw new CliError('--apply and --report cannot be combined');
  }
  if (options.outPath && !options.apply && !options.report) {
    throw new CliError('--out is only valid with --apply or --report');
  }
  return options;
}

function readJsonFile(filePath, label) {
  let text;
  try {
    text = readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new CliError(`cannot read ${label} file "${filePath}": ${error.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new CliError(`${label} file "${filePath}" is not valid JSON: ${error.message}`);
  }
}

function requireTextField(raw, field, rowLabel, errors) {
  if (!Object.hasOwn(raw, field)) {
    errors.push(`${rowLabel}.${field} is required`);
    return null;
  }
  const value = raw[field];
  if (typeof value !== 'string') {
    errors.push(`${rowLabel}.${field} must be a non-empty string`);
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    errors.push(`${rowLabel}.${field} must not be blank`);
    return null;
  }
  if (CONTROL_CHARACTERS.test(trimmed)) {
    errors.push(`${rowLabel}.${field} must not contain control characters`);
    return null;
  }
  return trimmed;
}

function checkUnknownFields(raw, rowLabel, errors) {
  for (const field of Object.keys(raw)) {
    if (!MAPPING_FIELDS.includes(field)) {
      errors.push(
        `${rowLabel} has unknown field "${field}"; expected ${MAPPING_FIELDS.join(', ')}`,
      );
    }
  }
}

/**
 * Validate and normalize the mapping. Returns every problem instead of throwing
 * on the first one, so one review pass can fix the whole file.
 *
 * Rules:
 *   - the document is an array of objects with exactly the three declared fields;
 *   - all three fields are non-blank strings without control characters;
 *   - one installation (`installationAppId`) appears at most once;
 *   - one deployment application (`deployApplicationId`) appears at most once
 *     (`uk_iam_application_installation_deploy` is a global partial unique index).
 */
export function validateMapping(raw) {
  const errors = [];
  const warnings = [];
  const entries = [];
  if (!Array.isArray(raw)) {
    return {
      entries,
      errors: ['mapping must be a JSON array of { tenantId, installationAppId, deployApplicationId } objects'],
      warnings,
    };
  }
  const byInstallation = new Map();
  const byDeployApplication = new Map();

  raw.forEach((candidate, index) => {
    const rowLabel = `mapping[${index}]`;
    if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
      errors.push(`${rowLabel} must be an object`);
      return;
    }
    checkUnknownFields(candidate, rowLabel, errors);
    const entry = {
      tenantId: requireTextField(candidate, 'tenantId', rowLabel, errors),
      appId: requireTextField(candidate, 'installationAppId', rowLabel, errors),
      deployApplicationId: requireTextField(candidate, 'deployApplicationId', rowLabel, errors),
      index,
    };
    // Duplicate detection is independent of field completeness: a repeated
    // installation is a duplicate even when the row is also missing a field,
    // and the operator should see both problems in one pass.
    if (entry.tenantId && entry.appId) {
      if (byInstallation.has(entry.appId)) {
        const first = byInstallation.get(entry.appId);
        errors.push(
          `${rowLabel}.installationAppId "${entry.appId}" duplicates mapping[${first}] ` +
            '(one installation cannot be backfilled twice)',
        );
      } else {
        byInstallation.set(entry.appId, index);
      }
    }
    if (!entry.tenantId || !entry.appId || !entry.deployApplicationId) {
      return;
    }
    if (byDeployApplication.has(entry.deployApplicationId)) {
      const first = byDeployApplication.get(entry.deployApplicationId);
      errors.push(
        `${rowLabel}.deployApplicationId "${entry.deployApplicationId}" duplicates mapping[${first}] ` +
          '(one deployment application cannot back two installations)',
      );
    } else {
      byDeployApplication.set(entry.deployApplicationId, index);
    }
    if (!/^[1-9][0-9]*$/.test(entry.deployApplicationId)) {
      warnings.push(
        `${rowLabel}.deployApplicationId "${entry.deployApplicationId}" is not a decimal ` +
          'deployment application id; the deployment module links installations by ' +
          'deploy_app.id (as a decimal string), never by uuid. Confirm it with the ' +
          'deployment owner.',
      );
    }
    entries.push(entry);
  });

  return { entries, errors, warnings };
}

/**
 * Validate and normalize an optional `--current` snapshot. `deployApplicationId`
 * may be null (or absent) to mean "the installation is still unlinked".
 */
export function validateCurrentSnapshot(raw) {
  const errors = [];
  const rows = [];
  if (raw === null) {
    // `json_agg(...)` over an empty table returns SQL NULL, not `[]`. Treat it
    // as an empty snapshot so an empty installation inventory is a valid input.
    return { rows, errors };
  }
  if (!Array.isArray(raw)) {
    return {
      rows,
      errors: ['--current must be a JSON array of { tenantId, installationAppId, deployApplicationId } objects'],
    };
  }
  const byInstallation = new Map();
  const byDeployApplication = new Map();
  raw.forEach((candidate, index) => {
    const rowLabel = `current[${index}]`;
    if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
      errors.push(`${rowLabel} must be an object`);
      return;
    }
    checkUnknownFields(candidate, rowLabel, errors);
    const tenantId = requireTextField(candidate, 'tenantId', rowLabel, errors);
    const appId = requireTextField(candidate, 'installationAppId', rowLabel, errors);
    let deployApplicationId = null;
    if (Object.hasOwn(candidate, 'deployApplicationId') && candidate.deployApplicationId !== null) {
      if (typeof candidate.deployApplicationId !== 'string') {
        errors.push(`${rowLabel}.deployApplicationId must be a string or null`);
      } else if (candidate.deployApplicationId.trim() !== '') {
        deployApplicationId = candidate.deployApplicationId.trim();
        if (CONTROL_CHARACTERS.test(deployApplicationId)) {
          errors.push(`${rowLabel}.deployApplicationId must not contain control characters`);
          deployApplicationId = null;
        }
      }
    }
    if (!tenantId || !appId) {
      return;
    }
    if (byInstallation.has(appId)) {
      const first = byInstallation.get(appId);
      errors.push(
        `${rowLabel}.installationAppId "${appId}" duplicates current[${first}] ` +
          '(iam_application_installation.app_id is globally unique)',
      );
    } else {
      byInstallation.set(appId, index);
    }
    if (deployApplicationId) {
      if (byDeployApplication.has(deployApplicationId)) {
        const first = byDeployApplication.get(deployApplicationId);
        errors.push(
          `${rowLabel}.deployApplicationId "${deployApplicationId}" duplicates current[${first}] ` +
            '(uk_iam_application_installation_deploy is a global partial unique index)',
        );
      } else {
        byDeployApplication.set(deployApplicationId, index);
      }
    }
    rows.push({ tenantId, appId, deployApplicationId });
  });
  return { rows, errors };
}

/**
 * Classify every mapping row against the snapshot (when one is supplied).
 *
 * Outcomes:
 *   would_update              installation exists, is unlinked, and no other
 *                             installation already holds the deployment app;
 *   already_consistent        the installation is already linked to that app;
 *   linked_elsewhere          the installation is linked to a different app;
 *   deploy_application_claimed another installation already holds that app;
 *   installation_missing      no (tenant_id, app_id) row exists;
 *   unverified                no snapshot was supplied.
 */
export function classifyMapping(entries, snapshotRows) {
  const classifications = new Map();
  if (!snapshotRows) {
    for (const entry of entries) {
      classifications.set(entry.index, { entry, outcome: 'unverified' });
    }
    return classifications;
  }
  const installationKey = (tenantId, appId) => `${tenantId}\u0000${appId}`;
  const currentByInstallation = new Map();
  const claimantByDeploy = new Map();
  for (const row of snapshotRows) {
    currentByInstallation.set(installationKey(row.tenantId, row.appId), row);
    if (row.deployApplicationId) {
      claimantByDeploy.set(row.deployApplicationId, installationKey(row.tenantId, row.appId));
    }
  }
  for (const entry of entries) {
    const key = installationKey(entry.tenantId, entry.appId);
    const current = currentByInstallation.get(key);
    let outcome;
    if (!current) {
      outcome = 'installation_missing';
    } else if (current.deployApplicationId === entry.deployApplicationId) {
      outcome = 'already_consistent';
    } else if (current.deployApplicationId) {
      outcome = 'linked_elsewhere';
    } else if (
      claimantByDeploy.has(entry.deployApplicationId) &&
      claimantByDeploy.get(entry.deployApplicationId) !== key
    ) {
      outcome = 'deploy_application_claimed';
    } else {
      outcome = 'would_update';
    }
    classifications.set(entry.index, {
      entry,
      outcome,
      currentDeployApplicationId: current?.deployApplicationId ?? null,
    });
  }
  return classifications;
}

/**
 * Summarize the plan. `stillUnmapped` is only exact when a snapshot is supplied;
 * it counts installations that remain unlinked after this mapping is applied.
 */
export function summarizePlan(entries, snapshotRows, classifications) {
  const summary = {
    mappingRows: entries.length,
    willUpdate: 0,
    alreadyConsistent: 0,
    conflicts: 0,
    installationMissing: 0,
    linkedElsewhere: 0,
    deployApplicationClaimed: 0,
    stillUnmapped: null,
    verified: Boolean(snapshotRows),
  };
  for (const { outcome } of classifications.values()) {
    if (outcome === 'would_update') {
      summary.willUpdate += 1;
    } else if (outcome === 'already_consistent') {
      summary.alreadyConsistent += 1;
    } else if (outcome === 'installation_missing') {
      summary.conflicts += 1;
      summary.installationMissing += 1;
    } else if (outcome === 'linked_elsewhere') {
      summary.conflicts += 1;
      summary.linkedElsewhere += 1;
    } else if (outcome === 'deploy_application_claimed') {
      summary.conflicts += 1;
      summary.deployApplicationClaimed += 1;
    }
  }
  if (!snapshotRows) {
    // The number of guarded UPDATE statements is the mapping size: each one is a
    // candidate, and the IS NULL predicate decides at execution time.
    summary.willUpdate = entries.length;
  }
  if (snapshotRows) {
    const mappedInstallations = new Set(
      entries.map((entry) => `${entry.tenantId}\u0000${entry.appId}`),
    );
    summary.stillUnmapped = snapshotRows.filter(
      (row) =>
        row.deployApplicationId === null &&
        !mappedInstallations.has(`${row.tenantId}\u0000${row.appId}`),
    ).length;
  }
  return summary;
}

function sqlLiteral(value) {
  if (value.includes('\u0000')) {
    throw new CliError(`SQL literal cannot contain NUL: ${JSON.stringify(value)}`);
  }
  const escapedQuotes = value.replaceAll("'", "''");
  // A plain literal is safe for values without backslashes even when
  // `standard_conforming_strings` is off; use an E-string so a backslash cannot
  // escape the closing quote under either setting.
  if (escapedQuotes.includes('\\')) {
    return `E'${escapedQuotes.replaceAll('\\', '\\\\')}'`;
  }
  return `'${escapedQuotes}'`;
}

function mappingCte(entries) {
  if (entries.length === 0) {
    return `mapping (tenant_id, app_id, deploy_application_id) AS (
    SELECT NULL::text, NULL::text, NULL::text
    WHERE FALSE
)`;
  }
  const rows = entries
    .map(
      (entry) =>
        `        (${sqlLiteral(entry.tenantId)}, ${sqlLiteral(entry.appId)}, ${sqlLiteral(entry.deployApplicationId)})`,
    )
    .join(',\n');
  return `mapping (tenant_id, app_id, deploy_application_id) AS (
    VALUES
${rows}
)`;
}

function classifiedCte() {
  return `classified AS (
    SELECT
        m.tenant_id,
        m.app_id,
        m.deploy_application_id,
        ta.deploy_application_id AS current_deploy_application_id,
        CASE
            WHEN ta.app_id IS NULL THEN 'installation_missing'
            WHEN ta.deploy_application_id = m.deploy_application_id THEN 'already_consistent'
            WHEN ta.deploy_application_id IS NOT NULL THEN 'linked_elsewhere'
            WHEN EXISTS (
                SELECT 1
                  FROM iam_application_installation other
                 WHERE other.deploy_application_id = m.deploy_application_id
                   AND other.app_id <> m.app_id
            ) THEN 'deploy_application_claimed'
            ELSE 'would_update'
        END AS outcome
      FROM mapping m
      LEFT JOIN iam_application_installation ta
             ON ta.tenant_id = m.tenant_id
            AND ta.app_id = m.app_id
)`;
}

/**
 * Read-only impact assessment. Returns the four required counters plus a
 * per-row breakdown of anything that will not be applied.
 */
export function buildPreflightSql(entries) {
  return `-- Preflight (read-only). Run this before the apply SQL; it never writes.
WITH ${mappingCte(entries)},
${classifiedCte()},
counted AS (
    SELECT
        count(*) FILTER (WHERE outcome = 'would_update') AS will_update,
        count(*) FILTER (WHERE outcome = 'already_consistent') AS already_consistent,
        count(*) FILTER (WHERE outcome = 'installation_missing') AS installation_missing,
        count(*) FILTER (WHERE outcome = 'linked_elsewhere') AS linked_elsewhere,
        count(*) FILTER (WHERE outcome = 'deploy_application_claimed') AS deploy_application_claimed
      FROM classified
),
unmapped AS (
    SELECT count(*) AS still_unmapped
      FROM iam_application_installation ta
     WHERE ta.deploy_application_id IS NULL
       AND NOT EXISTS (
           SELECT 1
             FROM mapping m
            WHERE m.tenant_id = ta.tenant_id
              AND m.app_id = ta.app_id
       )
)
SELECT metric, row_count
  FROM (
        SELECT 'will_update' AS metric, will_update AS row_count FROM counted
        UNION ALL SELECT 'already_consistent', already_consistent FROM counted
        UNION ALL SELECT 'conflict', installation_missing + linked_elsewhere + deploy_application_claimed FROM counted
        UNION ALL SELECT 'still_unmapped', still_unmapped FROM unmapped
       ) AS summary
 ORDER BY CASE metric
            WHEN 'will_update' THEN 1
            WHEN 'already_consistent' THEN 2
            WHEN 'conflict' THEN 3
            ELSE 4
          END;

-- Conflict detail (read-only): mapping rows the apply SQL will not touch.
WITH ${mappingCte(entries)},
${classifiedCte()}
SELECT tenant_id, app_id, deploy_application_id, current_deploy_application_id, outcome
  FROM classified
 WHERE outcome IN ('installation_missing', 'linked_elsewhere', 'deploy_application_claimed')
 ORDER BY outcome, tenant_id, app_id;
`;
}

/**
 * The guarded UPDATE statements. With a snapshot, only rows classified
 * `would_update` are emitted; without one, every mapping row is emitted and the
 * `deploy_application_id IS NULL` predicate decides at execution time.
 */
export function buildUpdateStatements(entries, classifications = null) {
  const hasVerifiedOutcomes =
    classifications !== null &&
    [...classifications.values()].some((classification) => classification.outcome !== 'unverified');
  const selected = hasVerifiedOutcomes
    ? entries.filter((entry) => classifications.get(entry.index)?.outcome === 'would_update')
    : entries;
  return selected.map((entry) => {
    const classification = classifications?.get(entry.index);
    const suffix = classification
      ? ` (${classification.outcome})`
      : '';
    return `-- mapping[${entry.index}] tenantId=${entry.tenantId} installationAppId=${entry.appId}${suffix}
UPDATE iam_application_installation
   SET deploy_application_id = ${sqlLiteral(entry.deployApplicationId)},
       updated_at = NOW()
 WHERE tenant_id = ${sqlLiteral(entry.tenantId)}
   AND app_id = ${sqlLiteral(entry.appId)}
   AND deploy_application_id IS NULL;`;
  });
}

/**
 * Executable SQL for psql. The transaction makes a unique-index collision abort
 * the whole batch instead of leaving a partial backfill behind.
 */
export function buildApplySql(entries, classifications = null) {
  const updates = buildUpdateStatements(entries, classifications);
  const body =
    updates.length === 0
      ? '-- No UPDATE statement is generated for this mapping.'
      : updates.join('\n\n');
  return `-- Apply: link IAM installations to their confirmed deployment applications.
-- Generated by tools/backfill_installation_deploy_link.mjs --apply.
--
-- Every UPDATE is guarded by \`deploy_application_id IS NULL\`, so an existing
-- link is never overwritten and re-running this file is safe. A row that already
-- has a link (including a different one) is therefore skipped: run the PREFLIGHT
-- query first to see those rows and resolve any conflict it reports.
--
-- Execute with psql; the generator never connects to a database:
--   psql "$SDKWORK_DATABASE_URL" -v ON_ERROR_STOP=1 -f <this-file>
BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '60s';

${body}

COMMIT;
`;
}

/**
 * Read-only query listing installations that still have no deployment
 * application. Rows with a non-null `pending_deploy_application_id` are already
 * covered by the mapping but were not applied yet; rows with a null value are
 * genuinely unmapped.
 */
export function buildReportSql(entries) {
  return `-- Report (read-only): installations that still have no deployment application.
-- Run after the apply SQL. A row with pending_deploy_application_id IS NULL is
-- still unmapped; a non-null value means this mapping covers it but the link was
-- not applied (run the preflight to see why).
WITH ${mappingCte(entries)}
SELECT ta.tenant_id,
       ta.app_id,
       ta.id,
       ta.instance_key,
       ta.display_name,
       ta.status,
       ta.updated_at,
       m.deploy_application_id AS pending_deploy_application_id
  FROM iam_application_installation ta
  LEFT JOIN mapping m
         ON m.tenant_id = ta.tenant_id
        AND m.app_id = ta.app_id
 WHERE ta.deploy_application_id IS NULL
 ORDER BY ta.tenant_id, ta.app_id;
`;
}

function formatTableValue(value) {
  return value === null ? 'unknown' : String(value);
}

export function renderDryRun({ mappingPath, currentPath, entries, warnings, summary, classifications }) {
  const lines = [];
  lines.push('sdkwork-iam: installation -> deployment application backfill');
  lines.push('mode: dry-run (no database connection, no writes)');
  lines.push('');
  lines.push(`mapping: ${mappingPath} (${entries.length} row${entries.length === 1 ? '' : 's'})`);
  lines.push(
    currentPath
      ? `current: ${currentPath} (${summary.verified ? 'exact counters' : 'not loaded'})`
      : 'current: not provided (pass --current for exact M/K/U counters)',
  );
  lines.push('');
  if (warnings.length > 0) {
    lines.push(`validation: ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`);
    for (const warning of warnings) {
      lines.push(`  warning: ${warning}`);
    }
    lines.push('');
  }
  lines.push('impact');
  lines.push(
    `  will update (N):         ${formatTableValue(summary.willUpdate)}` +
      (summary.verified ? '' : ' (guarded UPDATE statements; execution decides)'),
  );
  lines.push(`  already consistent (M):  ${formatTableValue(summary.verified ? summary.alreadyConsistent : null)}`);
  lines.push(
    `  conflict (K):            ${formatTableValue(summary.verified ? summary.conflicts : 0)}` +
      (summary.verified ? '' : ' (no mapping-level conflict; run PREFLIGHT for database conflicts)'),
  );
  lines.push(`  still unmapped (U):      ${formatTableValue(summary.stillUnmapped)}`);
  if (summary.verified) {
    lines.push(
      `  conflict breakdown:      installation_missing=${summary.installationMissing}, ` +
        `linked_elsewhere=${summary.linkedElsewhere}, ` +
        `deploy_application_claimed=${summary.deployApplicationClaimed}`,
    );
  }
  lines.push('');
  const conflictRows = [...classifications.values()].filter((classification) =>
    ['installation_missing', 'linked_elsewhere', 'deploy_application_claimed'].includes(
      classification.outcome,
    ),
  );
  if (conflictRows.length > 0) {
    lines.push('rows held back (not applied by this plan)');
    for (const classification of conflictRows) {
      const current =
        classification.currentDeployApplicationId === undefined
          ? ''
          : ` current=${classification.currentDeployApplicationId ?? 'NULL'}`;
      lines.push(`  - ${classification.entry.appId}: ${classification.outcome}${current}`);
    }
    lines.push('  --apply refuses while any conflict remains; resolve them and re-run');
    lines.push('');
  }
  lines.push('-- preflight (read-only) --------------------------------------------------');
  lines.push(buildPreflightSql(entries).trimEnd());
  lines.push('');
  lines.push('-- apply (review only; execute with psql) ---------------------------------');
  lines.push(buildApplySql(entries, classifications).trimEnd());
  lines.push('');
  lines.push('-- report (read-only; installations still unlinked) ------------------------');
  lines.push(buildReportSql(entries).trimEnd());
  lines.push('');
  return lines.join('\n');
}

function writeOrPrint(sql, outPath, io, description) {
  if (outPath) {
    try {
      writeFileSync(outPath, sql, 'utf8');
    } catch (error) {
      throw new CliError(`cannot write ${description} to "${outPath}": ${error.message}`);
    }
    io.stdout.write(`wrote the ${description} to ${outPath}\n`);
    io.stdout.write('nothing was executed by this tool\n');
    return;
  }
  io.stdout.write(sql);
}

/**
 * Run one CLI invocation. Exposed for tests; returns the process exit code.
 */
export function runCli(argv, io = { stdout: process.stdout, stderr: process.stderr }) {
  try {
    const options = parseArguments(argv);
    if (options.help) {
      io.stdout.write(`${usage()}\n`);
      return EXIT_OK;
    }

    const mappingRaw = readJsonFile(options.mappingPath, 'mapping');
    const mapping = validateMapping(mappingRaw);
    if (mapping.errors.length > 0) {
      io.stderr.write(`mapping validation failed with ${mapping.errors.length} error(s):\n`);
      for (const error of mapping.errors) {
        io.stderr.write(`  - ${error}\n`);
      }
      io.stderr.write('no SQL was generated\n');
      return EXIT_USAGE;
    }

    let snapshotRows = null;
    if (options.currentPath && !options.report) {
      const currentRaw = readJsonFile(options.currentPath, '--current');
      const snapshot = validateCurrentSnapshot(currentRaw);
      if (snapshot.errors.length > 0) {
        io.stderr.write(`--current validation failed with ${snapshot.errors.length} error(s):\n`);
        for (const error of snapshot.errors) {
          io.stderr.write(`  - ${error}\n`);
        }
        io.stderr.write('no SQL was generated\n');
        return EXIT_USAGE;
      }
      snapshotRows = snapshot.rows;
    }

    const classifications = classifyMapping(mapping.entries, snapshotRows);
    const summary = summarizePlan(mapping.entries, snapshotRows, classifications);

    if (options.report) {
      writeOrPrint(
        buildReportSql(mapping.entries),
        options.outPath,
        io,
        'read-only unmapped-installation report',
      );
      return EXIT_OK;
    }

    if (options.apply) {
      if (summary.conflicts > 0) {
        io.stderr.write(
          `refusing --apply: ${summary.conflicts} mapping row(s) conflict with the current installation state\n`,
        );
        for (const classification of classifications.values()) {
          if (
            classification.outcome !== 'would_update' &&
            classification.outcome !== 'already_consistent' &&
            classification.outcome !== 'unverified'
          ) {
            io.stderr.write(
              `  - ${classification.entry.appId}: ${classification.outcome}` +
                (classification.currentDeployApplicationId
                  ? ` (current deploy_application_id=${classification.currentDeployApplicationId})`
                  : '') +
                '\n',
            );
          }
        }
        io.stderr.write('fix the mapping or the conflicting link, then re-run; nothing was executed\n');
        return EXIT_REFUSED;
      }
      const sql = buildApplySql(mapping.entries, classifications);
      if (!summary.verified) {
        io.stderr.write(
          'no --current snapshot supplied: run the PREFLIGHT query before executing this SQL\n',
        );
      }
      if (!options.outPath) {
        io.stderr.write(
          `--apply: wrote ${buildUpdateStatements(mapping.entries, classifications).length} ` +
            'UPDATE statement(s) to stdout; nothing was executed by this tool\n',
        );
      }
      writeOrPrint(sql, options.outPath, io, 'apply SQL');
      return EXIT_OK;
    }

    io.stdout.write(
      renderDryRun({
        mappingPath: options.mappingPath,
        currentPath: options.currentPath,
        entries: mapping.entries,
        warnings: mapping.warnings,
        summary,
        classifications,
      }),
    );
    return EXIT_OK;
  } catch (error) {
    if (error instanceof CliError) {
      io.stderr.write(`error: ${error.message}\n`);
      if (error.exitCode === EXIT_USAGE) {
        io.stderr.write('run with --help for usage\n');
      }
      return error.exitCode;
    }
    io.stderr.write(`error: ${error?.stack ?? error}\n`);
    return 1;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const modulePath = fileURLToPath(import.meta.url);
if (invokedPath && invokedPath.toLowerCase() === modulePath.toLowerCase()) {
  process.exitCode = runCli(process.argv.slice(2));
}
