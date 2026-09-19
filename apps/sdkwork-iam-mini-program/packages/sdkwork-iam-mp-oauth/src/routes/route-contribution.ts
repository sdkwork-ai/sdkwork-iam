// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMMP_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-mp-core';

/** Route contributions owned by `@sdkwork/iam-mp-oauth`, taken from its tier registry. */
export const IAMMPOAUTH_ROUTE_CONTRIBUTIONS = IAMMP_ROUTE_CONTRIBUTIONS.filter(
  (route) => route.id === 'app.iam.oauth.providers',
);

export const IAMMPOAUTH_ROUTE_IDS = [
  'app.iam.oauth.providers',
] as const;
