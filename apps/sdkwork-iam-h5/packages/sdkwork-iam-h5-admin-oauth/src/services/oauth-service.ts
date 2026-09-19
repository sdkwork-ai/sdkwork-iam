// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamH5AdminOauthServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamH5AdminOauthService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamH5AdminOauthService(input: CreateiamH5AdminOauthServiceInput): iamH5AdminOauthService {
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
