// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMMPADMIN_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-mp-admin-core';

/** Route contributions owned by `@sdkwork/iam-mp-admin-tenant`, taken from its tier registry. */
export const IAMMPADMINTENANT_ROUTE_CONTRIBUTIONS = IAMMPADMIN_ROUTE_CONTRIBUTIONS.filter(
  (route) => route.id === 'admin.iam.tenant.list',
);

export const IAMMPADMINTENANT_ROUTE_IDS = [
  'admin.iam.tenant.list',
] as const;
