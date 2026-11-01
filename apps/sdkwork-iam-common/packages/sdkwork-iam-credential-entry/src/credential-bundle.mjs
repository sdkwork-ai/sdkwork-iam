/**
 * User-private bootstrap credential bundle.
 *
 * `IAM_APPLICATION_BOOTSTRAP_SPEC.md` section 5.4.1 puts the reusable bootstrap
 * token outside every checkout:
 *
 * ```text
 * ~/.sdkwork/<application-code>/credentials/<profile-id>.json
 * ```
 *
 * `ENVIRONMENT_SPEC.md` section 5.1.7 allows exactly four dotenv shapes, so a
 * repository file never carries a credential again. The bundle is a JSON object
 * with `accessToken` plus non-secret metadata, written with owner-only
 * permissions through a temporary file and an atomic rename so a reader never
 * observes a partially written token.
 *
 * @module
 */

import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

/** Name of the user-private store directory under the home directory. */
export const CREDENTIAL_STORE_DIRECTORY = '.sdkwork';

/** Sub-directory of the store that holds the bundles. */
export const CREDENTIAL_BUNDLE_DIRECTORY = 'credentials';

/**
 * Normalize an application code for use as a directory name.
 *
 * The manifest `app.key` carries a vendor prefix (`sdkwork-birdcoder2`); the
 * store path uses the bare application code (`birdcoder2`), matching the
 * `~/.sdkwork/<application-code>/credentials/...` shape of the spec.
 * @param value - manifest `app.key` or any operator-supplied code.
 * @returns a lower-case, path-safe application code.
 */
export function normalizeApplicationCode(value) {
  const trimmed = String(value ?? '').trim().toLowerCase().replace(/^sdkwork[-_]/u, '');
  const sanitized = trimmed.replace(/[^a-z0-9-]+/gu, '-').replace(/^-+|-+$/gu, '');
  return sanitized === '' ? 'application' : sanitized;
}

/**
 * The user-private store root.
 * @param homeDirectory - home directory; defaults to the current user's.
 * @returns the absolute store root.
 */
export function credentialStoreRoot(homeDirectory = homedir()) {
  return path.resolve(homeDirectory, CREDENTIAL_STORE_DIRECTORY);
}

/**
 * The credential bundle path of one profile id.
 * @param options - home directory, application code, and exact profile id.
 * @returns the absolute bundle path.
 */
export function credentialBundlePath({ applicationCode, profileId, homeDir }) {
  return path.resolve(
    credentialStoreRoot(homeDir ?? homedir()),
    normalizeApplicationCode(applicationCode),
    CREDENTIAL_BUNDLE_DIRECTORY,
    `${profileId}.json`,
  );
}

/**
 * Read a bundle from disk.
 * @param bundlePath - absolute bundle path.
 * @returns the bundle, or `undefined` when the file is absent or unreadable.
 */
export function readCredentialBundle(bundlePath) {
  let text;
  try {
    text = readFileSync(bundlePath, 'utf8');
  } catch {
    return undefined;
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (parsed === null || typeof parsed !== 'object') return undefined;
  const token = typeof parsed.accessToken === 'string' ? parsed.accessToken.trim() : '';
  if (token === '') return undefined;
  const readOptional = (value) => {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    return trimmed === '' ? undefined : trimmed;
  };
  const bundle = {
    accessToken: token,
    environment: readOptional(parsed.environment) ?? '',
    deploymentProfile: readOptional(parsed.deploymentProfile) ?? '',
  };
  for (const key of ['backend', 'appId', 'issuedAt', 'expiresAt', 'source']) {
    const value = readOptional(parsed[key]);
    if (value !== undefined) bundle[key] = value;
  }
  return bundle;
}

/**
 * Write a bundle with owner-only permissions through a temporary file and an
 * atomic rename (`IAM_APPLICATION_BOOTSTRAP_SPEC.md` section 5.4.1).
 * @param bundlePath - absolute bundle path.
 * @param bundle - the credential to persist.
 * @returns the written path.
 */
export function writeCredentialBundle(bundlePath, bundle) {
  const directory = path.dirname(bundlePath);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporary = `${bundlePath}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(bundle, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  try {
    chmodSync(temporary, 0o600);
  } catch {
    // Windows has no POSIX mode bits; the ACL of the user profile applies.
  }
  renameSync(temporary, bundlePath);
  return bundlePath;
}

/**
 * Decode the `iat`/`exp` claims of a JWT into ISO-8601 timestamps.
 * @param token - the bearer token.
 * @returns the timestamps that were present, as ISO strings.
 */
export function readTokenTimestamps(token) {
  const parts = String(token ?? '').split('.');
  if (parts.length < 2) return {};
  try {
    const payload = JSON.parse(
      Buffer.from((parts[1] ?? '').replace(/-/gu, '+').replace(/_/gu, '/'), 'base64').toString('utf8'),
    );
    const iso = (value) => (typeof value === 'number' && Number.isFinite(value)
      ? new Date(value * 1000).toISOString()
      : undefined);
    const issuedAt = iso(payload.iat);
    const expiresAt = iso(payload.exp);
    return {
      ...(issuedAt === undefined ? {} : { issuedAt }),
      ...(expiresAt === undefined ? {} : { expiresAt }),
    };
  } catch {
    return {};
  }
}
