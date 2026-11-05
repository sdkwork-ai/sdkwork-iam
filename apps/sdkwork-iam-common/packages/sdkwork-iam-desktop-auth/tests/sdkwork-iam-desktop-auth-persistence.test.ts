import { webcrypto } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  createBrowserSdkworkDesktopAuthFlowStore,
  createInMemorySdkworkDesktopAuthFlowStore,
  createSdkworkIamDesktopAuthRuntime,
  SDKWORK_DESKTOP_AUTH_FLOW_STORAGE_KEY,
  type SdkworkDesktopAuthHostPort,
  type SdkworkDesktopAuthFlowStorage,
} from "../src/index.ts";

const REDIRECT_URI = "sdkwork-iam://auth/callback";
const RUNTIME_SESSION = { accessToken: "access", authToken: "auth", refreshToken: "refresh" };

// jsdom's Crypto lacks subtle.digest; restore Node's WebCrypto for PKCE.
const cryptoGlobal = globalThis.crypto as Crypto & { subtle?: SubtleCrypto };
if (!cryptoGlobal?.subtle) {
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
}

function createStorage(): SdkworkDesktopAuthFlowStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

function createHost(initialUrl: string | null = null) {
  const state = { initialUrl, opened: [] as string[] };
  const host: SdkworkDesktopAuthHostPort = {
    id: "electron",
    async getInitialUrl() {
      const value = state.initialUrl;
      state.initialUrl = null;
      return value;
    },
    onOpenUrl() {
      return () => {};
    },
    async openExternal(url) {
      state.opened.push(url);
    },
  };
  return { host, state };
}

function createRuntime(host: SdkworkDesktopAuthHostPort, flowStore: ReturnType<typeof createBrowserSdkworkDesktopAuthFlowStore>) {
  const createSession = vi.fn(async () => RUNTIME_SESSION);
  const onSession = vi.fn(async (_session: unknown) => {});
  const runtime = createSdkworkIamDesktopAuthRuntime({
    appId: "sdkwork-iam",
    appSdkClient: { oauth: { desktopSessions: { create: createSession } } } as never,
    authorizeBaseUrl: "https://iam.example.com",
    flowStore,
    host,
    onSession,
  });
  return { createSession, onSession, runtime };
}

describe("browser pending-flow store", () => {
  it("persists a flow across store instances and clears it once read as expired", () => {
    const storage = createStorage();
    const now = 1_000;
    const first = createBrowserSdkworkDesktopAuthFlowStore(storage, () => now);
    first.save({
      appId: "sdkwork-iam",
      codeChallenge: "challenge",
      codeVerifier: "verifier",
      createdAt: now,
      expiresAt: now + 60_000,
      redirectUri: REDIRECT_URI,
      state: "state-1",
    });
    expect(storage.data.has(SDKWORK_DESKTOP_AUTH_FLOW_STORAGE_KEY)).toBe(true);

    // A fresh process reads the same durable entry.
    const second = createBrowserSdkworkDesktopAuthFlowStore(storage, () => now + 1_000);
    expect(second.load()).toMatchObject({ state: "state-1", codeVerifier: "verifier" });

    // The code window closed while the app was not running.
    const expired = createBrowserSdkworkDesktopAuthFlowStore(storage, () => now + 120_000);
    expect(expired.load()).toBeNull();
    expect(storage.data.has(SDKWORK_DESKTOP_AUTH_FLOW_STORAGE_KEY)).toBe(false);
  });

  it("drops corrupt or incomplete entries instead of throwing", () => {
    const storage = createStorage();
    storage.setItem(SDKWORK_DESKTOP_AUTH_FLOW_STORAGE_KEY, "{not-json");
    expect(createBrowserSdkworkDesktopAuthFlowStore(storage).load()).toBeNull();
    expect(storage.data.has(SDKWORK_DESKTOP_AUTH_FLOW_STORAGE_KEY)).toBe(false);

    storage.setItem(SDKWORK_DESKTOP_AUTH_FLOW_STORAGE_KEY, JSON.stringify({ state: "only-a-state" }));
    expect(createBrowserSdkworkDesktopAuthFlowStore(storage).load()).toBeNull();
  });

  it("falls back to memory when storage is unavailable", () => {
    const store = createBrowserSdkworkDesktopAuthFlowStore(null);
    expect(store.load()).toBeNull();
    store.save({
      appId: "app",
      codeChallenge: "c",
      codeVerifier: "v",
      createdAt: 1,
      expiresAt: Date.now() + 60_000,
      redirectUri: REDIRECT_URI,
      state: "s",
    });
    expect(store.load()).toMatchObject({ state: "s" });
  });

  it("keeps the in-memory factory usable on its own", () => {
    const store = createInMemorySdkworkDesktopAuthFlowStore();
    store.save({
      appId: "app",
      codeChallenge: "c",
      codeVerifier: "v",
      createdAt: 1,
      expiresAt: Date.now() + 60_000,
      redirectUri: REDIRECT_URI,
      state: "s",
    });
    expect(store.load()).toMatchObject({ codeVerifier: "v" });
    store.clear();
    expect(store.load()).toBeNull();
  });
});

