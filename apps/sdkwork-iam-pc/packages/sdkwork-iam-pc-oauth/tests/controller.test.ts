import { describe, expect, it, vi } from "vitest";

import {
  createSdkworkIamOfficialAccountsClient,
  readOfficialAccountMenu,
  SdkworkIamOfficialAccountsController,
  toOfficialAccount,
  toOfficialAccountCommand,
  toOfficialAccountCreateCommand,
  type SdkworkIamOfficialAccountsApi,
} from "../src";

const RECORD = {
  officialAccountId: "acc-1",
  appId: "wx1234567890abcdef",
  displayName: "BirdCoder",
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
      {
        name: "更多",
        subButtons: [{ name: "帮助", type: "click", key: "HELP" }],
      },
    ],
  },
  enabled: true,
  status: "active",
  createdAt: "2026-11-05T00:00:00Z",
  updatedAt: "2026-11-05T00:00:00Z",
};

function memoryApi(overrides: Partial<SdkworkIamOfficialAccountsApi> = {}): SdkworkIamOfficialAccountsApi {
  return {
    list: vi.fn(async () => ({
      items: [RECORD],
      pageInfo: { mode: "offset" as const, page: 1, pageSize: 20, totalItems: "1" },
    })),
    create: vi.fn(async (body: Record<string, unknown>) => ({ ...RECORD, ...body })),
    update: vi.fn(async (_id: string, body?: Record<string, unknown>) => ({ ...RECORD, ...body })),
    delete: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("official-account adapter", () => {
  it("normalizes one record and its menu", () => {
    const account = toOfficialAccount(RECORD);
    expect(account.id).toBe("acc-1");
    expect(account.appId).toBe("wx1234567890abcdef");
    expect(account.hasAppSecret).toBe(true);
    expect(account.hasEncodingAesKey).toBe(false);
    expect(account.notifyEncryptMode).toBe("safe");
    expect(account.jsSecureDomains).toEqual(["api.example.com"]);
    expect(account.webAuthDomains).toEqual(["auth.example.com"]);
    expect(account.businessDomains).toEqual(["h5.example.com"]);
    expect(account.customMenu.buttons).toHaveLength(2);
    expect(account.customMenu.buttons[1]?.subButtons?.[0]).toMatchObject({
      name: "帮助",
      type: "click",
      key: "HELP",
    });
  });

  it("rejects records without an id", () => {
    expect(() => toOfficialAccount({ appId: "wx1" })).toThrow(/missing its id/);
  });

  it("reads a damaged menu as empty", () => {
    expect(readOfficialAccountMenu("not an object")).toEqual({ buttons: [] });
    expect(readOfficialAccountMenu({ buttons: "nope" })).toEqual({ buttons: [] });
  });

  it("omits blank secrets so an existing value is kept", () => {
    const command = toOfficialAccountCommand({
      appId: "wx1",
      displayName: "  Name  ",
      appSecret: "   ",
      notifyToken: "",
    });
    expect(command).toEqual({ displayName: "Name" });
    expect(toOfficialAccountCommand({ displayName: "N", appSecret: " s3cret " })).toMatchObject({
      appSecret: "s3cret",
    });
  });

  it("carries the WeChat domain sets and encryption mode into the command", () => {
    const command = toOfficialAccountCommand({
      displayName: "Name",
      notifyEncryptMode: "compatible",
      jsSecureDomains: ["api.example.com"],
      webAuthDomains: ["auth.example.com"],
      businessDomains: ["h5.example.com"],
    });
    expect(command).toMatchObject({
      displayName: "Name",
      notifyEncryptMode: "compatible",
      jsSecureDomains: ["api.example.com"],
      webAuthDomains: ["auth.example.com"],
      businessDomains: ["h5.example.com"],
    });
    // A patch that does not mention them leaves the stored sets untouched.
    expect(toOfficialAccountCommand({ displayName: "Name" })).not.toHaveProperty("jsSecureDomains");
    expect(toOfficialAccountCommand({ displayName: "Name" })).not.toHaveProperty("notifyEncryptMode");
  });

  it("names the WeChat AppID wechatAppId on create and leaves it out of updates", () => {
    const draft = { appId: " wx1 ", displayName: "Name" };
    expect(toOfficialAccountCreateCommand(draft)).toEqual({
      displayName: "Name",
      wechatAppId: "wx1",
    });
    // `appId` is an ambient context selector key the app API rejects in a body.
    expect(toOfficialAccountCommand(draft)).not.toHaveProperty("appId");
    expect(toOfficialAccountCreateCommand(draft)).not.toHaveProperty("appId");
  });

  it("maps the list page through the port", async () => {
    const client = createSdkworkIamOfficialAccountsClient(memoryApi());
    const page = await client.list({ q: " bird " });
    expect(page).toMatchObject({ totalItems: 1, page: 1, pageSize: 20 });
    expect(page.items[0]?.displayName).toBe("BirdCoder");
  });
});

describe("official-account controller", () => {
  it("loads, publishes only after success, and exposes failures", async () => {
    const api = memoryApi();
    const controller = new SdkworkIamOfficialAccountsController(
      createSdkworkIamOfficialAccountsClient(api),
    );
    const states: string[] = [];
    controller.subscribe(() => states.push(controller.getState().status));

    await controller.load({ q: "bird" });
    expect(controller.getState()).toMatchObject({
      status: "ready",
      totalItems: 1,
      query: "bird",
    });
    expect(states).toEqual(["loading", "ready"]);

    const failing = new SdkworkIamOfficialAccountsController(
      createSdkworkIamOfficialAccountsClient(memoryApi({
        list: vi.fn(async () => { throw new Error("network down"); }),
      })),
    );
    await failing.load();
    expect(failing.getState()).toMatchObject({ status: "error", error: "network down" });
  });

  it("creates, updates, toggles, saves a menu, and deletes through the port", async () => {
    const api = memoryApi();
    const client = createSdkworkIamOfficialAccountsClient(api);
    const controller = new SdkworkIamOfficialAccountsController(client);
    const draft = { appId: "wx1", displayName: "Name" };

    const created = await controller.create(draft);
    expect(created.displayName).toBe("Name");
    expect(api.create).toHaveBeenCalledWith({ displayName: "Name", wechatAppId: "wx1" });

    await controller.update("acc-1", { ...draft, customMenu: { buttons: [] } });
    expect(api.update).toHaveBeenCalledWith("acc-1", {
      displayName: "Name",
      customMenu: { buttons: [] },
    });

    await controller.setEnabled(toOfficialAccount(RECORD), false);
    expect(api.update).toHaveBeenCalledWith("acc-1", {
      displayName: "BirdCoder",
      enabled: false,
    });

    await controller.saveMenu(toOfficialAccount(RECORD), {
      buttons: [{ name: "帮助", type: "click", key: "HELP" }],
    });
    expect(api.update).toHaveBeenCalledWith("acc-1", {
      displayName: "BirdCoder",
      customMenu: { buttons: [{ name: "帮助", type: "click", key: "HELP" }] },
    });

    await controller.remove("acc-1");
    expect(api.delete).toHaveBeenCalledWith("acc-1");
  });
});
