// SDKWORK-IAM-H5-CONSOLE-TENANT-TYPES: authored types.
/**
 * Types of the console tenant workspace.
 *
 * The console surface answers a different question than the app surface: an operator
 * wants the tenant they are acting in, how much it contains, and which self-service
 * policies are on — not their own membership list.
 */

import type { SdkworkIamH5ListQuery, SdkworkIamH5Page } from "@sdkwork/iam-h5-commons";
import type { SdkworkIamService } from "@sdkwork/iam-service";

/** The service port this capability consumes. */
export type SdkworkIamH5ConsoleTenantServicePort = Pick<
  SdkworkIamService,
  "iam" | "oauth" | "system"
>;

/** Tenant identity the console shows at the top. */
export interface SdkworkIamH5ConsoleTenantRuntime {
  readonly environment?: string;
  readonly tenantId?: string;
  readonly userId?: string;
}

/** One organization row, flattened for the screen. */
export interface SdkworkIamH5ConsoleTenantOrganization {
  readonly detail?: string;
  readonly id: string;
  readonly title: string;
}

/** The self-service policies an operator checks before answering a support ticket. */
export interface SdkworkIamH5ConsoleTenantPolicy {
  readonly contactEnabled: boolean;
  readonly emailEnabled: boolean;
  readonly oauthEnabled: boolean;
  readonly selfServiceUnlinkEnabled: boolean;
}

/** Everything the console screen renders. */
export interface SdkworkIamH5ConsoleTenantController {
  fetchOrganizationsPage(
    query: SdkworkIamH5ListQuery,
  ): Promise<SdkworkIamH5Page<SdkworkIamH5ConsoleTenantOrganization>>;
  loadPolicy(): Promise<SdkworkIamH5ConsoleTenantPolicy>;
  loadRuntime(): Promise<SdkworkIamH5ConsoleTenantRuntime>;
}

/** Controller construction input. */
export interface CreateSdkworkIamH5ConsoleTenantControllerInput {
  readonly service: SdkworkIamH5ConsoleTenantServicePort;
}
