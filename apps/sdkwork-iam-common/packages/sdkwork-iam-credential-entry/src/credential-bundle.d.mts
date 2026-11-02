/**
 * Type surface of `credential-bundle.mjs`.
 *
 * The implementation is plain ESM so the same file can be imported by the
 * repository's `.mjs` runners without a build step. TypeScript's `node16`
 * resolution therefore cannot infer its exports, and `node-bootstrap.d.mts`
 * re-exports this module — without this declaration the re-export silently
 * contributes nothing and every consumer of `credentialBundlePath` or
 * `writeCredentialBundle` fails with TS2305.
 *
 * `IAM_APPLICATION_BOOTSTRAP_SPEC.md` section 5.4.1 owns the path shape and the
 * owner-only write rule; this file mirrors the implementation exactly.
 */

/** Name of the user-private store directory under the home directory. */
export declare const CREDENTIAL_STORE_DIRECTORY: '.sdkwork';

/** Sub-directory of the store that holds the bundles. */
export declare const CREDENTIAL_BUNDLE_DIRECTORY: 'credentials';

/** A credential bundle as read back from disk. */
export interface CredentialBundle {
  accessToken: string;
  environment: string;
  deploymentProfile: string;
  backend?: string;
  appId?: string;
  issuedAt?: string;
  expiresAt?: string;
  source?: string;
}

/** A credential bundle as handed to the writer. */
export interface CredentialBundleWriteInput {
  accessToken: string;
  environment: string;
  deploymentProfile: string;
  backend?: string;
  appId?: string;
  issuedAt?: string;
  expiresAt?: string;
  source?: string;
}

/** Normalize an application code for use as a store directory name. */
export declare function normalizeApplicationCode(value: unknown): string;

/** The user-private store root; defaults to the current user's home. */
export declare function credentialStoreRoot(homeDirectory?: string): string;

/** The absolute bundle path of one profile id. */
export declare function credentialBundlePath(options: {
  applicationCode: string;
  profileId: string;
  homeDir?: string;
}): string;

/** Read a bundle; `undefined` when the file is absent, unreadable or not a bundle. */
export declare function readCredentialBundle(bundlePath: string): CredentialBundle | undefined;

/** Write a bundle atomically with owner-only permissions; returns the written path. */
export declare function writeCredentialBundle(
  bundlePath: string,
  bundle: CredentialBundleWriteInput,
): string;

/** Decode the `iat`/`exp` claims of a JWT into ISO-8601 timestamps. */
export declare function readTokenTimestamps(token: string): {
  issuedAt?: string;
  expiresAt?: string;
};
