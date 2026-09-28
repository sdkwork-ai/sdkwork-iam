import { webcrypto } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  bindSdkworkDesktopSessionExchange,
  buildSdkworkDesktopAuthorizeUrl,
  createBrowserDesktopAuthHost,
  createInMemorySdkworkDesktopAuthFlowStore,
  createSdkworkDesktopPkcePair,
  createSdkworkDesktopStateToken,
  createSdkworkIamDesktopAuthController,
  createSdkworkIamDesktopAuthRuntime,
  deriveSdkworkDesktopRedirectUri,
  isSdkworkDesktopAuthError,
  parseSdkworkDesktopAuthCallbackUri,
  statesMatch,
  type SdkworkDesktopAuthHostPort,
  type SdkworkDesktopBrowserLoginDescriptor,
} from "../src/index.ts";

const REDIRECT_URI = "sdkwork-iam://auth/callback";

// jsdom's Crypto lacks subtle.digest; the runtimes this package targets
// (browsers, Electron/Tauri webviews, Node) all provide a full WebCrypto, so
// restore Node's implementation for non-browser test environments.
const cryptoGlobal = globalThis.crypto as Crypto & { subtle?: SubtleCrypto };
if (!cryptoGlobal?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: webcrypto,
  });
}

const DESCRIPTOR: SdkworkDesktopBrowserLoginDescriptor = {
  appId: "sdkwork-iam",
  authorizeBaseUrl: "https://iam.example.com",
  redirectUri: REDIRECT_URI,
};

interface HostHarness {
  dispatchedUrls: string[];
  emitOpenUrl: (url: string) => void;
  host: SdkworkDesktopAuthHostPort;
  initialUrl: string | null;
  setInitialUrl: (url: string | null) => void;
}

function createHostHarness(): HostHarness {
  const state: HostHarness = {
    dispatchedUrls: [],
    emitOpenUrl: () => {},
    initialUrl: null,
    host: undefined as unknown as SdkworkDesktopAuthHostPort,
    setInitialUrl: (url) => {
      state.initialUrl = url;
    },
  };
  const openUrlHandlers = new Set<(url: string) => void>();
  state.host = {
    async getInitialUrl() {
      return state.initialUrl;
    },
    id: "electron",
    onOpenUrl(handler) {
      openUrlHandlers.add(handler);
      state.emitOpenUrl = (url: string) => {
        for (const openHandler of [...openUrlHandlers]) {
          openHandler(url);
        }
      };
      return () => {
        openUrlHandlers.delete(handler);
      };
    },
    async openExternal(url) {
      state.dispatchedUrls.push(url);
    },
  };
  return state;
}

