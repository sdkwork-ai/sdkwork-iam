#!/usr/bin/env node

/**
 * Materializes build evidence for the SDKWork IAM uni-app x root.
 *
 * This script does not replace HBuilderX: App packaging is performed by the
 * HBuilderX CLI in the release pipeline. It validates the root and mode
 * contract, validates the selected public runtime profile, and writes the build
 * evidence required by `UNIAPP_X_APP_ARCHITECTURE_SPEC.md` §12.
 *
 * Usage:
 *   node scripts/build-runtime.mjs
 *   node scripts/build-runtime.mjs --deployment-profile cloud --environment staging
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { verifyIamUniappxRoot } from './verify-uniappx-root.mjs';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DEPLOYMENT_PROFILES = ['standalone', 'cloud'];
const ENVIRONMENTS = ['development', 'test', 'staging', 'demo', 'production'];
const ENV_ALIAS = {
  development: 'dev',
  test: 'test',
  staging: 'staging',
  demo: 'demo',
  production: 'prod',
};
const SECRET_KEY = /(SECRET|PRIVATE_KEY|DATABASE_URL|REDIS_URL|PASSWORD|SIGNING_KEY)/u;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'deployment-profile': { type: 'string', default: 'standalone' },
    environment: { type: 'string', default: 'development' },
    'app-root': { type: 'string', default: APP_ROOT },
  },
  strict: true,
});

const deploymentProfile = values['deployment-profile'];
const environment = values.environment;
const appRoot = path.resolve(values['app-root']);

if (!DEPLOYMENT_PROFILES.includes(deploymentProfile)) {
  throw new Error(`--deployment-profile must be one of ${DEPLOYMENT_PROFILES.join(', ')}`);
}
if (!ENVIRONMENTS.includes(environment)) {
  throw new Error(`--environment must be one of ${ENVIRONMENTS.join(', ')}`);
}

const { issues, mode, targets } = verifyIamUniappxRoot(appRoot);
if (issues.length > 0) {
  for (const issue of issues) process.stderr.write(`[error] ${issue}\n`);
  throw new Error('uni-app x root verification failed; refusing to build evidence.');
}

const profileId = `${deploymentProfile}.${environment}`;
const profilePath = path.join(appRoot, 'config', 'app', `runtime-env.${profileId}.json`);
if (!fs.existsSync(profilePath)) {
  throw new Error(
    `Runtime profile is missing: ${path.relative(appRoot, profilePath)}. `
      + 'Materialize client runtime env with `node scripts/materialize-client-app-surfaces.mjs` '
      + 'from the repository root, then rerun the build.',
  );
}

const profile = readJson(profilePath);
for (const [key, expected] of Object.entries({
  SDKWORK_DEPLOYMENT_PROFILE: deploymentProfile,
  SDKWORK_ENVIRONMENT: environment,
  SDKWORK_PROFILE_ID: profileId,
})) {
  if (profile[key] !== expected) {
    throw new Error(`Runtime profile ${profileId} has ${key}="${String(profile[key])}"; expected "${expected}".`);
  }
}
if (typeof profile.SDKWORK_ACCESS_TOKEN !== 'string' || !profile.SDKWORK_ACCESS_TOKEN.trim()) {
  throw new Error(`Runtime profile ${profileId} must carry a non-empty public SDKWORK_ACCESS_TOKEN.`);
}
if (SECRET_KEY.test(Object.keys(profile).join(' '))) {
  throw new Error(`Runtime profile ${profileId} carries a forbidden private key.`);
}

const modeSpec = readJson(path.join(appRoot, 'specs', 'uniappx-mode.spec.json'));
const manifest = readJson(path.join(appRoot, 'manifest.json'));
const evidence = {
  schemaVersion: 1,
  kind: 'sdkwork.uniappx.build-evidence',
  root: 'sdkwork-iam/apps/sdkwork-iam-uniappx',
  architecture: 'uniappx',
  framework: 'uni-app-x',
  mode,
  profileId,
  targets,
  runtimeClassification: modeSpec.runtimeClassification,
  viewLayerCompilation: modeSpec.viewLayerCompilation,
  styleIsolationVersion: manifest['uni-app-x']?.styleIsolationVersion,
  minimumVersions: modeSpec.minimumVersions,
  toolchain: {
    hbuilderx: process.env.HBUILDERX_VERSION ?? 'unresolved',
    note: 'App packaging is performed by the HBuilderX CLI in the release pipeline.',
  },
  sourceProfile: path.relative(appRoot, profilePath).split(path.sep).join('/'),
  secretScan: 'passed',
};

const outDir = path.join(appRoot, 'dist', deploymentProfile, ENV_ALIAS[environment]);
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'build-evidence.json');
fs.writeFileSync(outPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
process.stdout.write(`build-runtime: wrote ${path.relative(appRoot, outPath)}\n`);
