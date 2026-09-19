// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMMP_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-mp-core';

/** Route contributions owned by `@sdkwork/iam-mp-user-center`, taken from its tier registry. */
export const IAMMPUSERCENTER_ROUTE_CONTRIBUTIONS = IAMMP_ROUTE_CONTRIBUTIONS.filter(
  (route) =>
    route.id === 'app.iam.user-center.profile' ||
    route.id === 'app.iam.user-center.password',
);

export const IAMMPUSERCENTER_ROUTE_IDS = [
  'app.iam.user-center.profile',
  'app.iam.user-center.password',
] as const;
