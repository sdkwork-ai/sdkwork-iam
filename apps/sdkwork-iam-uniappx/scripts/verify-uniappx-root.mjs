#!/usr/bin/env node

/**
 * Read-only verification for the SDKWork IAM uni-app x root.
 *
 * Makes `UNIAPP_X_APP_ARCHITECTURE_SPEC.md` §2, §3, §11, and §14 executable for
 * this root: mode declaration agreement, mode-aware minimum versions, the
 * `pages.json` projection, `.uvue` page ownership, and the secret-free config
 * boundary.
 *
 * Usage:
 *   node scripts/verify-uniappx-root.mjs
 *   node scripts/verify-uniappx-root.mjs --mode-only
 *   node scripts/verify-uniappx-root.mjs --root <app-root>
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const MODE_MINIMUMS = {
  vapor: { android: 23, ios: 15, harmony: 20 },
  vdom: { android: 21, ios: 12, harmony: 14 },
};

const TARGET_TO_MANIFEST = {
  APP_ANDROID: { node: 'app-android', key: 'minSdkVersion', minimum: 'android' },
  APP_IOS: { node: 'app-ios', key: 'minimumOSVersion', minimum: 'ios' },
  APP_HARMONY: { node: 'app-harmony', key: 'compatibleSdkVersion', minimum: 'harmony' },
};

const FORBIDDEN_PROFILE_KEY = /(SECRET|PRIVATE_KEY|DATABASE_URL|REDIS_URL|PASSWORD|SIGNING_KEY)/u;

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function parseInteger(value) {
  if (Number.isInteger(value)) return value;
  if (typeof value === 'string') {
    const parenthesized = value.match(/\((\d+)\)/u);
    if (parenthesized) return Number.parseInt(parenthesized[1], 10);
    const leading = value.match(/(\d+)/u);
    if (leading) return Number.parseInt(leading[1], 10);
  }
  return null;
}

function listFilesRecursive(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'unpackage') continue;
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFilesRecursive(child));
    else files.push(child);
  }
  return files;
}

export function verifyIamUniappxRoot(root, { modeOnly = false } = {}) {
  const issues = [];
  const manifest = readJson(path.join(root, 'manifest.json'));
  const agent = readJson(path.join(root, 'agent.app.config.json'));
  const modeSpec = readJson(path.join(root, 'specs', 'uniappx-mode.spec.json'));

  if (!manifest) issues.push('manifest.json is missing or invalid JSON');
  if (!agent) issues.push('agent.app.config.json is missing or invalid JSON');
  if (!modeSpec) issues.push('specs/uniappx-mode.spec.json is missing or invalid JSON');
  if (issues.length > 0) return { issues, mode: null, targets: [], manifest };

  const mode = agent.runtime?.uniappxMode;
  if (mode !== 'vapor' && mode !== 'vdom') {
    issues.push(`runtime.uniappxMode must be "vapor" or "vdom" (found ${String(mode)})`);
    return { issues, mode: null, targets: [], manifest };
  }
  if (agent.runtime?.framework !== 'uni-app-x') {
    issues.push('runtime.framework must be "uni-app-x"');
  }
  if (!Array.isArray(agent.runtime?.clientArchitectures)
    || !agent.runtime.clientArchitectures.includes('uniappx')) {
    issues.push('runtime.clientArchitectures must include "uniappx"');
  }

  const node = manifest['uni-app-x'];
  if (!node || typeof node !== 'object') {
    issues.push('manifest.json is missing the mandatory "uni-app-x" node');
  } else {
    if (node.vapor !== (mode === 'vapor')) {
      issues.push(
        `manifest.json uni-app-x.vapor "${String(node.vapor)}" disagrees with runtime.uniappxMode "${mode}"`,
      );
    }
    if (node.styleIsolationVersion !== '2') {
      issues.push('manifest.json uni-app-x.styleIsolationVersion must be "2"');
    }
  }

  if (modeSpec.mode !== mode) {
    issues.push(
      `specs/uniappx-mode.spec.json mode "${String(modeSpec.mode)}" disagrees with runtime.uniappxMode "${mode}"`,
    );
  }
  const targets = Array.isArray(modeSpec.targets)
    ? modeSpec.targets.filter((target) => typeof target === 'string')
    : [];
  if (targets.length === 0) issues.push('specs/uniappx-mode.spec.json targets must be non-empty');

  const minimums = modeSpec.minimumVersions ?? {};
  const expected = MODE_MINIMUMS[mode];
  for (const key of ['android', 'ios', 'harmony']) {
    const value = parseInteger(minimums[key]);
    if (value === null || value < expected[key]) {
      issues.push(`${mode} mode requires minimumVersions.${key} >= ${expected[key]}`);
    }
  }

  const classification = modeSpec.runtimeClassification ?? {};
  for (const target of targets) {
    const runtime = classification[target];
    if (mode === 'vdom' && runtime !== 'vdom') {
      issues.push(`vdom root target "${target}" must declare runtimeClassification "vdom"`);
    }
    if (mode === 'vapor' && target.startsWith('APP_') && runtime !== 'vapor') {
      issues.push(`vapor root App target "${target}" must declare runtimeClassification "vapor"`);
    }
    if (mode === 'vapor' && !target.startsWith('APP_') && runtime !== 'vdom') {
      issues.push(`vapor root target "${target}" runs VDOM; declare runtimeClassification "vdom"`);
    }
  }

  for (const target of targets) {
    const mapping = TARGET_TO_MANIFEST[target];
    if (!mapping) continue;
    const platformNode = manifest[mapping.node];
    const value = parseInteger(platformNode?.[mapping.key]);
    if (value === null || value < expected[mapping.minimum]) {
      issues.push(
        `${mode} mode requires manifest.json ${mapping.node}.${mapping.key} >= ${expected[mapping.minimum]}`,
      );
    }
  }

  if (modeOnly) return { issues, mode, targets, manifest };

  const pages = readJson(path.join(root, 'pages.json'));
  if (!pages) {
    issues.push('pages.json is missing or invalid JSON');
  } else {
    const entries = [
      ...(Array.isArray(pages.pages) ? pages.pages : []),
      ...(Array.isArray(pages.subPackages)
        ? pages.subPackages.flatMap((item) => item.pages ?? [])
        : []),
    ];
    for (const entry of entries) {
      const pagePath = typeof entry === 'string' ? entry : entry?.path;
      if (typeof pagePath !== 'string' || !pagePath) continue;
      const uvueFile = path.join(root, `${pagePath}.uvue`);
      if (!fs.existsSync(uvueFile)) {
        issues.push(`pages.json declares "${pagePath}" but ${pagePath}.uvue does not exist`);
      }
    }
  }

  for (const file of listFilesRecursive(root)) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (relative.endsWith('.vue') && (relative.startsWith('pages/') || relative.includes('/pages/'))) {
      issues.push(`${relative}: .vue pages are forbidden; use .uvue`);
    }
  }

  const profileFiles = listFilesRecursive(path.join(root, 'config'))
    .filter((file) => /runtime-env\..+\.json$/u.test(file));
  for (const file of profileFiles) {
    const profile = readJson(file);
    if (!profile) {
      issues.push(`${path.relative(root, file)} is not valid JSON`);
      continue;
    }
    for (const key of Object.keys(profile)) {
      if (FORBIDDEN_PROFILE_KEY.test(key)) {
        issues.push(`${path.relative(root, file)} carries forbidden private key ${key}`);
      }
    }
  }

  return { issues, mode, targets, manifest };
}

function isMain() {
  return path.resolve(process.argv[1] ?? '') === path.resolve(fileURLToPath(import.meta.url));
}

if (isMain()) {
  const { values } = parseArgs({
    options: {
      root: { type: 'string', default: '.' },
      'mode-only': { type: 'boolean', default: false },
    },
  });
  const root = path.resolve(values.root);
  const { issues } = verifyIamUniappxRoot(root, { modeOnly: values['mode-only'] });
  if (issues.length > 0) {
    for (const issue of issues) process.stderr.write(`[error] ${issue}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `verify-uniappx-root: OK (${values['mode-only'] ? 'mode' : 'root'} contract)\n`,
  );
}
