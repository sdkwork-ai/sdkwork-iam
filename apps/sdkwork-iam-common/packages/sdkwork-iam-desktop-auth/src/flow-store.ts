import type {
  SdkworkDesktopAuthFlowStore,
  SdkworkDesktopPendingFlow,
} from "./types.ts";

/** Durable browser key for the in-flight desktop browser login. */
export const SDKWORK_DESKTOP_AUTH_FLOW_STORAGE_KEY = "sdkwork.iam.desktopAuthFlow.v1";

/** Minimal Web Storage surface, so hosts and tests can inject their own. */
export interface SdkworkDesktopAuthFlowStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

/**
 * In-memory pending-flow store. Desktop hosts that want the flow to survive a
 * renderer reload wrap their secure-storage adapter in the same interface —
 * the flow only ever contains the PKCE verifier and state, never tokens.
 */
export function createInMemorySdkworkDesktopAuthFlowStore(): SdkworkDesktopAuthFlowStore {
  let flow: SdkworkDesktopPendingFlow | null = null;
  return {
    clear(): void {
      flow = null;
    },
    load(): SdkworkDesktopPendingFlow | null {
      return flow;
    },
    save(pending: SdkworkDesktopPendingFlow): void {
      flow = pending;
    },
  };
}

function readDefaultStorage(): SdkworkDesktopAuthFlowStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidPendingFlow(value: unknown): value is SdkworkDesktopPendingFlow {
  if (!isRecord(value)) {
    return false;
  }
  for (const field of ["appId", "codeChallenge", "codeVerifier", "redirectUri", "state"] as const) {
    const fieldValue = value[field];
    if (typeof fieldValue !== "string" || fieldValue.trim() === "") {
      return false;
    }
  }
  return Number.isFinite(value.createdAt) && Number.isFinite(value.expiresAt);
}

/**
 * Pending-flow store backed by Web Storage (the desktop renderer's
 * `localStorage`).
 *
 * A desktop browser login may outlive the process that started it: the user
 * closes the app while the system browser is still on the hosted login page,
 * then the deep link launches a fresh process. The PKCE verifier and state are
 * the only secrets needed to redeem the returned code, so they persist across
 * restarts instead of living in one renderer's memory. Tokens are never
 * stored here; the store is cleared as soon as the flow is redeemed, expired,
 * cancelled, or rejected.
 * @param storage - storage surface; defaults to `globalThis.localStorage`, and
 *   falls back to memory when storage is unavailable (SSR, private mode tests).
 * @param now - clock used to drop expired flows on read.
 * @returns the flow store consumed by the desktop auth controller.
 */
export function createBrowserSdkworkDesktopAuthFlowStore(
  storage: SdkworkDesktopAuthFlowStorage | null = readDefaultStorage(),
  now: () => number = Date.now,
): SdkworkDesktopAuthFlowStore {
  if (storage === null) {
    return createInMemorySdkworkDesktopAuthFlowStore();
  }

  const clear = (): void => {
    try {
      storage.removeItem(SDKWORK_DESKTOP_AUTH_FLOW_STORAGE_KEY);
    } catch {
      // Storage may be denied (private mode); the login simply cannot resume.
    }
  };

  return {
    clear,
    load(): SdkworkDesktopPendingFlow | null {
      let parsed: unknown;
      try {
        const raw = storage.getItem(SDKWORK_DESKTOP_AUTH_FLOW_STORAGE_KEY);
        if (raw === null || raw.trim() === "") {
          return null;
        }
        parsed = JSON.parse(raw);
      } catch {
        clear();
        return null;
      }
      if (!isValidPendingFlow(parsed)) {
        clear();
        return null;
      }
      if (parsed.expiresAt <= now()) {
        clear();
        return null;
      }
      return parsed;
    },
    save(pending: SdkworkDesktopPendingFlow): void {
      try {
        storage.setItem(SDKWORK_DESKTOP_AUTH_FLOW_STORAGE_KEY, JSON.stringify(pending));
      } catch {
        // Storage may be denied (quota, private mode); the in-process flow is
        // still complete for this run, so the login is not blocked here.
      }
    },
  };
}
