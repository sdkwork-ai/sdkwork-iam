#!/usr/bin/env node
/**
 * Verifies that every client root's component deployment descriptor points at
 * runtime documents that exist.
 *
 * ## Why this gate exists
 *
 * `sdkwork-specs/tools/check-source-config-standard.mjs` is the canonical gate
 * for `etc/`, and it does not cover this. Two independent reasons:
 *
 * 1. `inspectComponentDeploymentConfig` validates only `parentDeploymentConfig`
 *    and `parentTopologySpec`. It never reads `profiles[].source` or
 *    `materialization.outputPattern`.
 * 2. `inspectDeploymentIndex` — which *does* validate a per-profile target path
 *    and its identity fields — returns immediately unless
 *    `config.kind === 'sdkwork.deployment-index'`. A client root's descriptor is
 *    `kind: 'sdkwork.component-deployment'` and keys its profiles by `source`,
 *    not by `config`, so the entire body is skipped.
 *
 * The result was a generator bug that survived a full green gate run: all ten
 * sources of three client roots named files that did not exist, because the
 * builder appended a literal `app` path segment and a literal `runtime-env`
 * file stem instead of using the surface's own `runtimeEnvDir` and
 * `runtimeEnvFileBase`. A descriptor no tool reads is a descriptor that drifts;
 * this gate reads it.
 *
 * ## What it asserts
 *
 * For each `apps/*​/etc/sdkwork.deployment.config.json` with
 * `kind: sdkwork.component-deployment`:
 *
 * - every `profiles.<profileId>.source` resolves to an existing file;
 * - every such file declares `environment`, `deploymentProfile` and `profileId`
 *   matching the profile key it is registered under, so a copy-paste between
 *   profiles cannot pass;
 * - `materialization.outputPattern` is the literal template that reproduces
 *   every `source` when `{deploymentProfile}` and `{environment}` are
 *   substituted, and it carries both placeholders;
 * - `materialization.profiles` lists exactly the profile keys declared, and the
 *   descriptor declares all ten canonical profile ids.
 *
 * The `outputPattern` comparison is the one that catches a stem or directory
 * mismatch, which is precisely the shape the original bug took: paths resolved
 * consistently but named a file the root never materializes.
 *
 * Usage:
 *
 *   node tools/check-deployment-descriptor-sources.mjs
 *   node tools/check-deployment-descriptor-sources.mjs --root apps/sdkwork-iam-h5
 *
 * Exit codes: 0 pass, 1 issue found, 2 usage error.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

/** The ten canonical profile ids of `ENVIRONMENT_SPEC.md` section 5.1. */
const CANONICAL_PROFILES = ['standalone', 'cloud'].flatMap((deploymentProfile) =>
  ['development', 'test', 'staging', 'demo', 'production'].map(
    (environment) => `${deploymentProfile}.${environment}`,
  ),
);

const PROFILE_ID_PATTERN =
  /^(standalone|cloud)\.(development|test|staging|demo|production)$/u;

function toPosix(value) {
  return value.replaceAll('\\', '/');
}

/** Client roots owning a deployment descriptor, or one explicit root. */
function clientRoots(root) {
  if (root) return [path.resolve(REPO_ROOT, root)];
  const appsDir = path.join(REPO_ROOT, 'apps');
  if (!fs.existsSync(appsDir)) return [];
  return fs
    .readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(appsDir, entry.name))
    .filter((absolute) => fs.existsSync(path.join(absolute, 'etc', 'sdkwork.deployment.config.json')))
    .sort();
}

/**
 * The identity a runtime document declares.
 *
 * Both shapes are accepted because both are normative for their surface: the
 * browser/mini program/flutter surfaces materialize flat `SDKWORK_*` keys, and
 * the native surfaces materialize the nested `environment`/`deploymentProfile`/
 * `profileId` form of `ENVIRONMENT_SPEC.md` section 5.1.2.
 */
function runtimeDocumentIdentity(document) {
  const runtime = document?.runtime && typeof document.runtime === 'object' ? document.runtime : {};
  return {
    environment: document?.environment ?? document?.SDKWORK_ENVIRONMENT ?? runtime.environment,
    deploymentProfile:
      document?.deploymentProfile ?? document?.SDKWORK_DEPLOYMENT_PROFILE ?? runtime.deploymentProfile,
    profileId: document?.profileId ?? document?.SDKWORK_PROFILE_ID ?? runtime.profileId,
  };
}

/**
 * Substitute a profile id into an `outputPattern`.
 *
 * Returns `null` when the pattern does not carry both placeholders, so the
 * caller can report the pattern itself rather than a confusing mismatch.
 */
function expandOutputPattern(pattern, profileId) {
  const match = profileId.match(PROFILE_ID_PATTERN);
  if (!match) return null;
  if (!pattern.includes('{deploymentProfile}') || !pattern.includes('{environment}')) return null;
  return pattern
    .replaceAll('{deploymentProfile}', match[1])
    .replaceAll('{environment}', match[2]);
}

