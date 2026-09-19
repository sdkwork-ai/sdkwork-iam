// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Navigation registration shape owned by the `app` shell.
 *
 * `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 5 places the shell above the
 * capability packages, so a capability consumes the shell's public export rather
 * than re-declaring the navigator's contract. The shell owns the shape and the
 * validation; a capability only projects its own contributions onto it.
 */
import {
  type RouteAuth,
  type HarmonyRoutePresentation,
} from '@sdkwork/sdkwork-iam-harmony-mobile-core';

/** One route the navigator can mount. */
export interface IamHarmonyRouteRegistration {
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
export function resolveIamHarmonyEntryRouteId(
  registrations: IamHarmonyRouteRegistration[],
  authenticated: boolean,
): string | undefined {
  const candidates: IamHarmonyRouteRegistration[] = registrations.filter(
    (entry: IamHarmonyRouteRegistration) => (authenticated ? entry.auth === 'required' : entry.auth === 'public'),
  );
  const ordered: IamHarmonyRouteRegistration[] = candidates.sort(
    (left: IamHarmonyRouteRegistration, right: IamHarmonyRouteRegistration) => left.id.localeCompare(right.id),
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
export function validateIamHarmonyRegistrations(
  registrations: IamHarmonyRouteRegistration[],
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
  const ids: string[] = registrations.map((entry: IamHarmonyRouteRegistration) => entry.id);
  const unique: string[] = Array.from(new Set(ids));
  if (unique.length !== ids.length) {
    issues.push('duplicate route id in the app tier registry');
  }
  return issues;
}
