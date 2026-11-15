import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_OPERATOR_CAPABILITIES,
  DEFAULT_SELF_SERVICE_CAPABILITIES,
  OfficialAccountsCapabilityError,
  OfficialAccountsUnsupportedError,
  createOfficialAccountsController,
} from "../src";
import type {
  OfficialAccountsCapabilities,
  OfficialAccountsPage,
  OfficialAccountsTransport,
  OfficialAccount,
} from "../src";

const ACCOUNT: OfficialAccount = {
  id: "acc-1",
  appId: "wx1234567890abcdef",
  displayName: "Example Account",
  hasAppSecret: true,
  hasNotifyToken: false,
  hasEncodingAesKey: false,
  notifyEncryptMode: "safe",
  jsSecureDomains: ["api.example.com"],
  webAuthDomains: [],
  businessDomains: [],
  customMenu: { buttons: [] },
  enabled: true,
  status: "active",
};

function memoryPage(items: readonly OfficialAccount[] = [ACCOUNT]): OfficialAccountsPage {
  return { items, totalItems: items.length, page: 1, pageSize: 20 };
}

function memoryTransport(
  overrides: Partial<OfficialAccountsTransport> = {},
): OfficialAccountsTransport {
  return {
    list: vi.fn(async () => memoryPage()),
    create: vi.fn(async (draft) => ({ ...ACCOUNT, displayName: draft.displayName })),
    update: vi.fn(async (_id, patch) => ({ ...ACCOUNT, ...patch })),
    delete: vi.fn(async () => undefined),
    updateConfig: vi.fn(async () => ACCOUNT),
    loadCustomMenu: vi.fn(async (id) => ({ accountId: id, menu: { buttons: [] } })),
    saveCustomMenu: vi.fn(async (id, menu) => ({ accountId: id, menu })),
    publishCustomMenu: vi.fn(async (id) => ({ accountId: id, published: true })),
    setEnabled: vi.fn(async () => undefined),
    setQrLogin: vi.fn(async () => undefined),
    createFollowQrCode: vi.fn(async () => ({ qrCode: "https://example.test/qr" })),
    runVerification: vi.fn(async () => undefined),
    ...overrides,
  };
}

function capabilities(
  patch: Partial<OfficialAccountsCapabilities> = {},
): OfficialAccountsCapabilities {
  return { ...DEFAULT_OPERATOR_CAPABILITIES, ...patch };
}

