import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";

import { createSdkworkIamOauthAdminController } from "../src/services/oauth-admin-controller";
import { OauthResourceDrawer } from "../src/components/oauth-admin-ui";
async function openSelect(label: string) {
  const trigger = screen.getByRole("combobox", { name: label });
  const pointerDown = new PointerEvent("pointerdown", {
    bubbles: true,
    button: 0,
    cancelable: true,
    pointerId: 1,
    pointerType: "mouse",
  });
  trigger.dispatchEvent(pointerDown);
  await screen.findByRole("listbox");
}

function checkedOption(label: string) {
  return screen.getByRole("option", { name: label }).getAttribute("data-state") === "checked";
}

import { createOauthServiceMock } from "./fixtures/oauth-service-mock";
import {
  SdkworkIamOauthMiniProgramAccountsPage,
  SdkworkIamOauthOfficialAccountsPage,
  SdkworkIamOauthProviderConnectionsPage,
} from "../src";
import type { SdkworkIamOauthAdminController } from "../src/types/oauth-admin-types";



describe("SDKWork IAM OAuth quick setup controller", () => {
  it("creates a mini program login integration and resource account in one step", async () => {
    const service = createOauthServiceMock();
    const controller = createSdkworkIamOauthAdminController(service as never);

    await controller.createAccountSetup("mini_program", {
      appId: "wx-test-mini-001",
      appSecret: "secret-001",
      displayName: "My mini program",
      enabled: true,
      redirectUri: "https://app.example.com/oauth/callback",
    });

    expect(service.iam.oauth.integrations.list).toHaveBeenCalledWith({ page_size: 200, q: "wechat_mini_program" });
    expect(service.iam.oauth.integrations.create).toHaveBeenCalledWith({
      integrationCode: "mini-program-wx-test-mini-001",
      displayName: "My mini program",
      providerCode: "wechat_mini_program",
      providerClientId: "wx-test-mini-001",
      providerClientSecret: "secret-001",
      redirectUri: "https://app.example.com/oauth/callback",
      surfaceKind: "mini_program",
      enabled: true,
    });
    expect(service.iam.oauth.resourceAccounts.create).toHaveBeenCalledWith({
      integrationId: "iamoi-1",
      providerCode: "wechat_mini_program",
      resourceAccountCode: "mini-wx-test-mini-001",
      resourceAccountKind: "mini_program",
      displayName: "My mini program",
      providerAccountId: "wx-test-mini-001",
      accessMode: "operator_managed",
      enabled: true,
    });
  });

  it("creates an official account login integration and reuses an existing integration", async () => {
    const service = createOauthServiceMock();
    (service.iam.oauth.integrations.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [{
        id: "iamoi-existing",
        providerCode: "wechat",
        providerClientId: "wx-test-oa-001",
        displayName: "Existing WeChat",
      }],
    });
    const controller = createSdkworkIamOauthAdminController(service as never);

    await controller.createAccountSetup("official_account", {
      appId: "wx-test-oa-001",
      appSecret: "secret-002",
      displayName: "My official account",
      enabled: false,
      redirectUri: "https://app.example.com/oauth/callback",
    });

    expect(service.iam.oauth.integrations.create).not.toHaveBeenCalled();
    expect(service.iam.oauth.integrations.update).toHaveBeenCalledWith("iamoi-existing", {
      enabled: false,
      redirectUri: "https://app.example.com/oauth/callback",
    });
    expect(service.iam.oauth.resourceAccounts.create).toHaveBeenCalledWith(expect.objectContaining({
      integrationId: "iamoi-existing",
      providerCode: "wechat",
      resourceAccountKind: "official_account",
      providerAccountId: "wx-test-oa-001",
      enabled: false,
    }));
  });

  it("syncs the account and integration enabled state", async () => {
    const service = createOauthServiceMock();
    const controller = createSdkworkIamOauthAdminController(service as never);

    await controller.setResourceAccountEnabled("iamora-9", "iamoi-9", false);

    expect(service.iam.oauth.resourceAccounts.update).toHaveBeenCalledWith("iamora-9", { enabled: false });
    expect(service.iam.oauth.integrations.update).toHaveBeenCalledWith("iamoi-9", { enabled: false });
  });

  it("updates only the account when no integration is linked", async () => {
    const service = createOauthServiceMock();
    const controller = createSdkworkIamOauthAdminController(service as never);

    await controller.setResourceAccountEnabled("iamora-10", "", true);

    expect(service.iam.oauth.resourceAccounts.update).toHaveBeenCalledWith("iamora-10", { enabled: true });
    expect(service.iam.oauth.integrations.update).not.toHaveBeenCalled();
  });
});

