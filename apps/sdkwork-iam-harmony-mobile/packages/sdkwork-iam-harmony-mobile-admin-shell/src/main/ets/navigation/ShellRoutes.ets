// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Navigation registration shape owned by the `admin` shell.
 *
 * `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 5 places the shell above the
 * capability packages, so a capability consumes the shell's public export rather
 * than re-declaring the navigator's contract. The shell owns the shape and the
 * validation; a capability only projects its own contributions onto it.
 */
import {
  type RouteAuth,
  type HarmonyRoutePresentation,
} from '@sdkwork/sdkwork-iam-harmony-mobile-admin-core';

/** One route the navigator can mount. */
export interface IamHarmonyAdminRouteRegistration {
  readonly id: string;
  readonly pagePath: string;
  readonly titleKey: string;
  readonly auth: RouteAuth;
  readonly harnessLayoutGroup?: 'main' | 'stack';
  readonly harmonyNative: HarmonyRoutePresentation;
}

/**
 * Route id the navigator opens for an authentication state.
 *
 * The login screen is the only public entry; every other route is reachable only
 * after the auth gate has passed (`IAM_LOGIN_INTEGRATION_SPEC.md`).
 */
export function resolveIamHarmonyAdminEntryRouteId(
  registrations: IamHarmonyAdminRouteRegistration[],
  authenticated: boolean,
): string | undefined {
  const candidates: IamHarmonyAdminRouteRegistration[] = registrations.filter(
    (entry: IamHarmonyAdminRouteRegistration) => (authenticated ? entry.auth === 'required' : entry.auth === 'public'),
  );
  const ordered: IamHarmonyAdminRouteRegistration[] = candidates.sort(
    (left: IamHarmonyAdminRouteRegistration, right: IamHarmonyAdminRouteRegistration) => left.id.localeCompare(right.id),
  );
  return ordered.length === 0 ? undefined : ordered[0].id;
}

/**
 * Validates that every registration names a page path.
 *
 * A registration without a page path is a route the navigator cannot mount, and
 * section 8 wants that to fail where the registry is built instead of at the tap
 * that never navigates.
 */
export function validateIamHarmonyAdminRegistrations(
  registrations: IamHarmonyAdminRouteRegistration[],
): string[] {
  const issues: string[] = [];
  for (const entry of registrations) {
    if (entry.pagePath.trim().length === 0) {
      issues.push(entry.id + ' has no page path');
    }
    if (entry.titleKey.trim().length === 0) {
      issues.push(entry.id + ' has no title key');
    }
  }
  const ids: string[] = registrations.map((entry: IamHarmonyAdminRouteRegistration) => entry.id);
  const unique: string[] = Array.from(new Set(ids));
  if (unique.length !== ids.length) {
    issues.push('duplicate route id in the admin tier registry');
  }
  return issues;
}