describe("official accounts controller", () => {
  it("loads, publishes only after success, and exposes failures", async () => {
    const transport = memoryTransport();
    const controller = createOfficialAccountsController(transport, capabilities());
    const statuses: string[] = [];
    controller.subscribe(() => statuses.push(controller.getState().status));

    await controller.load({ q: "bird" });
    expect(controller.getState()).toMatchObject({ status: "ready", totalItems: 1, query: "bird" });
    expect(statuses).toEqual(["loading", "ready"]);

    const failing = createOfficialAccountsController(
      memoryTransport({ list: vi.fn(async () => { throw new Error("network down"); }) }),
      capabilities(),
    );
    await failing.load();
    expect(failing.getState()).toMatchObject({ status: "error", error: "network down" });
  });

  it("creates, updates, toggles, saves a menu, and deletes through the transport", async () => {
    const transport = memoryTransport();
    const controller = createOfficialAccountsController(transport, capabilities());

    await controller.create({ appId: "wx1", displayName: "Name" });
    expect(transport.create).toHaveBeenCalledWith({ appId: "wx1", displayName: "Name" });

    await controller.update("acc-1", { displayName: "Name", enabled: false });
    expect(transport.update).toHaveBeenCalledWith("acc-1", { displayName: "Name", enabled: false });

    await controller.setEnabled(ACCOUNT, false);
    expect(transport.update).toHaveBeenCalledWith("acc-1", { enabled: false });

    await controller.saveMenu(ACCOUNT, { buttons: [{ name: "Help", type: "click", key: "HELP" }] });
    expect(transport.update).toHaveBeenCalledWith("acc-1", {
      customMenu: { buttons: [{ name: "Help", type: "click", key: "HELP" }] },
    });

    await controller.remove("acc-1");
    expect(transport.delete).toHaveBeenCalledWith("acc-1");
  });

  it("addresses a self-service menu save by id plus display name", async () => {
    const transport = memoryTransport();
    const controller = createOfficialAccountsController(
      transport,
      DEFAULT_SELF_SERVICE_CAPABILITIES,
    );
    await controller.load();
    await controller.saveMenu("acc-1", { buttons: [] });
    expect(transport.update).toHaveBeenCalledWith("acc-1", {
      displayName: "Example Account",
      customMenu: { buttons: [] },
    });
  });

  it("resolves the display name of an id-addressed self-service update", async () => {
    const transport = memoryTransport();
    const controller = createOfficialAccountsController(
      transport,
      DEFAULT_SELF_SERVICE_CAPABILITIES,
    );
    await controller.load();
    await controller.setEnabled("acc-1", false);
    expect(transport.update).toHaveBeenCalledWith("acc-1", {
      displayName: "Example Account",
      enabled: false,
    });
  });

  it("dispatches the operator-only actions", async () => {
    const transport = memoryTransport();
    const controller = createOfficialAccountsController(transport, DEFAULT_OPERATOR_CAPABILITIES);
    await controller.load();

    await controller.publishMenu(ACCOUNT, { buttons: [] });
    expect(transport.publishCustomMenu).toHaveBeenCalledWith("acc-1", { buttons: [] });

    await controller.setQrLogin(ACCOUNT, true);
    expect(transport.setQrLogin).toHaveBeenCalledWith("acc-1", true);

    const qr = await controller.createFollowQrCode("acc-1");
    expect(qr.qrCode).toBe("https://example.test/qr");
    expect(transport.createFollowQrCode).toHaveBeenCalledWith("acc-1");

    await controller.runVerification("acc-1", "domain");
    expect(transport.runVerification).toHaveBeenCalledWith("acc-1", "domain");

    await controller.updateConfig("acc-1", { logoUrl: "drive://logo" });
    expect(transport.updateConfig).toHaveBeenCalledWith("acc-1", { logoUrl: "drive://logo" });
  });

  it("refuses the actions a host capability disables", async () => {
    const controller = createOfficialAccountsController(
      memoryTransport(),
      capabilities({ deleteAccount: false, publishMenu: false, manageQrLogin: false }),
    );
    await expect(controller.remove("acc-1")).rejects.toBeInstanceOf(OfficialAccountsCapabilityError);
    await expect(controller.publishMenu(ACCOUNT, { buttons: [] }))
      .rejects.toBeInstanceOf(OfficialAccountsCapabilityError);
    await expect(controller.setQrLogin(ACCOUNT, true))
      .rejects.toBeInstanceOf(OfficialAccountsCapabilityError);
    await expect(controller.createFollowQrCode(ACCOUNT))
      .rejects.toBeInstanceOf(OfficialAccountsCapabilityError);
    await expect(controller.runVerification(ACCOUNT, "domain")).resolves.toBeUndefined();
  });

  it("refuses domain verification when domain management is off", async () => {
    const controller = createOfficialAccountsController(
      memoryTransport(),
      capabilities({ manageDomains: false }),
    );
    await expect(controller.runVerification(ACCOUNT, "domain"))
      .rejects.toBeInstanceOf(OfficialAccountsCapabilityError);
  });

  it("reports a transport that cannot perform an action", async () => {
    const transport = memoryTransport({
      publishCustomMenu: undefined,
      createFollowQrCode: undefined,
    });
    const controller = createOfficialAccountsController(transport, DEFAULT_OPERATOR_CAPABILITIES);
    await expect(controller.publishMenu(ACCOUNT, { buttons: [] }))
      .rejects.toBeInstanceOf(OfficialAccountsUnsupportedError);
    await expect(controller.createFollowQrCode(ACCOUNT))
      .rejects.toBeInstanceOf(OfficialAccountsUnsupportedError);
  });

  it("defaults the two postures to their documented capability sets", () => {
    expect(DEFAULT_OPERATOR_CAPABILITIES).toMatchObject({
      mode: "operator",
      publishMenu: true,
      manageQrLogin: true,
    });
    expect(DEFAULT_SELF_SERVICE_CAPABILITIES).toMatchObject({
      mode: "self-service",
      editCredentials: true,
      publishMenu: false,
      manageQrLogin: false,
      manageDomains: true,
      manageNotify: true,
      deleteAccount: true,
    });
  });
});
