import { SdkworkDesktopAuthError } from "./errors.ts";
import {
  bindSdkworkDesktopSessionExchange,
  type SdkworkDesktopAuthController,
  type SdkworkDesktopAuthHostPort,
  type SdkworkDesktopAuthSession,
  type SdkworkDesktopBrowserLoginDescriptor,
} from "./types.ts";
import { createSdkworkIamDesktopAuthController } from "./controller.ts";

const SCHEME_PATTERN = /^[a-z][a-z0-9-]*$/u;

export const DEFAULT_SDKWORK_DESKTOP_CALLBACK_PATH = "/auth/callback";

/**
 * Derives the registered deep-link redirect URI from the application key,
 * mirroring the `normalize_deep_link_scheme` rules of the
 * `sdkwork-iam-tauri-host` Rust contract: lowercase letters, digits, and
 * `-`, starting with a letter. Throws for keys that cannot form a valid
 * scheme so misconfiguration surfaces at composition time, not at login.
 */
export function deriveSdkworkDesktopRedirectUri(appId: string): string {
  const scheme = appId.trim();
  if (!scheme) {
    throw new SdkworkDesktopAuthError(
      "host-unavailable",
      "Desktop browser login requires a non-empty application id.",
    );
  }
  if (!SCHEME_PATTERN.test(scheme)) {
    throw new SdkworkDesktopAuthError(
      "host-unavailable",
      "The application id must match [a-z][a-z0-9-]* to derive its deep-link scheme; pass redirectUri explicitly otherwise.",
      scheme,
    );
  }
  return `${scheme}://${DEFAULT_SDKWORK_DESKTOP_CALLBACK_PATH.replace(/^\//u, "")}`;
}

export interface SdkworkIamDesktopAuthRuntimeOptions {
  /** Application key; doubles as the OAuth client_id and scheme source. */
  appId: string;
  /** IAM issuer base URL, e.g. `https://iam.example.com`. */
  authorizeBaseUrl: string;
  /**
   * Generated app SDK client (`@sdkwork/iam-app-sdk`); the redeem leg goes
   * through `oauth.desktopSessions.create` on this client.
   */
  appSdkClient: Parameters<typeof bindSdkworkDesktopSessionExchange>[0];
  /** Native host port (Electron/Tauri adapter or the browser fallback). */
  host: SdkworkDesktopAuthHostPort;
  /**
   * Receives the validated dual-token session. Commit it through the
   * product auth runtime session bridge / token manager; this runtime never
   * stores session state itself.
   */
  onSession: (session: SdkworkDesktopAuthSession) => void | Promise<void>;
  /** Optional callback for flow errors (surfaced to the host UI). */
  onError?: (error: SdkworkDesktopAuthError) => void;
  /** Explicit redirect URI; wins over the derived one. */
  redirectUri?: string;
  scopes?: readonly string[];
  flowTtlMs?: number;
  now?: () => number;
}

export interface SdkworkIamDesktopAuthRuntime {
  controller: SdkworkDesktopAuthController;
  descriptor: SdkworkDesktopBrowserLoginDescriptor;
  /** Opens the system browser and starts the PKCE flow. */
  beginLogin(): Promise<void>;
  /**
   * Completes a callback the OS delivered at app launch (cold start), if
   * any. Safe to call unconditionally during bootstrap.
   */
  completePendingCallbackFromLaunch(): Promise<boolean>;
  /** Abandons a waiting flow without destroying the runtime. */
  cancelLogin(): Promise<void>;
  dispose(): void;
}

/**
 * Standard one-call integration point for any SDKWork desktop application
 * (Electron, Tauri, Capacitor desktop): binds the generated app SDK's
 * `oauth.desktopSessions.create`, wires deep-link dispatch, and routes the
 * resulting session to the product's session bridge. Applications supply
 * identity, the SDK client, the host port, and a session committer —
 * nothing else.
 */
export function createSdkworkIamDesktopAuthRuntime(
  options: SdkworkIamDesktopAuthRuntimeOptions,
): SdkworkIamDesktopAuthRuntime {
  const appId = options.appId.trim();
  const redirectUri = options.redirectUri?.trim() || deriveSdkworkDesktopRedirectUri(appId);
  const descriptor: SdkworkDesktopBrowserLoginDescriptor = {
    appId,
    authorizeBaseUrl: options.authorizeBaseUrl,
    redirectUri,
    ...(options.scopes ? { scopes: options.scopes } : {}),
  };

  const controller = createSdkworkIamDesktopAuthController({
    descriptor,
    exchangeDesktopSession: bindSdkworkDesktopSessionExchange(options.appSdkClient),
    host: options.host,
    ...(options.flowTtlMs !== undefined ? { flowTtlMs: options.flowTtlMs } : {}),
    ...(options.now ? { now: options.now } : {}),
  });

  const deliver = async (session: SdkworkDesktopAuthSession): Promise<void> => {
    await options.onSession(session);
  };

  // Persistent dispatch for callbacks that arrive outside an explicit
  // beginLogin window (cold start, browser finishing early). Callbacks
  // without a pending flow are ignored.
  const unsubscribeHost = options.host.onOpenUrl((url) => {
    void controller.handleOpenUrl(url).then(deliver).catch((error: unknown) => {
      if (options.onError) {
        options.onError(
          error instanceof SdkworkDesktopAuthError
            ? error
            : new SdkworkDesktopAuthError(
                "invalid-callback",
                error instanceof Error ? error.message : "Deep-link callback failed.",
              ),
        );
      }
    });
  });

  let disposed = false;

  return {
    beginLogin: async () => {
      if (disposed) {
        throw new SdkworkDesktopAuthError(
          "host-unavailable",
          "The desktop auth runtime has been disposed.",
        );
      }
      await controller.beginLogin();
    },
    cancelLogin: async () => {
      await controller.cancelLogin();
    },
    completePendingCallbackFromLaunch: async (): Promise<boolean> => {
      if (disposed) {
        return false;
      }
      const initialUrl = await options.host.getInitialUrl().catch(() => null);
      if (!initialUrl) {
        return false;
      }
      const session = await controller.handleOpenUrl(initialUrl);
      await deliver(session);
      return true;
    },
    controller,
    descriptor,
    dispose: (): void => {
      disposed = true;
      unsubscribeHost();
      controller.dispose();
    },
  };
}
