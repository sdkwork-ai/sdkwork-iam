// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamH5ConsoleCloudAccountServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamH5ConsoleCloudAccountService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamH5ConsoleCloudAccountService(input: CreateiamH5ConsoleCloudAccountServiceInput): iamH5ConsoleCloudAccountService {
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
