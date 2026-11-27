import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { SdkworkIamH5AuthRoutes } from "../src/index";
import type { SdkworkIamH5AuthController } from "../src/index";

function createFakeController(): SdkworkIamH5AuthController {
  return {
    completeScanLogin: vi.fn().mockResolvedValue(undefined),
    createOAuthAuthorizationUrl: vi.fn().mockResolvedValue("https://open.weixin.qq.com/auth"),
    getState: () => ({ status: "idle" as const }),
    listOAuthProviders: vi.fn().mockResolvedValue([]),
    login: vi.fn().mockResolvedValue({ kind: "session", session: { sessionId: "s" } }),
    loginWithCode: vi.fn().mockResolvedValue({ kind: "session", session: { sessionId: "s" } }),
    loginWithOAuth: vi.fn().mockResolvedValue({ sessionId: "s" }),
    loginWithMiniProgram: vi.fn().mockResolvedValue({ sessionId: "s" }),
    logout: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue({ kind: "session", session: { sessionId: "s" } }),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    resolveScanLoginContext: () => undefined,
    selectOrganization: vi.fn().mockResolvedValue({ sessionId: "s" }),
    selectPersonalLogin: vi.fn().mockResolvedValue({ sessionId: "s" }),
    sendVerificationCode: vi.fn().mockResolvedValue(undefined),
  } as unknown as SdkworkIamH5AuthController;
}

function renderRoutes(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SdkworkIamH5AuthRoutes controller={createFakeController()} locale="zh-CN" />
    </MemoryRouter>,
  );
}

describe("@sdkwork/iam-h5-auth route host", () => {
  it("renders the mobile login screen at the default base path", () => {
    renderRoutes("/auth/login");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("密码登录");
    expect(screen.getByText("同意并登录")).toBeTruthy();
    expect(screen.getByRole("checkbox")).toBeTruthy();
  });

  it("renders the OAuth callback screen at the OAuth callback path", () => {
    renderRoutes("/oauth/callback");
    // The callback screen shows its processing state before the exchange.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Signing in");
  });

  it("renders the callback screen at a host-registered callback path", () => {
    render(
      <MemoryRouter initialEntries={["/site/oauth/done"]}>
        <SdkworkIamH5AuthRoutes
          controller={createFakeController()}
          locale="zh-CN"
          oauthCallbackPath="/site/oauth/done"
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Signing in");
  });

  it("keeps the account base path independent of the OAuth callback path", () => {
    // A custom account base path must not move the provider callback: the two
    // namespaces are separate.
    render(
      <MemoryRouter initialEntries={["/oauth/callback"]}>
        <SdkworkIamH5AuthRoutes
          controller={createFakeController()}
          basePath="/login/mobile"
          locale="zh-CN"
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Signing in");
  });

  it("honors a custom base path", () => {
    render(
      <MemoryRouter initialEntries={["/login/mobile"]}>
        <SdkworkIamH5AuthRoutes controller={createFakeController()} basePath="/login/mobile" locale="zh-CN" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("密码登录");
  });
});
