import { trim } from "@sdkwork/utils";
import { unwrapIamSdkResponse } from "@sdkwork/iam-sdk-adapter";

import type {
  EnabledInstallationResult,
  IamApplicationBootstrapClient,
  IamInstallationProvisionCommand,
  IssuedAccessCredentialResult,
  ProvisionedInstallationResult,
} from "./types.ts";
import { normalizeInstallationResult } from "./results.ts";

/** Backend API prefix for IAM application-bootstrap operations. */
export const IAM_APPLICATION_BOOTSTRAP_API_PREFIX = "/backend/v3/api";

/** Provision or reconcile one tenant installation from its deploy application. */
/**
 * Backend path of the installation surface (canonical).
 *
 * The legacy `tenant_applications` route stays bound to the same handlers for
 * the transport migration window; first-party bootstrap traffic already uses
 * the canonical path.
 */
export const IAM_INSTALLATIONS_PATH = "/iam/installations";

/** Issue access credential. */
export const IAM_ACCESS_CREDENTIALS_PATH = "/iam/access_credentials";

/** HTTP config for {@link createFetchIamApplicationBootstrapClient}. */
export interface CreateFetchIamApplicationBootstrapClientOptions {
  /** Backend origin or origin plus `/backend/v3/api`. */
  baseUrl: string;
  /** Override for `globalThis.fetch`; tests inject a stub. */
  fetch?: typeof fetch;
  /** Per-request timeout in milliseconds; defaults to 30 seconds. */
  timeoutMs?: number;
}

const DEFAULT_BOOTSTRAP_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Strip a trailing `/backend/v3/api` so path constants can be joined once.
 * @param baseUrl - configured backend base URL
 * @returns origin without the API prefix
 */
export function resolveIamBackendApiOrigin(baseUrl: string): string {
  const trimmed = trim(baseUrl).replace(/\/+$/u, "");
  if (trimmed.endsWith(IAM_APPLICATION_BOOTSTRAP_API_PREFIX)) {
    return trimmed.slice(0, -IAM_APPLICATION_BOOTSTRAP_API_PREFIX.length);
  }
  return trimmed;
}

function bootstrapUrl(origin: string, pathname: string): string {
  return `${origin}${IAM_APPLICATION_BOOTSTRAP_API_PREFIX}${pathname}`;
}

function installationPath(installationId: string): string {
  return `${IAM_INSTALLATIONS_PATH}/${encodeURIComponent(installationId)}`;
}

function unwrapBootstrapResult<T extends Record<string, unknown>>(value: unknown): T {
  const data = unwrapIamSdkResponse<unknown>(value);
  if (data && typeof data === "object" && !Array.isArray(data) && "item" in data) {
    const item = (data as { item: unknown }).item;
    if (item && typeof item === "object") {
      return normalizeInstallationResult(item as T);
    }
  }
  return normalizeInstallationResult(data as T);
}

function problemMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as { detail?: unknown; title?: unknown; message?: unknown; msg?: unknown };
  const detail = [record.detail, record.title, record.message, record.msg]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .find((value) => value.length > 0);
  return detail || fallback;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`IAM bootstrap response is not JSON (HTTP ${response.status})`);
  }
}

function requestSignal(timeoutMs: number): AbortSignal | undefined {
  if (typeof AbortSignal === "undefined" || typeof AbortSignal.timeout !== "function") {
    return undefined;
  }
  return AbortSignal.timeout(timeoutMs);
}

/**
 * CLI/tooling IAM application-bootstrap client. Talks to the canonical
 * bootstrap-body HTTP operations without loading the generated backend SDK.
 * @param options - backend origin and optional fetch implementation
 * @returns an {@link IamApplicationBootstrapClient}
 */
export function createFetchIamApplicationBootstrapClient(
  options: CreateFetchIamApplicationBootstrapClientOptions,
): IamApplicationBootstrapClient {
  const origin = resolveIamBackendApiOrigin(options.baseUrl);
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const timeoutMs = options.timeoutMs ?? DEFAULT_BOOTSTRAP_REQUEST_TIMEOUT_MS;

  async function requestJson<T extends Record<string, unknown>>(
    method: string,
    pathname: string,
    body: Record<string, unknown> | undefined,
    fallbackMessage: string,
  ): Promise<T> {
    const signal = requestSignal(timeoutMs);
    const response = await fetchImpl(bootstrapUrl(origin, pathname), {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body ?? {}),
      ...(signal !== undefined ? { signal } : {}),
    });
    const payload = await parseJson(response);
    if (!response.ok) {
      throw new Error(problemMessage(payload, `${fallbackMessage} (HTTP ${response.status})`));
    }
    return unwrapBootstrapResult<T>(payload);
  }

  return {
    provisionInstallation(body: IamInstallationProvisionCommand) {
      return requestJson<ProvisionedInstallationResult>(
        "POST",
        IAM_INSTALLATIONS_PATH,
        body,
        "iam.installations.create failed",
      );
    },
    enableInstallation(installationId, body) {
      return requestJson<EnabledInstallationResult>(
        "POST",
        `${installationPath(installationId)}/enable`,
        body,
        "iam.installations.enable failed",
      );
    },
    createAccessCredential(body) {
      return requestJson<IssuedAccessCredentialResult>(
        "POST",
        IAM_ACCESS_CREDENTIALS_PATH,
        body,
        "iam.accessCredentials.create failed",
      );
    },
    updateInstallation(installationId, body) {
      return requestJson<ProvisionedInstallationResult>(
        "PATCH",
        installationPath(installationId),
        body,
        "iam.installations.update failed",
      );
    },
  };
}
