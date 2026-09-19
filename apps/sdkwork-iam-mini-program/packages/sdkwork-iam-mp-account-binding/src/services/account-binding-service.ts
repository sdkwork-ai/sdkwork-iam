// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamMpAccountBindingServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamMpAccountBindingService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamMpAccountBindingService(input: CreateiamMpAccountBindingServiceInput): iamMpAccountBindingService {
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
