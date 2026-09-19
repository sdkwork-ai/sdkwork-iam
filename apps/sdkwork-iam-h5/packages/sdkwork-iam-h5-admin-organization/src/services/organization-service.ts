// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamH5AdminOrganizationServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamH5AdminOrganizationService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamH5AdminOrganizationService(input: CreateiamH5AdminOrganizationServiceInput): iamH5AdminOrganizationService {
  const { service } = input;
  return {
    listScreenIds() {
      void service;
      return [
        'tree',
      ];
    },
  };
}
