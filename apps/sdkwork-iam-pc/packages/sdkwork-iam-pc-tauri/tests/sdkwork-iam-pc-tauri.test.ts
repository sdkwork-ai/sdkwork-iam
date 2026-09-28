import { describe, expect, it, vi } from "vitest";
import { createTauriDesktopAuthHost } from "../src/index.ts";

describe("tauri desktop auth host", () => {
  function createHarness() {
    const openUrlHandlers = new Set<(urls: string | string[] | null) => void>();
    const deepLink = {
      getCurrent: vi.fn<() => Promise<string | null | undefined>>(async () => null),
      onOpenUrl: vi.fn((handler: (urls: string | string[] | null) => void) => {
        openUrlHandlers.add(handler);
        return () => {
          openUrlHandlers.delete(handler);
        };
      }),
    };
    const opener = {
      openUrl: vi.fn(async () => {}),
    };
    const host = createTauriDesktopAuthHost({ deepLink, opener });
    return { deepLink, host, opener };
  }

  it("exposes the tauri identity and forwards opener calls", async () => {
    const { host, opener } = createHarness();
    expect(host.id).toBe("tauri");
    await host.openExternal("https://iam.example.com/iam/v3/oauth/authorize");
    expect(opener.openUrl).toHaveBeenCalledWith(
      "https://iam.example.com/iam/v3/oauth/authorize",
    );
  });

  it("maps getCurrent to the cold-start initial URL", async () => {
    const { deepLink, host } = createHarness();
    deepLink.getCurrent.mockResolvedValue("sdkwork-iam://auth/callback?code=cold");
    await expect(host.getInitialUrl()).resolves.toBe(
      "sdkwork-iam://auth/callback?code=cold",
    );
    deepLink.getCurrent.mockResolvedValue(undefined);
    await expect(host.getInitialUrl()).resolves.toBeNull();
  });

  it("delivers the latest deep-link payload to subscribers and unsubscribes", () => {
    const { deepLink, host } = createHarness();
    const received: string[] = [];
    const unsubscribe = host.onOpenUrl((url) => {
      received.push(url);
    });
    for (const handler of deepLink.onOpenUrl.mock.calls.map((call) => call[0])) {
      handler("sdkwork-iam://auth/callback?code=one");
      handler(["ignored", "sdkwork-iam://auth/callback?code=two"]);
      handler(null);
    }
    expect(received).toEqual([
      "sdkwork-iam://auth/callback?code=one",
      "sdkwork-iam://auth/callback?code=two",
    ]);
    unsubscribe();
    expect(deepLink.onOpenUrl.mock.results.length).toBeGreaterThan(0);
  });

  it("survives a rejecting getCurrent", async () => {
    const { deepLink, host } = createHarness();
    deepLink.getCurrent.mockRejectedValue(new Error("window not ready"));
    await expect(host.getInitialUrl()).resolves.toBeNull();
  });
});
