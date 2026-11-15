import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_OPERATOR_CAPABILITIES,
  DEFAULT_SELF_SERVICE_CAPABILITIES,
  MiniProgramCapabilityError,
  MiniProgramController,
  MiniProgramUnsupportedError,
} from "../src/controller";
import type { MiniProgramTransport } from "../src/controller";
import type { MiniProgramAccount, MiniProgramPage } from "../src/types";

function account(overrides: Partial<MiniProgramAccount> = {}): MiniProgramAccount {
  return {
    miniProgramId: "mp-1",
    tenantId: "t1",
    organizationId: "0",
    appId: "wx0001",
    displayName: "Example Mini Program",
    accessMode: "operator_authorized_account",
    ownerScope: "tenant",
    integrationId: "int-1",
    hasAppSecret: true,
    enabled: true,
    status: "active",
    loginCheckStatus: "unknown",
    providerConfig: {},
    ...overrides,
  };
}

function page(items: MiniProgramAccount[]): MiniProgramPage {
  return { items, totalItems: items.length, page: 1, pageSize: 20 };
}

function transport(overrides: Partial<MiniProgramTransport> = {}): MiniProgramTransport {
  return {
    list: vi.fn(async () => page([account()])),
    create: vi.fn(async () => account()),
    update: vi.fn(async () => account()),
    delete: vi.fn(async () => undefined),
    setEnabled: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("mini-program controller", () => {
  it("starts idle with the default page window", () => {
    const controller = new MiniProgramController(transport());
    expect(controller.getState()).toMatchObject({
      status: "idle",
      items: [],
      page: 1,
      pageSize: 20,
      query: "",
    });
  });

  it("loads a page and publishes ready state to subscribers", async () => {
    const controller = new MiniProgramController(transport());
    const seen: string[] = [];
    controller.subscribe(() => seen.push(controller.getState().status));

    await controller.load({ q: "wx" });

    expect(seen).toEqual(["loading", "ready"]);
    expect(controller.getState()).toMatchObject({ status: "ready", totalItems: 1, query: "wx" });
    expect(controller.getState().items[0]?.miniProgramId).toBe("mp-1");
  });

  it("surfaces list failures as error state instead of throwing", async () => {
    const controller = new MiniProgramController(
      transport({ list: vi.fn(async () => { throw new Error("boom"); }) }),
    );
    await controller.load();
    expect(controller.getState()).toMatchObject({ status: "error", error: "boom" });
  });

  it("refreshes the list after a mutation", async () => {
    const list = vi.fn(async () => page([account()]));
    const controller = new MiniProgramController(transport({ list }));
    await controller.load();
    list.mockClear();
    await controller.setEnabled("mp-1", false);
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("refuses capability-disabled calls instead of pretending success", async () => {
    const t = transport();
    const controller = new MiniProgramController(t, {
      ...DEFAULT_OPERATOR_CAPABILITIES,
      deleteAccount: false,
      editCredentials: false,
    });
    await expect(controller.remove("mp-1")).rejects.toBeInstanceOf(MiniProgramCapabilityError);
    await expect(
      controller.update("mp-1", { appSecret: "secret" }),
    ).rejects.toBeInstanceOf(MiniProgramCapabilityError);
    expect(t.delete).not.toHaveBeenCalled();
    expect(t.update).not.toHaveBeenCalled();
    // A patch without a credential field is still allowed.
    await expect(controller.update("mp-1", { displayName: "renamed" })).resolves.toBeDefined();
  });

  it("reports an unimplemented login check as unsupported", async () => {
    const controller = new MiniProgramController(transport(), DEFAULT_OPERATOR_CAPABILITIES);
    await expect(controller.runLoginCheck("mp-1")).rejects.toBeInstanceOf(
      MiniProgramUnsupportedError,
    );
  });

  it("runs the login check through the transport when implemented", async () => {
    const runLoginCheck = vi.fn(async () => ({
      accountId: "mp-1",
      status: "passed" as const,
    }));
    const controller = new MiniProgramController(
      transport({ runLoginCheck }),
      DEFAULT_OPERATOR_CAPABILITIES,
    );
    const result = await controller.runLoginCheck("mp-1");
    expect(runLoginCheck).toHaveBeenCalledWith("mp-1");
    expect(result.status).toBe("passed");
  });

  it("keeps the self-service posture from running diagnostics", async () => {
    const controller = new MiniProgramController(
      transport({ runLoginCheck: vi.fn() }),
      DEFAULT_SELF_SERVICE_CAPABILITIES,
    );
    await expect(controller.runLoginCheck("mp-1")).rejects.toBeInstanceOf(
      MiniProgramCapabilityError,
    );
  });
});
