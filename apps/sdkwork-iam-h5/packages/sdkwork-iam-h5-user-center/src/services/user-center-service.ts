// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamH5UserCenterServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamH5UserCenterService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamH5UserCenterService(input: CreateiamH5UserCenterServiceInput): iamH5UserCenterService {
  const { service } = input;
  return {
    listScreenIds() {
      void service;
      return [
        'profile',
        'password',
      ];
    },
  };
}
