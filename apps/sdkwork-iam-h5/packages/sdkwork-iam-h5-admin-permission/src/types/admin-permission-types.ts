// SDKWORK-IAM-H5-ADMIN-PERMISSION-TYPES: authored types.
/**
 * Types of the admin permission surface.
 *
 * Three catalogs, three questions an operator asks: which permissions exist, which roles
 * bundle them, and which policies attach conditions to them. They share the port and the
 * paging shape, so the screens differ only in their columns.
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

/** One role row, flattened for the screen. */
export interface SdkworkIamH5AdminRole {
  readonly id: string;
  readonly code: string;
  readonly name?: string;
  /**
   * Locale map of role labels keyed by BCP 47 tag, served verbatim as machine
   * vocabulary. Render through `resolveLocalizedLabel(labels, locale, name)`.
   */
  readonly labels?: Readonly<Record<string, string>>;
}

/** One policy row, flattened for the screen. */
export interface SdkworkIamH5AdminPolicy {
  readonly id: string;
  readonly code: string;
  readonly effect?: string;
}

/** The permissions screen's controller. */
export interface SdkworkIamH5AdminPermissionController {
  fetchPermissionsPage(
    query: SdkworkIamH5ListQuery,
  ): Promise<SdkworkIamH5Page<SdkworkIamH5AdminPermission>>;
}

/** The roles screen's controller. */
export interface SdkworkIamH5AdminRoleController {
  fetchRolesPage(query: SdkworkIamH5ListQuery): Promise<SdkworkIamH5Page<SdkworkIamH5AdminRole>>;
}

/** The policies screen's controller. */
export interface SdkworkIamH5AdminPolicyController {
  fetchPoliciesPage(query: SdkworkIamH5ListQuery): Promise<SdkworkIamH5Page<SdkworkIamH5AdminPolicy>>;
}

/** Controller construction input. */
export interface CreateSdkworkIamH5AdminPermissionControllerInput {
  readonly service: SdkworkIamH5AdminPermissionServicePort;
}
