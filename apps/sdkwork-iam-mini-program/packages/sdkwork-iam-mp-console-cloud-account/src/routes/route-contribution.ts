// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMMPCONSOLE_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-mp-console-core';

/** Route contributions owned by `@sdkwork/iam-mp-console-cloud-account`, taken from its tier registry. */
export const IAMMPCONSOLECLOUDACCOUNT_ROUTE_CONTRIBUTIONS = IAMMPCONSOLE_ROUTE_CONTRIBUTIONS.filter(
  (route) => route.id === 'console.iam.cloud-account.list',
);

export const IAMMPCONSOLECLOUDACCOUNT_ROUTE_IDS = [
  'console.iam.cloud-account.list',
] as const;
