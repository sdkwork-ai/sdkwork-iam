// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMMP_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-mp-core';

/** Route contributions owned by `@sdkwork/iam-mp-auth`, taken from its tier registry. */
export const IAMMPAUTH_ROUTE_CONTRIBUTIONS = IAMMP_ROUTE_CONTRIBUTIONS.filter(
  (route) =>
    route.id === 'app.iam.auth.login' ||
    route.id === 'app.iam.auth.register' ||
    route.id === 'app.iam.auth.forgot-password' ||
    route.id === 'app.iam.auth.oauth-callback' ||
    route.id === 'app.iam.auth.context-selection',
);

export const IAMMPAUTH_ROUTE_IDS = [
  'app.iam.auth.login',
  'app.iam.auth.register',
  'app.iam.auth.forgot-password',
  'app.iam.auth.oauth-callback',
  'app.iam.auth.context-selection',
] as const;
