#!/usr/bin/env node

/**
 * Register every application in a workspace against one IAM backend.
 *
 * Registration is per application identity (tenant + runtime `app_id`), not per
 * surface: a product's PC/H5/Flutter/mini/Harmony manifests share one identity
 * and one tenant application (`IAM_APPLICATION_BOOTSTRAP_SPEC.md` sections 1/4).
 *
 * Each identity is bootstrapped through the canonical CLI
 * `scripts/bootstrap/bootstrap-app.mjs` (register template -> provision tenant
 * application -> enable -> issue access credential), so this runner stays a
 * thin wrapper over the reusable framework package
 * (`@sdkwork/iam-application-bootstrap`).
 *
 * Usage:
 *   node scripts/bootstrap/bootstrap-workspace-apps.mjs \
 *     --workspace D:/sdkwork-space --environment development \
 *     --backend-base-url https://api-dev.sdkwork.com --dry-run
 *
 *   # apply (operator bootstrap credentials via env or a home profile):
 *   SDKWORK_IAM_BOOTSTRAP_OPERATOR_USERNAME=... \
 *   SDKWORK_IAM_BOOTSTRAP_OPERATOR_PASSWORD=... \
 *   node scripts/bootstrap/bootstrap-workspace-apps.mjs \
 *     --workspace D:/sdkwork-space --environment development \
 *     --backend-base-url https://api-dev.sdkwork.com --apply
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../..');
const bootstrapCli = path.join(scriptDir, 'bootstrap-app.mjs');
const LIFECYCLES = new Set(['development', 'test', 'staging', 'production']);

function parseArgs(argv) {
  const options = {
    workspace: '',
    backendBaseUrl: '',
    environment: '',
    only: [],
    dryRun: true,
    maxAttempts: 2,
    report: '',
    operatorProfile: '',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => {
      const next = argv[index + 1];
      if (!next || next.startsWith('--')) throw new Error(`${arg} requires a value`);
      index += 1;
      return next;
    };
    switch (arg) {
      case '--workspace':
        options.workspace = path.resolve(value());
        break;
      case '--backend-base-url':
        options.backendBaseUrl = value();
        break;
      case '--environment':
        options.environment = value();
        break;
      case '--only':
        options.only = value().split(',').map((entry) => entry.trim()).filter(Boolean);
        break;
      case '--apply':
        options.dryRun = false;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--max-attempts':
        options.maxAttempts = Math.max(1, Number.parseInt(value(), 10) || 2);
        break;
      case '--report':
        options.report = path.resolve(value());
        break;
      case '--operator-profile':
        options.operatorProfile = value();
        break;
      case '-h':
      case '--help':
        console.log('Usage: node scripts/bootstrap/bootstrap-workspace-apps.mjs --workspace <dir> --environment <development|test|staging|production> [--backend-base-url <url>] [--apply|--dry-run] [--only <appId,...>] [--report <path>] [--max-attempts <n>]');
        process.exit(0);
        break;
      default:
        throw new Error(`unknown option: ${arg}`);
    }
  }
  return options;
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function discoverSurfaces(workspace) {
  const surfaces = [];
  for (const repoEntry of readdirSync(workspace, { withFileTypes: true })) {
    if (!repoEntry.isDirectory() || !repoEntry.name.startsWith('sdkwork-')) continue;
    const appsDir = path.join(workspace, repoEntry.name, 'apps');
    if (!existsSync(appsDir)) continue;
    for (const appEntry of readdirSync(appsDir, { withFileTypes: true })) {
      if (!appEntry.isDirectory()) continue;
      const manifestPath = path.join(appsDir, appEntry.name, 'agent.app.config.json');
      if (!existsSync(manifestPath)) continue;
      let manifest;
      try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch { continue; }
      const appKey = text(manifest?.app?.key);
      if (!appKey) continue;
      const runtimeAppId = text(manifest?.backend?.appId) || appKey;
      const tenantId = text(manifest?.backend?.tenantId) || '100001';
      const organizationId = text(manifest?.backend?.organizationId) || '0';
      const permissions = Array.isArray(manifest?.backend?.accessTokenPermissionScope)
        && manifest.backend.accessTokenPermissionScope.length > 0
        ? manifest.backend.accessTokenPermissionScope
        : (Array.isArray(manifest?.backend?.permissionScope) ? manifest.backend.permissionScope : []);
      const issues = [];
      if (!text(manifest?.app?.name)) issues.push('missing app.name');
      if (!text(manifest?.app?.appType)) issues.push('missing app.appType');
      if (permissions.length === 0) issues.push('empty access permissions');
      surfaces.push({
        repo: repoEntry.name,
        app: appEntry.name,
        manifestPath,
        appKey,
        runtimeAppId,
        tenantId,
        organizationId,
        instanceKey: text(manifest?.backend?.instanceKey) || appKey,
        primaryDomain: text(manifest?.backend?.primaryDomain),
        issues,
      });
    }
  }
  return surfaces;
}

function groupIdentities(surfaces) {
  const groups = new Map();
  for (const surface of surfaces) {
    const key = `${surface.tenantId}\u0000${surface.runtimeAppId}`;
    const group = groups.get(key) ?? [];
    group.push(surface);
    groups.set(key, group);
  }
  const plan = [];
  for (const [key, group] of groups) {
    group.sort((a, b) => {
      const aPc = a.app.endsWith('-pc') ? 0 : 1;
      const bPc = b.app.endsWith('-pc') ? 0 : 1;
      if (aPc !== bPc) return aPc - bPc;
      return `${a.repo}/${a.app}`.localeCompare(`${b.repo}/${b.app}`);
    });
    const representative = group[0];
    plan.push({
      key,
      tenantId: representative.tenantId,
      organizationId: representative.organizationId,
      runtimeAppId: representative.runtimeAppId,
      appKey: representative.appKey,
      instanceKey: representative.instanceKey,
      primaryDomain: representative.primaryDomain,
      manifestPath: representative.manifestPath,
      surfaces: group.map((entry) => `${entry.repo}/${entry.app}`),
      repos: [...new Set(group.map((entry) => entry.repo))],
      issues: group.flatMap((entry) => entry.issues.map((issue) => `${entry.repo}/${entry.app}: ${issue}`)),
    });
  }
  return plan.sort((a, b) => a.runtimeAppId.localeCompare(b.runtimeAppId));
}

function bootstrapArgs(planEntry, options) {
  const args = [
    bootstrapCli,
    '--config', planEntry.manifestPath,
    '--environment', options.environment,
    '--tenant-id', planEntry.tenantId,
    '--organization-id', planEntry.organizationId,
    '--instance-key', planEntry.instanceKey,
  ];
  if (options.backendBaseUrl) args.push('--backend-base-url', options.backendBaseUrl);
  if (planEntry.primaryDomain) args.push('--domain', planEntry.primaryDomain);
  if (options.operatorProfile) args.push('--bootstrap-profile', options.operatorProfile);
  return args;
}

function bootstrapIdentity(planEntry, options) {
  let last = { ok: false, output: '' };
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    const run = spawnSync(process.execPath, bootstrapArgs(planEntry, options), {
      cwd: repoRoot,
      encoding: 'utf8',
      env: process.env,
      timeout: 300_000,
    });
    const output = `${run.stdout ?? ''}${run.stderr ?? ''}`.trim();
    if (run.status === 0) {
      return { ok: true, attempts: attempt, result: parseResult(output), output };
    }
    last = { ok: false, attempts: attempt, output };
  }
  return last;
}

function parseResult(output) {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start < 0 || end <= start) return undefined;
  try { return JSON.parse(output.slice(start, end + 1)); } catch { return undefined; }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.workspace) throw new Error('--workspace <dir> is required');
  if (!existsSync(options.workspace)) throw new Error(`workspace not found: ${options.workspace}`);
  const environment = text(options.environment || process.env.SDKWORK_ENVIRONMENT).toLowerCase();
  if (!LIFECYCLES.has(environment)) {
    throw new Error('--environment must be development, test, staging, or production');
  }
  options.environment = environment;
  if (!options.dryRun && !options.backendBaseUrl) {
    throw new Error('--apply requires --backend-base-url');
  }

  const surfaces = discoverSurfaces(options.workspace);
  const plan = groupIdentities(surfaces).filter((entry) => (
    options.only.length === 0 || options.only.includes(entry.runtimeAppId)
  ));
  const planIssues = plan.flatMap((entry) => entry.issues);
  if (planIssues.length > 0) {
    console.error(JSON.stringify({ status: 'invalid-plan', issues: planIssues }, null, 2));
    process.exitCode = 1;
    return;
  }

  if (options.dryRun) {
    const report = {
      mode: 'dry-run',
      environment,
      backendBaseUrl: options.backendBaseUrl || undefined,
      surfaces: surfaces.length,
      identities: plan.length,
      plan: plan.map((entry) => ({
        appId: entry.runtimeAppId,
        appKey: entry.appKey,
        tenantId: entry.tenantId,
        organizationId: entry.organizationId,
        manifest: entry.manifestPath,
        surfaces: entry.surfaces,
      })),
    };
    const reportPath = options.report || path.join(process.cwd(), 'dist', 'iam-workspace-registration-plan.json');
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({ mode: 'dry-run', surfaces: surfaces.length, identities: plan.length, report: reportPath }, null, 1));
    return;
  }

  const results = [];
  for (const entry of plan) {
    const result = bootstrapIdentity(entry, options);
    results.push({
      appId: entry.runtimeAppId,
      appKey: entry.appKey,
      manifest: entry.manifestPath,
      surfaces: entry.surfaces,
      ...result,
    });
    if (!result.ok) {
      console.error(`[bootstrap-workspace-apps] FAIL ${entry.runtimeAppId} (attempts=${result.attempts})`);
    }
  }

  const failed = results.filter((entry) => !entry.ok);
  const report = {
    mode: 'apply',
    environment,
    backendBaseUrl: options.backendBaseUrl,
    identities: results.length,
    succeeded: results.length - failed.length,
    failed: failed.length,
    results,
  };
  const reportPath = options.report || path.join(process.cwd(), 'dist', 'iam-workspace-registration-report.json');
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    mode: 'apply',
    identities: results.length,
    succeeded: results.length - failed.length,
    failed: failed.length,
    report: reportPath,
  }, null, 1));
  if (failed.length > 0) process.exitCode = 1;
}

main();
