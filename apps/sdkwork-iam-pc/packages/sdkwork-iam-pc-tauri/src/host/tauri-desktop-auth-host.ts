import type { SdkworkDesktopAuthHostPort } from "@sdkwork/iam-desktop-auth";

/**
 * Structural shapes of the Tauri plugin APIs this adapter consumes. Declared
 * locally so the package typechecks without pinning `@tauri-apps/*` runtime
 * packages — the desktop app's bootstrap passes the real plugin handles in
 * (`@tauri-apps/plugin-deep-link` and `@tauri-apps/plugin-opener`), keeping
 * feature code free of host globals (`DESKTOP_APP_ARCHITECTURE_SPEC.md`
 * section 5.5).
 */
export interface SdkworkTauriDeepLinkLike {
  /** Current deep-link URL if the app was launched through one. */
  getCurrent(): Promise<string | null | undefined>;
  /**
   * Subscribes to deep-link events; the unsubscribe may be sync or async
   * depending on the plugin version.
   */
  onOpenUrl(
    handler: (urls: string | string[] | null) => void,
  ): Promise<() => void> | (() => void);
}

export interface SdkworkTauriOpenerLike {
  openUrl(url: string): Promise<void>;
}

export interface CreateTauriDesktopAuthHostOptions {
  deepLink: SdkworkTauriDeepLinkLike;
  opener: SdkworkTauriOpenerLike;
}

/**
 * Renderer-side host port for Tauri. Maps the deep-link and opener plugins
 * onto the `@sdkwork/iam-desktop-auth` host port so the browser-login flow is
 * identical across Tauri, Electron, and the browser fallback.
 */
export function createTauriDesktopAuthHost(
  options: CreateTauriDesktopAuthHostOptions,
): SdkworkDesktopAuthHostPort {
  const { deepLink, opener } = options;
  return {
    async getInitialUrl() {
      const current = await deepLink.getCurrent().catch(() => null);
      if (typeof current === "string" && current.trim()) {
        return current;
      }
      return null;
    },
    id: "tauri",
    onOpenUrl(handler: (url: string) => void) {
      const unsubscribe = deepLink.onOpenUrl((urls) => {
        const payload = Array.isArray(urls) ? urls[urls.length - 1] : urls;
        if (typeof payload === "string" && payload.trim()) {
          handler(payload);
        }
      });
      return () => {
        void Promise.resolve(unsubscribe).then((dispose) => dispose?.());
      };
    },
    async openExternal(url: string) {
      await opener.openUrl(url);
    },
  };
}
