// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route composition of the `admin` tier.
 *
 * Joins the route contributions of this tier's own capability packages, so the app,
 * console and admin compositions stay independent even though one root ships all three.
 * Ids come from `sdkwork-iam-harmony-mobile-admin-core`, which owns the
 * registry, so this file adds no identities of its own.
 */
import { type RouteContribution } from '@sdkwork/sdkwork-iam-harmony-mobile-admin-core';
import { iamHarmonyAdminOauthRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-admin-oauth';
import { iamHarmonyAdminTenantRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-admin-tenant';
import { iamHarmonyAdminOrganizationRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-admin-organization';
import { iamHarmonyAdminPermissionRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-admin-permission';
import { iamHarmonyAdminAccountBindingRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-admin-account-binding';
import { iamHarmonyAdminUserRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-admin-user';
import { iamHarmonyAdminAuditRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-admin-audit';

/** Every route the `admin` tier contributes. */
export function iamHarmonyAdminRouteContributions(): RouteContribution[] {
  return [
  ...iamHarmonyAdminOauthRouteContributions,
  ...iamHarmonyAdminTenantRouteContributions,
  ...iamHarmonyAdminOrganizationRouteContributions,
  ...iamHarmonyAdminPermissionRouteContributions,
  ...iamHarmonyAdminAccountBindingRouteContributions,
  ...iamHarmonyAdminUserRouteContributions,
  ...iamHarmonyAdminAuditRouteContributions,
  ];
}

/** Route ids of the `admin` tier, in composition order. */
export function iamHarmonyAdminRouteIds(): string[] {
  return iamHarmonyAdminRouteContributions().map((entry: RouteContribution) => entry.id);
}
