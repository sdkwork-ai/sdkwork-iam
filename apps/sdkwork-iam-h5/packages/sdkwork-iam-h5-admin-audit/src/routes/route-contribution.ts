// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMH5ADMIN_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-h5-admin-core';

/** Route contributions owned by `@sdkwork/iam-h5-admin-audit`, taken from its tier registry. */
export const IAMH5ADMINAUDIT_ROUTE_CONTRIBUTIONS = IAMH5ADMIN_ROUTE_CONTRIBUTIONS.filter(
  (route) => route.id === 'admin.iam.audit.events',
);

export const IAMH5ADMINAUDIT_ROUTE_IDS = [
  'admin.iam.audit.events',
] as const;
