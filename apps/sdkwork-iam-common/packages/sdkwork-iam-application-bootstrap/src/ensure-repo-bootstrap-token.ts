import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { resolveBootstrapAuth, resolveBootstrapEnvironmentFromEnv } from "./auth.ts";
import { bootstrapApplicationFromManifest, formatBootstrapEnvFile } from "./bootstrap.ts";
import { loadBootstrapAuthProfileFromHome } from "./bootstrap-auth-profile.ts";
import { createFetchIamApplicationBootstrapClient } from "./fetch-client.ts";
import { hashManifestContent } from "./manifest.ts";
import { isBootstrapAccessTokenReusable } from "@sdkwork/iam-credential-entry/node-bootstrap";
import type { IamApplicationBootstrapClient, SdkworkAppManifest } from "./types.ts";
import {
  isUsableBootstrapAccessToken,
  normalizeBootstrapLifecycle,
  readRegisteredBootstrapAccessToken,
  writeRegisteredBootstrapEnvFiles,
} from "./registered-env.ts";

export type EnsureRepoBootstrapAccessTokenStatus = "configured" | "registered" | "unavailable";

export interface EnsureRepoBootstrapAccessTokenOptions {
  repoRoot: string;
  env?: Readonly<Record<string, string | undefined>>;
  environment?: string;
  deploymentProfile?: "standalone" | "cloud";
  /** Force registration even when a reusable cached token exists. */
  refresh?: boolean;
  tryApplicationBootstrap?: boolean;
  warn?: (line: string) => void;
  /** Override the CLI fetch transport (tests inject a stub client). */
  createClient?: (config: { baseUrl: string }) => IamApplicationBootstrapClient;
}

export interface EnsureRepoBootstrapAccessTokenResult {
  status: EnsureRepoBootstrapAccessTokenStatus;
  token?: string;
  overlayPaths?: string[];
  reason?: string;
}

function hasBootstrapAuthCredentials(auth: {
  authToken?: string;
  username?: string;
  password?: string;
  email?: string;
}): boolean {
  if (auth.authToken?.trim()) return true;
  const username = auth.username ?? auth.email;
  return Boolean(username?.trim() && auth.password?.trim());
}

async function readManifestRecord(
  repoRoot: string,
): Promise<{ manifest?: SdkworkAppManifest; raw?: string; reason?: string }> {
  const manifestPath = join(repoRoot, "agent.app.config.json");
  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf8");
  } catch {
    return { reason: `missing ${manifestPath}` };
  }
  try {
    return { manifest: JSON.parse(raw) as SdkworkAppManifest, raw };
  } catch (error) {
    return { reason: `${manifestPath} is not valid JSON: ${String(error)}` };
  }
}

/**
 * Resolve a private `SDKWORK_ACCESS_TOKEN` for start/build.
 *
 * Reuse is the default: a configured token that still matches the selected
 * lifecycle, manifest application identity, and backend is returned without
 * calling IAM bootstrap. Registration runs only when no reusable token exists,
 * when the cached token is expired or identity-incompatible, or when the
 * caller explicitly requests `refresh`.
 */
