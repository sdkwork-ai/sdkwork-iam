// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route contributions of `sdkwork-iam-harmony-mobile-oauth`.
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md section 7. The identities live in
 * `sdkwork-iam-harmony-mobile-core`, which owns the
 * `app` tier registry; this file narrows them to the `oauth`
 * capability so the pages, the tier shell and the entry bootstrap share one source of
 * truth.
 */

import { iamHarmonyMobileCoreRoutesByCapability, type RouteContribution } from '@sdkwork/sdkwork-iam-harmony-mobile-core';

/** Every route `sdkwork-iam-harmony-mobile-oauth` contributes, in registry order. */
export const iamHarmonyOauthRouteContributions: RouteContribution[] =
  iamHarmonyMobileCoreRoutesByCapability('oauth');

/**
 * Route ids of this capability, keyed by screen token.
 *
 * Derived rather than restated: a caller writes `IAM_HARMONY_OAUTH_ROUTE_IDS.login`
 * instead of a string literal, and the map cannot disagree with the registry it comes
 * from because nothing here spells an id out.
 */
export function iamHarmonyOauthRouteIdsByScreen(): Record<string, string> {
  const ids: Record<string, string> = {};
  for (const contribution of iamHarmonyOauthRouteContributions) {
    ids[contribution.screen] = contribution.id;
  }
  return ids;
}

/** Screen-token keyed route ids of `sdkwork-iam-harmony-mobile-oauth`. */
export const IAM_HARMONY_OAUTH_ROUTE_IDS: Record<string, string> = iamHarmonyOauthRouteIdsByScreen();
