// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * IAM runtime wiring for the SDKWork IAM HarmonyOS root.
 *
 * Authority: `APP_SDK_INTEGRATION_SPEC.md`, `IAM_LOGIN_INTEGRATION_SPEC.md` and
 * `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 6. Logout and refresh failure
 * must clear the token manager, the session store and the SDK clients together;
 * clearing any one of them alone leaves a credential the next request still sends.
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
  isIamHarmonyMobileCoreSessionComplete,
  markIamHarmonyAuthenticated,
  readIamHarmonyMobileCoreSession,
  type IamHarmonyMobileCoreSession,
} from '@sdkwork/sdkwork-iam-harmony-mobile-core';

import { getIamHarmonySdkClients } from './SdkClients';

export interface IamHarmonyIamRuntime {
  isAuthenticated(): boolean;
  /** Signed-in account id, for anything that has to render who is acting. */
  currentUserId(): string | undefined;
  commitSession(session: IamHarmonyMobileCoreSession): IamHarmonyMobileCoreSession;
  clearOnLogout(): void;
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

export function createIamHarmonyIamRuntime(): IamHarmonyIamRuntime {
  return {
    isAuthenticated(): boolean {
      return hasUsableSession();
    },

    currentUserId(): string | undefined {
      const session: IamHarmonyMobileCoreSession | undefined = readIamHarmonyMobileCoreSession();
      return session === undefined ? undefined : session.userId;
    },

    /**
     * Commits an exchanged session and rebuilds the SDK clients in one tick.
     *
     * Rebuilding here is what makes the post-login redirect unable to observe an
     * authenticated session store next to an unauthenticated SDK client.
     */
    commitSession(session: IamHarmonyMobileCoreSession): IamHarmonyMobileCoreSession {
      const committed: IamHarmonyMobileCoreSession = commitIamHarmonyMobileCoreSession(session);
      markIamHarmonyAuthenticated(true);
      getIamHarmonySdkClients().reinitialize();
      return committed;
    },

    clearOnLogout(): void {
      clearIamHarmonyTokens();
      clearIamHarmonyMobileCoreSession();
      markIamHarmonyAuthenticated(false);
      getIamHarmonySdkClients().reset();
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
