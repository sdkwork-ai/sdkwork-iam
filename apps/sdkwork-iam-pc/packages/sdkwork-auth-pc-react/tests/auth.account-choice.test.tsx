import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { SDKWORK_AUTH_I18N_CATALOG } from "../src/auth-copy.ts";
import type { SdkworkAuthBrand } from "../src/auth-brand.ts";
import {
  createSdkworkAuthController,
  type SdkworkAuthController,
} from "../src/auth-controller.ts";
import type { SdkworkAuthSession } from "../src/auth-service.ts";
import { SdkworkAuthPage } from "../src/pages/AuthPage.tsx";
import { mockAccessToken, mockAuthToken } from "./authJwtFixtures.ts";

const PENDING_AUTHORIZATION = "pending-state-7";

function sessionFor(displayName: string): SdkworkAuthSession {
  return {
    accessToken: mockAccessToken(`account-choice-access-${displayName}`),
    authToken: mockAuthToken(`account-choice-auth-${displayName}`),
    user: {
      displayName,
      email: "operator@example.test",
      firstName: displayName.split(/\s+/u)[0] ?? displayName,
      initials: "",
      lastName: displayName.split(/\s+/u)[1] ?? "",
    },
  };
}

function renderAuthPage(
  controller: SdkworkAuthController,
  options: {
    brand?: SdkworkAuthBrand;
    entry?: string;
  } = {},
) {
  return render(
    <SdkworkThemeProvider defaultTheme="light">
      <SdkworkI18nProvider catalogs={[SDKWORK_AUTH_I18N_CATALOG]} locale="en-US">
        <MemoryRouter
          initialEntries={[
            options.entry
              ?? `/auth/login?oauthAuthorizationStateId=${PENDING_AUTHORIZATION}`,
          ]}
        >
          <Routes>
            <Route
              element={
                <SdkworkAuthPage
                  basePath="/auth"
                  brand={options.brand}
                  controller={controller}
                />
              }
              path="/auth/login"
            />
            <Route element={<output>desktop-launch</output>} path="*" />
          </Routes>
        </MemoryRouter>
      </SdkworkI18nProvider>
    </SdkworkThemeProvider>,
  );
}

