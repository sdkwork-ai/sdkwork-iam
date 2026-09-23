// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamMpConsoleCloudAccountServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamMpConsoleCloudAccountService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamMpConsoleCloudAccountService(input: CreateiamMpConsoleCloudAccountServiceInput): iamMpConsoleCloudAccountService {
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
