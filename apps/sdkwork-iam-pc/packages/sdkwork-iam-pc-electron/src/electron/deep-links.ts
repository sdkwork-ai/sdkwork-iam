import { SDKWORK_DESKTOP_BRIDGE, type SdkworkDesktopBridgeShape } from "@sdkwork/iam-desktop-auth";

/**
 * Structural subset of the Electron APIs the bridge needs. Declared here so
 * this package typechecks without a hard `electron` dependency — consumers
 * pass the real `app`, `shell`, `ipcMain`, and `BrowserWindow` objects from
 * their main process (they stay inside the Electron host package per
 * `DESKTOP_APP_ARCHITECTURE_SPEC.md` section 4).
 */
export interface SdkworkElectronLikeApp {
  readonly isPackaged: boolean;
  setAsDefaultProtocolClient(scheme: string, options?: unknown): boolean;
  removeAsDefaultProtocolClient(scheme: string, options?: unknown): boolean;
  on(event: "open-url", listener: (info: { url: string }) => void): unknown;
  on(event: "second-instance", listener: (info: { argv: string[] }) => void): unknown;
  off(event: "open-url", listener: (info: { url: string }) => void): unknown;
  off(event: "second-instance", listener: (info: { argv: string[] }) => void): unknown;
}

export interface SdkworkElectronLikeShell {
  openExternal(url: string, options?: unknown): Promise<void>;
}

export interface SdkworkElectronLikeIpcMain {
  handle(channel: string, handler: (...args: unknown[]) => unknown): void;
  removeHandler(channel: string): void;
}

export interface SdkworkElectronLikeWebContents {
  send(channel: string, payload?: unknown): void;
}

export interface CreateSdkworkElectronDeepLinkBridgeOptions {
  app: SdkworkElectronLikeApp;
  shell: SdkworkElectronLikeShell;
  ipcMain: SdkworkElectronLikeIpcMain;
  /** Deep-link scheme, e.g. `sdkwork-iam` (registered with the OS). */
  scheme: string;
  /**
   * URL schemes the renderer may hand to `shell.openExternal` through the
   * bridge. Defaults to `https` plus this bridge's own deep-link scheme;
   * arbitrary protocols (file:, smb:, custom handlers) are rejected before
   * they reach the OS.
   */
  allowedOpenSchemes?: readonly string[];
  /**
   * Resolves the window that should receive deep-link events (may be null
   * while the window is still starting).
   */
  getWindow: () => { webContents: SdkworkElectronLikeWebContents } | null;
}

export interface SdkworkElectronDeepLinkBridge {
  /** URL the OS handed the app at launch, if any. */
  getInitialUrl(): string | null;
  dispose(): void;
}

function extractUrlFromArgv(argv: readonly string[], scheme: string): string | null {
  // Windows/Linux deliver the deep link as the last process argument.
  for (let index = argv.length - 1; index >= 0; index -= 1) {
    const argument = argv[index];
    if (argument && argument.toLowerCase().startsWith(`${scheme.toLowerCase()}:`)) {
      return argument;
    }
  }
  return null;
}

/**
 * Wires the Electron main process to the SDKWork desktop bridge protocol:
 * OS protocol registration, `open-url` / `second-instance` deep-link
 * collection, and the `sdkwork:deepLinks:*` / `sdkwork:shellOpen:*` IPC
 * allowlist. The renderer reaches it through the preload bridge only.
 */
