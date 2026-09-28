import type {
  SdkworkDesktopAuthFlowStore,
  SdkworkDesktopPendingFlow,
} from "./types.ts";

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
