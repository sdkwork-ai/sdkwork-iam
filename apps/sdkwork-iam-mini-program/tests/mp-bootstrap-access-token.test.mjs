/**
 * Bootstrap credential contract for the IAM mini program.
 *
 * The defect this suite exists to prevent: the shipped bootstrap built the IAM
 * service and the generated app SDK client without any access token, so
 * `POST /auth/sessions` — an `access-token-only` operation — threw
 * "access-token-only request requires Access-Token before request dispatch"
 * before dispatch. The committed profile documents carried
 * `SDKWORK_ACCESS_TOKEN`, but nothing read it, and sign-out cleared the client to
 * an empty credential instead of restoring the application token.
 *
 * The assertions read the committed bundle (`src/runtime/iam-app.js`) rather than
 * importing the TypeScript, so they are about the bytes that ship to the device.
 * Every case loads a fresh bundle instance because the bootstrap memoizes its
 * runtime for the process.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = path.join(appRoot, 'src', 'runtime', 'iam-app.js');
const profileDir = path.join(appRoot, 'config', 'mini-program');
const PROFILE_ID = 'standalone.development';
const PROFILE_DOCUMENT = `config/mini-program/runtime-env.${PROFILE_ID}.json`;
const SESSION_ACCESS_TOKEN = 'session-access-token-from-login';
const SESSION_AUTH_TOKEN = 'session-auth-token-from-login';

/** Loads the committed bundle without going through `require`. */
function loadBundle() {
  assert.ok(fs.existsSync(bundlePath), 'src/runtime/iam-app.js is missing: run scripts/build-runtime.mjs');
  const source = fs.readFileSync(bundlePath, 'utf8');
  const loaded = { exports: {} };
  const factory = new Function('module', 'exports', 'require', source);
  factory(loaded, loaded.exports, (specifier) => {
    throw new Error(`bundle must be self-contained but required ${specifier}`);
  });
  return loaded.exports;
}

