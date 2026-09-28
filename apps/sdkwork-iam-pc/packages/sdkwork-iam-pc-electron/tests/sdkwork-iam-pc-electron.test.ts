import { describe, expect, it, vi } from "vitest";
import {
  createElectronDesktopAuthHost,
  createSdkworkElectronDeepLinkBridge,
  exposeSdkworkDesktopPreloadBridge,
  SDKWORK_DESKTOP_PRELOAD_KEY,
} from "../src/index.ts";
import { SDKWORK_DESKTOP_BRIDGE } from "@sdkwork/iam-desktop-auth";

interface Harness {
  emitOpenUrl: (url: string) => void;
  emitSecondInstance: (argv: string[]) => void;
  rendererBridge: unknown;
  shellOpenExternal: (url: string) => Promise<void>;
  exposeKey: string;
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  bridge: {
    openUrl: (url: string) => void;
  };
}

function createHarness(): Harness {
  const openUrlListeners = new Set<(info: { url: string }) => void>();
  const secondInstanceListeners = new Set<(info: { argv: string[] }) => void>();
  const windowRef: { current: { webContents: { send: (channel: string, payload?: unknown) => void } } | null } = {
    current: null,
  };
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const shellOpenExternal = vi.fn(async () => {});

  const app = {
    get isPackaged() {
      return true;
    },
    off: vi.fn((_event: string, listener: never) => {
      openUrlListeners.delete(listener as never);
      secondInstanceListeners.delete(listener as never);
      return app;
    }),
    on: vi.fn((event: string, listener: never) => {
      if (event === "open-url") {
        openUrlListeners.add(listener as never);
      }
      if (event === "second-instance") {
        secondInstanceListeners.add(listener as never);
      }
      return app;
    }),
    removeAsDefaultProtocolClient: vi.fn(() => true),
    setAsDefaultProtocolClient: vi.fn(() => true),
  };

  const ipcMain = {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    }),
    removeHandler: vi.fn((channel: string) => {
      handlers.delete(channel);
    }),
  };

  createSdkworkElectronDeepLinkBridge({
    app: app as never,
    getWindow: () => windowRef.current,
    ipcMain: ipcMain as never,
    scheme: "sdkwork-iam",
    shell: { openExternal: shellOpenExternal } as never,
  });

  const harness: Harness = {
    bridge: {
      openUrl: (url: string) => {
        for (const listener of [...openUrlListeners]) {
          listener({ url });
        }
      },
    },
    emitOpenUrl: (url) => {
      windowRef.current = {
        webContents: {
          send: (channel, payload) => {
            rendererOpenListeners.forEach((listener) => listener({}, payload));
          },
        },
      };
      for (const listener of [...openUrlListeners]) {
        listener({ url });
      }
    },
    emitSecondInstance: (argv) => {
      for (const listener of [...secondInstanceListeners]) {
        listener({ argv });
      }
    },
    exposeKey: "",
    invoke: async (channel: string, ...args: unknown[]) => {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`no handler for ${channel}`);
      }
      return handler({}, ...args);
    },
    rendererBridge: undefined,
    shellOpenExternal,
  };

  const rendererOpenListeners = new Set<(...args: unknown[]) => void>();
  const contextBridge = {
    exposeInMainWorld: vi.fn((key: string, value: unknown) => {
      harness.exposeKey = key;
      harness.rendererBridge = value;
    }),
  };
  const ipcRenderer = {
    invoke: harness.invoke,
    on: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
      rendererOpenListeners.add(listener);
      return ipcRenderer;
    }),
    removeListener: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
      rendererOpenListeners.delete(listener);
      return ipcRenderer;
    }),
  };
  exposeSdkworkDesktopPreloadBridge({
    contextBridge,
    ipcRenderer: ipcRenderer as never,
  });

  return harness;
}

describe("electron deep-link bridge", () => {
  it("registers the protocol and exposes only the allowlisted channels", () => {
    const harness = createHarness();
    expect(harness.exposeKey).toBe(SDKWORK_DESKTOP_PRELOAD_KEY);
    const bridge = harness.rendererBridge as { deepLinks: unknown; shellOpen: unknown };
    expect(Object.keys(bridge).sort()).toEqual(["deepLinks", "shellOpen"]);
  });

  it("delivers open-url deep links to the renderer event channel", async () => {
    const harness = createHarness();
    const bridge = harness.rendererBridge as {
      deepLinks: {
        getInitialUrl(): Promise<string | null>;
        onOpenUrl(handler: (url: string) => void): () => void;
      };
    };
    const received: string[] = [];
    bridge.deepLinks.onOpenUrl((url) => {
      received.push(url);
    });

    harness.emitOpenUrl("sdkwork-iam://auth/callback?code=abc&state=xyz");
    await expect(bridge.deepLinks.getInitialUrl()).resolves.toBe(
      "sdkwork-iam://auth/callback?code=abc&state=xyz",
    );
    expect(received).toEqual(["sdkwork-iam://auth/callback?code=abc&state=xyz"]);
  });

  it("extracts deep links from second-instance argv", async () => {
    const harness = createHarness();
    harness.emitSecondInstance([
      "C:\\apps\\sdkwork-iam.exe",
      "sdkwork-iam://auth/callback?code=argv-code",
    ]);
    await expect(harness.invoke(SDKWORK_DESKTOP_BRIDGE.deepLinksGetInitialUrl)).resolves.toBe(
      "sdkwork-iam://auth/callback?code=argv-code",
    );
  });

  it("routes shellOpen through the main-process shell and enforces the scheme allowlist", async () => {
    const harness = createHarness();
    await harness.invoke(SDKWORK_DESKTOP_BRIDGE.shellOpen, "https://iam.example.com/auth/login");
    expect(harness.shellOpenExternal).toHaveBeenCalledWith("https://iam.example.com/auth/login");

    // The bridge's own deep-link scheme is allowed by default.
    await harness.invoke(SDKWORK_DESKTOP_BRIDGE.shellOpen, "sdkwork-iam://auth/callback");
    expect(harness.shellOpenExternal).toHaveBeenCalledWith("sdkwork-iam://auth/callback");

    // Arbitrary protocols never reach the OS.
    await expect(
      harness.invoke(SDKWORK_DESKTOP_BRIDGE.shellOpen, "file:///C:/Windows/System32"),
    ).rejects.toThrow(/refused scheme/iu);
    await expect(
      harness.invoke(SDKWORK_DESKTOP_BRIDGE.shellOpen, "smb://host/share"),
    ).rejects.toThrow(/refused scheme/iu);
    await expect(harness.invoke(SDKWORK_DESKTOP_BRIDGE.shellOpen, "")).rejects.toThrow(
      /requires a URL/iu,
    );
  });

  it("end-to-end: the renderer host port opens the browser and receives callbacks", async () => {
    const harness = createHarness();
    const host = createElectronDesktopAuthHost({
      bridge: harness.rendererBridge as never,
    });
    expect(host.id).toBe("electron");
    const received: string[] = [];
    host.onOpenUrl((url) => {
      received.push(url);
    });
    harness.emitOpenUrl("sdkwork-iam://auth/callback?code=port-code");
    expect(received).toEqual(["sdkwork-iam://auth/callback?code=port-code"]);
    await expect(host.getInitialUrl()).resolves.toBe(
      "sdkwork-iam://auth/callback?code=port-code",
    );
  });
});
