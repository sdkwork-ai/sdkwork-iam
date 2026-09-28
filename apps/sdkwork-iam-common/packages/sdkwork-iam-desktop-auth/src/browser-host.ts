import type { SdkworkDesktopAuthHostPort } from "./types.ts";

export interface CreateBrowserDesktopAuthHostOptions {
  /** Override the window opener (tests, sandboxed webviews). */
  openUrl?: (url: string) => Promise<void>;
}

/**
 * Browser fallback host (`id: "browser"`): opens the authorize URL in a new
 * tab and reports every native deep-link capability as unavailable. Used by
 * web builds and tests so the login UI can render the same entry without a
 * native shell.
 */
export function createBrowserDesktopAuthHost(
  options: CreateBrowserDesktopAuthHostOptions = {},
): SdkworkDesktopAuthHostPort {
  return {
    async getInitialUrl(): Promise<string | null> {
      return null;
    },
    id: "browser",
    onOpenUrl(): () => void {
      return () => {};
    },
    async openExternal(url: string): Promise<void> {
      if (options.openUrl) {
        await options.openUrl(url);
        return;
      }
      if (typeof window === "undefined") {
        throw new Error("Browser deep-link fallback requires a window context.");
      }
      window.open(url, "_blank", "noopener,noreferrer");
    },
  };
}
