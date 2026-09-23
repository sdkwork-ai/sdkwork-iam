// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMH5ADMIN_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-h5-admin-core';

/** Route contributions owned by `@sdkwork/iam-h5-admin-cloud-account`, taken from its tier registry. */
export const IAMH5ADMINCLOUDACCOUNT_ROUTE_CONTRIBUTIONS = IAMH5ADMIN_ROUTE_CONTRIBUTIONS.filter(
  (route) => route.id === 'admin.iam.cloud-account.list',
);

export const IAMH5ADMINCLOUDACCOUNT_ROUTE_IDS = [
  'admin.iam.cloud-account.list',
] as const;
