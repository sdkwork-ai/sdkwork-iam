// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMMPADMIN_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-mp-admin-core';

/** Route contributions owned by `@sdkwork/iam-mp-admin-permission`, taken from its tier registry. */
export const IAMMPADMINPERMISSION_ROUTE_CONTRIBUTIONS = IAMMPADMIN_ROUTE_CONTRIBUTIONS.filter(
  (route) =>
    route.id === 'admin.iam.permission.roles' ||
    route.id === 'admin.iam.permission.permissions' ||
    route.id === 'admin.iam.permission.policies' ||
    route.id === 'admin.iam.permission.authorizations',
);

export const IAMMPADMINPERMISSION_ROUTE_IDS = [
  'admin.iam.permission.roles',
  'admin.iam.permission.permissions',
  'admin.iam.permission.policies',
  'admin.iam.permission.authorizations',
] as const;
