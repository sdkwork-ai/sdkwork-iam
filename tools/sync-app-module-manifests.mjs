#!/usr/bin/env node
/**
 * Federate sibling application IAM module manifests into this application's
 * canonical catalog tree (`iam/modules/<moduleId>/iam.module.manifest.json`).
 *
 * The owning application's `specs/iam.module.manifest.json` is the source of
 * truth (IAM_MODULE_MANIFEST_SPEC.md). This keeps the bundled catalog complete
 * so a module's permission codes exist before its routes enforce them, and so a
 * newly shipped module materializes without editing a hand-maintained list
 * (AUTHORIZATION_STATE_SPEC.md 3.8).
 *
 * Usage:
 *   node tools/sync-app-module-manifests.mjs [--workspace <space-root>] [--check]
 *
 * `--check` reports drift and exits 1 without writing (CI gate).
 * Exit codes: 0 in sync, 1 drift/violation, 2 unusable input.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    workspace: { type: 'string', default: '' },
    check: { type: 'boolean', default: false },
  },
});

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspace = path.resolve(values.workspace || path.join(appRoot, '..'));
const modulesRoot = path.join(appRoot, 'iam/modules');

function fail(message) {
  process.stderr.write(`sync-app-module-manifests: ${message}\n`);
  process.exit(2);
}

if (!fs.existsSync(workspace)) {
  fail(`workspace not found: ${workspace}`);
}

const sources = [];
for (const entry of fs.readdirSync(workspace, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.startsWith('sdkwork-')) continue;
  if (entry.name === 'sdkwork-iam' || entry.name === 'sdkwork-specs') continue;
  const manifestPath = path.join(workspace, entry.name, 'specs/iam.module.manifest.json');
  if (!fs.existsSync(manifestPath)) continue;
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    fail(`${manifestPath}: invalid JSON (${error.message})`);
  }
  if (!parsed.moduleId || typeof parsed.moduleId !== 'string') {
    process.stderr.write(`skip (no moduleId): ${manifestPath}\n`);
    continue;
  }
  sources.push({ repo: entry.name, moduleId: parsed.moduleId, manifestPath, parsed });
}

const byModule = new Map();
for (const source of sources) {
  const existing = byModule.get(source.moduleId);
  if (existing) {
    fail(
      `duplicate moduleId '${source.moduleId}' in ${existing.repo} and ${source.repo}; ` +
        'a module id has exactly one owning application',
    );
  }
  byModule.set(source.moduleId, source);
}

const drift = [];
const written = [];

function unionPermissions(primary, secondary) {
  const byCode = new Map();
  for (const catalog of [primary, secondary]) {
    for (const entry of catalog ?? []) {
      if (!entry || typeof entry.code !== 'string') continue;
      if (!byCode.has(entry.code)) byCode.set(entry.code, entry);
    }
  }
  return [...byCode.values()];
}

function unionRoleGrants(primary, secondary) {
  const byRole = new Map();
  for (const grants of [primary, secondary]) {
    for (const grant of grants ?? []) {
      if (!grant || typeof grant.roleCode !== 'string') continue;
      const existing = byRole.get(grant.roleCode);
      const patterns = new Set([...(existing?.patterns ?? []), ...(grant.patterns ?? [])]);
      byRole.set(grant.roleCode, { ...(existing ?? grant), patterns: [...patterns] });
    }
  }
  return [...byRole.values()];
}

function unionDomainRoles(primary, secondary) {
  const byCode = new Map();
  for (const roles of [primary, secondary]) {
    for (const role of roles ?? []) {
      if (!role || typeof role.code !== 'string') continue;
      if (!byCode.has(role.code)) byCode.set(role.code, role);
    }
  }
  return [...byCode.values()];
}

function normalizeAuthorities(list) {
  return (list ?? [])
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object') {
        if (typeof entry.path === 'string') return entry.path;
        if (typeof entry.authority === 'string') return entry.authority;
      }
      return null;
    })
    .filter((entry) => typeof entry === 'string' && entry.length > 0);
}

function normalizePermissionEntry(entry) {
  const code = String(entry.code ?? '');
  const segments = code.split('.');
  return {
    ...entry,
    code,
    name: entry.name ?? entry.displayName ?? entry.title ?? code,
    resource: entry.resource ?? segments.slice(0, -1).join('.'),
    action: entry.action ?? segments.at(-1) ?? code,
    status: entry.status ?? 'active',
    since: entry.since ?? '1.0.0',
    replacementCode: entry.replacementCode ?? null,
  };
}

function normalizeDomainRole(role) {
  const surface = role.surface ?? 'organization';
  return {
    ...role,
    name: role.name ?? role.code,
    surface,
    scope: role.scope ?? surface,
    standard: role.standard ?? true,
    assignable: role.assignable ?? true,
    bindingPrincipalKind: role.bindingPrincipalKind ?? 'organization_membership',
    permissionPatterns: role.permissionPatterns ?? role.permissions ?? [],
  };
}

function normalizeGrant(grant) {
  return {
    ...grant,
    roleCode: grant.roleCode ?? grant.role ?? grant.role_code,
    patterns: grant.patterns ?? grant.permissions ?? [],
  };
}

function normalizeExclusion(exclusion) {
  return {
    ...exclusion,
    roleCode: exclusion.roleCode ?? exclusion.role ?? exclusion.role_code,
    excludesRoleCode:
      exclusion.excludesRoleCode ?? exclusion.excludes ?? exclusion.excludedRoleCode,
  };
}

function normalizeOauthMapping(mapping) {
  return {
    ...mapping,
    scope: mapping.scope ?? mapping.scopeCode ?? '',
    permissions: mapping.permissions ?? mapping.permissionCodes ?? [],
  };
}

/**
 * Fills the IAM module manifest defaults a partial app catalog omits. An app
 * that ships only `moduleId` + `permissions.catalog` still produces a complete,
 * valid module manifest (IAM_MODULE_MANIFEST_SPEC.md section 2). Unknown fields
 * are preserved so curated governance metadata is never dropped.
 */
