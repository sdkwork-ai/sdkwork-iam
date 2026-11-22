import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
import type { SdkworkAuthSession, SdkworkAuthOAuthAuthorizationCompletion } from "../src/auth-service.ts";
import type { SdkworkAuthAppAuthorizeRequest } from "../src/auth-app-authorize.ts";
import { SdkworkAuthPage } from "../src/pages/AuthPage.tsx";
import { mockAccessToken, mockAuthToken } from "./authJwtFixtures.ts";

const PENDING_AUTHORIZATION = "pending-state-7";

/** A desktop app authorization exactly as the authorize entry renders it. */
const APP_AUTHORIZE_SEARCH = [
  "response_type=code",
  "client_id=birdcoder",
  "redirect_uri=birdcoder%3A%2F%2Fauth%2Fcallback",
  "scope=openid+profile+offline_access",
  "state=app-state-1",
  `code_challenge=${"z".repeat(43)}`,
  "code_challenge_method=S256",
].join("&");

const APP_AUTHORIZE_REQUEST = {
  clientId: "birdcoder",
  codeChallenge: "z".repeat(43),
  redirectUri: "birdcoder://auth/callback",
  scope: "openid profile offline_access",
  state: "app-state-1",
};

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
    // torn away in the meantime, and the product header is already present.
    expect(screen.getByTestId("sdkwork-auth-session-check")).toBeInTheDocument();
    expect(screen.getByTestId("sdkwork-auth-brand-name")).toBeInTheDocument();
    expect(screen.queryByLabelText(/^account$/iu)).not.toBeInTheDocument();

    resolveSession(sessionFor("Current Operator"));

    expect(
      await screen.findByTestId("sdkwork-auth-account-choice"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Current Operator").length).toBeGreaterThan(0);
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

    expect(await screen.findByLabelText(/^account$/iu)).toBeInTheDocument();
    expect(
      screen.queryByTestId("sdkwork-auth-account-choice"),
    ).not.toBeInTheDocument();
    expect(completeOAuthAuthorization).not.toHaveBeenCalled();
  });

  it("shows the product header on the account choice and signs out from it", async () => {
    const signOut = vi.fn(async () => undefined);
    const controller = createSdkworkAuthController({
      service: {
        getCurrentSession: vi.fn().mockResolvedValue(sessionFor("Current Operator")),
        getCurrentUser: vi.fn().mockResolvedValue(null),
        signOut,
      },
    });

    renderAuthPage(controller, { brand: { name: "BirdCoder" } });

    expect(
      await screen.findByTestId("sdkwork-auth-account-choice"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("sdkwork-auth-brand-name")).toHaveTextContent("BirdCoder");
    expect(
      screen.getByTestId("sdkwork-auth-account-menu-trigger"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("sdkwork-auth-account-menu-trigger"));
    fireEvent.click(
      await screen.findByTestId("sdkwork-auth-account-menu-sign-out"),
    );

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
    });
    // Signing out from the header drops back to the account method form, where
    // another account can sign in and still complete the pending authorization.
    expect(await screen.findByLabelText(/^account$/iu)).toBeInTheDocument();
    expect(
      screen.queryByTestId("sdkwork-auth-account-choice"),
    ).not.toBeInTheDocument();
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

describe("app authorization rendered before its state exists", () => {
  function lazyController(options: {
    authenticated: boolean;
    completeOAuthAuthorization: (
      authorizationStateId: string,
    ) => Promise<SdkworkAuthOAuthAuthorizationCompletion>;
    createOAuthAuthorizationState: (
      input: SdkworkAuthAppAuthorizeRequest,
    ) => Promise<string>;
  }) {
    return createSdkworkAuthController({
      service: {
        completeOAuthAuthorization: options.completeOAuthAuthorization,
        createOAuthAuthorizationState: options.createOAuthAuthorizationState,
        getCurrentSession: vi.fn().mockResolvedValue(
          options.authenticated ? sessionFor("Current Operator") : null,
        ),
        getCurrentUser: vi.fn().mockResolvedValue(null),
        signIn: vi.fn().mockResolvedValue(sessionFor("Current Operator")),
        signOut: vi.fn(),
      },
    });
  }

  it("shows the login form and creates the state only when the visitor signs in", async () => {
    const createOAuthAuthorizationState = vi.fn(async () => "created-state-1");
    const completeOAuthAuthorization = vi.fn(async () => ({
      authorizationCode: "code-1",
      redirectUrl: "birdcoder://auth/callback?code=code-1&state=app-state-1",
    }));
    const controller = lazyController({
      authenticated: false,
      completeOAuthAuthorization,
      createOAuthAuthorizationState,
    });

    renderAuthPage(controller, { entry: `/auth/login?${APP_AUTHORIZE_SEARCH}` });

    // The anonymous visitor reaches the login form immediately: no waiting
    // page, no bounce to the product home page.
    expect(await screen.findByLabelText(/^account$/iu)).toBeInTheDocument();
    expect(createOAuthAuthorizationState).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/^account$/iu), {
      target: { value: "operator@example.test" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/iu), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/iu }));

    await waitFor(() => {
      expect(createOAuthAuthorizationState).toHaveBeenCalledWith(APP_AUTHORIZE_REQUEST);
    });
    await waitFor(() => {
      expect(completeOAuthAuthorization).toHaveBeenCalledWith("created-state-1");
    });
    expect(await screen.findByText("desktop-launch")).toBeInTheDocument();
  });

  it("shows the account choice for a signed-in browser and creates the state on continue", async () => {
    const createOAuthAuthorizationState = vi.fn(async () => "created-state-2");
    const completeOAuthAuthorization = vi.fn(async () => ({
      authorizationCode: "code-2",
      redirectUrl: "birdcoder://auth/callback?code=code-2&state=app-state-1",
    }));
    const controller = lazyController({
      authenticated: true,
      completeOAuthAuthorization,
      createOAuthAuthorizationState,
    });

    renderAuthPage(controller, {
      brand: { name: "BirdCoder" },
      entry: `/auth/login?${APP_AUTHORIZE_SEARCH}`,
    });

    expect(
      await screen.findByTestId("sdkwork-auth-account-choice"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("sdkwork-auth-brand-name")).toHaveTextContent("BirdCoder");
    expect(createOAuthAuthorizationState).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("sdkwork-auth-account-continue"));

    await waitFor(() => {
      expect(createOAuthAuthorizationState).toHaveBeenCalledWith(APP_AUTHORIZE_REQUEST);
    });
    await waitFor(() => {
      expect(completeOAuthAuthorization).toHaveBeenCalledWith("created-state-2");
    });
    expect(await screen.findByText("desktop-launch")).toBeInTheDocument();
  });
});

describe("auth page session check gating", () => {  it("renders the login form for a browser with no stored session", async () => {
    const getCurrentSession = vi.fn().mockResolvedValue(null);
    const controller = createSdkworkAuthController({
      service: {
        getCurrentSession,
        getCurrentUser: vi.fn().mockResolvedValue(null),
      },
    });

    renderAuthPage(controller, { entry: "/auth/login" });

    expect(await screen.findByLabelText(/^account$/iu)).toBeInTheDocument();
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

    expect(await screen.findByLabelText(/^account$/iu)).toBeInTheDocument();
    expect(
      screen.queryByTestId("sdkwork-auth-session-check"),
    ).not.toBeInTheDocument();
  });
});
