// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route composition of the `app` tier.
 *
 * Joins the route contributions of this tier's own capability packages, so the app,
 * console and admin compositions stay independent even though one root ships all three.
 * Ids come from `sdkwork-iam-harmony-mobile-core`, which owns the
 * registry, so this file adds no identities of its own.
 */
import { type RouteContribution } from '@sdkwork/sdkwork-iam-harmony-mobile-core';
import { iamHarmonyAuthRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-auth';
import { iamHarmonyUserCenterRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-user-center';
import { iamHarmonyAccountBindingRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-account-binding';
import { iamHarmonyUserRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-user';
import { iamHarmonyTenantRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-tenant';
import { iamHarmonyOrganizationRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-organization';
import { iamHarmonyOauthRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-oauth';

/** Every route the `app` tier contributes. */
export function iamHarmonyRouteContributions(): RouteContribution[] {
  return [
  ...iamHarmonyAuthRouteContributions,
  ...iamHarmonyUserCenterRouteContributions,
  ...iamHarmonyAccountBindingRouteContributions,
  ...iamHarmonyUserRouteContributions,
  ...iamHarmonyTenantRouteContributions,
  ...iamHarmonyOrganizationRouteContributions,
  ...iamHarmonyOauthRouteContributions,
  ];
}

/** Route ids of the `app` tier, in composition order. */
export function iamHarmonyRouteIds(): string[] {
  return iamHarmonyRouteContributions().map((entry: RouteContribution) => entry.id);
}