export function checkDeploymentDescriptorSources(roots = null) {
  const issues = [];
  let inspectedRoots = 0;
  let inspectedProfiles = 0;

  for (const absoluteRoot of clientRoots(roots)) {
    const relativeRoot = toPosix(path.relative(REPO_ROOT, absoluteRoot));
    const descriptorPath = path.join(absoluteRoot, 'etc', 'sdkwork.deployment.config.json');
    let descriptor;
    try {
      descriptor = JSON.parse(fs.readFileSync(descriptorPath, 'utf8'));
    } catch (error) {
      issues.push(`${relativeRoot}: invalid descriptor JSON (${error.message})`);
      continue;
    }
    if (descriptor?.kind !== 'sdkwork.component-deployment') continue;
    inspectedRoots += 1;

    const profiles = descriptor.profiles;
    if (profiles === null || typeof profiles !== 'object' || Array.isArray(profiles)) {
      issues.push(`${relativeRoot}: profiles must be an object keyed by profile id`);
      continue;
    }

    const declared = Object.keys(profiles).sort();
    for (const profileId of CANONICAL_PROFILES) {
      if (!declared.includes(profileId)) {
        issues.push(`${relativeRoot}: missing canonical profile ${profileId}`);
      }
    }

    const pattern = descriptor?.materialization?.outputPattern;
    if (typeof pattern !== 'string' || pattern.trim() === '') {
      issues.push(`${relativeRoot}: materialization.outputPattern is required`);
    } else if (!pattern.includes('{deploymentProfile}') || !pattern.includes('{environment}')) {
      issues.push(
        `${relativeRoot}: materialization.outputPattern must carry {deploymentProfile} and {environment}, found "${pattern}"`,
      );
    }

    const patternProfileIds = descriptor?.materialization?.profiles;
    if (Array.isArray(patternProfileIds)) {
      const missing = declared.filter((profileId) => !patternProfileIds.includes(profileId));
      const extra = patternProfileIds.filter((profileId) => !declared.includes(profileId));
      if (missing.length > 0) {
        issues.push(
          `${relativeRoot}: materialization.profiles omits declared profile(s) ${missing.join(', ')}`,
        );
      }
      if (extra.length > 0) {
        issues.push(
          `${relativeRoot}: materialization.profiles declares undeclared profile(s) ${extra.join(', ')}`,
        );
      }
    }

    for (const [profileId, entry] of Object.entries(profiles)) {
      inspectedProfiles += 1;
      const source = entry?.source;
      if (typeof source !== 'string' || source.trim() === '') {
        issues.push(`${relativeRoot}#/profiles/${profileId}/source: non-empty relative path is required`);
        continue;
      }

      const absoluteSource = path.resolve(path.dirname(descriptorPath), source);
      if (!fs.existsSync(absoluteSource)) {
        issues.push(
          `${relativeRoot}#/profiles/${profileId}/source: target does not exist (${source})`,
        );
        continue;
      }

      if (typeof pattern === 'string') {
        const expanded = expandOutputPattern(pattern, profileId);
        if (expanded !== null && expanded !== source) {
          issues.push(
            `${relativeRoot}#/profiles/${profileId}/source: "${source}" disagrees with outputPattern `
              + `"${pattern}", which expands to "${expanded}"`,
          );
        }
      }

      if (!PROFILE_ID_PATTERN.test(profileId)) {
        issues.push(
          `${relativeRoot}#/profiles/${profileId}: profile id must use <standalone|cloud>.<development|test|staging|demo|production>`,
        );
        continue;
      }

      let document;
      try {
        document = JSON.parse(fs.readFileSync(absoluteSource, 'utf8'));
      } catch (error) {
        issues.push(`${relativeRoot}#/profiles/${profileId}/source: invalid JSON (${error.message})`);
        continue;
      }

      const [, deploymentProfile, environment] = profileId.match(PROFILE_ID_PATTERN);
      const identity = runtimeDocumentIdentity(document);
      const relativeSource = toPosix(path.relative(absoluteRoot, absoluteSource));
      // Only a document that declares any identity at all is required to be
      // complete: a surface whose bootstrap derives identity from the file name
      // is not making a claim this gate can contradict.
      const declaredFields = Object.values(identity).filter(Boolean).length;
      if (declaredFields === 0) continue;
      if (identity.environment !== environment) {
        issues.push(
          `${relativeRoot}: ${relativeSource}#environment: must equal ${environment}, found ${identity.environment}`,
        );
      }
      if (identity.deploymentProfile !== deploymentProfile) {
        issues.push(
          `${relativeRoot}: ${relativeSource}#deploymentProfile: must equal ${deploymentProfile}, found ${identity.deploymentProfile}`,
        );
      }
      if (identity.profileId !== profileId) {
        issues.push(
          `${relativeRoot}: ${relativeSource}#profileId: must equal ${profileId}, found ${identity.profileId}`,
        );
      }
    }
  }

  return { issues, inspectedRoots, inspectedProfiles };
}

function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      root: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    console.log(
      'Usage: node tools/check-deployment-descriptor-sources.mjs [--root <client-root>]',
    );
    return 0;
  }

  const { issues, inspectedRoots, inspectedProfiles } = checkDeploymentDescriptorSources(values.root);
  if (issues.length > 0) {
    console.error(`deployment descriptor sources failed: ${issues.length} issue(s)`);
    for (const issue of issues) console.error(`- ${issue}`);
    return 1;
  }
  // A gate that can pass without reading anything is indistinguishable from a
  // gate that is not wired (`QUALITY_GATE_SPEC.md` section 1.1), so the count is
  // part of the success output rather than a silent zero.
  console.log(
    `deployment descriptor sources OK (${inspectedRoots} root(s), ${inspectedProfiles} profile source(s) resolved)`,
  );
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
