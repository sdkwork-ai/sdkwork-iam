// SDKWORK-IAM-H5-ADMIN-PERMISSION-TYPES: authored types.
/**
 * Types of the admin permission catalog.
 *
 * A permission row is a code plus the resource/action it grants; an operator scans it to
 * answer "does this tenant even have a permission for that?".
 */

import type { SdkworkIamH5ListQuery, SdkworkIamH5Page } from "@sdkwork/iam-h5-commons";
import type { SdkworkIamService } from "@sdkwork/iam-service";

/** The service port this capability consumes (admin tier: backend-api resources). */
export type SdkworkIamH5AdminPermissionServicePort = Pick<SdkworkIamService, "iam">;

/** One permission row, flattened for the screen. */
export interface SdkworkIamH5AdminPermission {
  readonly id: string;
  readonly code: string;
  readonly resource?: string;
  readonly action?: string;
}

/** The controller the screen binds to. */
export interface SdkworkIamH5AdminPermissionController {
  fetchPermissionsPage(
    query: SdkworkIamH5ListQuery,
  ): Promise<SdkworkIamH5Page<SdkworkIamH5AdminPermission>>;
}

/** Controller construction input. */
export interface CreateSdkworkIamH5AdminPermissionControllerInput {
  readonly service: SdkworkIamH5AdminPermissionServicePort;
}
