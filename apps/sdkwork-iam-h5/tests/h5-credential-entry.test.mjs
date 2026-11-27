// SDKWORK-IAM-H5-CREDENTIAL-ENTRY-CONTRACT: authored regression guard.
//
// The generated `h5-surface-contract.test.mjs` owns the surface/route/runtime
// document contract. This sibling owns the credential-entry delivery path, which
// no generated file asserts: the committed public application access token must
// reach the browser global through the canonical Vite plugin, and the bootstrap
// must seed it into the IAM runtime instead of starting credential-free.
// It is intentionally authored (no generated banner) so regeneration is a no-op.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(rootDir, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
}

/**
 * Parse one committed `.env.<profile-id>` document.
 * @param {string} profileId canonical `<deployment-profile>.<environment>` id.
 * @returns {Record<string, string>} dotenv entries.
 */
function readProfileEnv(profileId) {
  const entries = {};
  for (const line of read('.env.' + profileId).split(/\r?\n/u)) {
    const separator = line.indexOf('=');
    if (separator <= 0 || line.startsWith('#')) continue;
    entries[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return entries;
}

/** Profile ids that must carry the committed public application token. */
const PROFILE_IDS = [
  'standalone.development',
  'standalone.test',
  'standalone.staging',
  'standalone.demo',
  'standalone.production',
  'cloud.development',
  'cloud.test',
  'cloud.staging',
  'cloud.demo',
  'cloud.production',
];

// IAM makes the deploy application the identity of every access token, so the
// committed `app_id`/`aud` claims are this installation's anchor, never the
// manifest runtime id (APP_ACCESS_TOKEN_SPEC.md section 3.1.1). With no anchor on
// a source checkout the committed profiles carry the explicit placeholder.
const DEPLOY_APPLICATION_ID_ENV = 'SDKWORK_DEPLOY_APPLICATION_ID';
const PENDING_DEPLOY_APPLICATION_ID = '__SDKWORK_DEPLOY_APPLICATION_ID__';

function expectedTokenAppId() {
  return String(process.env[DEPLOY_APPLICATION_ID_ENV] ?? '').trim() || PENDING_DEPLOY_APPLICATION_ID;
}

test('vite config registers the canonical public application access token plugin', () => {
  const config = read('vite.config.ts');
  assert.match(
    config,
    /import\s*\{\s*createSdkworkPublicApplicationAccessTokenVitePlugin\s*\}\s*from\s*'@sdkwork\/iam-credential-entry\/vite';/u,
    'vite.config.ts must import the canonical plugin from @sdkwork/iam-credential-entry/vite',
  );
  const call = /createSdkworkPublicApplicationAccessTokenVitePlugin\(\{([\s\S]*?)\}\)/u.exec(config);
  assert.ok(call, 'vite.config.ts must register the public application access token plugin');
  const options = call[1];
  assert.match(options, /accessToken:/u, 'the plugin must receive the committed access token');
  assert.match(
    options,
    /SDKWORK_ACCESS_TOKEN/u,
    'the token option must resolve SDKWORK_ACCESS_TOKEN from the selected profile env',
  );
  assert.match(
    options,
    /applicationId:\s*readDeployApplicationId\(\)/u,
    'the token app_id must bind to the deploy application anchor',
  );
  assert.match(options, /environment/u, 'the plugin must receive the profile lifecycle environment');
  assert.match(options, /profileId/u, 'the plugin must receive the profile id');
});

test('vite config loads the selected mode profile env without a local credential fork', () => {
  const config = read('vite.config.ts');
  assert.match(config, /loadEnv\(mode,\s*appRoot,\s*''\)/u, 'the config must load the mode profile env');
  assert.match(config, /readProfileDotenv\(mode\)/u, 'the token must come from the profile dotenv document');
  assert.match(config, /VITE_SDKWORK_ENVIRONMENT/u, 'the lifecycle environment must come from the profile env');
  assert.match(config, /VITE_SDKWORK_PROFILE_ID/u, 'the profile id must come from the profile env');
  // A hand-rolled injection channel bypassing the canonical plugin is the defect
  // class IAM_CREDENTIAL_ENTRY_SPEC.md section 6 (rule2) rejects.
  assert.doesNotMatch(config, /define:\s*\{[\s\S]*SDKWORK_ACCESS_TOKEN/u, 'the config must not define the token itself');
  assert.doesNotMatch(config, /globalThis\.__SDKWORK_CREDENTIAL_ENTRY/u, 'the config must not serialize the global itself');
});

test('every committed profile carries the public application token the config embeds', () => {
  for (const profileId of PROFILE_IDS) {
    assert.ok(fs.existsSync(path.join(appRoot, '.env.' + profileId)), 'missing .env.' + profileId);
    const token = readProfileEnv(profileId).SDKWORK_ACCESS_TOKEN;
    assert.ok(token, profileId + ' must declare SDKWORK_ACCESS_TOKEN');
    const parts = token.split('.');
    assert.equal(parts.length, 3, profileId + ' SDKWORK_ACCESS_TOKEN must be a JWT compact serialization');
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    assert.equal(header.kid, 'public-app-token', profileId + ' token must be the public application token');
    assert.equal(header.alg, 'none', profileId + ' token must be the unsigned public token');
    assert.equal(payload.token_class, 'application', profileId + ' token must declare token_class:application');
    assert.equal(payload.environment, profileId.split('.')[1], profileId + ' token environment must match the profile');
    assert.equal(payload.app_id, expectedTokenAppId(), profileId + ' token must bind app_id to the deploy application anchor');
  }
});

test('the bootstrap reads the injected token and seeds it into the IAM runtime', () => {
  const source = read('src/bootstrap/iamService.ts');
  assert.match(
    source,
    /import\s*\{\s*readBootstrapAccessTokenFromProcessEnv\s*\}\s*from\s*"@sdkwork\/iam-credential-entry";/u,
    'iamService.ts must read the bootstrap token through the canonical package',
  );
  const bootstrapIndex = source.indexOf('readBootstrapAccessTokenFromProcessEnv()');
  const runtimeIndex = source.indexOf('createIamH5RuntimeService(');
  assert.ok(bootstrapIndex >= 0, 'iamService.ts must call readBootstrapAccessTokenFromProcessEnv()');
  assert.ok(
    bootstrapIndex < runtimeIndex,
    'the bootstrap token must be read before the runtime service (and any request) is built',
  );
  // The initial access token is the session token when present, otherwise the
  // injected public application token: a fresh page load must never start empty.
  assert.match(source, /const resolveAccessToken[\s\S]*bootstrapAccessToken/u, 'the resolver must fall back to the bootstrap token');
  assert.match(source, /const initialSnapshot = sessionStore\.get\(\)/u);
  assert.match(source, /const initialAccessToken = resolveAccessToken\(initialSnapshot\)/u);
  assert.match(source, /accessToken: initialAccessToken/u, 'the runtime must be seeded with the initial access token');
  // A sign-out emits no session, so the subscription must revert to the bootstrap
  // token rather than clearing to an empty value.
  assert.match(source, /runtime\.setAccessToken\(accessToken\)/u);
  // The admin backend client follows the same session subscription and fallback.
  assert.match(source, /backendClient\.setAccessToken\(accessToken\)/u);
  assert.match(source, /backendClient\.setAuthToken\(snapshot\?\.authToken\)/u);
});

test('the app declares the credential-entry workspace dependency', () => {
  const manifest = JSON.parse(read('package.json'));
  assert.equal(
    manifest.dependencies?.['@sdkwork/iam-credential-entry'],
    'workspace:*',
    'package.json must declare @sdkwork/iam-credential-entry as workspace:*',
  );
});

test('the public runtime document never carries the application token', () => {
  const envDir = path.join(appRoot, 'config/browser');
  for (const file of fs.readdirSync(envDir).filter((name) => name.endsWith('.json'))) {
    const raw = fs.readFileSync(path.join(envDir, file), 'utf8');
    const document = JSON.parse(raw);
    const profileId = file.replace('runtime-env.', '').replace('.json', '');
    const token = readProfileEnv(profileId).SDKWORK_ACCESS_TOKEN;
    assert.ok(token, 'missing committed token for ' + profileId);
    assert.ok(!raw.includes(token), file + ' must not embed the application access token');
    for (const key of Object.keys(document)) {
      assert.ok(
        !/(?:secret|password|privateKey|signingKey|refreshToken|accessToken|SDKWORK_ACCESS_TOKEN)/iu.test(key),
        file + ' leaks a credential-shaped key ' + key,
      );
    }
  }
});
