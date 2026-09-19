// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Session and context store of `sdkwork-iam-harmony-mobile-console-core`.
 *
 * Authority: `APP_SDK_INTEGRATION_SPEC.md`. Logout, refresh failure, tenant switch
 * and account switch must clear this store together with the global token-manager
 * equivalent, secure platform storage and the realtime bridges
 * (`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 6).
 */

export interface IamHarmonyMobileConsoleCoreSession {
  readonly accessToken?: string;
  readonly authToken?: string;
  readonly tenantId?: string;
  readonly userId?: string;
}

let currentSession: IamHarmonyMobileConsoleCoreSession | undefined = undefined;

export function readIamHarmonyMobileConsoleCoreSession(): IamHarmonyMobileConsoleCoreSession | undefined {
  return currentSession;
}

export function writeIamHarmonyMobileConsoleCoreSession(session: IamHarmonyMobileConsoleCoreSession | undefined): void {
  currentSession = session;
}

/**
 * Commits a session read from the IAM exchange.
 *
 * Returns the stored value so a caller can assert what it actually got rather than
 * what it hoped to send.
 */
export function commitIamHarmonyMobileConsoleCoreSession(session: IamHarmonyMobileConsoleCoreSession): IamHarmonyMobileConsoleCoreSession {
  currentSession = session;
  return session;
}

export function clearIamHarmonyMobileConsoleCoreSession(): void {
  currentSession = undefined;
}

export function resolveIamHarmonyMobileConsoleCoreAccessToken(
  session: IamHarmonyMobileConsoleCoreSession | undefined,
): string | undefined {
  const value: string | undefined = session === undefined ? undefined : session.accessToken;
  const normalized: string = value === undefined ? '' : value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function resolveIamHarmonyMobileConsoleCoreAuthToken(
  session: IamHarmonyMobileConsoleCoreSession | undefined,
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
export function isIamHarmonyMobileConsoleCoreSessionComplete(session: IamHarmonyMobileConsoleCoreSession | undefined): boolean {
  return resolveIamHarmonyMobileConsoleCoreAccessToken(session) !== undefined
    && resolveIamHarmonyMobileConsoleCoreAuthToken(session) !== undefined;
}
