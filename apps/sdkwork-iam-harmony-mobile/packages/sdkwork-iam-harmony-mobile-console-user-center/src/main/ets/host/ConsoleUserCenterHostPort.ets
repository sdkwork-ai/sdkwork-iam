// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Host adapter needs of `sdkwork-iam-harmony-mobile-console-user-center`.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 7. A feature package
 * depends on host adapter interfaces declared in the tier core; it must not call
 * HarmonyOS system APIs, hold an ability context, or handle a raw want.
 *
 * The capability currently needs no platform adapter beyond `secureStorage`, which
 * the session store reaches through the core's host registry. The type below
 * exists so a future need is added here instead of inline in a page.
 */

/** Host capabilities this package is allowed to consume. */
export const IAM_HARMONY_CONSOLE_USER_CENTER_HOST_CAPABILITIES: string[] = [];
