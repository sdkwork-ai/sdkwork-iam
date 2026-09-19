// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route composition of the `console` tier.
 *
 * Joins the route contributions of this tier's own capability packages, so the app,
 * console and admin compositions stay independent even though one root ships all three.
 * Ids come from `sdkwork-iam-harmony-mobile-console-core`, which owns the
 * registry, so this file adds no identities of its own.
 */
import { type RouteContribution } from '@sdkwork/sdkwork-iam-harmony-mobile-console-core';
import { iamHarmonyConsoleTenantRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-console-tenant';
import { iamHarmonyConsoleOrganizationRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-console-organization';
import { iamHarmonyConsoleAccountBindingRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-console-account-binding';
import { iamHarmonyConsoleUserCenterRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-console-user-center';

/** Every route the `console` tier contributes. */
export function iamHarmonyConsoleRouteContributions(): RouteContribution[] {
  return [
  ...iamHarmonyConsoleTenantRouteContributions,
  ...iamHarmonyConsoleOrganizationRouteContributions,
  ...iamHarmonyConsoleAccountBindingRouteContributions,
  ...iamHarmonyConsoleUserCenterRouteContributions,
  ];
}

/** Route ids of the `console` tier, in composition order. */
export function iamHarmonyConsoleRouteIds(): string[] {
  return iamHarmonyConsoleRouteContributions().map((entry: RouteContribution) => entry.id);
}
