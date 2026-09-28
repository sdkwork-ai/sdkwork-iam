import { buildSdkworkDesktopAuthorizeUrl, createSdkworkDesktopStateToken, isFlowExpired, statesMatch } from "./authorize.ts";
import { parseSdkworkDesktopAuthCallbackUri } from "./callback.ts";
import { createInMemorySdkworkDesktopAuthFlowStore } from "./flow-store.ts";
import { createSdkworkDesktopPkcePair } from "./pkce.ts";
import { normalizeSdkworkDesktopAuthSession } from "./session.ts";
import {
  DEFAULT_DESKTOP_FLOW_TTL_MS,
  type SdkworkDesktopAuthController,
  type SdkworkDesktopAuthControllerOptions,
  type SdkworkDesktopAuthSession,
} from "./types.ts";
import { SdkworkDesktopAuthError } from "./errors.ts";

/**
 * Orchestrates one desktop browser login:
 *
 * 1. `beginLogin()` — creates a PKCE S256 pair + state, stores the pending
 *    flow, asks the host port to open the system browser at the IAM
 *    authorize endpoint, and starts listening for the deep-link callback.
 * 2. The user completes login/registration/password reset on the hosted web
 *    surface; the hosted login-success page deep-links back with
 *    `code` + `state`.
 * 3. `handleOpenUrl()` (also wired automatically to host deep-link events and
 *    the cold-start initial URL) validates the callback against the pending
 *    flow and redeems the code through the generated SDK's
 *    `oauth.desktopSessions.create` for a standard dual-token session.
 *
 * The controller owns flow state only; the returned session is committed by
 * the product's auth runtime (session bridge / token manager).
 */
export function createSdkworkIamDesktopAuthController(
  options: SdkworkDesktopAuthControllerOptions,
): SdkworkDesktopAuthController {
  const flowStore = options.flowStore ?? createInMemorySdkworkDesktopAuthFlowStore();
  const now = options.now ?? Date.now;
  const flowTtlMs = options.flowTtlMs ?? DEFAULT_DESKTOP_FLOW_TTL_MS;

  let waiting = false;
  let disposed = false;
  const listeners = new Set<() => void>();
  let unsubscribeOpenUrl: (() => void) | null = null;

  const notify = (): void => {
    for (const listener of [...listeners]) {
      listener();
    }
  };

  const setWaiting = (value: boolean): void => {
    if (waiting !== value) {
      waiting = value;
      notify();
    }
  };

  const processUri = async (rawUri: string): Promise<void> => {
    try {
      await controller.handleOpenUrl(rawUri);
    } catch {
      // Callback failures surface to the UI through the rejected
      // `handleOpenUrl` promise; auto-dispatch stays silent so one bad URL
      // (for example a foreign deep link) does not crash the host.
    }
  };

  const controller: SdkworkDesktopAuthController = {
    async beginLogin() {
      if (disposed) {
        throw new SdkworkDesktopAuthError(
          "host-unavailable",
          "The desktop login controller has been disposed.",
        );
      }

      const { codeChallenge, codeVerifier } = await createSdkworkDesktopPkcePair();
      const state = createSdkworkDesktopStateToken();
      const startedAt = now();
      await flowStore.save({
        appId: options.descriptor.appId.trim(),
        codeChallenge,
        codeVerifier,
        createdAt: startedAt,
        expiresAt: startedAt + flowTtlMs,
        redirectUri: options.descriptor.redirectUri.trim(),
        state,
      });

      const authorizeUrl = buildSdkworkDesktopAuthorizeUrl(options.descriptor, {
        codeChallenge,
        state,
      });

      if (!unsubscribeOpenUrl) {
        unsubscribeOpenUrl = options.host.onOpenUrl((url) => {
          void processUri(url);
        });
      }
      setWaiting(true);

      try {
        await options.host.openExternal(authorizeUrl);
      } catch (error) {
        setWaiting(false);
        await flowStore.clear();
        throw new SdkworkDesktopAuthError(
          "browser-open-failed",
          "The system browser could not be opened for login.",
          error instanceof Error ? error.message : undefined,
        );
      }

      // Cold start: the OS may have launched the app with the callback URL
      // already in hand (browser finished before the listener attached).
      const initialUrl = await options.host.getInitialUrl().catch(() => null);
      if (initialUrl) {
        void processUri(initialUrl);
      }

      return { authorizeUrl };
    },

    cancelLogin(): Promise<void> | void {
      // Abandon the pending flow but keep the controller usable so the user
      // can start a fresh browser login — unlike dispose(), which is for
      // final teardown.
      return Promise.resolve(flowStore.clear()).then(() => {
        setWaiting(false);
      });
    },

    dispose(): void {
      disposed = true;
      if (unsubscribeOpenUrl) {
        unsubscribeOpenUrl();
        unsubscribeOpenUrl = null;
      }
      listeners.clear();
      setWaiting(false);
    },

    async handleOpenUrl(rawUri: string): Promise<SdkworkDesktopAuthSession> {
      const callback = parseSdkworkDesktopAuthCallbackUri(rawUri, {
        redirectUri: options.descriptor.redirectUri,
      });

      if (callback.kind === "error") {
        setWaiting(false);
        await flowStore.clear();
        throw new SdkworkDesktopAuthError(
          "provider-denied",
          callback.errorDescription || "The browser login ended with an error.",
          callback.error,
        );
      }

      const pending = await flowStore.load();
      if (!pending) {
        throw new SdkworkDesktopAuthError(
          "no-pending-flow",
          "No desktop browser login is in progress.",
        );
      }
      if (!statesMatch(pending.state, callback.state)) {
        // Keep the flow: a forged or stale deep link must not be able to
        // kill the user's in-progress login.
        throw new SdkworkDesktopAuthError(
          "state-mismatch",
          "Deep-link state does not match the pending browser login.",
        );
      }
      if (isFlowExpired(pending, now())) {
        setWaiting(false);
        await flowStore.clear();
        throw new SdkworkDesktopAuthError(
          "flow-expired",
          "The browser login window expired; start the login again.",
        );
      }

      let rawSession: unknown;
      try {
        rawSession = await options.exchangeDesktopSession({
          authorizationCode: callback.code,
          clientId: pending.appId,
          codeVerifier: pending.codeVerifier,
          redirectUri: pending.redirectUri,
        });
      } catch (error) {
        // The authorization code is single-use: once the server has consumed
        // it, a retry can never succeed, and a lost response is therefore
        // unrecoverable too. Reset the flow so the UI leaves the waiting
        // state and the user can start a fresh browser login.
        setWaiting(false);
        await flowStore.clear();
        throw new SdkworkDesktopAuthError(
          "exchange-failed",
          "The desktop session exchange failed. Start the browser login again.",
          error instanceof Error ? error.message : undefined,
        );
      }

      let session: SdkworkDesktopAuthSession;
      try {
        session = normalizeSdkworkDesktopAuthSession(rawSession);
      } catch (error) {
        setWaiting(false);
        await flowStore.clear();
        throw error;
      }

      setWaiting(false);
      await flowStore.clear();
      return session;
    },

    isWaiting(): boolean {
      return waiting;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return controller;
}
