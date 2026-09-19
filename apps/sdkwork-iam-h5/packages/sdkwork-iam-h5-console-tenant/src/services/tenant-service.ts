// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamH5ConsoleTenantServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamH5ConsoleTenantService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamH5ConsoleTenantService(input: CreateiamH5ConsoleTenantServiceInput): iamH5ConsoleTenantService {
  const { service } = input;
  return {
    listScreenIds() {
      void service;
      return [
        'overview',
      ];
    },
  };
}
