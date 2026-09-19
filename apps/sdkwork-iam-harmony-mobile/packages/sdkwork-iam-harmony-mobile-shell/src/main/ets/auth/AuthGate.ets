// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Authentication gate of the `app` shell.
 *
 * `IAM_LOGIN_INTEGRATION_SPEC.md` and `APP_SDK_INTEGRATION_SPEC.md`: a protected
 * route is never mounted before the session is complete, and a logout or refresh
 * failure clears the session, the token manager and the realtime bridges together.
 */
import { isIamHarmonyMobileCoreSessionComplete, readIamHarmonyMobileCoreSession } from '@sdkwork/sdkwork-iam-harmony-mobile-core';

/** Whether a protected route may be mounted. */
export function iamHarmonyAllowsRoute(auth: 'public' | 'required'): boolean {
  if (auth === 'public') return true;
  return isIamHarmonyMobileCoreSessionComplete(readIamHarmonyMobileCoreSession());
}
