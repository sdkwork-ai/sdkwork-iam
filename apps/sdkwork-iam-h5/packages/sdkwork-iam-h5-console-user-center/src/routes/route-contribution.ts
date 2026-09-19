// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMH5CONSOLE_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-h5-console-core';

/** Route contributions owned by `@sdkwork/iam-h5-console-user-center`, taken from its tier registry. */
export const IAMH5CONSOLEUSERCENTER_ROUTE_CONTRIBUTIONS = IAMH5CONSOLE_ROUTE_CONTRIBUTIONS.filter(
  (route) => route.id === 'console.iam.user-center.profile',
);

export const IAMH5CONSOLEUSERCENTER_ROUTE_IDS = [
  'console.iam.user-center.profile',
] as const;
