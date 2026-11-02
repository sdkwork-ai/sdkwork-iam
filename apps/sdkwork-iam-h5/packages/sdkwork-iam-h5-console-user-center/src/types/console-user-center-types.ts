// SDKWORK-IAM-H5-CONSOLE-USER-CENTER-TYPES: authored types.
/**
 * Types of the console user-center profile.
 *
 * The console shows the operator's own record plus the tenant's verification policy:
 * "what will this user be asked to verify" is the question behind most verification
 * tickets, and the app profile screen never surfaces it.
 */

import type { SdkworkIamService } from "@sdkwork/iam-service";

/** The service port this capability consumes. */
export type SdkworkIamH5ConsoleUserCenterServicePort = Pick<SdkworkIamService, "iam" | "system">;

/** The caller's own record. */
export interface SdkworkIamH5ConsoleUserAccount {
  readonly userId?: string;
  readonly displayName?: string;
  readonly email?: string;
  readonly phone?: string;
}

/** Tenant verification policy, as far as the console shows it. */
export interface SdkworkIamH5ConsoleUserVerificationPolicy {
  readonly contactRequired: boolean;
  readonly emailRequired: boolean;
  readonly oauthRequired: boolean;
}

/** The controller the screen binds to. */
export interface SdkworkIamH5ConsoleUserCenterController {
  loadAccount(): Promise<SdkworkIamH5ConsoleUserAccount>;
  loadVerificationPolicy(): Promise<SdkworkIamH5ConsoleUserVerificationPolicy>;
}

/** Controller construction input. */
export interface CreateSdkworkIamH5ConsoleUserCenterControllerInput {
  readonly service: SdkworkIamH5ConsoleUserCenterServicePort;
}
