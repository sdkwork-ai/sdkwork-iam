// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Session and context store of `sdkwork-iam-harmony-mobile-core`.
 *
 * Authority: `APP_SDK_INTEGRATION_SPEC.md`. Logout, refresh failure, tenant switch
 * and account switch must clear this store together with the global token-manager
 * equivalent, secure platform storage and the realtime bridges
 * (`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 6).
 */

export interface IamHarmonyMobileCoreSession {
  readonly accessToken?: string;
  readonly authToken?: string;
  readonly tenantId?: string;
  readonly userId?: string;
}

let currentSession: IamHarmonyMobileCoreSession | undefined = undefined;

export function readIamHarmonyMobileCoreSession(): IamHarmonyMobileCoreSession | undefined {
  return currentSession;
}

export function writeIamHarmonyMobileCoreSession(session: IamHarmonyMobileCoreSession | undefined): void {
  currentSession = session;
}

/**
 * Commits a session read from the IAM exchange.
 *
 * Returns the stored value so a caller can assert what it actually got rather than
 * what it hoped to send.
 */
export function commitIamHarmonyMobileCoreSession(session: IamHarmonyMobileCoreSession): IamHarmonyMobileCoreSession {
  currentSession = session;
  return session;
}

export function clearIamHarmonyMobileCoreSession(): void {
  currentSession = undefined;
}

export function resolveIamHarmonyMobileCoreAccessToken(
  session: IamHarmonyMobileCoreSession | undefined,
): string | undefined {
  const value: string | undefined = session === undefined ? undefined : session.accessToken;
  const normalized: string = value === undefined ? '' : value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function resolveIamHarmonyMobileCoreAuthToken(
  session: IamHarmonyMobileCoreSession | undefined,
): string | undefined {
  const value: string | undefined = session === undefined ? undefined : session.authToken;
  const normalized: string = value === undefined ? '' : value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

/**
 * A session is complete only when both tokens are present.
 *
 * The dual-token contract is what makes a cold launch able to refresh: a session
 * with only an access token cannot survive its first expiry.
 */
export function isIamHarmonyMobileCoreSessionComplete(session: IamHarmonyMobileCoreSession | undefined): boolean {
  return resolveIamHarmonyMobileCoreAccessToken(session) !== undefined
    && resolveIamHarmonyMobileCoreAuthToken(session) !== undefined;
}
