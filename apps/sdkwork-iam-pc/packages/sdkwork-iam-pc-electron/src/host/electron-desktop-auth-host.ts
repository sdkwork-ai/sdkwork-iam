import type {
  SdkworkDesktopAuthHostPort,
  SdkworkDesktopBridgeShape,
} from "@sdkwork/iam-desktop-auth";

export interface CreateElectronDesktopAuthHostOptions {
  /**
   * The preload bridge exposed on `window.sdkworkDesktop`
   * (`exposeSdkworkDesktopPreloadBridge`). Passed in explicitly so renderer
   * code never reaches for host globals.
   */
  bridge: SdkworkDesktopBridgeShape;
}

/**
 * Renderer-side host port for Electron. Implements the
 * `@sdkwork/iam-desktop-auth` host port over the preload bridge; system
 * browser opening goes through the main-process `shellOpen` channel so the
 * renderer never touches OS APIs.
 */
export function createElectronDesktopAuthHost(
  options: CreateElectronDesktopAuthHostOptions,
): SdkworkDesktopAuthHostPort {
  const { bridge } = options;
  return {
    async getInitialUrl() {
      return bridge.deepLinks.getInitialUrl();
    },
    id: "electron",
    onOpenUrl(handler: (url: string) => void) {
      return bridge.deepLinks.onOpenUrl(handler);
    },
    async openExternal(url: string) {
      await bridge.shellOpen.open(url);
    },
  };
}
