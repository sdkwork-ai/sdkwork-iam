import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  buildBootstrapAccessTokenEnvFileContents,
  inspectBootstrapAccessToken,
  isBootstrapAccessTokenReusable,
  looksLikeLocalFixtureJwt,
  parseBootstrapAccessToken,
  readBootstrapAccessTokenEnvFileContents,
} from "@sdkwork/iam-credential-entry/node-bootstrap";
import type {
  BootstrapAccessTokenMetadata,
  CredentialEntryBootstrapManifest,
  SdkworkEnvironment,
} from "@sdkwork/iam-credential-entry/node-bootstrap";

/** Canonical registration output for one repository/environment scope. */
export const REGISTERED_BOOTSTRAP_ENV_FILE = ".sdkwork.local.env";

export interface RegisteredBootstrapInspectionOptions {
  allowTestTokenGeneration?: boolean;
  backendBaseUrl?: string;
  deploymentProfile?: "standalone" | "cloud";
  manifest?: CredentialEntryBootstrapManifest;
  nowSeconds?: number;
  skewSeconds?: number;
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
 * Overlay files the start/build loaders probe, most canonical first.
 *
 * The environment-scoped artifact is the reusable cache. Legacy spellings are
 * read-only fallbacks so a development token cannot be reused for another
 * lifecycle merely because `.sdkwork.local.env` sorts first.
 * @param repoRoot - repository root.
 * @param environment - lifecycle or profile alias.
 * @param deploymentProfile - `standalone` or `cloud`.
 * @returns artifact paths, in read order.
 */
export function resolveRegisteredBootstrapEnvPaths(
  repoRoot: string,
  environment?: string,
  deploymentProfile: "standalone" | "cloud" = "standalone",
): string[] {
  const lifecycle = normalizeBootstrapLifecycle(environment);
  return [
    join(repoRoot, `.env.${deploymentProfile}.${lifecycle}.bootstrap.local`),
    join(repoRoot, `.env.standalone.${lifecycle}.bootstrap.local`),
    join(repoRoot, `.env.${lifecycle}.bootstrap.local`),
    join(repoRoot, REGISTERED_BOOTSTRAP_ENV_FILE),
  ].filter((value, index, values) => values.indexOf(value) === index);
}

export function parseAccessTokenFromEnvFile(contents: string): string | undefined {
  return readBootstrapAccessTokenEnvFileContents(contents).token;
}

function readRegisteredRecord(contents: string): {
  token?: string;
  metadata: BootstrapAccessTokenMetadata;
} {
  return readBootstrapAccessTokenEnvFileContents(contents);
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
  const deploymentProfile = options.deploymentProfile ?? "standalone";
  for (const envPath of resolveRegisteredBootstrapEnvPaths(repoRoot, environment, deploymentProfile)) {
    let record: { token?: string; metadata: BootstrapAccessTokenMetadata };
    try {
      record = readRegisteredRecord(await readFile(envPath, "utf8"));
    } catch {
      continue;
    }
    const token = record.token;
    if (!token) continue;
    if (
      envPath.endsWith(REGISTERED_BOOTSTRAP_ENV_FILE)
      && lifecycle !== "development"
      && parseBootstrapAccessToken(token) === undefined
    ) {
      continue;
    }
    if (
      isBootstrapAccessTokenReusable(token, {
        ...options,
        environment: lifecycle,
        tokenMetadata: record.metadata,
      })
    ) {
      return token;
    }
  }
  return undefined;
}

/**
 * Write the registration output for one repository/environment scope.
 *
 * The canonical environment-scoped path is the only write target. The write is
 * atomic (same-directory temporary file plus rename) and owner-only on POSIX.
 * @param repoRoot - repository root.
 * @param contents - env-file contents.
 * @param environment - lifecycle or profile alias.
 * @param deploymentProfile - `standalone` or `cloud`.
 * @returns the written path.
 */
export async function writeRegisteredBootstrapEnvFiles(
  repoRoot: string,
  contents: string,
  environment?: string,
  deploymentProfile: "standalone" | "cloud" = "standalone",
): Promise<string[]> {
  const targetPath = resolveRegisteredBootstrapEnvPaths(
    repoRoot,
    environment,
    deploymentProfile,
  )[0];
  const normalizedContents = contents.endsWith("\n") ? contents : `${contents}\n`;
  await mkdir(dirname(targetPath), { recursive: true });
  const temporaryPath = join(
    dirname(targetPath),
    `.${targetPath.split(/[\\/]/u).at(-1)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
  );
  try {
    await writeFile(temporaryPath, normalizedContents, { encoding: "utf8", mode: 0o600 });
    await rename(temporaryPath, targetPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
  return [targetPath];
}

export { buildBootstrapAccessTokenEnvFileContents, looksLikeLocalFixtureJwt };

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
