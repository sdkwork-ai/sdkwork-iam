// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route and page registry assembly.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 8 and
 * `APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md` section 7. Route ids follow
 * `<surface>.<domain>.<capability>.<screen>` and stay aligned with the PC, H5,
 * Flutter and mini program roots; a physical Harmony page path may differ per
 * platform.
 *
 * Validation throws instead of returning issues: a duplicate route id, or a screen
 * without a page path, means a shipped feature a user cannot reach, and a warning
 * during bootstrap is a warning nobody reads.
 */
import { type RouteContribution } from '@sdkwork/sdkwork-iam-harmony-mobile-core';
import { iamHarmonyRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-shell';
import { iamHarmonyConsoleRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-console-shell';
import { iamHarmonyAdminRouteContributions } from '@sdkwork/sdkwork-iam-harmony-mobile-admin-shell';
import { validateIamHarmonyRegistrations } from '@sdkwork/sdkwork-iam-harmony-mobile-shell';
import { validateIamHarmonyConsoleRegistrations } from '@sdkwork/sdkwork-iam-harmony-mobile-console-shell';
import { validateIamHarmonyAdminRegistrations } from '@sdkwork/sdkwork-iam-harmony-mobile-admin-shell';
import { listIamHarmonyMobileCoreModules } from '@sdkwork/sdkwork-iam-harmony-mobile-core';
import { listIamHarmonyMobileConsoleCoreModules } from '@sdkwork/sdkwork-iam-harmony-mobile-console-core';
import { listIamHarmonyMobileAdminCoreModules } from '@sdkwork/sdkwork-iam-harmony-mobile-admin-core';
import {
  validateIamHarmonyRegistrations,
  type IamHarmonyRouteRegistration,
} from '@sdkwork/sdkwork-iam-harmony-mobile-shell';

/** Projects one tier's contribution onto the navigator's registration shape. */
export function toIamHarmonyRouteRegistration(
  contribution: RouteContribution,
): IamHarmonyRouteRegistration {
  return {
    id: contribution.id,
    pagePath: contribution.pagePath,
    titleKey: contribution.titleKey,
    auth: contribution.auth,
    harmonyNative: contribution.harmonyNative,
  };
}

/** Assembles and validates the route registry of every tier this root ships. */
export function createIamHarmonyRoutes(): IamHarmonyRouteRegistration[] {
  const appIssues: string[] = validateIamHarmonyRegistrations(
    iamHarmonyRouteContributions().map((contribution: RouteContribution) => toIamHarmonyRouteRegistration(contribution)),
  );
  if (appIssues.length > 0) {
    throw new Error('Harmony app route registry is invalid: ' + appIssues.join('; '));
  }
  const consoleIssues: string[] = validateIamHarmonyConsoleRegistrations(
    iamHarmonyConsoleRouteContributions().map((contribution: RouteContribution) => toIamHarmonyRouteRegistration(contribution)),
  );
  if (consoleIssues.length > 0) {
    throw new Error('Harmony console route registry is invalid: ' + consoleIssues.join('; '));
  }
  const adminIssues: string[] = validateIamHarmonyAdminRegistrations(
    iamHarmonyAdminRouteContributions().map((contribution: RouteContribution) => toIamHarmonyRouteRegistration(contribution)),
  );
  if (adminIssues.length > 0) {
    throw new Error('Harmony admin route registry is invalid: ' + adminIssues.join('; '));
  }
  const routes: IamHarmonyRouteRegistration[] = iamHarmonyRouteContributions()
    .map((contribution: RouteContribution) => toIamHarmonyRouteRegistration(contribution))
    .concat(iamHarmonyRouteContributions().map((contribution: RouteContribution) => toIamHarmonyRouteRegistration(contribution)))
    .concat(iamHarmonyConsoleRouteContributions().map((contribution: RouteContribution) => toIamHarmonyRouteRegistration(contribution)))
    .concat(iamHarmonyAdminRouteContributions().map((contribution: RouteContribution) => toIamHarmonyRouteRegistration(contribution)))
    ;
  const issues: string[] = validateIamHarmonyRegistrations(routes);
  if (issues.length > 0) {
    throw new Error('Harmony route registry is invalid: ' + issues.join('; '));
  }
  assertIamHarmonyModuleCoverage(routes);
  return routes;
}

/**
 * Checks every route against the tier module registries.
 *
 * A core cannot import a capability package to count its routes (section 5 forbids
 * the cycle), so it declares route-id prefixes instead. That makes this check the
 * thing that keeps the registry honest: without it, a capability could ship routes
 * under a prefix no core has ever heard of and nothing would notice.
 */
export function assertIamHarmonyModuleCoverage(
  routes: IamHarmonyRouteRegistration[],
): void {
  const modules = listIamHarmonyMobileCoreModules()
    .concat(listIamHarmonyMobileConsoleCoreModules()
    .concat(listIamHarmonyMobileAdminCoreModules());
  for (const route of routes) {
    const owned: boolean = modules.some(
      (entry) => route.id.startsWith(entry.routeIdPrefix),
    );
    if (!owned) {
      throw new Error(
        'Harmony route ' + route.id + ' is not owned by any registered module prefix',
      );
    }
  }
}
