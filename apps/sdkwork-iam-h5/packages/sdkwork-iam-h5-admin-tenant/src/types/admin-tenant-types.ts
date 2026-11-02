// SDKWORK-IAM-H5-ADMIN-TENANT-TYPES: authored types.
/**
 * Types of the admin tenant list.
 *
 * The operator's view of the deployment: which tenants exist and whether each is active.
 * The status is on the row because "exists but suspended" is the case a support ticket is
 * usually about.
 */

import type { SdkworkIamH5ListQuery, SdkworkIamH5Page } from "@sdkwork/iam-h5-commons";
import type { SdkworkIamService } from "@sdkwork/iam-service";

/** The service port this capability consumes (admin tier: backend-api resources). */
export type SdkworkIamH5AdminTenantServicePort = Pick<SdkworkIamService, "iam">;

/** One tenant row, flattened for the screen. */
export interface SdkworkIamH5AdminTenantRow {
  readonly id: string;
  readonly name: string;
  readonly status?: string;
}

/** The controller the screen binds to. */
export interface SdkworkIamH5AdminTenantController {
  fetchTenantsPage(query: SdkworkIamH5ListQuery): Promise<SdkworkIamH5Page<SdkworkIamH5AdminTenantRow>>;
}

/** Controller construction input. */
export interface CreateSdkworkIamH5AdminTenantControllerInput {
  readonly service: SdkworkIamH5AdminTenantServicePort;
}
