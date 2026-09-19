// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMMPCONSOLE_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-mp-console-core';

/** Route contributions owned by `@sdkwork/iam-mp-console-tenant`, taken from its tier registry. */
export const IAMMPCONSOLETENANT_ROUTE_CONTRIBUTIONS = IAMMPCONSOLE_ROUTE_CONTRIBUTIONS.filter(
  (route) => route.id === 'console.iam.tenant.overview',
);

export const IAMMPCONSOLETENANT_ROUTE_IDS = [
  'console.iam.tenant.overview',
] as const;
