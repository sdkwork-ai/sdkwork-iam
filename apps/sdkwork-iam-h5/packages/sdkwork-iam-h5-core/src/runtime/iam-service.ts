/**
 * Real IAM service construction for the H5 client root.
 *
 * `@sdkwork/iam-h5-core` is the only package allowed to build SDK clients
 * (`APP_H5_ARCHITECTURE_SPEC.md` section 15), so this module owns the one path
 * from profile configuration to a `SdkworkIamService` the capability packages
 * consume. Two facts make that possible without a per-surface adapter package:
 *
 * - the generated app client already exposes `auth`, `iam`, `oauth` and `system`,
 *   which is the port shape `createSdkworkIamService` expects, and every port
 *   method is optional so a route this deployment does not publish stays absent
 *   instead of throwing at construction time;
 * - the generated backend client exposes `iam` plus the nested `iamOauth.iam.oauth`
 *   tree, which is the backend port shape used by operator surfaces.
 *
 * A capability package therefore depends on the service **interface** only and
 * never imports a generated SDK.
 */

import { createClient as createIamAppSdkClient, type SdkworkAppClient } from "@sdkwork/iam-app-sdk";
import { createSdkworkIamService, type SdkworkIamService } from "@sdkwork/iam-service";

/** Inputs needed to build the app-surface IAM service. */
export interface CreateIamH5AppServiceInput {
  /** Absolute app-api origin, already profile-resolved. */
  baseUrl: string;
  /** Access token for the signed-in session, when the caller holds one. */
  accessToken?: string;
  /** Clears the host session before a new one is established. */
  clearSession?: () => Promise<unknown> | unknown;
  /** Commits a freshly established session to the host store. */
  commitSession?: Parameters<typeof createSdkworkIamService>[0]["commitSession"];
  /** Tenant the caller is acting in, when the host pins one. */
  tenantId?: string;
  /** Request timeout in milliseconds; the SDK default applies when omitted. */
  timeoutMs?: number;
}

/**
 * Build the generated app SDK client.
 * @param input - base URL plus optional token and timeout.
 * @returns the generated client, ready to be handed to the service factory.
 */
export function createIamH5AppClient(input: CreateIamH5AppServiceInput): SdkworkAppClient {
  const baseUrl = input.baseUrl.trim();
  if (!baseUrl) {
    throw new Error("sdkwork-iam-h5: app-api base url is required to build the IAM client");
  }
  const client = createIamAppSdkClient({
    baseUrl,
    ...(input.accessToken ? { accessToken: input.accessToken } : {}),
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    ...(input.timeoutMs !== undefined ? { timeout: input.timeoutMs } : {}),
  });
  return client;
}

/**
 * Build the `SdkworkIamService` every H5 capability package consumes.
 *
 * The app client supplies `auth`, `iam` (read surfaces), `oauth` and `system`.
 * Backend-only resources are reached through `createIamH5BackendService` in the
 * admin tier; calling one from this service fails the way the port contract
 * documents ("not available on this client"), not silently.
 *
 * @param input - configuration for the client and the session bridge.
 * @returns the composed service.
 */
export function createIamH5AppService(input: CreateIamH5AppServiceInput): SdkworkIamService {
  const appbaseAppClient = createIamH5AppClient(input);
  return createSdkworkIamService({
    appbaseAppClient,
    ...(input.clearSession ? { clearSession: input.clearSession } : {}),
    ...(input.commitSession ? { commitSession: input.commitSession } : {}),
  });
}

/**
 * Whether a base URL points at this machine.
 *
 * Kept here rather than in a screen so the bootstrap can refuse a plaintext
 * cross-origin backend while still allowing local development.
 * @param url - candidate origin.
 * @returns `true` for loopback hosts.
 */
export function isIamH5LoopbackUrl(url: string | undefined): boolean {
  const trimmed = url?.trim();
  if (!trimmed) return false;
  try {
    const hostname = new URL(trimmed).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
  } catch {
    return false;
  }
}

/** The composed runtime: one client, its service, and the token setter. */
export interface IamH5RuntimeService {
  /** The generated app client; kept so the session bridge can rotate the token. */
  readonly client: SdkworkAppClient;
  /** The port-shaped service every capability package consumes. */
  readonly service: SdkworkIamService;
  /**
   * Push the current access token onto the client.
   *
   * A session can be established *after* the client is built (the login screen
   * posts credentials, then the bridge commits the session), so the token cannot
   * be frozen at construction. Passing `undefined` clears it on sign-out.
   * @param token - bearer token, or `undefined` to clear.
   */
  setAccessToken(token: string | undefined): void;
}

/**
 * Build the client, the service and the token setter in one step.
 *
 * Use this from the bootstrap instead of `createIamH5AppService` when the host
 * owns the session lifecycle — that is the normal case for a signed-in shell.
 * @param input - client and session-bridge configuration.
 * @returns the runtime triple.
 */
export function createIamH5RuntimeService(input: CreateIamH5AppServiceInput): IamH5RuntimeService {
  const client = createIamH5AppClient(input);
  const service = createSdkworkIamService({
    appbaseAppClient: client,
    ...(input.clearSession ? { clearSession: input.clearSession } : {}),
    ...(input.commitSession ? { commitSession: input.commitSession } : {}),
  });
  return {
    client,
    service,
    setAccessToken(token: string | undefined) {
      client.setAccessToken(token ?? "");
    },
  };
}