describe("pkce", () => {
  it("matches the RFC 7636 appendix B S256 vector", async () => {
    const { computeSdkworkDesktopPkceChallenge } = await import("../src/index.ts");
    const challenge = await computeSdkworkDesktopPkceChallenge(
      "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
    );
    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("creates a valid high-entropy verifier and matching challenge", async () => {
    const pair = await createSdkworkDesktopPkcePair();
    expect(pair.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(pair.codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/u);
    const { computeSdkworkDesktopPkceChallenge } = await import("../src/index.ts");
    expect(await computeSdkworkDesktopPkceChallenge(pair.codeVerifier)).toBe(
      pair.codeChallenge,
    );
  });
});

describe("authorize url", () => {
  it("builds an S256 authorization redirect", () => {
    const url = buildSdkworkDesktopAuthorizeUrl(DESCRIPTOR, {
      codeChallenge: "challenge-value",
      state: "state-value",
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://iam.example.com/iam/v3/oauth/authorize",
    );
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe("sdkwork-iam");
    expect(parsed.searchParams.get("redirect_uri")).toBe(REDIRECT_URI);
    expect(parsed.searchParams.get("code_challenge")).toBe("challenge-value");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("state")).toBe("state-value");
    expect(parsed.searchParams.get("scope")).toContain("openid");
  });
});

describe("callback parsing", () => {
  it("parses success callbacks on the registered redirect shape", () => {
    const callback = parseSdkworkDesktopAuthCallbackUri(
      `${REDIRECT_URI}?code=abc&state=xyz`,
      { redirectUri: REDIRECT_URI },
    );
    expect(callback).toMatchObject({ code: "abc", kind: "success", state: "xyz" });
  });

  it("parses provider-denied callbacks", () => {
    const callback = parseSdkworkDesktopAuthCallbackUri(
      `${REDIRECT_URI}?error=access_denied&state=xyz`,
      { redirectUri: REDIRECT_URI },
    );
    expect(callback).toMatchObject({ error: "access_denied", kind: "error" });
  });

  it("rejects look-alike schemes and foreign paths", () => {
    expect(() =>
      parseSdkworkDesktopAuthCallbackUri("evil-app://auth/callback?code=abc&state=xyz", {
        redirectUri: REDIRECT_URI,
      }),
    ).toThrowError();
    expect(() =>
      parseSdkworkDesktopAuthCallbackUri("sdkwork-iam://other/path?code=abc&state=xyz", {
        redirectUri: REDIRECT_URI,
      }),
    ).toThrowError();
    expect(() =>
      parseSdkworkDesktopAuthCallbackUri(`${REDIRECT_URI}?state=xyz`, {
        redirectUri: REDIRECT_URI,
      }),
    ).toThrowError();
  });

  it("compares states without length leaks", () => {
    expect(statesMatch("abc", "abc")).toBe(true);
    expect(statesMatch("abc", "abd")).toBe(false);
    expect(statesMatch("abc", "abcd")).toBe(false);
  });
});

describe("controller", () => {
  const SESSION = {
    accessToken: "access-jwt",
    authToken: "auth-jwt",
    context: { tenantId: "100001" },
    refreshToken: "refresh-token",
    sessionId: "session-1",
    user: { id: "user-1" },
  };

  function createControllerHarness(overrides?: {
    exchange?: (command: Record<string, unknown>) => Promise<unknown>;
    now?: () => number;
  }) {
    const hostHarness = createHostHarness();
    const exchange = vi.fn(
      overrides?.exchange ?? (async () => SESSION),
    );
    const controller = createSdkworkIamDesktopAuthController({
      descriptor: DESCRIPTOR,
      exchangeDesktopSession: exchange,
      flowStore: createInMemorySdkworkDesktopAuthFlowStore(),
      host: hostHarness.host,
      ...(overrides?.now ? { now: overrides.now } : {}),
    });
    return { controller, exchange, hostHarness };
  }

  it("opens the browser, redeems the deep-link code, and returns a session", async () => {
    const { controller, exchange, hostHarness } = createControllerHarness();
    const waitingListener = vi.fn();
    controller.subscribe(waitingListener);

    await controller.beginLogin();
    expect(hostHarness.dispatchedUrls).toHaveLength(1);
    expect(new URL(hostHarness.dispatchedUrls[0]).searchParams.get("code_challenge_method")).toBe(
      "S256",
    );
    expect(controller.isWaiting()).toBe(true);

    const state = new URL(hostHarness.dispatchedUrls[0]).searchParams.get("state");
    const session = await controller.handleOpenUrl(
      `${REDIRECT_URI}?code=one-time-code&state=${state}`,
    );
    expect(session).toMatchObject({
      accessToken: "access-jwt",
      authToken: "auth-jwt",
      refreshToken: "refresh-token",
    });
    expect(exchange).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizationCode: "one-time-code",
        clientId: "sdkwork-iam",
        redirectUri: REDIRECT_URI,
      }),
    );
    expect(exchange.mock.calls[0][0].codeVerifier).toBeTruthy();
    expect(controller.isWaiting()).toBe(false);
    expect(waitingListener).toHaveBeenCalled();
    controller.dispose();
  });

  it("auto-dispatches deep-link events raised by the host", async () => {
    const { controller, hostHarness } = createControllerHarness();
    await controller.beginLogin();
    const state = new URL(hostHarness.dispatchedUrls[0]).searchParams.get("state");

    hostHarness.emitOpenUrl(`${REDIRECT_URI}?code=cold-start-code&state=${state}`);
    await vi.waitFor(() => {
      if (controller.isWaiting()) {
        throw new Error("controller still waiting for the deep link");
      }
    });
    controller.dispose();
  });

  it("rejects a state mismatch without consuming the flow", async () => {
    const { controller, exchange } = createControllerHarness();
    await controller.beginLogin();
    await expect(
      controller.handleOpenUrl(`${REDIRECT_URI}?code=abc&state=forged`),
    ).rejects.toMatchObject({ code: "state-mismatch" });
    expect(exchange).not.toHaveBeenCalled();
    expect(controller.isWaiting()).toBe(true);
    controller.dispose();
  });

  it("maps provider-denied callbacks to a typed error and clears the flow", async () => {
    const { controller, exchange, hostHarness } = createControllerHarness();
    await controller.beginLogin();
    const authorizeUrl = new URL(hostHarness.dispatchedUrls[0]);
    const state = authorizeUrl.searchParams.get("state");
    await expect(
      controller.handleOpenUrl(`${REDIRECT_URI}?error=access_denied&state=${state}`),
    ).rejects.toMatchObject({ code: "provider-denied" });
    expect(exchange).not.toHaveBeenCalled();
    expect(controller.isWaiting()).toBe(false);
    await expect(
      controller.handleOpenUrl(`${REDIRECT_URI}?code=abc&state=${state}`),
    ).rejects.toMatchObject({ code: "no-pending-flow" });
    controller.dispose();
  });

  it("fails closed when the flow expired", async () => {
    let current = 1_000_000;
    const { controller, hostHarness } = createControllerHarness({
      now: () => current,
    });
    await controller.beginLogin();
    const state = new URL(hostHarness.dispatchedUrls[0]).searchParams.get("state");
    current += 11 * 60 * 1000;
    await expect(
      controller.handleOpenUrl(`${REDIRECT_URI}?code=abc&state=${state}`),
    ).rejects.toMatchObject({ code: "flow-expired" });
    expect(controller.isWaiting()).toBe(false);
    controller.dispose();
  });

  it("fails closed on an incomplete exchange session", async () => {
    const { controller, hostHarness } = createControllerHarness({
      exchange: async () => ({ authToken: "auth-jwt" }),
    });
    await controller.beginLogin();
    const state = new URL(hostHarness.dispatchedUrls[0]).searchParams.get("state");
    await expect(
      controller.handleOpenUrl(`${REDIRECT_URI}?code=abc&state=${state}`),
    ).rejects.toMatchObject({ code: "invalid-session" });
    controller.dispose();
  });

  it("wraps exchange failures without exposing raw rejections", async () => {
    const { controller, hostHarness } = createControllerHarness({
      exchange: async () => {
        throw new Error("network down");
      },
    });
    await controller.beginLogin();
    const state = new URL(hostHarness.dispatchedUrls[0]).searchParams.get("state");
    await expect(
      controller.handleOpenUrl(`${REDIRECT_URI}?code=abc&state=${state}`),
    ).rejects.toMatchObject({ code: "exchange-failed" });
    controller.dispose();
  });

  it("raises browser-open-failed when the host cannot open the browser", async () => {
    const hostHarness = createHostHarness();
    hostHarness.host.openExternal = async () => {
      throw new Error("no default browser");
    };
    const controller = createSdkworkIamDesktopAuthController({
      descriptor: DESCRIPTOR,
      exchangeDesktopSession: async () => SESSION,
      host: hostHarness.host,
    });
    await expect(controller.beginLogin()).rejects.toMatchObject({
      code: "browser-open-failed",
    });
    expect(controller.isWaiting()).toBe(false);
    controller.dispose();
  });
});

