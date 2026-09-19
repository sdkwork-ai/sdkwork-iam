// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Global token-manager equivalent.
 *
 * Section 6 requires one shared instance across the appbase app SDK, every
 * authenticated app-api SDK client and any explicit backend-admin client. A second
 * manager is how a logout clears one credential set while another stays live, so
 * this module is the only place a token is held.
 *
 * The manager stores nothing itself: it delegates to the session store so there is
 * one credential record rather than two that must agree.
 *
 * The session store sits in a sibling directory, so the specifier is
 * `'../session/SessionStore'` and not `'./SessionStore'`: the latter named a file
 * under `sdk/` that this generator never writes.
 */
import {
  clearIamHarmonyMobileCoreSession,
  readIamHarmonyMobileCoreSession,
  resolveIamHarmonyMobileCoreAccessToken,
  isIamHarmonyMobileCoreSessionComplete,
} from '../session/SessionStore';

/** Tokens the runtime applies to every constructed client. */
export interface IamHarmonyTokenSet {
  readonly accessToken?: string;
  readonly authToken?: string;
}

let authenticated: boolean = false;

/**
 * Marks the runtime authenticated.
 *
 * Separate from holding a token because a refresh failure leaves the manager
 * holding a token that is known to be dead; authentication state and credential
 * presence are different facts and one must not be inferred from the other.
 */
export function markIamHarmonyAuthenticated(value: boolean): void {
  authenticated = value;
}

export function isIamHarmonyAuthenticated(): boolean {
  return authenticated;
}

/** The token set the SDK clients should be configured with. */
export function currentIamHarmonyTokenSet(): IamHarmonyTokenSet {
  const session = readIamHarmonyMobileCoreSession();
  return {
    accessToken: resolveIamHarmonyMobileCoreAccessToken(session),
    authToken: session === undefined ? undefined : session.authToken,
  };
}

/** Whether a refresh can be attempted at all. */
export function canIamHarmonyRefresh(): boolean {
  return isIamHarmonyMobileCoreSessionComplete(readIamHarmonyMobileCoreSession());
}

/**
 * Clears the manager and the session store together.
 *
 * Section 6 pairs them because a caller that clears only one leaves a token the
 * next request will still send.
 */
export function clearIamHarmonyTokens(): void {
  authenticated = false;
  clearIamHarmonyMobileCoreSession();
}
