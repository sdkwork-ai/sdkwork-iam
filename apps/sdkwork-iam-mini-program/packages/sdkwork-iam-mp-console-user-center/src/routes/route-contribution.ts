// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMMPCONSOLE_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-mp-console-core';

/** Route contributions owned by `@sdkwork/iam-mp-console-user-center`, taken from its tier registry. */
export const IAMMPCONSOLEUSERCENTER_ROUTE_CONTRIBUTIONS = IAMMPCONSOLE_ROUTE_CONTRIBUTIONS.filter(
  (route) => route.id === 'console.iam.user-center.profile',
);

export const IAMMPCONSOLEUSERCENTER_ROUTE_IDS = [
  'console.iam.user-center.profile',
] as const;
