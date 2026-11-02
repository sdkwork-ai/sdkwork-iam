// SDKWORK-IAM-H5-ADMIN-ORGANIZATION-TYPES: authored types.
/**
 * Types of the admin organization tree.
 *
 * The tree endpoint returns nested nodes; the screen needs a flat, ordered list with a
 * depth, because a browser tree is a list plus indentation and flattening here keeps the
 * screen out of the recursion business.
 */

import type { SdkworkIamService } from "@sdkwork/iam-service";

/** The service port this capability consumes (admin tier: backend-api resources). */
export type SdkworkIamH5AdminOrganizationServicePort = Pick<SdkworkIamService, "iam">;

/** One node of the organization tree, already flattened. */
export interface SdkworkIamH5AdminOrganizationNode {
  readonly id: string;
  readonly name: string;
  /** Zero for a root, one per level below it. */
  readonly depth: number;
}

/** The controller the screen binds to. */
export interface SdkworkIamH5AdminOrganizationController {
  loadTree(): Promise<readonly SdkworkIamH5AdminOrganizationNode[]>;
}

/** Controller construction input. */
export interface CreateSdkworkIamH5AdminOrganizationControllerInput {
  readonly service: SdkworkIamH5AdminOrganizationServicePort;
}
