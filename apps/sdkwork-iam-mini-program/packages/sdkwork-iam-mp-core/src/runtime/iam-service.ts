/**
 * Real IAM service construction for the mini-program client root.
 *
 * `@sdkwork/iam-mp-core` is the only package allowed to build SDK clients, so this
 * module owns the one path from the materialized runtime document to the
 * `SdkworkIamService` the capability pages consume. It mirrors the H5 root's
 * factory deliberately: both surfaces must send the same request bodies to the
 * same app-api operations, and a divergence there is a product bug that only shows
 * up on one platform.
 */

import { createClient as createIamAppSdkClient, type SdkworkAppClient } from "@sdkwork/iam-app-sdk";
import { createSdkworkIamService, type SdkworkIamService } from "@sdkwork/iam-service";

/** Inputs needed to build the app-surface IAM service in the mini program. */
export interface CreateIamMpAppServiceInput {
  /** Absolute app-api origin from the materialized runtime document. */
  baseUrl: string;
  /** Access token for a restored session, when one exists. */
  accessToken?: string;
  /**
   * Public application access token of the selected profile document
   * (`SDKWORK_ACCESS_TOKEN`, `APP_ACCESS_TOKEN_SPEC.md` §2).
   *
   * It is the credential every pre-login call needs — `POST /auth/sessions` is
   * `access-token-only` — and the credential a cleared session falls back to.
   * The session token supersedes it after login; it never becomes the session.
   */
  bootstrapAccessToken?: string;
  /** Clears the host session before a new one is established. */
  clearSession?: () => Promise<unknown> | unknown;
  /** Commits a freshly established session to the host store. */
  commitSession?: Parameters<typeof createSdkworkIamService>[0]["commitSession"];
  /** Request timeout in milliseconds; the SDK default applies when omitted. */
  timeoutMs?: number;
}

/** Trimmed credential, or `undefined` for "not configured". */
function normalizeAccessToken(value: string | undefined): string | undefined {
  const token = typeof value === "string" ? value.trim() : "";
  return token === "" ? undefined : token;
}

/**
 * Build the generated app SDK client.
 * @param input - base URL plus optional session/bootstrap token and timeout.
 * @returns the generated client.
 */
export function createIamMpAppClient(input: CreateIamMpAppServiceInput): SdkworkAppClient {
  const baseUrl = input.baseUrl.trim();
  if (!baseUrl) {
    throw new Error("sdkwork-iam-mini-program: app-api base url is required to build the IAM client");
  }
  // Seed the client's own TokenManager in its constructor: the generated client
  // reads `Access-Token` from that manager (never from the plain config field
  // alone), so a token handed over after construction would be too late for an
  // `accessTokenOnly` operation.
  const accessToken =
    normalizeAccessToken(input.accessToken) ?? normalizeAccessToken(input.bootstrapAccessToken);
  return createIamAppSdkClient({
    baseUrl,
    ...(accessToken ? { accessToken } : {}),
    ...(input.timeoutMs !== undefined ? { timeout: input.timeoutMs } : {}),
  });
}

/** The composed runtime: one client, its service, and the token setter. */
export interface IamMpRuntimeService {
  readonly client: SdkworkAppClient;
  readonly service: SdkworkIamService;
  /**
   * The credential the next request will carry: the session access token while a
   * session exists, otherwise the bootstrap application access token.
   * @returns the active access token, or `undefined` when none is configured.
   */
  getAccessToken(): string | undefined;
  /**
   * Push the current access token onto the client.
   *
   * `undefined` means "the session is gone", not "no credential": the bootstrap
   * application access token is restored so the login screen and every
   * credential-entry call still work after sign-out or a failed refresh.
   * @param token - session access token, or `undefined` to fall back.
   */
  setAccessToken(token: string | undefined): void;
}

/**
 * Build the client, the service and the token setter in one step.
 * @param input - client and session-bridge configuration.
 * @returns the runtime triple.
 */
export function createIamMpRuntimeService(input: CreateIamMpAppServiceInput): IamMpRuntimeService {
  const bootstrapAccessToken = normalizeAccessToken(input.bootstrapAccessToken);
  const client = createIamMpAppClient(input);
  const service = createSdkworkIamService({
    appbaseAppClient: client,
    ...(input.clearSession ? { clearSession: input.clearSession } : {}),
    ...(input.commitSession ? { commitSession: input.commitSession } : {}),
  });
  return {
    client,
    getAccessToken() {
      return normalizeAccessToken(client.http.getTokenManager()?.getAccessToken());
    },
    service,
    setAccessToken(token: string | undefined) {
      client.setAccessToken(normalizeAccessToken(token) ?? bootstrapAccessToken ?? "");
    },
  };
}