describe("browser fallback host", () => {
  it("opens authorize URLs through the injected opener and exposes no deep links", async () => {
    const openUrl = vi.fn(async () => {});
    const host = createBrowserDesktopAuthHost({ openUrl });
    await host.openExternal("https://iam.example.com/iam/v3/oauth/authorize");
    expect(openUrl).toHaveBeenCalledTimes(1);
    await expect(host.getInitialUrl()).resolves.toBeNull();
    const unsubscribe = host.onOpenUrl(() => {
      throw new Error("browser fallback must never emit deep links");
    });
    unsubscribe();
    expect(host.id).toBe("browser");
  });
});

describe("sdk binding", () => {
  it("binds the generated oauth.desktopSessions.create resource", async () => {
    const create = vi.fn(async (command: unknown) => command);
    const exchange = bindSdkworkDesktopSessionExchange({
      oauth: {
        desktopSessions: {
          create,
        },
      },
    });
    await exchange({ authorizationCode: "abc" });
    expect(create).toHaveBeenCalledWith({ authorizationCode: "abc" });
  });

  it("refuses clients without the desktopSessions resource", () => {
    expect(() => bindSdkworkDesktopSessionExchange({})).toThrowError(/desktopSessions/);
  });
});

describe("state token", () => {
  it("creates unique url-safe tokens", () => {
    const first = createSdkworkDesktopStateToken();
    const second = createSdkworkDesktopStateToken();
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/u);
  });
});