const EMPTY_STATE = {
  accountLinks: [],
  callbackEvents: [],
  claimMappings: [],
  clients: [],
  diagnosticRuns: [],
  flowConfigs: [],
  grants: [],
  integrations: [],
  operationalResources: [],
  operatorPlatforms: [],
  policies: [],
  providerCatalog: [{
    id: "iamopc-1",
    providerCode: "google",
    providerName: "Google",
    providerDisplayName: "Google",
  }, {
    id: "iamopc-2",
    providerCode: "wechat",
    providerName: "WeChat",
    providerDisplayName: "WeChat",
  }],
  resourceAccounts: [{
    id: "iamora-1",
    integrationId: "iamoi-1",
    providerCode: "wechat_mini_program",
    resourceAccountCode: "mini-wx-test",
    resourceAccountKind: "mini_program",
    displayName: "My mini program",
    providerAccountId: "wx-test-mini-001",
    enabled: true,
  }, {
    id: "iamora-2",
    integrationId: "iamoi-2",
    providerCode: "wechat",
    resourceAccountCode: "oa-wx-test",
    resourceAccountKind: "official_account",
    displayName: "My official account",
    providerAccountId: "wx-test-oa-001",
    providerAccountType: "service",
    providerAccountOriginalId: "gh_oa001",
    authorizationStatus: "authorized",
    providerConfigJson: JSON.stringify({ logoUrl: "data:image/png;base64,AAAA" }),
    enabled: false,
  }],
  scopeProfiles: [],
  secrets: [],
  status: "ready",
  surfaces: [],
  tenantBindings: [],
  webhookConfigs: [],
};

// These doubles implement only the members the rendered read paths reach, so the
// compiler has no provable overlap with the controller interface and each cast
// goes through `unknown`.
const controller = {
  getState: () => EMPTY_STATE,
  load: () => Promise.resolve(EMPTY_STATE),
} as unknown as SdkworkIamOauthAdminController;

/**
 * Backend-admin controller double for the mini-program thin shell: the shared
 * panel lists through `listResourceAccountPage` and mutates through the
 * resource-account actions the operator transport calls.
 * @param overrides - members the test asserts or redirects.
 */
function miniProgramPageController(
  overrides: Record<string, unknown> = {},
): {
  controller: SdkworkIamOauthAdminController;
  listResourceAccountPage: ReturnType<typeof vi.fn>;
} {
  const listResourceAccountPage = vi.fn(async () => ({
    items: EMPTY_STATE.resourceAccounts,
    pageInfo: { page: 1, pageSize: 20, totalItems: "2" },
  }));
  return {
    controller: {
      getState: () => EMPTY_STATE,
      load: () => Promise.resolve(EMPTY_STATE),
      listResourceAccountPage,
      createAccountSetup: vi.fn(async () => ({ id: "iamora-new" })),
      updateAccountProfile: vi.fn(async () => ({})),
      updateAccountCredentials: vi.fn(async () => ({})),
      updateAccountConfig: vi.fn(async () => ({})),
      deleteResourceAccount: vi.fn(async () => ({})),
      setResourceAccountEnabled: vi.fn(async () => ({})),
      runResourceAccountMiniProgramLoginCheck: vi.fn(async () => ({})),
      ...overrides,
    } as unknown as SdkworkIamOauthAdminController,
    listResourceAccountPage,
  };
}

/**
 * Backend-admin controller double for the official-account thin shell: the
 * shared panel lists through `listResourceAccountPage` and mutates through the
 * official-account actions the operator transport calls.
 * @param rows - the resource-account rows the list returns.
 * @param overrides - members the test asserts or redirects.
 */
function officialPageController(
  rows: readonly unknown[],
  overrides: Record<string, unknown> = {},
): {
  controller: SdkworkIamOauthAdminController;
  listResourceAccountPage: ReturnType<typeof vi.fn>;
} {
  const listResourceAccountPage = vi.fn(async () => ({
    items: rows,
    pageInfo: { page: 1, pageSize: 20, totalItems: String(rows.length) },
  }));
  return {
    controller: {
      getState: () => EMPTY_STATE,
      load: () => Promise.resolve(EMPTY_STATE),
      listResourceAccountPage,
      createAccountSetup: vi.fn(async () => ({ id: "iamora-new" })),
      updateAccountProfile: vi.fn(async () => ({})),
      updateAccountCredentials: vi.fn(async () => ({})),
      updateAccountConfig: vi.fn(async () => ({})),
      deleteResourceAccount: vi.fn(async () => ({})),
      setResourceAccountEnabled: vi.fn(async () => ({})),
      setResourceAccountQrLogin: vi.fn(async () => ({})),
      createAccountFollowQrCode: vi.fn(async () => ({
        qrCode: "https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=abc",
        scene: "follow:iamora-1",
      })),
      runResourceAccountVerification: vi.fn(async () => ({})),
      ...overrides,
    } as unknown as SdkworkIamOauthAdminController,
    listResourceAccountPage,
  };
}

