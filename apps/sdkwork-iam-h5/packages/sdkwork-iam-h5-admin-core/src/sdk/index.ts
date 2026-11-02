// SDKWORK-IAM-H5-ADMIN-SDK: authored backend-admin client boundary.
/**
 * Backend-admin SDK boundary. This is the only package in the client root that may
 * export backend SDK wrappers (APP_H5_ARCHITECTURE_SPEC section 15).
 *
 * The marker object this replaced carried a base URL and nothing else, so no admin
 * screen could ever have read a real resource. It now constructs the generated backend
 * client, which is what the admin capability packages consume through
 * `createIamH5AdminService`.
 */

import { createClient, type SdkworkBackendClient } from '@sdkwork/iam-backend-sdk';

/** Boundary object the root passes around: a real generated client plus its origin. */
export interface iamH5AdminBackendAdminSdkClient {
  readonly surface: 'backend-api';
  readonly baseUrl: string;
  /** Generated backend client; admin capability packages never see this type. */
  readonly client: SdkworkBackendClient;
}

/**
 * Build the backend-admin client.
 * @param input - backend origin and the accessor for the current admin credential.
 * @returns the boundary object.
 * @throws when the origin is empty: an admin console pointed at no origin would issue
 *   requests to the page itself, and every screen would look "forbidden" instead of
 *   "misconfigured".
 */
export function createIamH5AdminBackendAdminSdkClient(input: {
  baseUrl: string;
  /** Reads the current admin credential at request time, never at construction time. */
  getAccessToken?: () => string | undefined;
}): iamH5AdminBackendAdminSdkClient {
  const baseUrl = input.baseUrl.trim();
  if (baseUrl === '') {
    throw new Error('@sdkwork/iam-h5-admin-core: backend admin base url is required');
  }
  const accessToken = input.getAccessToken?.();
  const client = createClient({
    baseUrl,
    // The generated client takes a static token; the admin surface re-creates this
    // client when the credential changes instead of mutating a live one, so a request
    // in flight cannot switch identity half-way.
    ...(accessToken === undefined ? {} : { accessToken }),
  } as Parameters<typeof createClient>[0]);
  return { baseUrl, client, surface: 'backend-api' };
}