describe("cold-start redemption after the app restarted", () => {
  it("redeems the callback with the PKCE verifier persisted by the previous process", async () => {
    const storage = createStorage();
    const store = createBrowserSdkworkDesktopAuthFlowStore(storage);

    // First process: the user starts the browser login, then closes the app.
    const firstHost = createHost();
    const first = createRuntime(firstHost.host, store);
    await first.runtime.beginLogin();
    expect(firstHost.state.opened).toHaveLength(1);
    const state = new URL(firstHost.state.opened[0]).searchParams.get("state");
    expect(state).not.toBeNull();
    first.runtime.dispose();

    // The deep link relaunches the app: a new runtime, same durable storage.
    const callback = `${REDIRECT_URI}?code=cold-code&state=${state}`;
    const secondHost = createHost(callback);
    const second = createRuntime(secondHost.host, createBrowserSdkworkDesktopAuthFlowStore(storage));

    await expect(second.runtime.completePendingCallbackFromLaunch()).resolves.toBe(true);
    expect(second.onSession).toHaveBeenCalledTimes(1);
    expect(second.onSession.mock.calls[0][0]).toMatchObject({ accessToken: "access" });
    expect(second.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizationCode: "cold-code",
        clientId: "sdkwork-iam",
        redirectUri: REDIRECT_URI,
        codeVerifier: expect.any(String),
      }),
    );
    expect(storage.data.has(SDKWORK_DESKTOP_AUTH_FLOW_STORAGE_KEY)).toBe(false);
    second.runtime.dispose();
  });

  it("rejects a relaunched callback whose persisted flow already expired", async () => {
    const storage = createStorage();
    const store = createBrowserSdkworkDesktopAuthFlowStore(storage, () => 1_000);
    // Build a flow directly with a short TTL on the fake clock.
    store.save({
      appId: "sdkwork-iam",
      codeChallenge: "challenge",
      codeVerifier: "verifier",
      createdAt: 1_000,
      expiresAt: 1_100,
      redirectUri: REDIRECT_URI,
      state: "expired-state",
    });

    const host = createHost(`${REDIRECT_URI}?code=late-code&state=expired-state`);
    const runtime = createSdkworkIamDesktopAuthRuntime({
      appId: "sdkwork-iam",
      appSdkClient: { oauth: { desktopSessions: { create: vi.fn() } } } as never,
      authorizeBaseUrl: "https://iam.example.com",
      flowStore: createBrowserSdkworkDesktopAuthFlowStore(storage, () => 2_000),
      host: host.host,
      onSession: vi.fn(),
    });

    await expect(runtime.completePendingCallbackFromLaunch()).rejects.toMatchObject({
      code: "no-pending-flow",
    });
    runtime.dispose();
  });
});
