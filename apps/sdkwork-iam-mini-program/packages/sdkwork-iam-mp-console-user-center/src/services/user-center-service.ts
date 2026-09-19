// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamMpConsoleUserCenterServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamMpConsoleUserCenterService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamMpConsoleUserCenterService(input: CreateiamMpConsoleUserCenterServiceInput): iamMpConsoleUserCenterService {
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
