// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMH5ADMIN_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-h5-admin-core';

/** Route contributions owned by `@sdkwork/iam-h5-admin-user`, taken from its tier registry. */
export const IAMH5ADMINUSER_ROUTE_CONTRIBUTIONS = IAMH5ADMIN_ROUTE_CONTRIBUTIONS.filter(
  (route) => route.id === 'admin.iam.user.list',
);

export const IAMH5ADMINUSER_ROUTE_IDS = [
  'admin.iam.user.list',
] as const;
