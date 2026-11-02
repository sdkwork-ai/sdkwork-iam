// SDKWORK-IAM-H5-CONSOLE-ORGANIZATION-TYPES: authored types.
/**
 * Types of the console organization workspace.
 *
 * The console lists every organization of the tenant an operator is acting in, so the
 * row carries the parent id an operator needs to reconstruct the tree — the app
 * surface shows the same rows for a different reason (what am I a member of).
 */

import type { SdkworkIamH5ListQuery, SdkworkIamH5Page } from "@sdkwork/iam-h5-commons";
import type { SdkworkIamService } from "@sdkwork/iam-service";

/** The service port this capability consumes. */
export type SdkworkIamH5ConsoleOrganizationServicePort = Pick<SdkworkIamService, "iam">;

/** One organization row, flattened for the screen. */
export interface SdkworkIamH5ConsoleOrganization {
  readonly id: string;
  readonly name: string;
  readonly parentId?: string;
}

/** The controller the screen binds to. */
export interface SdkworkIamH5ConsoleOrganizationController {
  fetchOrganizationsPage(
    query: SdkworkIamH5ListQuery,
  ): Promise<SdkworkIamH5Page<SdkworkIamH5ConsoleOrganization>>;
}

/** Controller construction input. */
export interface CreateSdkworkIamH5ConsoleOrganizationControllerInput {
  readonly service: SdkworkIamH5ConsoleOrganizationServicePort;
}
