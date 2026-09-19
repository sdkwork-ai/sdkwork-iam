// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamH5AdminAuditServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamH5AdminAuditService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamH5AdminAuditService(input: CreateiamH5AdminAuditServiceInput): iamH5AdminAuditService {
  const { service } = input;
  return {
    listScreenIds() {
      void service;
      return [
        'events',
      ];
    },
  };
}
