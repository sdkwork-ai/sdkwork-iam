// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Runtime-configuration contract for the sdkwork-iam-harmony-mobile root.
 *
 * Authority: `ENVIRONMENT_SPEC.md` sections 5.1.0.1, 5.1.2, 5.1.3 and 5.1.4.1.
 *
 * The ten documents under `config/app/` are generated from
 * `etc/sdkwork.deployment.config.json` and `etc/topology/<profile-id>.env`. This
 * suite re-derives every endpoint from those same files through its own reader and
 * asserts the checked-in documents still agree, so "generated" cannot quietly become
 * "whatever the generator happened to write".
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(HERE, '..');
const REPO_ROOT = path.resolve(APP_ROOT, '..', '..');
const RUNTIME_DIR = path.join(APP_ROOT, 'config', 'app');
const AUTHORITY = path.join(REPO_ROOT, 'etc', 'sdkwork.deployment.config.json');
const GENERATED_ENTRY = path.join(APP_ROOT, 'entry', 'src', 'main', 'ets', 'generated', 'RuntimeConfig.ets');
const DEPLOYMENT_CONFIG = path.join(APP_ROOT, 'etc', 'sdkwork.deployment.config.json');

const PROFILE_IDS = [
  'cloud.demo',
  'cloud.development',
  'cloud.production',
  'cloud.staging',
  'cloud.test',
  'standalone.demo',
  'standalone.development',
  'standalone.production',
  'standalone.staging',
  'standalone.test',
];

