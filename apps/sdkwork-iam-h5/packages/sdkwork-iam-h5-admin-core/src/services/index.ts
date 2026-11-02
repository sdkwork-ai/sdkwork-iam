// SDKWORK-IAM-H5-ADMIN-SERVICES: authored admin service assembly.
/**
 * Admin service assembly.
 *
 * The admin screens consume `SdkworkIamService`, exactly like the app screens do, but
 * with the generated **backend** client attached: that is what makes `iam.permissions`,
 * `iam.roles` and the audit resources readable. Assembling it here keeps the choice of
 * client out of every capability package.
 */

import { createSdkworkIamService, type SdkworkIamService } from '@sdkwork/iam-service';

import type { iamH5AdminBackendAdminSdkClient } from '../sdk/index.js';

/** Minimal shape the assembly needs from the app client (app-api resources). */
export interface IamH5AdminAppSdkClientLike {
  readonly surface?: string;
}

/** Input of {@link createIamH5AdminService}. */
export interface CreateIamH5AdminServiceInput {
  /** App-api client; the admin surface still needs it for the resources it shares. */
  appbaseAppClient: unknown;
  /** Backend-admin client built by the root bootstrap. */
  backendClient: iamH5AdminBackendAdminSdkClient;
}

/**
 * Build the admin IAM service.
 * @param input - both clients the generated service aggregates.
 * @returns the service the admin capability packages bind to.
 */
export function createIamH5AdminService(input: CreateIamH5AdminServiceInput): SdkworkIamService {
  return createSdkworkIamService({
    appbaseAppClient: input.appbaseAppClient as Parameters<typeof createSdkworkIamService>[0]['appbaseAppClient'],
    appbaseBackendClient: input.backendClient.client as Parameters<
      typeof createSdkworkIamService
    >[0]['appbaseBackendClient'],
  });
}
