// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMH5ADMIN_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-h5-admin-core';

/** Route contributions owned by `@sdkwork/iam-h5-admin-permission`, taken from its tier registry. */
export const IAMH5ADMINPERMISSION_ROUTE_CONTRIBUTIONS = IAMH5ADMIN_ROUTE_CONTRIBUTIONS.filter(
  (route) =>
    route.id === 'admin.iam.permission.roles' ||
    route.id === 'admin.iam.permission.permissions' ||
    route.id === 'admin.iam.permission.policies' ||
    route.id === 'admin.iam.permission.authorizations',
);

export const IAMH5ADMINPERMISSION_ROUTE_IDS = [
  'admin.iam.permission.roles',
  'admin.iam.permission.permissions',
  'admin.iam.permission.policies',
  'admin.iam.permission.authorizations',
] as const;