describe("auth page account choice for an already signed-in browser", () => {
  it("holds the login form while the stored session is verified, then offers that account", async () => {
    let resolveSession!: (session: SdkworkAuthSession) => void;
    const getCurrentSession = vi.fn(
      () => new Promise<SdkworkAuthSession>((resolve) => {
        resolveSession = resolve;
      }),
    );
    const controller = createSdkworkAuthController({
      service: {
        getCurrentSession,
        getCurrentUser: vi.fn().mockResolvedValue(null),
      },
    });

    renderAuthPage(controller);

    // The stored session is being revalidated: no login form is painted and
    // torn away in the meantime.
    expect(screen.getByTestId("sdkwork-auth-session-check")).toBeInTheDocument();
    expect(screen.queryByLabelText(/account/iu)).not.toBeInTheDocument();

    resolveSession(sessionFor("Current Operator"));

    expect(
      await screen.findByTestId("sdkwork-auth-account-choice"),
    ).toBeInTheDocument();
    expect(screen.getByText("Current Operator")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in with another account/iu }),
    ).toBeInTheDocument();
  });

  it("does not complete the pending authorization until the account row is used", async () => {
    const completeOAuthAuthorization = vi.fn().mockResolvedValue({
      authorizationCode: "authz-code",
      redirectUrl: "sdkwork-iam://auth/callback?code=desktop-code&state=s",
    });
    const controller = createSdkworkAuthController({
      service: {
        completeOAuthAuthorization,
        getCurrentSession: vi.fn().mockResolvedValue(sessionFor("Current Operator")),
        getCurrentUser: vi.fn().mockResolvedValue(null),
      },
    });

    renderAuthPage(controller);

    const continueButton = await screen.findByTestId("sdkwork-auth-account-continue");
    expect(completeOAuthAuthorization).not.toHaveBeenCalled();

    fireEvent.click(continueButton);

    expect(await screen.findByText("desktop-launch")).toBeInTheDocument();
    expect(completeOAuthAuthorization).toHaveBeenCalledTimes(1);
    expect(completeOAuthAuthorization).toHaveBeenCalledWith(PENDING_AUTHORIZATION);
  });

  it("keeps the account choice after a failed completion so the choice can be retried", async () => {
    const completeOAuthAuthorization = vi.fn()
      .mockRejectedValueOnce(new Error("authorization state expired"))
      .mockResolvedValue({
        authorizationCode: "authz-code",
        redirectUrl: "sdkwork-iam://auth/callback?code=desktop-code&state=s",
      });
    const controller = createSdkworkAuthController({
      service: {
        completeOAuthAuthorization,
        getCurrentSession: vi.fn().mockResolvedValue(sessionFor("Current Operator")),
        getCurrentUser: vi.fn().mockResolvedValue(null),
      },
    });

    renderAuthPage(controller);

    fireEvent.click(await screen.findByTestId("sdkwork-auth-account-continue"));

    await vi.waitFor(() => {
      expect(completeOAuthAuthorization).toHaveBeenCalledTimes(1);
    });
    // The failure is reported and the account card stays usable instead of
    // leaving the page stuck on a busy card.
    expect(
      await screen.findByTestId("sdkwork-auth-account-choice"),
    ).toBeInTheDocument();
    const retry = screen.getByTestId("sdkwork-auth-account-continue");
    await vi.waitFor(() => {
      expect(retry).not.toBeDisabled();
    });

    fireEvent.click(retry);
    expect(await screen.findByText("desktop-launch")).toBeInTheDocument();
    expect(completeOAuthAuthorization).toHaveBeenCalledTimes(2);
  });

  it("opens the account method form when the visitor chooses another account", async () => {
    const completeOAuthAuthorization = vi.fn();
    const controller = createSdkworkAuthController({
      service: {
        completeOAuthAuthorization,
        getCurrentSession: vi.fn().mockResolvedValue(sessionFor("Current Operator")),
        getCurrentUser: vi.fn().mockResolvedValue(null),
      },
    });

    renderAuthPage(controller);

    fireEvent.click(await screen.findByTestId("sdkwork-auth-account-switch"));

    expect(await screen.findByLabelText(/account/iu)).toBeInTheDocument();
    expect(
      screen.queryByTestId("sdkwork-auth-account-choice"),
    ).not.toBeInTheDocument();
    expect(completeOAuthAuthorization).not.toHaveBeenCalled();
  });

  it("names the product the session is being signed in to", async () => {
    const controller = createSdkworkAuthController({
      service: {
        getCurrentSession: vi.fn().mockResolvedValue(sessionFor("Current Operator")),
        getCurrentUser: vi.fn().mockResolvedValue(null),
      },
    });

    renderAuthPage(controller, {
      brand: {
        logoUrl: "https://cdn.example.test/birdcoder.png",
        name: "BirdCoder",
      },
    });

    const accountChoice = await screen.findByTestId("sdkwork-auth-account-choice");
    expect(accountChoice).toHaveTextContent("BirdCoder");
    expect(screen.getByTestId("sdkwork-auth-account-avatar")).toHaveAttribute(
      "src",
      "https://cdn.example.test/birdcoder.png",
    );
    expect(
      screen.getByTestId("sdkwork-auth-account-continue"),
    ).not.toHaveAttribute("aria-busy");
  });
});

describe("auth page session check gating", () => {
  it("renders the login form for a browser with no stored session", async () => {
    const getCurrentSession = vi.fn().mockResolvedValue(null);
    const controller = createSdkworkAuthController({
      service: {
        getCurrentSession,
        getCurrentUser: vi.fn().mockResolvedValue(null),
      },
    });

    renderAuthPage(controller, { entry: "/auth/login" });

    expect(await screen.findByLabelText(/account/iu)).toBeInTheDocument();
    expect(
      screen.queryByTestId("sdkwork-auth-session-check"),
    ).not.toBeInTheDocument();
  });

  it("settles back onto the login form when a stored session no longer holds", async () => {
    let resolveSession!: (session: null) => void;
    const getCurrentSession = vi.fn(
      () => new Promise<null>((resolve) => {
        resolveSession = resolve;
      }),
    );
    const controller = createSdkworkAuthController({
      service: {
        getCurrentSession,
        getCurrentUser: vi.fn().mockResolvedValue(null),
      },
    });

    renderAuthPage(controller, { entry: "/auth/login" });
    expect(screen.getByTestId("sdkwork-auth-session-check")).toBeInTheDocument();

    resolveSession(null);

    expect(await screen.findByLabelText(/account/iu)).toBeInTheDocument();
    expect(
      screen.queryByTestId("sdkwork-auth-session-check"),
    ).not.toBeInTheDocument();
  });
});
