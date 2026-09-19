// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamMpUserCenterServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamMpUserCenterService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamMpUserCenterService(input: CreateiamMpUserCenterServiceInput): iamMpUserCenterService {
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
