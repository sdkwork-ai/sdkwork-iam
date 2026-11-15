import { describe, expect, it, vi } from "vitest";

import {
  createOperatorTransport,
  createSelfServiceTransport,
  toOfficialAccount,
} from "../src";
import type {
  OfficialAccountsOperatorOperations,
  OfficialAccountsSelfServiceApi,
  OfficialAccount,
} from "../src";

const RECORD = {
  officialAccountId: "acc-1",
  appId: "wx1234567890abcdef",
  displayName: "Example Account",
  accountType: "service",
  originalId: "gh_123",
  logoUrl: "https://example.test/logo.png",
  hasAppSecret: true,
  notifyUrl: "https://example.test/notify",
  hasNotifyToken: true,
  hasEncodingAesKey: false,
  notifyEncryptMode: "safe",
  jsSecureDomains: ["api.example.com"],
  webAuthDomains: ["auth.example.com"],
  businessDomains: ["h5.example.com"],
  customMenu: {
    buttons: [
      { name: "产品", type: "view", url: "https://example.test/product" },
      { name: "更多", subButtons: [{ name: "帮助", type: "click", key: "HELP" }] },
    ],
  },
  enabled: true,
  status: "active",
};

function memoryApi(overrides: Partial<OfficialAccountsSelfServiceApi> = {}): OfficialAccountsSelfServiceApi {
  return {
    list: vi.fn(async () => ({
      items: [RECORD],
      pageInfo: { page: 1, pageSize: 20, totalItems: "1" },
    })),
    create: vi.fn(async (body: Record<string, unknown>) => ({ ...RECORD, ...body })),
    update: vi.fn(async (_id: string, body?: Record<string, unknown>) => ({ ...RECORD, ...body })),
    delete: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("self-service transport", () => {
  it("maps one page and the record model", async () => {
    const transport = createSelfServiceTransport(memoryApi());
    const page = await transport.list({ q: " bird " });
    expect(page).toMatchObject({ totalItems: 1, page: 1, pageSize: 20 });
    expect(page.items[0]).toMatchObject({
      id: "acc-1",
      appId: "wx1234567890abcdef",
      jsSecureDomains: ["api.example.com"],
      notifyEncryptMode: "safe",
    });
  });

  it("names the WeChat AppID wechatAppId on create and omits blank secrets", async () => {
    const api = memoryApi();
    const transport = createSelfServiceTransport(api);
    await transport.create({ appId: " wx1 ", displayName: " Name ", appSecret: "   " });
    expect(api.create).toHaveBeenCalledWith({ displayName: "Name", wechatAppId: "wx1" });
  });

  it("keeps the stored value when an update omits a secret", async () => {
    const api = memoryApi();
    const transport = createSelfServiceTransport(api);
    await transport.update("acc-1", { displayName: "Name", appSecret: "" });
    expect(api.update).toHaveBeenCalledWith("acc-1", { displayName: "Name" });
  });

  it("flattens a provider configuration document onto the app-API body", async () => {
    const api = memoryApi();
    const transport = createSelfServiceTransport(api);
    await transport.updateConfig("acc-1", {
      logoUrl: "drive://logo",
      jsSecureDomains: ["api.example.com"],
      businessDomains: ["h5.example.com"],
      notify: { url: "https://example.test/notify", token: "abc", encryptMode: "safe" },
    });
    expect(api.update).toHaveBeenCalledWith("acc-1", {
      logoUrl: "drive://logo",
      jsSecureDomains: ["api.example.com"],
      businessDomains: ["h5.example.com"],
      notifyUrl: "https://example.test/notify",
      notifyToken: "abc",
      notifyEncryptMode: "safe",
    });
  });

  it("saves a custom-menu draft through the update command", async () => {
    const api = memoryApi();
    const transport = createSelfServiceTransport(api);
    const saved = await transport.saveCustomMenu("acc-1", { buttons: [] });
    expect(saved).toEqual({ accountId: "acc-1", menu: { buttons: [] } });
    expect(api.update).toHaveBeenCalledWith("acc-1", { customMenu: { buttons: [] } });
  });

  it("rejects a menu read the app slice cannot serve", async () => {
    const transport = createSelfServiceTransport(memoryApi());
    await expect(transport.loadCustomMenu("acc-1")).rejects.toThrow(/does not support/);
  });
  it("syncs, publishes and rolls back the app-owned menu through the customMenus slice", async () => {
    const sync = vi.fn(async (id: string) => ({
      accountId: id,
      displayName: "Example",
      menu: { buttons: [], version: 2 },
      source: "wechat",
      version: 2,
    }));
    const publish = vi.fn(async (id: string) => ({
      accountId: id,
      menu: { buttons: [{ key: "menu-0", name: "Help" }], version: 3 },
      source: "wechat",
      version: 3,
    }));
    const rollback = vi.fn(async (id: string) => ({
      accountId: id,
      menu: { buttons: [], version: 4 },
      source: "wechat",
      version: 4,
    }));
    const transport = createSelfServiceTransport(memoryApi({ customMenus: { sync, publish, rollback } }));
    const synced = await transport.syncCustomMenu!("acc-1", 1);
    expect(sync).toHaveBeenCalledWith("acc-1", { baseVersion: 1 });
    expect(synced.menu.version).toBe(2);
    const result = await transport.publishCustomMenu!("acc-1", {
      buttons: [{ key: "menu-0", name: "Help" }],
    });
    expect(publish).toHaveBeenCalledWith("acc-1", { buttons: [{ key: "menu-0", name: "Help" }] });
    expect(result.published).toBe(true);
    const restored = await transport.rollbackCustomMenu!("acc-1", 2, 3);
    expect(rollback).toHaveBeenCalledWith("acc-1", { version: 2, baseVersion: 3 });
    expect(restored.menu.version).toBe(4);
  });

});

describe("operator transport", () => {
  function memoryOperations(
    overrides: Partial<OfficialAccountsOperatorOperations> = {},
  ): OfficialAccountsOperatorOperations {
    return {
      list: vi.fn(async () => ({
        items: [toOfficialAccount(RECORD)],
        totalItems: 1,
        page: 1,
        pageSize: 20,
      })),
      create: vi.fn(async () => ({ ...RECORD, resourceAccountKind: "official_account" })),
      updateProfile: vi.fn(async () => undefined),
      updateCredentials: vi.fn(async () => undefined),
      updateConfig: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
      setEnabled: vi.fn(async () => undefined),
      setQrLogin: vi.fn(async () => undefined),
      createFollowQrCode: vi.fn(async () => ({ qrCode: "https://example.test/qr", scene: "follow:1" })),
      runVerification: vi.fn(async () => undefined),
      ...overrides,
    };
  }

  it("applies a grouped patch in dependency order", async () => {
    const order: string[] = [];
    const operations = memoryOperations({
      updateProfile: vi.fn(async () => { order.push("profile"); }),
      updateCredentials: vi.fn(async () => { order.push("credentials"); }),
      updateConfig: vi.fn(async () => { order.push("config"); }),
      setEnabled: vi.fn(async () => { order.push("enabled"); }),
    });
    const transport = createOperatorTransport(operations);
    await transport.update("iamora-1", {
      profile: { displayName: "Renamed" },
      credentials: { appSecret: "s3cret" },
      config: { logoUrl: "drive://logo" },
      enabled: false,
    });
    expect(order).toEqual(["profile", "credentials", "config", "enabled"]);
    expect(operations.updateProfile).toHaveBeenCalledWith("iamora-1", { displayName: "Renamed" });
    expect(operations.updateCredentials).toHaveBeenCalledWith("iamora-1", { appSecret: "s3cret" });
    expect(operations.updateConfig).toHaveBeenCalledWith("iamora-1", { logoUrl: "drive://logo" });
    expect(operations.setEnabled).toHaveBeenCalledWith("iamora-1", false);
  });

  it("groups an ungrouped panel-shaped patch", async () => {
    const operations = memoryOperations();
    const transport = createOperatorTransport(operations);
    await transport.update("iamora-1", {
      displayName: "Renamed",
      appId: "wx-new",
      appSecret: "s3cret",
      logoUrl: "drive://logo",
      jsSecureDomains: ["api.example.com"],
      notifyUrl: "https://example.test/notify",
      notifyToken: "abc",
      notifyEncryptMode: "safe",
      customMenu: { buttons: [] },
      enabled: false,
    });
    expect(operations.updateProfile).toHaveBeenCalledWith("iamora-1", {
      displayName: "Renamed",
    });
    expect(operations.updateCredentials).toHaveBeenCalledWith("iamora-1", {
      appId: "wx-new",
      appSecret: "s3cret",
    });
    expect(operations.updateConfig).toHaveBeenCalledWith("iamora-1", {
      logoUrl: "drive://logo",
      jsSecureDomains: ["api.example.com"],
      customMenu: { buttons: [] },
      notify: { url: "https://example.test/notify", token: "abc", encryptMode: "safe" },
    });
    expect(operations.setEnabled).toHaveBeenCalledWith("iamora-1", false);
  });

  it("survives a host write that returns no usable record", async () => {
    const transport = createOperatorTransport(memoryOperations({
      updateConfig: vi.fn(async () => ({})),
    }));
    const updated = await transport.updateConfig("iamora-1", { logoUrl: "drive://logo" });
    expect(updated).toMatchObject({ id: "iamora-1", logoUrl: "drive://logo" });
  });

  it("normalizes the created record and the follow QR", async () => {
    const operations = memoryOperations();
    const transport = createOperatorTransport(operations);
    const created = await transport.create({ appId: "wx1", displayName: "Name" });
    expect(created).toMatchObject({ id: "acc-1", resourceAccountKind: "official_account" });
    const qr = await transport.createFollowQrCode?.("iamora-1");
    expect(qr).toMatchObject({ qrCode: "https://example.test/qr" });
    await transport.setEnabled("iamora-1", true);
    expect(operations.setEnabled).toHaveBeenCalledWith("iamora-1", true);
    await transport.delete("iamora-1");
    expect(operations.remove).toHaveBeenCalledWith("iamora-1");
    await transport.runVerification?.("iamora-1", "domain");
    expect(operations.runVerification).toHaveBeenCalledWith("iamora-1", "domain");
  });

  it("reads the unified administration mode", () => {
    expect(toOfficialAccount({ ...RECORD, accessMode: "self_managed_account" }).accessMode)
      .toBe("self_managed_account");
    expect(toOfficialAccount({ ...RECORD, access_mode: "operator_managed" }).accessMode)
      .toBe("operator_authorized_account");
    expect(toOfficialAccount({
      ...RECORD,
      accessMode: "self_managed_account",
      maintainerUserId: "user-1",
      qrDefaultEnabled: "0",
      resourceAccountKind: "official_account",
    })).toMatchObject({
      maintainerUserId: "user-1",
      qrDefaultEnabled: false,
      resourceAccountKind: "official_account",
    });
  });

  it("reads the owner labels the operator list renders", () => {
    expect(toOfficialAccount({
      ...RECORD,
      organization_id: "iamorg-1",
      organization_name: "Acme Org",
      maintainer_user_id: "iamu-1",
      maintainer_display_name: "Li Ming",
      maintainer_username: "liming",
    })).toMatchObject({
      organizationId: "iamorg-1",
      organizationName: "Acme Org",
      maintainerUserId: "iamu-1",
      maintainerDisplayName: "Li Ming",
      maintainerUsername: "liming",
    });
  });

  it("reads the provider configuration document instead of duplicate columns", () => {
    const account: OfficialAccount = toOfficialAccount({
      id: "iamora-9",
      providerClientId: "wx9",
      displayName: "From config",
      providerConfigJson: JSON.stringify({
        logoUrl: "drive://logo",
        jsSecureDomains: ["api.example.com"],
        customMenu: { buttons: [{ name: "Help", type: "click", key: "HELP" }] },
      }),
    });
    expect(account).toMatchObject({
      id: "iamora-9",
      appId: "wx9",
      logoUrl: "drive://logo",
      jsSecureDomains: ["api.example.com"],
    });
    expect(account.customMenu.buttons[0]).toMatchObject({
      name: "Help",
      type: "click",
      key: "menu-0",
      message: "HELP",
    });
  });
});