/** One official-account row as the backend list projects it. */
function officialAccountRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "iamora-1",
    integrationId: "iamoi-1",
    providerCode: "wechat",
    resourceAccountCode: "oa-wx-test",
    resourceAccountKind: "official_account",
    displayName: "My official account",
    providerAccountId: "wx-test-oa-001",
    providerAccountType: "service",
    providerAccountOriginalId: "gh_oa001",
    providerConfigJson: JSON.stringify({
      logoUrl: "drive://spaces/space-1/nodes/node-1",
      webAuthDomains: ["app.example.com"],
    }),
    enabled: true,
    ...overrides,
  };
}

describe("SDKWork IAM OAuth quick setup pages", () => {
  it("shows only added platforms as rows and offers an add action", () => {
    const html = renderToStaticMarkup(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthProviderConnectionsPage controller={controller} />
      </SdkworkI18nProvider>,
    );
    expect(html).toContain("尚未添加平台");
    expect(html).toContain("添加平台");
    // Catalog platforms stay hidden until the operator adds them.
    expect(html).not.toContain("Google");
    expect(html).not.toContain("wechat");
  });

  it("renders added platforms as rows with enable/disable and delete actions", () => {
    const configuredState = {
      ...EMPTY_STATE,
      integrations: [{
        id: "iamoi-google-1",
        integrationCode: "google-google-1",
        providerCode: "google",
        displayName: "Google Login",
        enabled: true,
      }],
    };
    const configuredController = {
      getState: () => configuredState,
      load: () => Promise.resolve(configuredState),
    } as unknown as SdkworkIamOauthAdminController;
    const html = renderToStaticMarkup(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthProviderConnectionsPage controller={configuredController} />
      </SdkworkI18nProvider>,
    );
    expect(html).toContain("已配置平台（1）");
    expect(html).toContain("Google");
    expect(html).toContain("google");
    expect(html).toContain("已开启");
    expect(html).not.toContain("尚未添加平台");
  });

  it("renders the mini program accounts page through the shared panel", async () => {
    const { controller: miniController } = miniProgramPageController();
    const { unmount } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthMiniProgramAccountsPage controller={miniController} />
      </SdkworkI18nProvider>,
    );
    // Only the `mini_program` rows of the unified aggregate are listed; the
    // shared panel owns the title, the add action, and the row actions.
    expect(await screen.findByText("My mini program")).toBeTruthy();
    expect(screen.getByText("wx-test-mini-001")).toBeTruthy();
    expect(screen.getByText("添加小程序账号")).toBeTruthy();
    expect(screen.queryByText("My official account")).toBeNull();
    unmount();
  });

  it("renders the official accounts page through the shared panel", async () => {
    const { controller: officialController } = officialPageController([
      officialAccountRow(),
      { id: "iamora-mini", resourceAccountKind: "mini_program", displayName: "My mini program" },
    ]);
    const { unmount } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthOfficialAccountsPage controller={officialController} />
      </SdkworkI18nProvider>,
    );
    // Only the `official_account` rows of the unified aggregate are listed; the
    // shared panel owns the columns, the type badge, and the add action.
    expect(await screen.findByText("My official account")).toBeTruthy();
    expect(screen.getByText("wx-test-oa-001")).toBeTruthy();
    expect(screen.getByText("服务号")).toBeTruthy();
    expect(screen.getByText("gh_oa001")).toBeTruthy();
    expect(screen.getByText("添加公众号账号")).toBeTruthy();
    expect(screen.queryByText("My mini program")).toBeNull();
    unmount();
  });

  it("creates an official account through the one-click setup", async () => {
    const createAccountSetup = vi.fn(async () => ({ id: "iamora-new" }));
    const { controller: officialController } = officialPageController([], { createAccountSetup });
    const { unmount } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthOfficialAccountsPage controller={officialController} />
      </SdkworkI18nProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "添加公众号账号" }));
    fireEvent.change(screen.getByLabelText("账号名称"), { target: { value: "New official" } });
    fireEvent.change(screen.getByLabelText("AppID"), { target: { value: "wx-oa-new" } });
    fireEvent.change(screen.getByLabelText("AppSecret"), { target: { value: "secret-oa" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    // Official accounts still go through the one-click integration → account
    // setup; the shared panel supplies the credential fields it validates.
    await waitFor(() => {
      expect(createAccountSetup).toHaveBeenCalledWith("official_account", expect.objectContaining({
        appId: "wx-oa-new",
        appSecret: "secret-oa",
        displayName: "New official",
        accountType: "service",
        enabled: true,
      }));
    });
    unmount();
  });

  it("edits an official account through the shared drawer", async () => {
    const updateAccountProfile = vi.fn(async () => ({}));
    const updateAccountConfig = vi.fn(async () => ({}));
    const { controller: officialController } = officialPageController(
      [officialAccountRow()],
      { updateAccountProfile, updateAccountConfig },
    );
    const { unmount } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthOfficialAccountsPage controller={officialController} />
      </SdkworkI18nProvider>,
    );
    fireEvent.click(await screen.findByText("My official account"));
    fireEvent.change(await screen.findByLabelText("账号名称"), { target: { value: "Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    // The profile group writes the display name (and integration name); the
    // provider configuration document still carries the stored domains/logo.
    await waitFor(() => {
      expect(updateAccountProfile).toHaveBeenCalledWith("iamora-1", "iamoi-1", expect.objectContaining({
        displayName: "Renamed",
      }));
    });
    expect(updateAccountConfig).toHaveBeenCalledWith("iamora-1", expect.objectContaining({
      logoUrl: "drive://spaces/space-1/nodes/node-1",
      webAuthDomains: ["app.example.com"],
    }));
    unmount();
  });

  it("generates the official account follow QR from the shared row action", async () => {
    const createAccountFollowQrCode = vi.fn(async () => ({
      qrCode: "https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=abc",
      scene: "follow:iamora-1",
    }));
    const { controller: officialController } = officialPageController(
      [officialAccountRow({ enabled: false })],
      { createAccountFollowQrCode },
    );
    const { unmount } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthOfficialAccountsPage controller={officialController} />
      </SdkworkI18nProvider>,
    );
    await screen.findByText("My official account");
    fireEvent.click(screen.getByRole("button", { name: "关注二维码" }));

    // The follow QR only needs valid credentials, so a disabled login entry
    // keeps the action; the shared dialog shows the returned image and scene.
    await waitFor(() => {
      expect(createAccountFollowQrCode).toHaveBeenCalledWith("iamora-1");
    });
    const image = await screen.findByAltText("My official account");
    expect(image.getAttribute("src"))
      .toBe("https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=abc");
    expect(screen.getByText("场景值: follow:iamora-1")).toBeTruthy();
    expect(screen.getByText("该二维码为永久有效，可长期投放使用。")).toBeTruthy();
    unmount();
  });

  it("hides the actions the page permissions forbid", async () => {
    const { controller: officialController } = officialPageController([officialAccountRow()]);
    const { unmount } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthOfficialAccountsPage
          controller={officialController}
          permissions={{ create: false, update: false, delete: false }}
        />
      </SdkworkI18nProvider>,
    );
    expect(await screen.findByText("My official account")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "添加公众号账号" })).toBeNull();
    expect(screen.queryByRole("button", { name: "删除" })).toBeNull();
    expect(screen.queryByRole("button", { name: "关注二维码" })).toBeNull();
    unmount();
  });

  it("renders drawer forms with a bottom action bar (cancel + confirm)", async () => {
    const { findByText } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <OauthResourceDrawer
          confirmDisabled={false}
          confirmLabel="保存并开启"
          description="测试抽屉"
          onConfirm={() => undefined}
          open
          triggerLabel="添加平台"
        >
          <div>表单字段</div>
        </OauthResourceDrawer>
      </SdkworkI18nProvider>,
    );
    // The footer action bar keeps cancel and confirm together at the bottom.
    expect(await findByText("保存并开启")).toBeTruthy();
    const footer = document.querySelector('[data-sdk-ui="drawer-footer"]');
    expect(footer).toBeTruthy();
    expect(footer?.textContent).toContain("取消");
    expect(footer?.textContent).toContain("保存并开启");
  });

  it("opens the shared account drawer from a row and edits the profile", async () => {
    const rows = [{
      id: "iamora-1",
      integrationId: "iamoi-1",
      providerCode: "wechat_mini_program",
      resourceAccountCode: "mini-wx-test",
      resourceAccountKind: "mini_program",
      displayName: "My mini program",
      providerAccountId: "wx-test-mini-001",
      providerAccountType: "enterprise",
      enabled: true,
      providerConfigJson: JSON.stringify({ category: "商城", note: "旧备注" }),
    }];
    const listResourceAccountPage = vi.fn(async () => ({
      items: rows,
      pageInfo: { page: 1, pageSize: 20, totalItems: "1" },
    }));
    const updateAccountProfile = vi.fn(async () => ({}));
    const updateAccountConfig = vi.fn(async () => ({}));
    const updateAccountCredentials = vi.fn(async () => ({}));
    const { controller: miniController } = miniProgramPageController({
      listResourceAccountPage,
      updateAccountProfile,
      updateAccountConfig,
      updateAccountCredentials,
    });
    const { unmount } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthMiniProgramAccountsPage controller={miniController} />
      </SdkworkI18nProvider>,
    );
    fireEvent.click(await screen.findByText("My mini program"));

    // The shared drawer edits the identity, the credential, and the
    // non-identity provider settings; the AppID is immutable after create.
    expect(await screen.findByText("身份信息")).toBeTruthy();
    expect(screen.getByDisplayValue("My mini program")).toBeTruthy();
    expect(screen.getByDisplayValue("wx-test-mini-001")).toBeDisabled();
    expect(screen.getByLabelText("AppSecret")).toBeTruthy();
    expect(screen.getByRole("button", { name: "登录检测" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("显示名称"), { target: { value: "Renamed" } });
    fireEvent.change(screen.getByLabelText("备注"), { target: { value: "新备注" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    // Profile, provider configuration, and the integration display name write
    // in dependency order; an untouched credential is never re-submitted.
    await waitFor(() => {
      expect(updateAccountProfile).toHaveBeenCalledWith("iamora-1", "iamoi-1", {
        displayName: "Renamed",
      });
    });
    expect(updateAccountConfig).toHaveBeenCalledWith("iamora-1", {
      category: "商城",
      note: "新备注",
    });
    expect(updateAccountCredentials).not.toHaveBeenCalled();
    unmount();
  });

  it("renders the shared create drawer's identity and credential sections", async () => {
    const { controller: miniController } = miniProgramPageController();
    const { unmount } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthMiniProgramAccountsPage controller={miniController} />
      </SdkworkI18nProvider>,
    );
    fireEvent.click(await screen.findByText("添加小程序账号"));

    expect(await screen.findByText("身份信息")).toBeTruthy();
    expect(screen.getByText("凭据")).toBeTruthy();
    expect(screen.getByLabelText("AppID")).toBeTruthy();
    expect(screen.getByLabelText("AppSecret")).toBeTruthy();
    expect(screen.getByLabelText("主体类型")).toBeTruthy();
    expect(screen.getByLabelText("业务分类")).toBeTruthy();
    // The login-check section only exists for a saved account.
    expect(screen.queryByRole("button", { name: "登录检测" })).toBeNull();
    unmount();
  });

  it("creates a mini program account through the one-click setup", async () => {
    const createAccountSetup = vi.fn(async () => ({ id: "iamora-new" }));
    const { controller: miniController } = miniProgramPageController({ createAccountSetup });
    const { unmount } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthMiniProgramAccountsPage controller={miniController} />
      </SdkworkI18nProvider>,
    );
    fireEvent.click(await screen.findByText("添加小程序账号"));
    fireEvent.change(screen.getByLabelText("显示名称"), { target: { value: "New mini" } });
    fireEvent.change(screen.getByLabelText("AppID"), { target: { value: "wx-mini-001" } });
    fireEvent.change(screen.getByLabelText("AppSecret"), { target: { value: "secret-001" } });
    fireEvent.change(screen.getByLabelText("业务分类"), { target: { value: "商城" } });
    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    // Mini programs go through the one-click setup (integration → account) and
    // need no OAuth callback URL.
    await waitFor(() => {
      expect(createAccountSetup).toHaveBeenCalledWith("mini_program", {
        appId: "wx-mini-001",
        appSecret: "secret-001",
        displayName: "New mini",
        accountType: "personal",
        enabled: true,
        redirectUri: "",
        config: { category: "商城" },
      });
    });
    unmount();
  });
});
