// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamH5ConsoleUserCenterServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamH5ConsoleUserCenterService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamH5ConsoleUserCenterService(input: CreateiamH5ConsoleUserCenterServiceInput): iamH5ConsoleUserCenterService {
  const { service } = input;
  return {
    listScreenIds() {
      void service;
      return [
        'profile',
      ];
    },
  };
}
