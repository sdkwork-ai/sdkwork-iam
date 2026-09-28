import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import {
  SDKWORK_AUTH_I18N_CATALOG,
} from "../src/auth-copy.ts";
import {
  buildSdkworkAuthDesktopLaunchLocation,
  buildSdkworkAuthDesktopLaunchPath,
  createAuthRouteCatalog,
  isSdkworkDesktopDeepLinkRedirect,
  resolveAuthAccess,
} from "../src/auth.ts";
import { SdkworkAuthDesktopLaunchPage } from "../src/pages/AuthDesktopLaunchPage.tsx";
import { SdkworkAuthPage } from "../src/pages/AuthPage.tsx";
import type { SdkworkAuthDesktopBrowserLoginBinding } from "../src/desktop-browser-login.ts";
import { createSdkworkAuthController } from "../src/auth-controller.ts";

describe("desktop deep-link redirect helpers", () => {
  it("detects custom-scheme deep-link redirects", () => {
    expect(isSdkworkDesktopDeepLinkRedirect("sdkwork-iam://auth/callback?code=abc")).toBe(true);
    expect(isSdkworkDesktopDeepLinkRedirect("  sdkwork-iam://auth/callback ")).toBe(true);
    expect(isSdkworkDesktopDeepLinkRedirect("https://app.example.com/next")).toBe(false);
    expect(isSdkworkDesktopDeepLinkRedirect("http://127.0.0.1:41017/cb")).toBe(false);
    expect(isSdkworkDesktopDeepLinkRedirect("")).toBe(false);
    expect(isSdkworkDesktopDeepLinkRedirect(null)).toBe(false);
  });

  it("builds the hosted desktop launch location", () => {
    expect(buildSdkworkAuthDesktopLaunchPath()).toBe("/auth/desktop/launch");
    expect(buildSdkworkAuthDesktopLaunchPath({ basePath: "/iam-auth" })).toBe(
      "/iam-auth/desktop/launch",
    );
    const location = buildSdkworkAuthDesktopLaunchLocation(
      "sdkwork-iam://auth/callback?code=a b&state=x",
    );
    expect(location).toContain("/auth/desktop/launch?redirectUrl=");
    expect(location).not.toContain(" ");
  });
});

describe("auth access for the desktop hand-off page", () => {
  const routes = createAuthRouteCatalog("/auth");
  const authenticatedSession = { accessToken: "a", authToken: "b" };

  it("allows authenticated users on the desktop launch page (no bounce to home)", () => {
    // The user just completed login in the browser; the hand-off page must
    // still render even though every other auth route redirects away.
    const decision = resolveAuthAccess({
      currentPath: "/auth/desktop/launch",
      routes,
      session: authenticatedSession,
    });
    expect(decision).toMatchObject({ allowed: true });
  });

  it("still bounces authenticated users away from regular login routes", () => {
    const decision = resolveAuthAccess({
      currentPath: "/auth/login",
      routes,
      session: authenticatedSession,
    });
    expect(decision).toMatchObject({
      allowed: false,
      reason: "already-authenticated",
    });
  });

  it("allows anonymous users on the desktop launch page without redirect loops", () => {
    const decision = resolveAuthAccess({
      currentPath: "/auth/desktop/launch",
      routes,
      session: null,
    });
    expect(decision).toMatchObject({ allowed: true });
  });
});

describe("sdkwork desktop launch page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function renderLaunchPage(
    initialEntry: string,
    options: { onLaunch?: (url: string) => void } = {},
  ) {
    return render(
      <SdkworkI18nProvider catalogs={[SDKWORK_AUTH_I18N_CATALOG]} locale="en-US">
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route
              element={<SdkworkAuthDesktopLaunchPage onLaunch={options.onLaunch} />}
              path="/auth/desktop/launch"
            />
            <Route element={<output>login-page</output>} path="/auth/login" />
          </Routes>
        </MemoryRouter>
      </SdkworkI18nProvider>,
    );
  }

  it("renders the success hand-off and auto-launches the deep link once", async () => {
    vi.useFakeTimers();
    const onLaunch = vi.fn();
    renderLaunchPage(
      buildSdkworkAuthDesktopLaunchLocation("sdkwork-iam://auth/callback?code=abc&state=xyz"),
      { onLaunch },
    );
    expect(screen.getByTestId("sdkwork-desktop-launch-description")).toBeInTheDocument();
    expect(screen.getByText("Login successful")).toBeInTheDocument();

    vi.advanceTimersByTime(500);
    expect(onLaunch).toHaveBeenCalledTimes(1);
    expect(onLaunch).toHaveBeenCalledWith("sdkwork-iam://auth/callback?code=abc&state=xyz");

    fireEvent.click(screen.getByTestId("sdkwork-desktop-launch-open-app"));
    expect(onLaunch).toHaveBeenCalledTimes(2);
  });

  it("shows the fallback copy when the redirect parameter is missing", () => {
    renderLaunchPage("/auth/desktop/launch");
    expect(
      screen.getByText(/hand-off link is missing or invalid/iu),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("sdkwork-desktop-launch-open-app"),
    ).not.toBeInTheDocument();
  });

  it("navigates back to the login route", () => {
    renderLaunchPage("/auth/desktop/launch");
    fireEvent.click(screen.getByText("Back to login"));
    expect(screen.getByText("login-page")).toBeInTheDocument();
  });
});

describe("sdkwork auth page desktop browser-login entry", () => {
  function renderAuthPage(binding?: SdkworkAuthDesktopBrowserLoginBinding) {
    const controller = createSdkworkAuthController({
      service: {
        getCurrentSession: vi.fn().mockResolvedValue(null),
        getCurrentUser: vi.fn().mockResolvedValue(null),
      },
    });
    return render(
      <SdkworkI18nProvider catalogs={[SDKWORK_AUTH_I18N_CATALOG]} locale="en-US">
        <MemoryRouter initialEntries={["/auth/login"]}>
          <SdkworkAuthPage basePath="/auth" controller={controller} desktopBrowserLogin={binding} />
        </MemoryRouter>
      </SdkworkI18nProvider>,
    );
  }

  it("hides the entry on pure web (no binding provided)", () => {
    renderAuthPage(undefined);
    expect(
      screen.queryByTestId("sdkwork-desktop-browser-login-entry"),
    ).not.toBeInTheDocument();
  });

  it("renders the entry, starts the browser login, and shows the waiting state", async () => {
    const waitingListeners = new Set<() => void>();
    let waiting = false;
    const begin = vi.fn(async () => {
      waiting = true;
      for (const listener of [...waitingListeners]) {
        listener();
      }
    });
    const binding: SdkworkAuthDesktopBrowserLoginBinding = {
      begin,
      cancel: vi.fn(() => {
        waiting = false;
        for (const listener of [...waitingListeners]) {
          listener();
        }
      }),
      isWaiting: () => waiting,
      subscribe: (listener) => {
        waitingListeners.add(listener);
        return () => {
          waitingListeners.delete(listener);
        };
      },
    };

    renderAuthPage(binding);
    const entry = screen.getByTestId("sdkwork-desktop-browser-login-entry");
    fireEvent.click(entry);
    await vi.waitFor(() => {
      expect(begin).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(screen.getByTestId("sdkwork-desktop-browser-login-waiting")).toBeInTheDocument();
    });
    expect(screen.getByText(/Finish signing in from your default browser/iu)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("sdkwork-desktop-browser-login-cancel"));
    await vi.waitFor(() => {
      expect(screen.getByTestId("sdkwork-desktop-browser-login-entry")).toBeInTheDocument();
    });
  });
});
