// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMH5CONSOLE_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-h5-console-core';

/** Route contributions owned by `@sdkwork/iam-h5-console-tenant`, taken from its tier registry. */
export const IAMH5CONSOLETENANT_ROUTE_CONTRIBUTIONS = IAMH5CONSOLE_ROUTE_CONTRIBUTIONS.filter(
  (route) => route.id === 'console.iam.tenant.overview',
);

export const IAMH5CONSOLETENANT_ROUTE_IDS = [
  'console.iam.tenant.overview',
] as const;
