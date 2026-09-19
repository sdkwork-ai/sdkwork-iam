// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route contributions of `sdkwork-iam-harmony-mobile-console-tenant`.
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md section 7. The identities live in
 * `sdkwork-iam-harmony-mobile-console-core`, which owns the
 * `console` tier registry; this file narrows them to the `tenant`
 * capability so the pages, the tier shell and the entry bootstrap share one source of
 * truth.
 */

import { iamHarmonyMobileConsoleCoreRoutesByCapability, type RouteContribution } from '@sdkwork/sdkwork-iam-harmony-mobile-console-core';

/** Every route `sdkwork-iam-harmony-mobile-console-tenant` contributes, in registry order. */
export const iamHarmonyConsoleTenantRouteContributions: RouteContribution[] =
  iamHarmonyMobileConsoleCoreRoutesByCapability('tenant');

/**
 * Route ids of this capability, keyed by screen token.
 *
 * Derived rather than restated: a caller writes `IAM_HARMONY_CONSOLE_TENANT_ROUTE_IDS.login`
 * instead of a string literal, and the map cannot disagree with the registry it comes
 * from because nothing here spells an id out.
 */
export function iamHarmonyConsoleTenantRouteIdsByScreen(): Record<string, string> {
  const ids: Record<string, string> = {};
  for (const contribution of iamHarmonyConsoleTenantRouteContributions) {
    ids[contribution.screen] = contribution.id;
  }
  return ids;
}

/** Screen-token keyed route ids of `sdkwork-iam-harmony-mobile-console-tenant`. */
export const IAM_HARMONY_CONSOLE_TENANT_ROUTE_IDS: Record<string, string> = iamHarmonyConsoleTenantRouteIdsByScreen();