export function createSdkworkElectronDeepLinkBridge(
  options: CreateSdkworkElectronDeepLinkBridgeOptions,
): SdkworkElectronDeepLinkBridge {
  const { app, shell, ipcMain, scheme } = options;
  let initialUrl: string | null = null;
  let disposed = false;

  app.setAsDefaultProtocolClient(scheme);

  const handleOpenUrl = (info: { url: string }): void => {
    initialUrl = info.url;
    const currentWindow = options.getWindow();
    if (currentWindow && !disposed) {
      currentWindow.webContents.send(SDKWORK_DESKTOP_BRIDGE.deepLinksOpenEvent, info.url);
    }
  };

  const handleSecondInstance = (info: { argv: string[] }): void => {
    const url = extractUrlFromArgv(info.argv, scheme);
    if (url) {
      handleOpenUrl({ url });
    }
  };

  app.on("open-url", handleOpenUrl);
  app.on("second-instance", handleSecondInstance);

  const allowedSchemes = new Set(
    (options.allowedOpenSchemes ?? ["https", scheme.toLowerCase()]).map((value) =>
      value.trim().toLowerCase().replace(/:$/u, ""),
    ),
  );

  ipcMain.handle(SDKWORK_DESKTOP_BRIDGE.deepLinksGetInitialUrl, () => initialUrl);
  ipcMain.handle(
    SDKWORK_DESKTOP_BRIDGE.shellOpen,
    (_event: unknown, url: unknown) => {
      if (typeof url !== "string" || !url.trim()) {
        throw new Error("shellOpen requires a URL string");
      }
      const parsed = new URL(url);
      const requestScheme = parsed.protocol.replace(/:$/u, "").toLowerCase();
      if (!allowedSchemes.has(requestScheme)) {
        throw new Error(`shellOpen refused scheme ${requestScheme}`);
      }
      return shell.openExternal(url);
    },
  );

  return {
    getInitialUrl(): string | null {
      return initialUrl;
    },
    dispose(): void {
      disposed = true;
      app.off("open-url", handleOpenUrl);
      app.off("second-instance", handleSecondInstance);
      ipcMain.removeHandler(SDKWORK_DESKTOP_BRIDGE.deepLinksGetInitialUrl);
      ipcMain.removeHandler(SDKWORK_DESKTOP_BRIDGE.shellOpen);
      app.removeAsDefaultProtocolClient(scheme);
    },
  };
}

/**
 * Preload-side factory. Receives Electron's `contextBridge` and `ipcRenderer`
 * and exposes exactly the allowlisted bridge — no generic pass-through.
 */
export interface SdkworkElectronLikeContextBridge {
  exposeInMainWorld(key: string, value: unknown): void;
}

export interface SdkworkElectronLikeIpcRenderer {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(channel: string, listener: (...args: unknown[]) => void): unknown;
  removeListener(channel: string, listener: (...args: unknown[]) => void): unknown;
}

export const SDKWORK_DESKTOP_PRELOAD_KEY = "sdkworkDesktop";

export function exposeSdkworkDesktopPreloadBridge(deps: {
  contextBridge: SdkworkElectronLikeContextBridge;
  ipcRenderer: SdkworkElectronLikeIpcRenderer;
}): void {
  const deepLinkListeners = new Set<(url: string) => void>();
  const forwardOpenEvent = (_event: unknown, payload: unknown): void => {
    if (typeof payload === "string") {
      for (const listener of [...deepLinkListeners]) {
        listener(payload);
      }
    }
  };
  deps.ipcRenderer.on(SDKWORK_DESKTOP_BRIDGE.deepLinksOpenEvent, forwardOpenEvent);

  const bridge: SdkworkDesktopBridgeShape = {
    deepLinks: {
      async getInitialUrl() {
        const value = await deps.ipcRenderer.invoke(SDKWORK_DESKTOP_BRIDGE.deepLinksGetInitialUrl);
        return typeof value === "string" ? value : null;
      },
      onOpenUrl(handler) {
        deepLinkListeners.add(handler);
        return () => {
          deepLinkListeners.delete(handler);
        };
      },
    },
    shellOpen: {
      async open(url: string) {
        await deps.ipcRenderer.invoke(SDKWORK_DESKTOP_BRIDGE.shellOpen, url);
      },
    },
  };
  deps.contextBridge.exposeInMainWorld(SDKWORK_DESKTOP_PRELOAD_KEY, bridge);
}
