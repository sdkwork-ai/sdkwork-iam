// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamMpOauthServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamMpOauthService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamMpOauthService(input: CreateiamMpOauthServiceInput): iamMpOauthService {
  const { service } = input;
  return {
    listScreenIds() {
      void service;
      return [
        'providers',
      ];
    },
  };
}