function readProfile(profileId = PROFILE_ID) {
  const file = path.join(profileDir, `runtime-env.${profileId}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/u, ''));
}

/** Claims of a compact JWT, decoded without trusting the payload. */
function readClaims(token) {
  const segments = token.split('.');
  assert.equal(segments.length, 3, 'token must be a three-part JWT compact string');
  return JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'));
}

/**
 * Replaces `globalThis.fetch` for one case and records every dispatch.
 * @param {(url: string, init: object) => Response} respond
 * @returns {{calls: {url: string, headers: Record<string, string>}[], restore: () => void}}
 */
function stubFetch(respond) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), headers: { ...(init.headers ?? {}) } });
    return respond(String(url), init);
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

/** A successful app-api session envelope, as the login operation returns it. */
function sessionResponse() {
  return new Response(
    JSON.stringify({
      code: 0,
      data: {
        accessToken: SESSION_ACCESS_TOKEN,
        authToken: SESSION_AUTH_TOKEN,
        expiresAt: '2999-01-01T00:00:00.000Z',
        refreshToken: 'session-refresh-token',
      },
      traceId: 'trace-mp-bootstrap',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

test('every profile document carries a public application access token', () => {
  const files = fs.readdirSync(profileDir).filter((name) => name.endsWith('.json'));
  assert.equal(files.length, 10, 'expected the full ten-profile matrix under config/mini-program');
  for (const file of files) {
    const document = JSON.parse(fs.readFileSync(path.join(profileDir, file), 'utf8').replace(/^\uFEFF/u, ''));
    assert.equal(
      typeof document.SDKWORK_ACCESS_TOKEN,
      'string',
      `${file} must carry SDKWORK_ACCESS_TOKEN (APP_ACCESS_TOKEN_SPEC.md §2)`,
    );
    const claims = readClaims(document.SDKWORK_ACCESS_TOKEN);
    assert.equal(claims.token_class, 'application', `${file} must carry an application token, not a session credential`);
    assert.equal(claims.iss, 'sdkwork-iam-public', `${file} token issuer must be sdkwork-iam-public`);
    assert.equal(claims.runtime_target, 'mini-program', `${file} token must target the mini program`);
  }
});

test('the runtime env contract declares the optional application token', () => {
  const contractPath = path.join(appRoot, 'packages', 'sdkwork-iam-mp-core', 'src', 'sdk', 'index.ts');
  const contract = fs.readFileSync(contractPath, 'utf8');
  assert.match(contract, /SDKWORK_ACCESS_TOKEN\?: string;/u, 'IamMpRuntimeEnv must declare SDKWORK_ACCESS_TOKEN');
});

test('the built runtime document ships the committed profile token', () => {
  const envPath = path.join(appRoot, 'src', 'runtime', 'runtime-env.js');
  const source = fs.readFileSync(envPath, 'utf8');
  const loaded = { exports: {} };
  new Function('module', 'exports', source)(loaded, loaded.exports);
  const profile = readProfile(loaded.exports.SDKWORK_PROFILE_ID);
  assert.equal(
    loaded.exports.SDKWORK_ACCESS_TOKEN,
    profile.SDKWORK_ACCESS_TOKEN,
    'src/runtime/runtime-env.js must ship the profile document application token',
  );
});

test('bootstrap seeds the profile application token before the first request', async () => {
  const bundle = loadBundle();
  const profile = readProfile();
  const { calls, restore } = stubFetch(sessionResponse);
  try {
    const runtime = await bundle.bootstrapIamMpApp({ runtimeEnv: profile });

    // Seeded before any dispatch: the client's own TokenManager already holds it.
    assert.equal(
      runtime.service.client.http.getTokenManager().getAccessToken(),
      profile.SDKWORK_ACCESS_TOKEN,
      'the application token must be seeded into the shared client token manager',
    );
    // It is a fallback credential, not a session: the app must still start signed out.
    assert.equal(runtime.session.get(), undefined, 'the application token must not be stored as a session');
    assert.equal(runtime.auth.isAuthenticated(), false, 'the application token must not authenticate the user');
    assert.equal(calls.length, 0, 'bootstrap must not dispatch a request');

    // Login clears the stale session first, so this only works when the clear
    // restores the application token instead of emptying the credential.
    await runtime.auth.loginPassword({ password: 'secret', username: 'alice' });
    assert.equal(calls.length, 1, 'login must dispatch exactly one request');
    assert.ok(
      calls[0].url.endsWith('/app/v3/api/auth/sessions'),
      `unexpected dispatch target ${calls[0].url}`,
    );
    assert.equal(
      calls[0].headers['Access-Token'],
      profile.SDKWORK_ACCESS_TOKEN,
      'POST /auth/sessions must dispatch with the application token, not without a credential',
    );
    assert.equal(calls[0].headers.Authorization, undefined, 'the application token is not a session credential');
  } finally {
    restore();
  }
});

test('login replaces the application token with the session credential', async () => {
  const bundle = loadBundle();
  const profile = readProfile();
  const { restore } = stubFetch(sessionResponse);
  try {
    const runtime = await bundle.bootstrapIamMpApp({ runtimeEnv: profile });
    await runtime.auth.loginPassword({ password: 'secret', username: 'alice' });

    assert.equal(runtime.auth.isAuthenticated(), true, 'a committed session must read as authenticated');
    assert.equal(runtime.session.get()?.accessToken, SESSION_ACCESS_TOKEN);
    assert.equal(
      runtime.service.getAccessToken(),
      SESSION_ACCESS_TOKEN,
      'the session access token must supersede the application token after login',
    );
  } finally {
    restore();
  }
});

test('sign-out restores the application token instead of clearing the credential', async () => {
  const bundle = loadBundle();
  const profile = readProfile();
  const { restore } = stubFetch(sessionResponse);
  try {
    const runtime = await bundle.bootstrapIamMpApp({ runtimeEnv: profile });
    await runtime.auth.loginPassword({ password: 'secret', username: 'alice' });
    runtime.auth.signOut();

    assert.equal(runtime.auth.isAuthenticated(), false, 'sign-out must clear the session');
    assert.equal(runtime.session.get(), undefined, 'sign-out must empty the session store');
    assert.equal(
      runtime.service.getAccessToken(),
      profile.SDKWORK_ACCESS_TOKEN,
      'sign-out must restore the bootstrap application token, not leave an empty credential',
    );
  } finally {
    restore();
  }
});

test('a cleared session (failed refresh path) restores the application token', async () => {
  const bundle = loadBundle();
  const profile = readProfile();
  const { restore } = stubFetch(sessionResponse);
  try {
    const runtime = await bundle.bootstrapIamMpApp({ runtimeEnv: profile });
    await runtime.auth.loginPassword({ password: 'secret', username: 'alice' });

    // The session bridge clears the store on a failed refresh, then pushes the
    // cleared snapshot at the client exactly as the sign-out path does.
    runtime.session.clear();
    assert.equal(
      runtime.service.getAccessToken(),
      profile.SDKWORK_ACCESS_TOKEN,
      'a cleared session must fall back to the application token',
    );
    runtime.service.setAccessToken(undefined);
    assert.equal(
      runtime.service.getAccessToken(),
      profile.SDKWORK_ACCESS_TOKEN,
      'pushing an empty session token must fall back to the application token',
    );
  } finally {
    restore();
  }
});

test('bootstrap fails closed when the selected profile has no application token', async () => {
  const bundle = loadBundle();
  const profile = readProfile();
  const { SDKWORK_ACCESS_TOKEN: _ignored, ...withoutToken } = profile;
  assert.equal('SDKWORK_ACCESS_TOKEN' in withoutToken, false);

  await assert.rejects(
    () => bundle.bootstrapIamMpApp({ runtimeEnv: withoutToken }),
    (error) => {
      assert.match(error.message, /SDKWORK_ACCESS_TOKEN/u, 'the failure must name SDKWORK_ACCESS_TOKEN');
      assert.ok(
        error.message.includes(PROFILE_DOCUMENT),
        `the failure must name the selected profile document ${PROFILE_DOCUMENT}: ${error.message}`,
      );
      return true;
    },
  );
  assert.throws(
    () => bundle.getIamMpRuntime(),
    /not bootstrapped/u,
    'a failed bootstrap must not publish a runtime',
  );
});

test('bootstrap rejects a token that is not a public application token', async () => {
  const bundle = loadBundle();
  const profile = readProfile();
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const sessionCredential = [
    encode({ alg: 'HS256', typ: 'JWT' }),
    encode({ iss: 'sdkwork-iam', token_class: 'session', token_type: 'access' }),
    'signature',
  ].join('.');

  await assert.rejects(
    () => bundle.bootstrapIamMpApp({ runtimeEnv: { ...profile, SDKWORK_ACCESS_TOKEN: sessionCredential } }),
    (error) => {
      assert.match(error.message, /SDKWORK_ACCESS_TOKEN/u);
      assert.match(error.message, /session credential is not accepted/u);
      return true;
    },
    'a session credential must not be accepted as the bootstrap token',
  );

  await assert.rejects(
    () => bundle.bootstrapIamMpApp({ runtimeEnv: { ...profile, SDKWORK_ACCESS_TOKEN: 'not-a-jwt' } }),
    /not a valid public application token/u,
    'a malformed token must fail closed',
  );
});
