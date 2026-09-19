// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamMpAuthServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamMpAuthService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamMpAuthService(input: CreateiamMpAuthServiceInput): iamMpAuthService {
  const { service } = input;
  return {
    listScreenIds() {
      void service;
      return [
        'login',
        'register',
        'forgot-password',
        'oauth-callback',
        'context-selection',
      ];
    },
  };
}
