// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMH5_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-h5-core';

/** Route contributions owned by `@sdkwork/iam-h5-auth`, taken from its tier registry. */
export const IAMH5AUTH_ROUTE_CONTRIBUTIONS = IAMH5_ROUTE_CONTRIBUTIONS.filter(
  (route) =>
    route.id === 'app.iam.auth.login' ||
    route.id === 'app.iam.auth.register' ||
    route.id === 'app.iam.auth.forgot-password' ||
    route.id === 'app.iam.auth.oauth-callback' ||
    route.id === 'app.iam.auth.context-selection',
);

export const IAMH5AUTH_ROUTE_IDS = [
  'app.iam.auth.login',
  'app.iam.auth.register',
  'app.iam.auth.forgot-password',
  'app.iam.auth.oauth-callback',
  'app.iam.auth.context-selection',
] as const;
