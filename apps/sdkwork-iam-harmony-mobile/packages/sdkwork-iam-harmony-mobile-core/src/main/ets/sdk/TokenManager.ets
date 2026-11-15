// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Global token-manager equivalent.
 *
 * Section 6 requires one shared instance across the appbase app SDK, every
 * authenticated app-api SDK client and any explicit backend-admin client. A second
 * manager is how a logout clears one credential set while another stays live, so
 * this module is the only place a token is held.
 *
 * Two credential classes live here and are deliberately not conflated
 * (`ENVIRONMENT_SPEC.md` section 6.1): the public application access token
 * (`SDKWORK_ACCESS_TOKEN`, committed, `token_class:application`, `alg:none`) that
 * bootstrap seeds before any SDK client is constructed, and the private session
 * tokens an interactive login installs later. A session token supersedes the
 * application token for outbound requests, and clearing the session restores the
 * application token rather than leaving credential entry with no credential.
 *
 * The manager stores no session record itself: it delegates to the session store so
 * there is one credential record rather than two that must agree.
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
 * Public application access token seeded by runtime bootstrap.
 *
 * Held outside the session store because it must survive logout and refresh failure:
 * credential entry needs `Access-Token` for tenant, application and environment
 * isolation before any interactive session exists (`ENVIRONMENT_SPEC.md` section
 * 6.1). It is public material (`APP_ACCESS_TOKEN_SPEC.md` section 1), never a
 * session credential.
 */
let bootstrapAccessToken: string | undefined = undefined;

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

/**
 * Seeds the public application access token.
 *
 * Called by runtime bootstrap before SDK client construction. A client reads this
 * manager once while its config is built, so a client constructed before this call
 * would carry no credential and a transport would send no `Access-Token`
 * (`ENVIRONMENT_SPEC.md` section 6.1).
 *
 * Empty input is a bootstrap defect, not a value to store: the selected profile
 * document is validated before this call, and a second silent no-op here would let a
 * caller skip the seed without noticing.
 */
export function initializeIamHarmonyBootstrapToken(accessToken: string): void {
  const normalized: string = accessToken.trim();
  if (normalized.length === 0) {
    throw new Error(
      'IAM Harmony bootstrap requires a non-empty SDKWORK_ACCESS_TOKEN before SDK client construction',
    );
  }
  bootstrapAccessToken = normalized;
}

/** Whether bootstrap seeded the public application access token. */
export function hasIamHarmonyBootstrapToken(): boolean {
  return bootstrapAccessToken !== undefined;
}

/**
 * Drops the seeded token.
 *
 * Runtime teardown and tests call this; logout must restore the token, not remove it.
 */
export function resetIamHarmonyBootstrapToken(): void {
  bootstrapAccessToken = undefined;
}

/** The seeded public application access token, or `undefined` before bootstrap. */
export function readIamHarmonyBootstrapToken(): string | undefined {
  return bootstrapAccessToken;
}

/**
 * The token set the SDK clients should be configured with.
 *
 * The session access token wins while a session exists; otherwise the public
 * application access token is returned, which is what keeps credential entry able to
 * send `Access-Token` before login and after logout.
 */
export function currentIamHarmonyTokenSet(): IamHarmonyTokenSet {
  const session = readIamHarmonyMobileCoreSession();
  const sessionAccessToken: string | undefined = resolveIamHarmonyMobileCoreAccessToken(session);
  return {
    accessToken: sessionAccessToken !== undefined ? sessionAccessToken : bootstrapAccessToken,
    authToken: session === undefined ? undefined : session.authToken,
  };
}

/** Whether a refresh can be attempted at all. */
export function canIamHarmonyRefresh(): boolean {
  return isIamHarmonyMobileCoreSessionComplete(readIamHarmonyMobileCoreSession());
}

/**
 * Clears the session credential set and restores the bootstrap application token.
 *
 * Section 6 pairs the session store with the token manager because a caller that
 * clears only one leaves a token the next request will still send. The public
 * application token is deliberately kept: clearing it would leave credential entry
 * with no `Access-Token` at all (`APP_ACCESS_TOKEN_SPEC.md` section 2).
 */
export function clearIamHarmonyTokens(): void {
  authenticated = false;
  clearIamHarmonyMobileCoreSession();
}
