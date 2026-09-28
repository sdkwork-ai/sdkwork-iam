import type { IamAppSdkClient } from "@sdkwork/iam-sdk-ports";

/** Host identities a desktop browser-login port can represent. */
export type SdkworkDesktopAuthHostId =
  | "browser"
  | "capacitor"
  | "custom"
  | "electron"
  | "tauri";

/**
 * The narrow native surface the browser-login flow needs. Host packages
 * (Electron main via preload bridge, Tauri deep-link/opener plugins)
 * implement this port; this package never imports a host SDK.
 */
export interface SdkworkDesktopAuthHostPort {
  readonly id: SdkworkDesktopAuthHostId;
  /** Opens the system browser at the authorize URL. */
  openExternal(url: string): Promise<void>;
  /** Deep-link URL the app was launched with (cold start), if any. */
  getInitialUrl(): Promise<string | null>;
  /** Subscribes to deep-link events while running; returns an unsubscribe. */
  onOpenUrl(handler: (url: string) => void): () => void;
}

/**
 * Identifies the desktop browser-login flow to the IAM surface. `appId` is
 * the tenant application key (the OAuth `client_id`); `redirectUri` must be
 * registered on that application's OAuth relying-party config.
 */
export interface SdkworkDesktopBrowserLoginDescriptor {
  appId: string;
  redirectUri: string;
  /** IAM issuer base, e.g. `https://iam.example.com`. */
  authorizeBaseUrl?: string;
  /** Full authorize endpoint override; wins over `authorizeBaseUrl`. */
  authorizeUrl?: string;
  scopes?: readonly string[];
}

/** One in-flight browser login: PKCE pair plus binding state. */
export interface SdkworkDesktopPendingFlow {
  appId: string;
  codeChallenge: string;
  codeVerifier: string;
  createdAt: number;
  expiresAt: number;
  redirectUri: string;
  state: string;
}

/** Pluggable pending-flow persistence; hosts may back it with secure storage. */
export interface SdkworkDesktopAuthFlowStore {
  clear(): Promise<void> | void;
  load(): Promise<SdkworkDesktopPendingFlow | null> | SdkworkDesktopPendingFlow | null;
  save(flow: SdkworkDesktopPendingFlow): Promise<void> | void;
}

/** Standard dual-token IAM session returned by the redeem leg. */
export interface SdkworkDesktopAuthSession {
  accessToken: string;
  authToken: string;
  context?: Record<string, unknown> | null;
  refreshToken?: string;
  sessionId?: string;
  user?: Record<string, unknown> | null;
}

/** Result of parsing an incoming deep-link callback. */
export type SdkworkDesktopAuthCallback =
  | {
      callbackUri: string;
      code: string;
      kind: "success";
      state: string;
    }
  | {
      callbackUri: string;
      error: string;
      errorDescription?: string;
      kind: "error";
      state?: string;
    };

/** Command body for `oauth.desktopSessions.create`. */
export type SdkworkDesktopSessionExchangeCommand = Record<string, unknown>;

/**
 * Exchange port bound to the generated `@sdkwork/iam-app-sdk`
 * `oauth.desktopSessions.create` resource at composition time.
 */
export type SdkworkDesktopSessionExchangePort = (
  command: SdkworkDesktopSessionExchangeCommand,
) => Promise<unknown>;

export interface SdkworkDesktopAuthControllerOptions {
  descriptor: SdkworkDesktopBrowserLoginDescriptor;
  exchangeDesktopSession: SdkworkDesktopSessionExchangePort;
  flowStore?: SdkworkDesktopAuthFlowStore;
  flowTtlMs?: number;
  host: SdkworkDesktopAuthHostPort;
  now?: () => number;
}

export interface SdkworkDesktopAuthController {
  beginLogin(): Promise<{ authorizeUrl: string }>;
  /** Abandons the pending flow but keeps the controller usable. */
  cancelLogin(): Promise<void> | void;
  dispose(): void;
  handleOpenUrl(rawUri: string): Promise<SdkworkDesktopAuthSession>;
  isWaiting(): boolean;
  subscribe(listener: () => void): () => void;
}

export const DEFAULT_DESKTOP_LOGIN_SCOPES: readonly string[] = [
  "openid",
  "profile",
  "offline_access",
];

export const DEFAULT_DESKTOP_FLOW_TTL_MS = 10 * 60 * 1000;

/**
 * Bridge protocol method and event names (`DESKTOP_APP_ARCHITECTURE_SPEC.md`
 * section 5.6). Electron preload allowlists and Tauri command wiring share
 * these exact names so renderer feature code is host-agnostic.
 */
export const SDKWORK_DESKTOP_BRIDGE = {
  deepLinksGetInitialUrl: "sdkwork:deepLinks:getInitialUrl",
  deepLinksOpenEvent: "sdkwork:deepLinks:open",
  shellOpen: "sdkwork:shellOpen:open",
} as const;

/** Renderer-visible shape of the preload bridge for Electron hosts. */
export interface SdkworkDesktopBridgeShape {
  deepLinks: {
    getInitialUrl(): Promise<string | null>;
    onOpenUrl(handler: (url: string) => void): () => void;
  };
  shellOpen: {
    open(url: string): Promise<void>;
  };
}

/**
 * Binds a generated app SDK client to the desktop session-exchange port.
 * The call goes through `oauth.desktopSessions.create` — never raw HTTP.
 */
export function bindSdkworkDesktopSessionExchange(
  client: IamAppSdkClient,
): SdkworkDesktopSessionExchangePort {
  const create = client.oauth?.desktopSessions?.create;
  if (typeof create !== "function") {
    throw new Error(
      "The generated app SDK client does not expose oauth.desktopSessions.create; regenerate the SDK from the app-api authority.",
    );
  }
  return (command) => Promise.resolve(create(command));
}
