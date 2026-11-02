// SDKWORK-IAM-H5-ADMIN-ACCOUNT-BINDING-TYPES: authored types.
/**
 * Types of the admin account-binding settings surface.
 *
 * The screen edits one tenant policy: which binding capabilities exist for its users, and
 * whether they may remove a linked identity themselves. Reading and writing that policy is
 * the whole capability, so there is no list here.
 */

import type { SdkworkIamService } from "@sdkwork/iam-service";

/** The service port this capability consumes (admin tier: backend-api resources). */
export type SdkworkIamH5AdminAccountBindingServicePort = Pick<SdkworkIamService, "iam">;

/** The tenant binding policy as the screen edits it. */
export interface SdkworkIamH5AdminAccountBindingPolicy {
  readonly contactEnabled: boolean;
  readonly emailEnabled: boolean;
  readonly oauthEnabled: boolean;
  readonly selfServiceUnlinkEnabled: boolean;
}

/** The settings screen's controller. */
export interface SdkworkIamH5AdminAccountBindingController {
  loadPolicy(): Promise<SdkworkIamH5AdminAccountBindingPolicy>;
  savePolicy(policy: SdkworkIamH5AdminAccountBindingPolicy): Promise<void>;
}

/** Controller construction input. */
export interface CreateSdkworkIamH5AdminAccountBindingControllerInput {
  readonly service: SdkworkIamH5AdminAccountBindingServicePort;
}

/** The policy with every capability switched off. */
export const IAM_H5_ADMIN_ACCOUNT_BINDING_EMPTY_POLICY: SdkworkIamH5AdminAccountBindingPolicy = {
  contactEnabled: false,
  emailEnabled: false,
  oauthEnabled: false,
  selfServiceUnlinkEnabled: false,
};