function normalizedSource(source, repo) {
  const parsed = source.parsed;
  const catalog = (parsed.permissions?.catalog ?? []).map(normalizePermissionEntry);
  const prefixes = new Set(
    catalog.map((entry) => entry.code.split('.')[0]).filter((prefix) => prefix.length > 0),
  );
  const declaredDomain = parsed.domain ?? parsed.moduleId;
  // A module owns one permission domain. When a legacy app declares a domain
  // label that matches none of its codes, derive it from the single owning
  // prefix (deployments -> deploy, feeds -> feeds).
  const domain =
    prefixes.size === 0 || prefixes.has(declaredDomain)
      ? declaredDomain
      : prefixes.size === 1
        ? [...prefixes][0]
        : declaredDomain;
  return {
    schemaVersion: parsed.schemaVersion ?? 1,
    kind: parsed.kind ?? 'sdkwork.iam.module',
    moduleId: parsed.moduleId,
    catalogVersion: parsed.catalogVersion ?? '1.0.0',
    domain,
    owner: parsed.owner ?? repo,
    displayName: parsed.displayName ?? parsed.moduleId,
    permissions: {
      ...(parsed.permissions ?? {}),
      openapiAuthorities: normalizeAuthorities(parsed.permissions?.openapiAuthorities),
      catalog,
    },
    roles: {
      ...(parsed.roles ?? {}),
      domainStandardRoles: (parsed.roles?.domainStandardRoles ?? []).map(normalizeDomainRole),
      roleGrantExtensions: (parsed.roles?.roleGrantExtensions ?? []).map(normalizeGrant),
      roleExclusions: (parsed.roles?.roleExclusions ?? []).map(normalizeExclusion),
    },
    directory: {
      organizationTemplates: parsed.directory?.organizationTemplates ?? [],
      departmentTemplates: parsed.directory?.departmentTemplates ?? [],
      positionTemplates: parsed.directory?.positionTemplates ?? [],
      membershipTemplates: parsed.directory?.membershipTemplates ?? [],
    },
    policyConditions: {
      supportedAttributes: parsed.policyConditions?.supportedAttributes ?? [],
    },
    oauthScopeMappings: (parsed.oauthScopeMappings ?? []).map(normalizeOauthMapping),
    dependencies: {
      requiresModules: parsed.dependencies?.requiresModules ?? ['iam-kernel'],
    },
  };
}

/**
 * Federation is additive: the owning app spec wins for shared entries, while
 * catalog codes, role grant patterns, and domain roles already shipped by the
 * bundle are never dropped. Removing a code requires an explicit catalog
 * deprecation in the module manifest (IAM_CATALOG_GOVERNANCE_SPEC).
 */
function mergedManifest(existing, source) {
  const merged = { ...existing, ...source };
  merged.permissions = {
    ...(source.permissions ?? {}),
    ...(existing.permissions ?? {}),
    catalog: unionPermissions(
      (source.permissions?.catalog ?? []).map(normalizePermissionEntry),
      (existing.permissions?.catalog ?? []).map(normalizePermissionEntry),
    )
      .map((entry) => ({ ...entry }))
      .sort((left, right) => left.code.localeCompare(right.code)),
    openapiAuthorities: [
      ...new Set([
        ...normalizeAuthorities(source.permissions?.openapiAuthorities),
        ...normalizeAuthorities(existing.permissions?.openapiAuthorities),
      ]),
    ].sort(),
  };
  merged.roles = {
    ...(source.roles ?? {}),
    ...(existing.roles ?? {}),
    roleGrantExtensions: unionRoleGrants(
      (source.roles?.roleGrantExtensions ?? []).map(normalizeGrant),
      (existing.roles?.roleGrantExtensions ?? []).map(normalizeGrant),
    )
      .map((grant) => ({ ...grant, patterns: [...grant.patterns].sort() }))
      .sort((left, right) => left.roleCode.localeCompare(right.roleCode)),
    domainStandardRoles: unionDomainRoles(
      (source.roles?.domainStandardRoles ?? []).map(normalizeDomainRole),
      (existing.roles?.domainStandardRoles ?? []).map(normalizeDomainRole),
    ).sort((left, right) => left.code.localeCompare(right.code)),
  };
  return merged;
}

fs.mkdirSync(modulesRoot, { recursive: true });
for (const [moduleId, source] of [...byModule.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const targetDir = path.join(modulesRoot, moduleId);
  const targetPath = path.join(targetDir, 'iam.module.manifest.json');
  const existing = fs.existsSync(targetPath)
    ? JSON.parse(fs.readFileSync(targetPath, 'utf8'))
    : null;
  const merged = mergedManifest(existing ?? {}, normalizedSource(source, source.repo));
  const mergedText = `${JSON.stringify(merged, null, 2)}\n`;
  const currentText = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : null;
  if (currentText !== null && JSON.stringify(JSON.parse(currentText)) === JSON.stringify(merged)) {
    continue;
  }
  drift.push(`${moduleId} <- ${source.repo}`);
  if (values.check) continue;
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(targetPath, mergedText, 'utf8');
  written.push(moduleId);
}

process.stdout.write(
  `federated modules: ${byModule.size}; drift: ${drift.length}; written: ${written.length}\n`,
);
for (const item of drift) {
  process.stdout.write(`drift ${item}\n`);
}
if (values.check && drift.length > 0) {
  process.stderr.write('sync-app-module-manifests: catalog drift detected\n');
  process.exit(1);
}
