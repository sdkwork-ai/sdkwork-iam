// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamMpAdminCloudAccountServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamMpAdminCloudAccountService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamMpAdminCloudAccountService(input: CreateiamMpAdminCloudAccountServiceInput): iamMpAdminCloudAccountService {
  const { service } = input;
  return {
    listScreenIds() {
      void service;
      return [
        'list',
      ];
    },
  };
}