const DEFAULT_PROFILE_ID = 'standalone.development';
const RUNTIME_TARGET = 'harmony-native';
const CANONICAL_API_PREFIXES = ['/app/v3/api', '/backend/v3/api'];
const APPLICATION_ACCESS_TOKEN_KEY = 'SDKWORK_ACCESS_TOKEN';
const CORE_RUNTIME_ENV = path.join(
  APP_ROOT, 'packages', 'sdkwork-iam-harmony-mobile-core', 'src', 'main', 'ets', 'runtime', 'RuntimeEnv.ets',
);
/** Keys a committed profile document must never carry: they are session credentials. */
const PRIVATE_CREDENTIAL_KEYS = [
  'accessToken',
  'authToken',
  'refreshToken',
  'sessionAccessToken',
  'apiKey',
  'password',
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readProfileEnv(file) {
  const values = {};
  if (!fs.existsSync(file)) return values;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    values[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
  }
  return values;
}

function stripTrailingSlashes(value) {
  let normalized = value;
  while (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
  return normalized;
}

function websocketOf(origin) {
  if (origin.startsWith('https://')) return 'wss://' + origin.slice('https://'.length);
  if (origin.startsWith('http://')) return 'ws://' + origin.slice('http://'.length);
  throw new Error('cannot derive a websocket origin from ' + origin);
}

/** Independently re-derives one document from the deployment authority. */
function derive(profileId) {
  const authority = readJson(AUTHORITY);
  const [deploymentProfile, environment] = profileId.split('.');
  const values = readProfileEnv(path.join(REPO_ROOT, 'etc', authority.profiles[profileId].config));
  const applicationOrigin = stripTrailingSlashes(authority.environments[environment].applicationOrigin);
  if (deploymentProfile === 'standalone') {
    const origin = stripTrailingSlashes(values.SDKWORK_IAM_APPLICATION_PUBLIC_HTTP_URL);
    return {
      application: { publicHttpUrl: origin, publicWebsocketUrl: websocketOf(origin) },
      appbase: { appApiBaseUrl: origin, loginUrl: origin },
      platform: { apiGatewayHttpUrl: origin },
    };
  }
  const family = authority.environments[environment].cloudApiBaseUrl;
  const primary = family.split(';')[0].trim();
  const localGateway = stripTrailingSlashes(values.SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL ?? '');
  const apiBase = localGateway.length > 0 ? localGateway : family;
  return {
    application: {
      publicHttpUrl: applicationOrigin,
      publicWebsocketUrl: websocketOf(primary),
    },
    appbase: { appApiBaseUrl: apiBase, loginUrl: applicationOrigin },
    platform: { apiGatewayHttpUrl: apiBase },
  };
}

function readRuntimeDocument(profileId) {
  return readJson(path.join(RUNTIME_DIR, 'runtime-env.' + profileId + '.json'));
}

function readApplicationAccessToken(profileId) {
  const document = readRuntimeDocument(profileId);
  return String(document[APPLICATION_ACCESS_TOKEN_KEY] ?? '').trim();
}

/** Decodes one base64url JWT segment. The public token has no signature to verify. */
function decodeJwtSegment(segment) {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
}

describe('harmony runtime config', () => {
  it('tracks exactly the ten registered profiles', () => {
    const profiles = fs
      .readdirSync(RUNTIME_DIR)
      .filter((name) => /^runtime-env\..+\.json$/u.test(name))
      .map((name) => name.slice('runtime-env.'.length, -'.json'.length))
      .sort((a, b) => a.localeCompare(b));
    assert.deepEqual(profiles, PROFILE_IDS);
  });

  it('declares identity keys that agree with the filename and each other', () => {
    for (const profileId of PROFILE_IDS) {
      const document = readRuntimeDocument(profileId);
      assert.equal(document.profileId, profileId, profileId + ': profileId');
      assert.equal(
        document.profileId,
        document.deploymentProfile + '.' + document.environment,
        profileId + ': profileId must be <deploymentProfile>.<environment>',
      );
      assert.equal(document.runtimeTarget, RUNTIME_TARGET, profileId + ': runtimeTarget');
    }
  });

  it('carries the public application access token in every profile document', () => {
    // APP_ACCESS_TOKEN_SPEC.md section 2: the key is mandatory in every profile file of
    // a manifest-bearing root, and section 3.1 fixes it as one JWT compact string.
    for (const profileId of PROFILE_IDS) {
      const document = readRuntimeDocument(profileId);
      assert.ok(
        Object.prototype.hasOwnProperty.call(document, APPLICATION_ACCESS_TOKEN_KEY),
        profileId + ': ' + APPLICATION_ACCESS_TOKEN_KEY + ' is missing',
      );
      const token = readApplicationAccessToken(profileId);
      assert.ok(token.length > 0, profileId + ': ' + APPLICATION_ACCESS_TOKEN_KEY + ' must be non-empty');
      const segments = token.split('.');
      assert.equal(segments.length, 3, profileId + ': the token must be a three-part JWT');
      for (const segment of segments) {
        assert.ok(segment.length > 0, profileId + ': every JWT segment must be non-empty');
      }
    }
  });

  it('issues the public application token class, not a session credential', () => {
    // ENVIRONMENT_SPEC.md section 6.1 and APP_ACCESS_TOKEN_SPEC.md section 3: this is
    // the public pre-login isolation token (alg:none, token_class:application) and it
    // must match the profile and the root manifest identity it is committed for.
    const manifest = readJson(path.join(APP_ROOT, 'agent.app.config.json'));
    for (const profileId of PROFILE_IDS) {
      const [deploymentProfile, environment] = profileId.split('.');
      const segments = readApplicationAccessToken(profileId).split('.');
      const header = decodeJwtSegment(segments[0]);
      const payload = decodeJwtSegment(segments[1]);
      assert.equal(header.alg, 'none', profileId + ': a public application token uses alg:none');
      assert.equal(header.kid, 'public-app-token', profileId + ': public app token kid');
      assert.equal(payload.token_class, 'application', profileId + ': token_class must be application');
      assert.equal(payload.token_type, 'access', profileId + ': token_type must be access');
      assert.equal(payload.environment, environment, profileId + ': environment claim');
      assert.equal(payload.deployment_profile, deploymentProfile, profileId + ': deployment_profile claim');
      assert.equal(payload.runtime_target, RUNTIME_TARGET, profileId + ': runtime_target claim');
      assert.equal(payload.app_id, manifest.backend.appId, profileId + ': app_id claim');
      assert.equal(payload.aud, manifest.backend.appId, profileId + ': aud claim');
      assert.equal(
        String(payload.tenant_id),
        String(manifest.backend.tenantId),
        profileId + ': tenant_id claim',
      );
      assert.equal(String(payload.user_id), '0', profileId + ': a public token carries no user');
    }
  });

  it('keeps private session credentials out of the profile documents', () => {
    // Only the public application token may be committed (APP_ACCESS_TOKEN_SPEC.md
    // section 1). A session access token, auth token, refresh token, API key or
    // password in a profile file would be a committed private credential.
    for (const profileId of PROFILE_IDS) {
      const document = readRuntimeDocument(profileId);
      for (const key of PRIVATE_CREDENTIAL_KEYS) {
        assert.equal(
          document[key],
          undefined,
          profileId + ': ' + key + ' is a session credential and must not be committed',
        );
      }
    }
  });

  it('declares metadata that names this application', () => {
    for (const profileId of PROFILE_IDS) {
      const document = readRuntimeDocument(profileId);
      assert.equal(document.metadata.applicationCode, 'iam', profileId + ': metadata.applicationCode');
      assert.equal(document.metadata.namespace, 'sdkwork-iam-harmony-mobile', profileId + ': metadata.namespace');
    }
  });

  it('materializes endpoints that equal the deployment authority derivation', () => {
    for (const profileId of PROFILE_IDS) {
      const document = readRuntimeDocument(profileId);
      assert.deepEqual(
        {
          application: document.application,
          appbase: document.appbase,
          platform: document.platform,
        },
        derive(profileId),
        profileId + ': the tracked document must equal the deployment authority derivation',
      );
    }
  });

  it('materializes absolute origins with the expected scheme', () => {
    const websocketKeys = new Set(['publicWebsocketUrl']);
    for (const profileId of PROFILE_IDS) {
      const document = readRuntimeDocument(profileId);
      for (const group of ['application', 'appbase', 'platform']) {
        for (const key of Object.keys(document[group])) {
          for (const origin of String(document[group][key]).split(';')) {
            const match = /^([a-z][a-z0-9+.-]*):\/\/([^/\s]+)$/u.exec(origin);
            assert.ok(match, profileId + ': ' + key + ' origin must be absolute, found ' + origin);
            const expected = websocketKeys.has(key) ? ['ws', 'wss'] : ['http', 'https'];
            assert.ok(
              expected.includes(match[1]),
              profileId + ': ' + key + ' must use ' + expected.join('/') + ', found ' + match[1],
            );
          }
        }
      }
    }
  });

  it('keeps base urls free of the canonical api prefix', () => {
    // ENVIRONMENT_SPEC.md section 5.1.4.1 assigns prefix normalization to the
    // generated SDK transport layer. A document that already carries the prefix
    // produces /app/v3/api/app/v3/api at request time.
    for (const profileId of PROFILE_IDS) {
      const document = readRuntimeDocument(profileId);
      for (const group of ['application', 'appbase', 'platform']) {
        for (const key of Object.keys(document[group])) {
          for (const prefix of CANONICAL_API_PREFIXES) {
            assert.ok(
              !String(document[group][key]).includes(prefix),
              profileId + ': ' + key + ' must be a bare origin',
            );
          }
        }
      }
    }
  });

  it('records the deferred materialization instead of a fabricated command', () => {
    const config = readJson(DEPLOYMENT_CONFIG);
    assert.equal(config.materialization.checkedIn, true, 'checkedIn');
    assert.equal(config.materialization.deferred, true, 'deferred');
    assert.ok(
      String(config.materialization.deferredReason ?? '').length > 0,
      'a deferred materialization must state its reason',
    );
    assert.equal(config.materialization.runtimeTarget, RUNTIME_TARGET, 'runtimeTarget');
    assert.equal(
      config.materialization.command,
      undefined,
      'a deferred materialization must not declare a command',
    );
    assert.deepEqual(
      [...config.materialization.profiles].sort((a, b) => a.localeCompare(b)),
      PROFILE_IDS,
      'declared profiles must match the tracked documents',
    );
    for (const profileId of PROFILE_IDS) {
      const source = config.profiles[profileId]?.source;
      assert.ok(source, 'profile ' + profileId + ' must declare its source document');
      assert.ok(
        fs.existsSync(path.join(APP_ROOT, 'etc', source)),
        'profile ' + profileId + ' source ' + source + ' must resolve to a real file',
      );
    }
  });

  it('projects every profile into the generated ArkTS module', () => {
    // Quote style is not the contract; content is. Normalizing to single quotes
    // keeps these assertions about which profiles and which default are projected,
    // instead of failing the moment the emitter's string style changes.
    const generated = fs.readFileSync(GENERATED_ENTRY, 'utf8').replaceAll('"', "'");
    assert.ok(
      generated.includes('GENERATED FILE - DO NOT EDIT'),
      'the generated module must be marked as generated',
    );
    for (const profileId of PROFILE_IDS) {
      assert.ok(
        generated.includes("profileId: '" + profileId + "'"),
        'generated RuntimeConfig.ets is missing profile ' + profileId,
      );
    }
    assert.ok(
      generated.includes("IAM_HARMONY_DEFAULT_PROFILE_ID: string = '" + DEFAULT_PROFILE_ID + "'"),
      'the generated module must pin the default profile id',
    );
    assert.ok(
      generated.includes("from '../bootstrap/EnvironmentContract'"),
      'the generated module must import the document contract, not redeclare it',
    );
    for (const profileId of PROFILE_IDS) {
      const token = readApplicationAccessToken(profileId);
      assert.ok(
        generated.includes(APPLICATION_ACCESS_TOKEN_KEY + ": '" + token + "'"),
        'generated RuntimeConfig.ets must project the committed ' + APPLICATION_ACCESS_TOKEN_KEY
          + ' of ' + profileId,
      );
    }
    assert.ok(
      !generated.includes('metadata'),
      'the projection must not carry metadata, which the contract interface does not declare',
    );
  });

  it('declares the token in the contract interface and the validated environment', () => {
    // The HAP cannot read the tracked JSON, so the value reaches the loader through
    // generated/RuntimeConfig.ets and must be a declared contract field - otherwise
    // ArkTS rejects the projected literal and the token never arrives at bootstrap.
    const contract = fs.readFileSync(CORE_RUNTIME_ENV, 'utf8');
    assert.ok(
      contract.includes('readonly ' + APPLICATION_ACCESS_TOKEN_KEY + ': string;'),
      'IamHarmonyRuntimeEnvDocument must declare ' + APPLICATION_ACCESS_TOKEN_KEY,
    );
    assert.ok(
      contract.includes('readonly applicationAccessToken: string;'),
      'IamHarmonyEnvironment must expose the loaded application token to bootstrap',
    );
    assert.ok(
      contract.includes('IAM_HARMONY_APPLICATION_ACCESS_TOKEN_KEY'),
      'the loader must name the canonical token key in its fail-closed diagnostics',
    );
    assert.ok(
      contract.includes("'config/app/runtime-env.'"),
      'a missing-token diagnostic must name the profile document',
    );
  });
});
