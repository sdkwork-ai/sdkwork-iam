// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamMpConsoleOrganizationServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamMpConsoleOrganizationService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamMpConsoleOrganizationService(input: CreateiamMpConsoleOrganizationServiceInput): iamMpConsoleOrganizationService {
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
