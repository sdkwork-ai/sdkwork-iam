import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";

import { SdkworkIamOauthProviderConnectionsPage } from "../src";
import { OauthUrlScanLoginSection } from "../src/components/oauth-scan-login-sections";
import type { SdkworkIamOauthAdminController, SdkworkIamOauthScanLoginSettings } from "../src/types/oauth-admin-types";

function controllerWithState(state: Record<string, unknown>): SdkworkIamOauthAdminController {
  return {
    getState: () => state,
    load: () => Promise.resolve(state),
  } as SdkworkIamOauthAdminController;
}

const CONFIGURED_INTEGRATION_STATE = {
  integrations: [
    {
      id: "iamoi-google-1",
      integrationCode: "google-google-1",
      providerCode: "google",
      displayName: "Google Login",
      enabled: true,
    },
  ],
  providerCatalog: [
    { id: "iamopc-1", providerCode: "google", providerName: "Google", providerDisplayName: "Google" },
  ],
};

const URL_SETTINGS: SdkworkIamOauthScanLoginSettings = {
  mode: "url",
  urlLogin: {
    enabled: true,
    domain: "console.example.com",
    h5LoginOrigin: "https://console.example.com",
    protocol: "https",
  },
} as unknown as SdkworkIamOauthScanLoginSettings;

describe("SDKWork IAM OAuth page permission gating (REQ-2026-0107)", () => {
  it("keeps every provider mutation affordance enabled when no permissions prop is passed", () => {
    render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthProviderConnectionsPage
          controller={controllerWithState(CONFIGURED_INTEGRATION_STATE)}
        />
      </SdkworkI18nProvider>,
    );
    expect(screen.getByRole("button", { name: "添加平台" })).not.toBeDisabled();
    expect(screen.getByRole("switch")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "编辑" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "删除" })).not.toBeDisabled();
  });

  it("disables provider create, update, and delete affordances under a read-only permissions prop", () => {
    render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthProviderConnectionsPage
          controller={controllerWithState(CONFIGURED_INTEGRATION_STATE)}
          permissions={{ create: false, delete: false, update: false }}
        />
      </SdkworkI18nProvider>,
    );
    expect(screen.getByRole("button", { name: "添加平台" })).toBeDisabled();
    expect(screen.getByRole("switch")).toBeDisabled();
    expect(screen.getByRole("button", { name: "编辑" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "删除" })).toBeDisabled();
  });

  it("disables provider delete only when the delete member is false", () => {
    render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthProviderConnectionsPage
          controller={controllerWithState(CONFIGURED_INTEGRATION_STATE)}
          permissions={{ delete: false }}
        />
      </SdkworkI18nProvider>,
    );
    expect(screen.getByRole("button", { name: "添加平台" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "编辑" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "删除" })).toBeDisabled();
  });

  it("disables the URL scan-login save and preview buttons under their codes", () => {
    render(
      <SdkworkI18nProvider locale="zh-CN">
        <OauthUrlScanLoginSection
          canCreate={false}
          canUpdate={false}
          controller={controllerWithState({})}
          onChanged={() => undefined}
          onError={() => undefined}
          onNotice={() => undefined}
          onPreview={() => undefined}
          settings={URL_SETTINGS}
        />
      </SdkworkI18nProvider>,
    );
    expect(screen.getByRole("button", { name: "保存 URL 配置" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "生成登录二维码" })).toBeDisabled();
  });

  it("keeps the URL scan-login buttons enabled by default", () => {
    render(
      <SdkworkI18nProvider locale="zh-CN">
        <OauthUrlScanLoginSection
          controller={controllerWithState({})}
          onChanged={() => undefined}
          onError={() => undefined}
          onNotice={() => undefined}
          onPreview={() => undefined}
          settings={URL_SETTINGS}
        />
      </SdkworkI18nProvider>,
    );
    expect(screen.getByRole("button", { name: "保存 URL 配置" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "生成登录二维码" })).not.toBeDisabled();
  });
});
