// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamMpOrganizationServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamMpOrganizationService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamMpOrganizationService(input: CreateiamMpOrganizationServiceInput): iamMpOrganizationService {
  const { service } = input;
  return {
    listScreenIds() {
      void service;
      return [
        'directory',
      ];
    },
  };
}
