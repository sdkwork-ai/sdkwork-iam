// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Backend-admin SDK boundary. This is the only package in the client root that
 * may export backend SDK wrappers (APP_H5_ARCHITECTURE_SPEC §15).
 */

export interface iamH5AdminBackendAdminSdkClient {
  readonly surface: 'backend-api';
  readonly baseUrl: string;
}

export function createIamH5AdminBackendAdminSdkClient(
  baseUrl: string,
): iamH5AdminBackendAdminSdkClient {
  if (!baseUrl) throw new Error('@sdkwork/iam-h5-admin-core: backend admin base url is required');
  return { surface: 'backend-api', baseUrl };
}
