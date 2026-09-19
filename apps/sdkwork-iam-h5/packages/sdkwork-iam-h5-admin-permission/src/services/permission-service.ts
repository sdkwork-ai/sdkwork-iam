// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamH5AdminPermissionServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamH5AdminPermissionService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamH5AdminPermissionService(input: CreateiamH5AdminPermissionServiceInput): iamH5AdminPermissionService {
  const { service } = input;
  return {
    listScreenIds() {
      void service;
      return [
        'roles',
        'permissions',
        'policies',
        'authorizations',
      ];
    },
  };
}
