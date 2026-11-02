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
  /** Clears the host session before a new one is established. */
  clearSession?: () => Promise<unknown> | unknown;
  /** Commits a freshly established session to the host store. */
  commitSession?: Parameters<typeof createSdkworkIamService>[0]["commitSession"];
  /** Request timeout in milliseconds; the SDK default applies when omitted. */
  timeoutMs?: number;
}

/**
 * Build the generated app SDK client.
 * @param input - base URL plus optional token and timeout.
 * @returns the generated client.
 */
export function createIamMpAppClient(input: CreateIamMpAppServiceInput): SdkworkAppClient {
  const baseUrl = input.baseUrl.trim();
  if (!baseUrl) {
    throw new Error("sdkwork-iam-mini-program: app-api base url is required to build the IAM client");
  }
  return createIamAppSdkClient({
    baseUrl,
    ...(input.accessToken ? { accessToken: input.accessToken } : {}),
    ...(input.timeoutMs !== undefined ? { timeout: input.timeoutMs } : {}),
  });
}

/** The composed runtime: one client, its service, and the token setter. */
export interface IamMpRuntimeService {
  readonly client: SdkworkAppClient;
  readonly service: SdkworkIamService;
  /**
   * Push the current access token onto the client.
   * @param token - bearer token, or `undefined` to clear it on sign-out.
   */
  setAccessToken(token: string | undefined): void;
}

/**
 * Build the client, the service and the token setter in one step.
 * @param input - client and session-bridge configuration.
 * @returns the runtime triple.
 */
export function createIamMpRuntimeService(input: CreateIamMpAppServiceInput): IamMpRuntimeService {
  const client = createIamMpAppClient(input);
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
