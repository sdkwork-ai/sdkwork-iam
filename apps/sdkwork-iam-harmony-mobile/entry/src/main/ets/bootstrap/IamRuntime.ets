// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * IAM runtime wiring for the SDKWork IAM HarmonyOS root.
 *
 * Authority: `APP_SDK_INTEGRATION_SPEC.md`, `IAM_LOGIN_INTEGRATION_SPEC.md`,
 * `ENVIRONMENT_SPEC.md` section 6.1 and
 * `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 6. Logout and refresh failure
 * must clear the token manager, the session/context store, secure platform storage and
 * the SDK clients together; clearing any one of them alone leaves a credential the
 * next request still sends.
 *
 * The teardown restores the public application access token (`SDKWORK_ACCESS_TOKEN`)
 * instead of leaving credential entry with nothing: after logout the app is still
 * below login and still needs `Access-Token` for tenant, application and environment
 * isolation. The bootstrap token lives in the token manager outside the session
 * record, so clearing the session cannot remove it (`TokenManager.ets`).
 *
 * The exchange of an authorization code for a session is `sdkwork-iam-app-sdk`'s
 * job and needs an ArkTS target that does not exist yet (see `sdks/README.md`).
 * What this module owns is the commit and the teardown around it, so the session
 * route never has to know which stores have to be cleared together.
 */
import {
  clearIamHarmonyMobileCoreSession,
  clearIamHarmonyTokens,
  commitIamHarmonyMobileCoreSession,
  currentIamHarmonyTokenSet,
  isIamHarmonyMobileCoreSessionComplete,
  markIamHarmonyAuthenticated,
  readIamHarmonyMobileCoreSession,
  type IamHarmonyMobileCoreSession,
} from '@sdkwork/sdkwork-iam-harmony-mobile-core';

import { getIamHarmonyHostAdapters } from './HostAdapters';
import { getIamHarmonySdkClients } from './SdkClients';

export interface IamHarmonyIamRuntime {
  isAuthenticated(): boolean;
  /** Signed-in account id, for anything that has to render who is acting. */
  currentUserId(): string | undefined;
  /**
   * Whether an `Access-Token` is configured for outbound requests — the bootstrap
   * application token before login, the session token after it.
   */
  hasAccessToken(): boolean;
  commitSession(session: IamHarmonyMobileCoreSession): IamHarmonyMobileCoreSession;
  /** Clears every credential store and restores the bootstrap application token. */
  clearOnLogout(): Promise<void>;
  /** Same teardown for a failed refresh (section 6). */
  clearOnRefreshFailure(): Promise<void>;
}

/**
 * Reads whether a usable session is present.
 *
 * Consults the session store rather than a flag: a session can be restored from
 * secure storage before any exchange ran in this process, and reporting
 * "unauthenticated" then would bounce a signed-in user back to the login route on
 * every cold launch.
 */
function hasUsableSession(): boolean {
  return isIamHarmonyMobileCoreSessionComplete(readIamHarmonyMobileCoreSession());
}

/**
 * Clears the session, the context store and the persisted credential.
 *
 * The public application token is deliberately not cleared with the session:
 * `clearIamHarmonyTokens` drops the session record only, so the manager still holds
 * the seeded application token. Rebuilding the clients in `finally` then configures
 * every tier with that token again, which is what keeps credential entry usable.
 *
 * Async because the secure-storage adapter is async (section 7). The rebuild runs in
 * `finally` so a storage failure cannot leave the clients holding the old session
 * credential.
 */
async function clearSessionAndRestoreBootstrapToken(): Promise<void> {
  clearIamHarmonyTokens();
  clearIamHarmonyMobileCoreSession();
  markIamHarmonyAuthenticated(false);
  try {
    await getIamHarmonyHostAdapters().secureStorage.clear();
  } finally {
    getIamHarmonySdkClients().reinitialize();
  }
}

export function createIamHarmonyIamRuntime(): IamHarmonyIamRuntime {
  return {
    isAuthenticated(): boolean {
      return hasUsableSession();
    },

    currentUserId(): string | undefined {
      const session: IamHarmonyMobileCoreSession | undefined = readIamHarmonyMobileCoreSession();
      return session === undefined ? undefined : session.userId;
    },

    hasAccessToken(): boolean {
      return currentIamHarmonyTokenSet().accessToken !== undefined;
    },

    /**
     * Commits an exchanged session and rebuilds the SDK clients in one tick.
     *
     * Rebuilding here is what makes the post-login redirect unable to observe an
     * authenticated session store next to an unauthenticated SDK client. It also
     * propagates the session to the console and admin clients, which read the same
     * manager through their own cores.
     */
    commitSession(session: IamHarmonyMobileCoreSession): IamHarmonyMobileCoreSession {
      const committed: IamHarmonyMobileCoreSession = commitIamHarmonyMobileCoreSession(session);
      markIamHarmonyAuthenticated(true);
      getIamHarmonySdkClients().reinitialize();
      return committed;
    },

    clearOnLogout(): Promise<void> {
      return clearSessionAndRestoreBootstrapToken();
    },

    clearOnRefreshFailure(): Promise<void> {
      return clearSessionAndRestoreBootstrapToken();
    },
  };
}

let iamRuntime: IamHarmonyIamRuntime | null = null;

export function getIamHarmonyIamRuntime(): IamHarmonyIamRuntime {
  const existing: IamHarmonyIamRuntime | null = iamRuntime;
  if (existing === null) {
    iamRuntime = createIamHarmonyIamRuntime();
  }
  return iamRuntime;
}

export function resetIamHarmonyIamRuntime(): void {
  iamRuntime = null;
}
