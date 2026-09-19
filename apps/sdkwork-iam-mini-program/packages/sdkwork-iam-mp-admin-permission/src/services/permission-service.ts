// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface CreateiamMpAdminPermissionServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface iamMpAdminPermissionService {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function createiamMpAdminPermissionService(input: CreateiamMpAdminPermissionServiceInput): iamMpAdminPermissionService {
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
