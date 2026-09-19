// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamMpAdminUserServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamMpAdminUserService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamMpAdminUserService(input: CreateiamMpAdminUserServiceInput): iamMpAdminUserService {
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
