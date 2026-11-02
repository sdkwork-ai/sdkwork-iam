// SDKWORK-IAM-H5-CONSOLE-ACCOUNT-BINDING-TYPES: authored types.
/**
 * Types of the console account-binding workspace.
 *
 * An operator answers two questions here: which identities this user signs in with,
 * and whether the tenant's policy would even allow the user to remove one themselves.
 */

import type { SdkworkIamH5ListQuery, SdkworkIamH5Page } from "@sdkwork/iam-h5-commons";
import type { SdkworkIamService } from "@sdkwork/iam-service";

/** The service port this capability consumes. */
export type SdkworkIamH5ConsoleAccountBindingServicePort = Pick<
  SdkworkIamService,
  "oauth" | "system"
>;

/** Tenant policy that decides what a user may do to their own bindings. */
export interface SdkworkIamH5ConsoleAccountBindingPolicy {
  readonly contactEnabled: boolean;
  readonly emailEnabled: boolean;
  readonly oauthEnabled: boolean;
  readonly selfServiceUnlinkEnabled: boolean;
}

/** One linked third-party identity. */
export interface SdkworkIamH5ConsoleAccountLink {
  readonly accountLinkId: string;
  readonly provider: string;
  readonly providerUserId?: string;
}

/** The controller the screen binds to. */
export interface SdkworkIamH5ConsoleAccountBindingController {
  fetchLinksPage(query: SdkworkIamH5ListQuery): Promise<SdkworkIamH5Page<SdkworkIamH5ConsoleAccountLink>>;
  loadPolicy(): Promise<SdkworkIamH5ConsoleAccountBindingPolicy>;
  unlink(accountLinkId: string): Promise<void>;
}

/** Controller construction input. */
export interface CreateSdkworkIamH5ConsoleAccountBindingControllerInput {
  readonly service: SdkworkIamH5ConsoleAccountBindingServicePort;
}