describe("controller cancel and retry", () => {
  const RETRY_SESSION = {
    accessToken: "access-jwt",
    authToken: "auth-jwt",
    refreshToken: "refresh-token",
  };

  it("allows a fresh beginLogin after cancel without disposing", async () => {
    const hostHarness = createHostHarness();
    const exchange = vi.fn(async () => RETRY_SESSION);
    const controller = createSdkworkIamDesktopAuthController({
      descriptor: DESCRIPTOR,
      exchangeDesktopSession: exchange,
      host: hostHarness.host,
    });
    await controller.beginLogin();
    expect(controller.isWaiting()).toBe(true);

    await controller.cancelLogin();
    expect(controller.isWaiting()).toBe(false);

    await controller.beginLogin();
    expect(controller.isWaiting()).toBe(true);
    expect(hostHarness.dispatchedUrls).toHaveLength(2);
    controller.dispose();
  });

  it("resets the flow and waiting state when the exchange fails", async () => {
    const hostHarness = createHostHarness();
    const controller = createSdkworkIamDesktopAuthController({
      descriptor: DESCRIPTOR,
      exchangeDesktopSession: async () => {
        throw new Error("network down");
      },
      host: hostHarness.host,
    });
    await controller.beginLogin();
    const state = new URL(hostHarness.dispatchedUrls[0]).searchParams.get("state");
    await expect(
      controller.handleOpenUrl(`${REDIRECT_URI}?code=abc&state=${state}`),
    ).rejects.toMatchObject({ code: "exchange-failed" });
    expect(controller.isWaiting()).toBe(false);

    await controller.beginLogin();
    expect(controller.isWaiting()).toBe(true);
    controller.dispose();
  });
});

