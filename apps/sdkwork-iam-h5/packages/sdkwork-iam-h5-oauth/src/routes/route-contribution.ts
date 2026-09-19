// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMH5_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-h5-core';

/** Route contributions owned by `@sdkwork/iam-h5-oauth`, taken from its tier registry. */
export const IAMH5OAUTH_ROUTE_CONTRIBUTIONS = IAMH5_ROUTE_CONTRIBUTIONS.filter(
  (route) => route.id === 'app.iam.oauth.providers',
);

export const IAMH5OAUTH_ROUTE_IDS = [
  'app.iam.oauth.providers',
] as const;
