// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMH5ADMIN_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-h5-admin-core';

/** Route contributions owned by `@sdkwork/iam-h5-admin-tenant`, taken from its tier registry. */
export const IAMH5ADMINTENANT_ROUTE_CONTRIBUTIONS = IAMH5ADMIN_ROUTE_CONTRIBUTIONS.filter(
  (route) => route.id === 'admin.iam.tenant.list',
);

export const IAMH5ADMINTENANT_ROUTE_IDS = [
  'admin.iam.tenant.list',
] as const;
