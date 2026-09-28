import type { SdkworkDesktopAuthController } from "@sdkwork/iam-desktop-auth";

/**
 * The browser-login entry the auth page renders when a desktop host is
 * present. Product composition builds it from an
 * `@sdkwork/iam-desktop-auth` controller; the page never touches host
 * globals or PKCE internals.
 */
export interface SdkworkAuthDesktopBrowserLoginBinding {
  /** Begins the browser login (PKCE + system browser). */
  begin: () => Promise<void>;
  /** Cancels the pending browser login, if supported. */
  cancel?: () => void;
  /** True while the browser login is waiting for the deep-link callback. */
  isWaiting?: () => boolean;
  /** Subscribes to waiting-state changes; returns an unsubscribe function. */
  subscribe?: (listener: () => void) => () => void;
}

export interface CreateSdkworkAuthDesktopBrowserLoginBindingOptions {
  controller: SdkworkDesktopAuthController;
}

/**
 * Adapts an `@sdkwork/iam-desktop-auth` controller into the auth-page
 * binding. Session delivery is owned by the controller's `onSession` hook
 * (wired to the product session bridge at composition time); this binding
 * only drives the entry button and the waiting state.
 */
export function createSdkworkAuthDesktopBrowserLoginBinding({
  controller,
}: CreateSdkworkAuthDesktopBrowserLoginBindingOptions): SdkworkAuthDesktopBrowserLoginBinding {
  const listeners = new Set<() => void>();
  const forward = (): void => {
    for (const listener of [...listeners]) {
      listener();
    }
  };
  const unsubscribeController = controller.subscribe(forward);
  let disposed = false;

  return {
    begin: async () => {
      await controller.beginLogin();
    },
    cancel: () => {
      controller.dispose();
    },
    isWaiting: () => controller.isWaiting(),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
