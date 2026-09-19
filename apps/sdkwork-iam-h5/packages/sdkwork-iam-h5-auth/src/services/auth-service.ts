// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamH5AuthServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamH5AuthService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamH5AuthService(input: CreateiamH5AuthServiceInput): iamH5AuthService {
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
