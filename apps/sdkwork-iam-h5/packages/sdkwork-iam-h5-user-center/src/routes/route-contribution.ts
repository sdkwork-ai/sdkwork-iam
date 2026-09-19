// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMH5_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-h5-core';

/** Route contributions owned by `@sdkwork/iam-h5-user-center`, taken from its tier registry. */
export const IAMH5USERCENTER_ROUTE_CONTRIBUTIONS = IAMH5_ROUTE_CONTRIBUTIONS.filter(
  (route) =>
    route.id === 'app.iam.user-center.profile' ||
    route.id === 'app.iam.user-center.password',
);

export const IAMH5USERCENTER_ROUTE_IDS = [
  'app.iam.user-center.profile',
  'app.iam.user-center.password',
] as const;