export async function ensureRepoBootstrapAccessToken(
  options: EnsureRepoBootstrapAccessTokenOptions,
): Promise<EnsureRepoBootstrapAccessTokenResult> {
  const env = { ...(options.env ?? process.env) };
  // base-url-check: exempt (Node-side private bootstrap env, §6.1)
  const backendBaseUrl = env.SDKWORK_BACKEND_BASE_URL?.trim();
  const lifecycle = normalizeBootstrapLifecycle(
    options.environment ?? env.SDKWORK_ENVIRONMENT ?? env.SDKWORK_ENV,
  );
  const deploymentProfile = options.deploymentProfile
    ?? (env.SDKWORK_DEPLOYMENT_PROFILE?.trim() === "cloud" ? "cloud" : "standalone");
  const manifestRecord = await readManifestRecord(options.repoRoot);
  const inspection = {
    environment: lifecycle,
    ...(backendBaseUrl ? { backendBaseUrl } : {}),
    ...(manifestRecord.manifest ? { manifest: manifestRecord.manifest } : {}),
  };

  const envToken = env.SDKWORK_ACCESS_TOKEN?.trim();
  if (envToken && options.refresh !== true && isBootstrapAccessTokenReusable(envToken, inspection)) {
    return { status: "configured", token: envToken };
  }

  const registeredToken = await readRegisteredBootstrapAccessToken(
    options.repoRoot,
    lifecycle,
    { ...inspection, deploymentProfile },
  );
  if (
    registeredToken
    && options.refresh !== true
    && isBootstrapAccessTokenReusable(registeredToken, inspection)
  ) {
    return { status: "configured", token: registeredToken };
  }

  const existing = envToken && isBootstrapAccessTokenReusable(envToken, inspection)
    ? envToken
    : registeredToken;

  if (options.tryApplicationBootstrap === false) {
    return {
      status: "unavailable",
      reason: existing
        ? "overlay bootstrap token is a local fixture and the backend is not loopback"
        : "no reusable registered SDKWORK_ACCESS_TOKEN overlay",
    };
  }

  if (!manifestRecord.manifest) {
    return { status: "unavailable", reason: manifestRecord.reason ?? "agent.app.config.json is required" };
  }

  const loadedProfile = await loadBootstrapAuthProfileFromHome({
    env,
    lifecycleEnvironment: lifecycle,
    ...(deploymentProfile ? { deploymentProfile } : {}),
  });
  const auth = resolveBootstrapAuth({
    env,
    profile: loadedProfile?.profile ?? null,
  });
  if (!hasBootstrapAuthCredentials(auth)) {
    return {
      status: "unavailable",
      reason: "no IAM bootstrap auth credentials in env or ~/.sdkwork/iam-bootstrap",
    };
  }
  if (!backendBaseUrl) {
    return {
      status: "unavailable",
      // base-url-check: exempt (diagnostic message text, §6.1 Node-side bootstrap)
      reason: "SDKWORK_BACKEND_BASE_URL is required to provision a registered access token",
    };
  }

  const manifest = manifestRecord.manifest;
  const primaryDomain = resolveEnsurePrimaryDomain(env, manifest, backendBaseUrl);
  const environment = resolveBootstrapEnvironmentFromEnv(env, {
    backendApiBaseUrl: backendBaseUrl,
    ...(lifecycle !== undefined ? { environment: lifecycle } : {}),
    ...(manifest.backend?.tenantId !== undefined
      ? { tenantId: manifest.backend.tenantId }
      : {}),
    ...(manifest.backend?.organizationId !== undefined
      ? { organizationId: manifest.backend.organizationId }
      : {}),
    ...(primaryDomain !== undefined ? { primaryDomain } : {}),
  });

  try {
    const createClient = options.createClient ?? createFetchIamApplicationBootstrapClient;
    const client = createClient({
      baseUrl: backendBaseUrl,
    });
    const result = await bootstrapApplicationFromManifest({
      client,
      manifest: manifest as never,
      manifestHash: hashManifestContent(manifestRecord.raw ?? ""),
      auth,
      profile: loadedProfile?.profile ?? null,
      environment,
    });
    const contents = `# SDKWork IAM application-bootstrap registration output (gitignored).\n${formatBootstrapEnvFile({
      result,
      ...(environment.primaryDomain !== undefined
        ? { primaryDomain: environment.primaryDomain }
        : {}),
    })}`;
    const overlayPaths = await writeRegisteredBootstrapEnvFiles(
      options.repoRoot,
      contents,
      lifecycle,
      deploymentProfile,
    );
    const token = result.env.SDKWORK_ACCESS_TOKEN?.trim();
    if (!token) {
      return { status: "unavailable", reason: "IAM application bootstrap did not return SDKWORK_ACCESS_TOKEN" };
    }
    options.warn?.(`provisioned SDKWORK_ACCESS_TOKEN via IAM application bootstrap (${overlayPaths[0]})`);
    return { status: "registered", token, overlayPaths };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    options.warn?.(`IAM application bootstrap failed: ${reason}`);
    return { status: "unavailable", reason };
  }
}

function resolveEnsurePrimaryDomain(
  env: Readonly<Record<string, string | undefined>>,
  manifest: SdkworkAppManifest,
  backendBaseUrl: string,
): string | undefined {
  const configured = env.SDKWORK_APP_DOMAIN?.trim();
  if (configured) return configured;
  const fromManifest = manifest.backend?.primaryDomain?.trim() || manifest.backend?.domain?.trim();
  if (fromManifest) return fromManifest;
  try {
    return new URL(backendBaseUrl).hostname;
  } catch {
    return undefined;
  }
}

export { isUsableBootstrapAccessToken };