describe("runtime factory", () => {
  const RUNTIME_SESSION = {
    accessToken: "access-jwt",
    authToken: "auth-jwt",
    refreshToken: "refresh-token",
  };

  function createRuntimeHarness(overrides?: {
    createSession?: (command: Record<string, unknown>) => Promise<unknown>;
  }) {
    const hostHarness = createHostHarness();
    const createSession = vi.fn(
      overrides?.createSession ?? (async () => RUNTIME_SESSION),
    );
    const appSdkClient = {
      oauth: {
        desktopSessions: {
          create: createSession,
        },
      },
    };
    const onSession = vi.fn(async (_session: unknown) => {});
    const runtime = createSdkworkIamDesktopAuthRuntime({
      appId: "sdkwork-iam",
      appSdkClient: appSdkClient as never,
      authorizeBaseUrl: "https://iam.example.com",
      host: hostHarness.host,
      onSession,
    });
    return { createSession, hostHarness, onSession, runtime };
  }

  it("derives the redirect uri from scheme-safe app ids", () => {
    expect(deriveSdkworkDesktopRedirectUri("sdkwork-iam")).toBe(
      "sdkwork-iam://auth/callback",
    );
    expect(deriveSdkworkDesktopRedirectUri("sdkwork-cloudrouter")).toBe(
      "sdkwork-cloudrouter://auth/callback",
    );
    expect(() => deriveSdkworkDesktopRedirectUri("Sdkwork IAM")).toThrowError(
      /application id/iu,
    );
    expect(() => deriveSdkworkDesktopRedirectUri("1app")).toThrowError();
  });

  it("begins login and redeems the session through the bound SDK", async () => {
    const { createSession, hostHarness, onSession, runtime } = createRuntimeHarness();
    await runtime.beginLogin();
    expect(hostHarness.dispatchedUrls).toHaveLength(1);
    expect(new URL(hostHarness.dispatchedUrls[0]).searchParams.get("redirect_uri")).toBe(
      "sdkwork-iam://auth/callback",
    );

    const state = new URL(hostHarness.dispatchedUrls[0]).searchParams.get("state");
    // Direct controller calls return the session; onSession fires only on
    // runtime-owned dispatch paths (host events, cold start).
    await expect(
      runtime.controller.handleOpenUrl(`${REDIRECT_URI}?code=rt-code&state=${state}`),
    ).resolves.toMatchObject({ authToken: "auth-jwt" });
    expect(onSession).not.toHaveBeenCalled();
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizationCode: "rt-code",
        clientId: "sdkwork-iam",
        redirectUri: "sdkwork-iam://auth/callback",
      }),
    );
    runtime.dispose();
  });

  it("completes a cold-start launch callback", async () => {
    const { hostHarness, onSession, runtime } = createRuntimeHarness();
    await runtime.beginLogin();
    const state = new URL(hostHarness.dispatchedUrls[0]).searchParams.get("state");
    hostHarness.setInitialUrl(`${REDIRECT_URI}?code=cold-code&state=${state}`);

    await expect(runtime.completePendingCallbackFromLaunch()).resolves.toBe(true);
    expect(onSession).toHaveBeenCalledTimes(1);
    expect(onSession.mock.calls[0][0]).toMatchObject({ accessToken: "access-jwt" });
    runtime.dispose();
  });

  it("reports nothing when launched without a callback", async () => {
    const { onSession, runtime } = createRuntimeHarness();
    await expect(runtime.completePendingCallbackFromLaunch()).resolves.toBe(false);
    expect(onSession).not.toHaveBeenCalled();
    runtime.dispose();
  });

  it("keeps the runtime usable after an exchange failure", async () => {
    const { hostHarness, runtime } = createRuntimeHarness({
      createSession: async () => {
        throw new Error("consumed");
      },
    });
    await runtime.beginLogin();
    const state = new URL(hostHarness.dispatchedUrls[0]).searchParams.get("state");
    await expect(
      runtime.controller.handleOpenUrl(`${REDIRECT_URI}?code=x&state=${state}`),
    ).rejects.toMatchObject({ code: "exchange-failed" });
    expect(runtime.controller.isWaiting()).toBe(false);

    await runtime.beginLogin();
    expect(runtime.controller.isWaiting()).toBe(true);
    runtime.dispose();
  });

  it("auto-dispatches host deep-link events to onSession", async () => {
    const { hostHarness, onSession, runtime } = createRuntimeHarness();
    await runtime.beginLogin();
    const state = new URL(hostHarness.dispatchedUrls[0]).searchParams.get("state");
    hostHarness.emitOpenUrl(`${REDIRECT_URI}?code=auto-code&state=${state}`);
    await vi.waitFor(() => {
      expect(onSession).toHaveBeenCalledTimes(1);
    });
    runtime.dispose();
  });
});

describe("error type", () => {
  it("is recognizable through the guard", async () => {
    const error = new (await import("../src/index.ts")).SdkworkDesktopAuthError(
      "invalid-callback",
      "boom",
    );
    expect(isSdkworkDesktopAuthError(error)).toBe(true);
    expect(isSdkworkDesktopAuthError(new Error("boom"))).toBe(false);
    expect(error.code).toBe("invalid-callback");
  });
});
