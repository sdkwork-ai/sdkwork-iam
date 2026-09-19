// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamH5ConsoleOrganizationServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamH5ConsoleOrganizationService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamH5ConsoleOrganizationService(input: CreateiamH5ConsoleOrganizationServiceInput): iamH5ConsoleOrganizationService {
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
