/**
 * Registration output of the IAM application bootstrap for one repository scope.
 *
 * `IAM_APPLICATION_BOOTSTRAP_SPEC.md` section 5.4.1 puts the reusable token in
 * the user-private store:
 *
 * ```text
 * ~/.sdkwork/<application-code>/credentials/<profile-id>.json
 * ```
 *
 * `ENVIRONMENT_SPEC.md` section 5.1.7 allows exactly four dotenv shapes and
 * retires every composed overlay, so this module never reads or writes a
 * repository env file. The legacy unscoped `.sdkwork.local.env` stays readable
 * as the last fallback until the next write replaces it with a bundle.
 *
 * @module
 */
// env-naming:allow-file — the doc comment above cannot name the retired spelling otherwise.

import {
  buildBootstrapAccessTokenEnvFileContents,
  credentialBundlePath,
  readBootstrapAccessTokenEnvFileContents,
  looksLikeLocalFixtureJwt,
  writeCredentialBundle,
  readRepoBootstrapAccessToken,
  resolveRepoBootstrapAccessTokenPaths,
} from "@sdkwork/iam-credential-entry/node-bootstrap";
import { inspectBootstrapAccessToken } from "@sdkwork/iam-credential-entry/node-bootstrap";
import type {
  BootstrapAccessTokenMetadata,
  CredentialEntryBootstrapManifest,
  SdkworkEnvironment,
} from "@sdkwork/iam-credential-entry/node-bootstrap";

export interface RegisteredBootstrapInspectionOptions {
  allowTestTokenGeneration?: boolean;
  backendBaseUrl?: string;
  deploymentProfile?: "standalone" | "cloud";
  manifest?: CredentialEntryBootstrapManifest;
  nowSeconds?: number;
  skewSeconds?: number;
  homeDir?: string;
}

export function normalizeBootstrapLifecycle(value: string | undefined): SdkworkEnvironment {
  const normalized = value?.trim().toLowerCase() ?? "development";
  if (normalized === "dev" || normalized === "local") return "development";
  if (normalized === "prod") return "production";
  if (normalized === "development" || normalized === "test" || normalized === "staging" || normalized === "production") {
    return normalized;
  }
  return "development";
}

/**
 * The credential bundle of one repository/environment scope.
 * @param repoRoot - repository root.
 * @param environment - lifecycle or profile alias.
 * @param deploymentProfile - `standalone` or `cloud`.
 * @param options - manifest and home-directory inputs.
 * @returns the absolute bundle path.
 */
export function resolveRegisteredBootstrapCredentialPath(
  repoRoot: string,
  environment?: string,
  deploymentProfile: "standalone" | "cloud" = "standalone",
  options: { manifest?: CredentialEntryBootstrapManifest; homeDir?: string; appCode?: string } = {},
): string {
  const lifecycle = normalizeBootstrapLifecycle(environment);
  if (options.homeDir === undefined && options.appCode !== undefined) {
    return credentialBundlePath({
      applicationCode: options.appCode,
      profileId: `${deploymentProfile}.${lifecycle}`,
    });
  }
  return resolveRepoBootstrapAccessTokenPaths(repoRoot, lifecycle, deploymentProfile, {
    ...(options.manifest ? { manifest: options.manifest } : {}),
    ...(options.homeDir ? { homeDir: options.homeDir } : {}),
  }).bundlePath;
}

/**
 * Read the first reusable registered token for one repository scope.
 * @param repoRoot - repository root.
 * @param environment - lifecycle or profile alias.
 * @param options - manifest/backend inspection inputs.
 * @returns the reusable token, or `undefined`.
 */
export async function readRegisteredBootstrapAccessToken(
  repoRoot: string,
  environment?: string,
  options: RegisteredBootstrapInspectionOptions = {},
): Promise<string | undefined> {
  const lifecycle = normalizeBootstrapLifecycle(environment);
  return readRepoBootstrapAccessToken(repoRoot, lifecycle, {
    ...options,
    environment: lifecycle,
  });
}

/**
 * Write the registration output for one repository/environment scope.
 *
 * The user-private bundle is the only write target: no repository file is
 * created or updated (`IAM_APPLICATION_BOOTSTRAP_SPEC.md` section 5.4.1).
 * @param repoRoot - repository root.
 * @param record - token plus non-secret scope metadata.
 * @param options - lifecycle, deployment profile, and home-directory inputs.
 * @returns the written bundle paths.
 */
export async function writeRegisteredBootstrapCredential(
  repoRoot: string,
  record: { token: string; metadata?: BootstrapAccessTokenMetadata; appId?: string },
  options: {
    environment?: string;
    deploymentProfile?: "standalone" | "cloud";
    homeDir?: string;
  } = {},
): Promise<string[]> {
  const lifecycle = normalizeBootstrapLifecycle(options.environment);
  const deploymentProfile = options.deploymentProfile ?? "standalone";
  const metadata = record.metadata ?? {};
  const bundlePath = resolveRegisteredBootstrapCredentialPath(
    repoRoot,
    lifecycle,
    deploymentProfile,
    options.homeDir === undefined ? {} : { homeDir: options.homeDir },
  );
  const backend = metadata.backend?.trim();
  writeCredentialBundle(bundlePath, {
    accessToken: record.token,
    environment: lifecycle,
    deploymentProfile,
    ...(backend ? { backend } : {}),
    ...(record.appId ? { appId: record.appId } : {}),
    issuedAt: metadata.issuedAt ?? new Date().toISOString(),
    ...(metadata.expiresAt ? { expiresAt: metadata.expiresAt } : {}),
    source: metadata.source ?? (looksLikeLocalFixtureJwt(record.token) ? "local-fixture" : "iam-application-bootstrap"),
  });
  return [bundlePath];
}

export { buildBootstrapAccessTokenEnvFileContents, looksLikeLocalFixtureJwt };

/**
 * Token of one env-file body, for callers that still parse operator input.
 * @param contents - env-file text.
 * @returns the token, or `undefined`.
 */
export function parseAccessTokenFromEnvFile(contents: string): string | undefined {
  return readBootstrapAccessTokenEnvFileContents(contents).token;
}

export function isLoopbackBackendUrl(url: string | undefined): boolean {
  const trimmed = url?.trim();
  if (!trimmed) return false;
  try {
    const hostname = new URL(trimmed).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

/**
 * Compatibility predicate for a token that a loopback-local runtime may use.
 * @param token - raw token.
 * @param backendBaseUrl - active backend base URL.
 * @param options - optional environment/manifest inspection inputs.
 * @returns whether the token may be used without regeneration.
 */
export function isUsableBootstrapAccessToken(
  token: string,
  backendBaseUrl: string | undefined,
  options: RegisteredBootstrapInspectionOptions = {},
): boolean {
  if (!token.trim()) return false;
  return inspectBootstrapAccessToken(token, {
    ...options,
    backendBaseUrl,
  }).reusable;
}
