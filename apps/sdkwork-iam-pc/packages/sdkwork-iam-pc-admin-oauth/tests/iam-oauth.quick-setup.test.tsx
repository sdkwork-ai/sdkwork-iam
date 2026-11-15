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
      redirectUri: "https://app.example.com/auth/oauth/callback",
    });

    expect(service.iam.oauth.integrations.list).toHaveBeenCalledWith({ page_size: 200, q: "wechat_mini_program" });
    expect(service.iam.oauth.integrations.create).toHaveBeenCalledWith({
      integrationCode: "mini-program-wx-test-mini-001",
      displayName: "My mini program",
      providerCode: "wechat_mini_program",
      providerClientId: "wx-test-mini-001",
      providerClientSecret: "secret-001",
      redirectUri: "https://app.example.com/auth/oauth/callback",
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
      redirectUri: "https://app.example.com/auth/oauth/callback",
    });

    expect(service.iam.oauth.integrations.create).not.toHaveBeenCalled();
    expect(service.iam.oauth.integrations.update).toHaveBeenCalledWith("iamoi-existing", {
      enabled: false,
      redirectUri: "https://app.example.com/auth/oauth/callback",
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

  it("renders the official accounts page as a list with a top add action", () => {
    const html = renderToStaticMarkup(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthOfficialAccountsPage controller={controller} />
      </SdkworkI18nProvider>,
    );
    expect(html).toContain("公众号账号");
    expect(html).toContain("添加公众号账号");
    expect(html).toContain("My official account");
    expect(html).toContain("未启用");
    expect(html).not.toContain("My mini program");
    // Name column shows the account type badge and the WeChat original id.
    expect(html).toContain("服务号");
    expect(html).toContain("gh_oa001");
    // Search input and filter selects are rendered in the header row.
    expect(html).toContain("搜索账号名称、AppID 或原始ID");
    // Radix Select renders options in a portal only when opened, so assert the
    // filter triggers are present instead of the option text.
    expect(html).toContain('aria-label="账号类型"');
    expect(html).toContain('aria-label="接通状态"');
    expect(html).toContain('aria-label="状态"');
  });

  it("renders the account list search box, filters, and delete actions", () => {
    const { unmount } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthOfficialAccountsPage controller={controller} />
      </SdkworkI18nProvider>,
    );
    expect(screen.getByPlaceholderText("搜索账号名称、AppID 或原始ID")).toBeTruthy();
    // Type / connection / enabled filter selects.
    expect(screen.getAllByRole("combobox")).toHaveLength(3);
    // Row actions include a delete button (with confirm dialog).
    const deleteButton = screen.getByTitle("删除");
    expect(deleteButton).toBeTruthy();
    fireEvent.click(deleteButton);
    expect(screen.getByText("确定删除账号 My official account 吗？删除后该账号的登录入口将立即失效。")).toBeTruthy();
    unmount();
  });

  it("generates and previews the official account follow QR from the row action", async () => {
    const service = createOauthServiceMock();
    (service.iam.oauth.resourceAccounts.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [{
        id: "iamora-2",
        integrationId: "iamoi-2",
        providerCode: "wechat",
        resourceAccountCode: "oa-wx-test",
        resourceAccountKind: "official_account",
        displayName: "My official account",
        providerAccountId: "wx-test-oa-001",
        // Follow QRs require the parameterized-QR API, which WeChat grants to
        // certified service accounts only.
        providerAccountType: "service",
        // Deliberately disabled for login: a follow QR only needs valid
        // credentials, so the row action stays available.
        enabled: false,
      }],
    });
    (service.iam.oauth.resourceAccounts.followQrCodes.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      expireSeconds: 0,
      permanent: true,
      qrCode: "https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=abc",
      qrContent: "https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=abc",
      qrMode: "official_account",
      scene: "follow:iamora-2",
      ticket: "abc",
    });
    const liveController = createSdkworkIamOauthAdminController(service as never);
    const { unmount } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthOfficialAccountsPage controller={liveController} />
      </SdkworkI18nProvider>,
    );

    // Row action opens the follow QR dialog even for a disabled account
    // (generation only needs the configured credentials) and renders the
    // WeChat image.
    await screen.findByText("My official account");
    const qrButton = await screen.findByTitle("生成带参数二维码");
    expect((qrButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(qrButton);
    await screen.findByText("关注二维码");
    const image = await screen.findByAltText("My official account");
    expect(image.getAttribute("src"))
      .toBe("https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=abc");
    expect(screen.getByText("场景值: follow:iamora-2")).toBeTruthy();
    expect(screen.getByText("该二维码为永久有效，可长期投放使用。")).toBeTruthy();
    unmount();
  });

  it("renders the connection status column per account authorization", () => {
    const html = renderToStaticMarkup(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthOfficialAccountsPage controller={controller} />
      </SdkworkI18nProvider>,
    );
    // The official account fixture is authorized -> connected.
    expect(html).toContain("已接通");
  });

  it("renders the official account AppID column and the uploaded logo icon", () => {
    const html = renderToStaticMarkup(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthOfficialAccountsPage controller={controller} />
      </SdkworkI18nProvider>,
    );
    // The dedicated AppID column carries the provider account id.
    expect(html).toContain("wx-test-oa-001");
    // The logo column renders the stored account logo (config.logoUrl).
    expect(html).toContain('data:image/png;base64,AAAA');
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

  it("renders official account domain rows with dynamic add inputs", async () => {
    const configuredState = {
      ...EMPTY_STATE,
      resourceAccounts: [{
        id: "iamora-2",
        integrationId: "iamoi-2",
        providerCode: "wechat",
        resourceAccountCode: "oa-wx-test",
        resourceAccountKind: "official_account",
        displayName: "My official account",
        providerAccountId: "wx-test-oa-001",
        providerAccountType: "subscription",
        providerClientSecret: "oa-secret-1",
        enabled: true,
        providerConfigJson: JSON.stringify({
          webDomain: "app.example.com",
          jsSecureDomains: ["js.example.com"],
          businessDomains: ["open.example.com"],
          verifyFiles: [
            { domain: "app.example.com", fileName: "MP_verify_app.txt", content: "wx-app" },
            { domain: "js.example.com", fileName: "MP_verify_js.txt", content: "wx-js" },
          ],
        }),
      }],
    };
    const configuredController = {
      getState: () => configuredState,
      load: () => Promise.resolve(configuredState),
      updateAccountConfig: () => Promise.resolve({}),
      runResourceAccountVerification: () => Promise.resolve({}),
      setResourceAccountEnabled: () => Promise.resolve({}),
      deleteResourceAccount: () => Promise.resolve({}),
      listPageResource: () => Promise.resolve([]),
    } as unknown as SdkworkIamOauthAdminController;
    const { unmount } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthOfficialAccountsPage controller={configuredController} />
      </SdkworkI18nProvider>,
    );
    await screen.findByText("My official account");
    // Subscription accounts lack the parameterized-QR API permission, so the
    // follow-QR row action stays hidden for them.
    expect(screen.queryByTitle("生成带参数二维码")).toBeNull();
    fireEvent.click(screen.getByTitle("操作"));

    // Official accounts keep the server config tab with generate/copy links.
    expect(await screen.findByRole("tab", { name: "服务器配置" })).toBeTruthy();
    // The saved AppID, AppSecret and account type are prefilled in the edit
    // drawer (type echoes the saved subscription value, not the service
    // default).
    expect(screen.getByDisplayValue("wx-test-oa-001")).toBeTruthy();
    expect(screen.getByDisplayValue("oa-secret-1")).toBeTruthy();
    await openSelect("账号类型");
    expect(checkedOption("订阅号")).toBe(true);
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
    fireEvent.mouseDown(screen.getByRole("tab", { name: "服务器配置" }));
    expect(screen.getAllByText("生成令牌").length).toBeGreaterThan(0);
    expect(screen.getAllByText("生成密钥").length).toBeGreaterThan(0);
    // Copy links appear for both secret fields.
    expect(screen.getAllByText("复制").length).toBeGreaterThan(0);
    // Generate fills the token input with a 32-char value.
    fireEvent.click(screen.getAllByText("生成令牌")[0]);
    const tokenInputs = screen.getAllByDisplayValue(/^[A-Za-z0-9]{32}$/u);
    expect(tokenInputs.length).toBeGreaterThan(0);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "开发配置" }));

    // Official account domains: the three WeChat console sets, dynamic rows.
    fireEvent.mouseDown(screen.getByRole("tab", { name: "开发配置" }));
    expect(screen.getByText("域名配置")).toBeTruthy();
    // The label also appears as the kind badge on the verification deploy rows.
    expect(screen.getAllByText("JS 接口安全域名").length).toBeGreaterThan(0);
    expect(screen.getAllByText("网页授权域名").length).toBeGreaterThan(0);
    expect(screen.getAllByText("业务域名").length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue("js.example.com")).toBeTruthy();
    expect(screen.getByDisplayValue("open.example.com")).toBeTruthy();
    // The legacy primary domain folds into the web-authorization set.
    expect(screen.getByDisplayValue("app.example.com")).toBeTruthy();
    // One add control per protected-domain set.
    expect(screen.getAllByText("添加域名").length).toBe(3);
    // The console's per-set caps are shown next to each label.
    expect(screen.getAllByText("1/5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1/2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1/3").length).toBeGreaterThan(0);
    // The account-level verification file is prefilled from the first legacy
    // per-domain entry and drives the deploy addresses.
    expect(screen.getByDisplayValue("MP_verify_app.txt")).toBeTruthy();
    expect(screen.getByText("需部署到以下地址")).toBeTruthy();
    expect(screen.getAllByText("app.example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("js.example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("open.example.com").length).toBeGreaterThan(0);
    unmount();
  });

  it("validates official account domains against the WeChat console rules", async () => {
    const configuredState = {
      ...EMPTY_STATE,
      resourceAccounts: [{
        id: "iamora-3",
        integrationId: "iamoi-3",
        providerCode: "wechat",
        resourceAccountCode: "oa-wx-test-2",
        resourceAccountKind: "official_account",
        displayName: "Domain validation account",
        providerAccountId: "wx-test-oa-003",
        enabled: true,
        providerConfigJson: JSON.stringify({
          redirectUri: "https://app.example.com/auth/oauth/callback",
          webAuthDomains: ["app.example.com"],
        }),
      }],
    };
    const updateAccountConfig = vi.fn(() => Promise.resolve({}));
    const configuredController = {
      getState: () => configuredState,
      load: () => Promise.resolve(configuredState),
      updateAccountConfig,
      runResourceAccountVerification: () => Promise.resolve({}),
      setResourceAccountEnabled: () => Promise.resolve({}),
      deleteResourceAccount: () => Promise.resolve({}),
      listPageResource: () => Promise.resolve([]),
    } as unknown as SdkworkIamOauthAdminController;
    const { unmount } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthOfficialAccountsPage controller={configuredController} />
      </SdkworkI18nProvider>,
    );
    await screen.findByText("Domain validation account");
    fireEvent.click(screen.getByTitle("操作"));
    await screen.findByRole("tab", { name: "开发配置" });
    fireEvent.mouseDown(screen.getByRole("tab", { name: "开发配置" }));

    // An IP literal is rejected by the console, so it never becomes a row; the
    // typed value stays in the add field so it can be corrected.
    const jsAddInput = screen.getByLabelText("JS 接口安全域名 添加域名");
    fireEvent.change(jsAddInput, { target: { value: "192.168.1.10" } });
    fireEvent.click(screen.getAllByText("添加域名")[0]);
    expect(screen.getByText(/请填写域名，如 app\.example\.com/u)).toBeTruthy();
    expect(screen.getByLabelText("JS 接口安全域名 添加域名")).toHaveProperty("value", "192.168.1.10");
    expect(screen.getAllByText("0/5").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("删除: 192.168.1.10")).toBeNull();

    // A valid host is normalized and appended.
    fireEvent.change(screen.getByLabelText("JS 接口安全域名 添加域名"), {
      target: { value: "HTTPS://JS.Example.com/" },
    });
    fireEvent.click(screen.getAllByText("添加域名")[0]);
    expect(screen.getByDisplayValue("js.example.com")).toBeTruthy();
    expect(screen.getAllByText("1/5").length).toBeGreaterThan(0);
    unmount();
  });

  it("refuses to save a callback URL outside every web-authorization domain", async () => {
    const configuredState = {
      ...EMPTY_STATE,
      resourceAccounts: [{
        id: "iamora-4",
        integrationId: "iamoi-4",
        providerCode: "wechat",
        resourceAccountCode: "oa-wx-test-3",
        resourceAccountKind: "official_account",
        displayName: "Callback mismatch account",
        providerAccountId: "wx-test-oa-004",
        enabled: true,
        providerConfigJson: JSON.stringify({
          redirectUri: "https://other.example.com/auth/oauth/callback",
          webAuthDomains: ["app.example.com"],
        }),
      }],
    };
    const updateAccountConfig = vi.fn(() => Promise.resolve({}));
    const configuredController = {
      getState: () => configuredState,
      load: () => Promise.resolve(configuredState),
      updateAccountConfig,
      runResourceAccountVerification: () => Promise.resolve({}),
      setResourceAccountEnabled: () => Promise.resolve({}),
      deleteResourceAccount: () => Promise.resolve({}),
      listPageResource: () => Promise.resolve([]),
    } as unknown as SdkworkIamOauthAdminController;
    const { unmount } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthOfficialAccountsPage controller={configuredController} />
      </SdkworkI18nProvider>,
    );
    await screen.findByText("Callback mismatch account");
    fireEvent.click(screen.getByTitle("操作"));
    await screen.findByRole("tab", { name: "开发配置" });

    fireEvent.click(screen.getByText("保存配置"));
    expect(await screen.findByText("回调地址必须位于已配置的网页授权域名下。")).toBeTruthy();
    expect(updateAccountConfig).not.toHaveBeenCalled();
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
