// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMH5CONSOLE_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-h5-console-core';

/** Route contributions owned by `@sdkwork/iam-h5-console-cloud-account`, taken from its tier registry. */
export const IAMH5CONSOLECLOUDACCOUNT_ROUTE_CONTRIBUTIONS = IAMH5CONSOLE_ROUTE_CONTRIBUTIONS.filter(
  (route) => route.id === 'console.iam.cloud-account.list',
);

export const IAMH5CONSOLECLOUDACCOUNT_ROUTE_IDS = [
  'console.iam.cloud-account.list',
] as const;
