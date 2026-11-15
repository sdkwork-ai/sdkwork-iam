import { describe, expect, it, vi } from "vitest";

import {
  MINI_PROGRAM_ACCOUNT_KIND,
  MiniProgramUnsupportedError,
  createMiniProgramBackendOperations,
  createMiniProgramBackendTransport,
  createMiniProgramOperatorTransport,
  isMiniProgramAccountRecord,
  toMiniProgramAccount,
  toMiniProgramPage,
  type MiniProgramOperatorBackendPort,
  type MiniProgramOperatorOperations,
} from "../src";
import type { MiniProgramAccount } from "../src";

const RECORD = {
  id: "iamora-1",
  tenantId: "t1",
  organizationId: "0",
  integrationId: "iamoi-1",
  oauthClientId: "iamoc-1",
  providerCode: "wechat_mini_program",
  resourceAccountKind: "mini_program",
  displayName: "Shop mini program",
  providerAccountId: "wx1234567890abcdef",
  hasAppSecret: true,
  providerAccountType: "enterprise",
  providerAccountOriginalId: "gh_123456",
  accessMode: "operator_managed",
  providerConfigJson: JSON.stringify({ category: "商城", note: "kept" }),
  enabled: 1,
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

function account(overrides: Partial<MiniProgramAccount> = {}): MiniProgramAccount {
  return {
    miniProgramId: "iamora-1",
    tenantId: "t1",
    organizationId: "0",
    appId: "wx1234567890abcdef",
    displayName: "Shop mini program",
    accessMode: "operator_authorized_account",
    ownerScope: "tenant",
    integrationId: "iamoi-1",
    hasAppSecret: true,
    enabled: true,
    status: "active",
    loginCheckStatus: "unknown",
    providerConfig: {},
    ...overrides,
  };
}

function operations(overrides: Partial<MiniProgramOperatorOperations> = {}): MiniProgramOperatorOperations {
  return {
    list: vi.fn(async () => ({ items: [account()], totalItems: 1, page: 1, pageSize: 20 })),
    create: vi.fn(async () => account()),
    updateProfile: vi.fn(async () => account()),
    updateCredentials: vi.fn(async () => account()),
    updateConfig: vi.fn(async () => account()),
    remove: vi.fn(async () => undefined),
    setEnabled: vi.fn(async () => undefined),
    runLoginCheck: vi.fn(async () => ({ status: "passed" })),
    ...overrides,
  };
}

describe("mini-program record normalization", () => {
  it("projects camelCase backend rows onto the account model", () => {
    expect(toMiniProgramAccount(RECORD)).toMatchObject({
      miniProgramId: "iamora-1",
      appId: "wx1234567890abcdef",
      displayName: "Shop mini program",
      originalId: "gh_123456",
      accountType: "enterprise",
      accessMode: "operator_authorized_account",
      ownerScope: "tenant",
      integrationId: "iamoi-1",
      oauthClientId: "iamoc-1",
      hasAppSecret: true,
      enabled: true,
      status: "active",
      loginCheckStatus: "unknown",
      providerConfig: { category: "商城", note: "kept" },
    });
  });

  it("reads snake_case rows and the surface mini_program_* fields", () => {
    const normalized = toMiniProgramAccount({
      resource_account_id: "iamora-2",
      tenant_id: "t2",
      organization_id: "org-1",
      integration_id: "iamoi-2",
      provider_code: "wechat_mini_program",
      resource_account_kind: "mini_program",
      display_name: "Snake",
      provider_account_id: "wx-snake",
      provider_account_original_id: "gh_snake",
      access_mode: "self_managed_account",
      owner_scope: "organization",
      mini_program_environment: "trial",
      mini_program_release_channel: "gray",
      login_check_status: "passed",
      last_login_checked_at: "2026-02-01T00:00:00.000Z",
      has_app_secret: 0,
      enabled: 0,
      status: "inactive",
    });
    expect(normalized).toMatchObject({
      miniProgramId: "iamora-2",
      ownerScope: "organization",
      accessMode: "self_managed_account",
      environment: "trial",
      releaseChannel: "gray",
      loginCheckStatus: "passed",
      lastLoginCheckedAt: "2026-02-01T00:00:00.000Z",
      hasAppSecret: false,
      enabled: false,
      status: "inactive",
    });
  });

  it("detects mini-program rows by kind or provider code and drops others", () => {
    expect(isMiniProgramAccountRecord({ resourceAccountKind: "mini_program" })).toBe(true);
    expect(isMiniProgramAccountRecord({ providerCode: "wechat_mini_program" })).toBe(true);
    expect(isMiniProgramAccountRecord({ resourceAccountKind: "official_account" })).toBe(false);
    expect(isMiniProgramAccountRecord({ provider_code: "wechat_official_account" })).toBe(false);
    expect(isMiniProgramAccountRecord("nope")).toBe(false);
    const page = toMiniProgramPage([
      RECORD,
      { id: "iamora-oa", resourceAccountKind: "official_account" },
      { resourceAccountKind: "mini_program" },
    ], { page: 2, pageSize: 5, totalItems: "7" });
    expect(page).toMatchObject({ totalItems: 7, page: 2, pageSize: 5 });
    expect(page.items).toHaveLength(1);
  });

  it("rejects a record without an id", () => {
    expect(() => toMiniProgramAccount({ displayName: "orphan" }))
      .toThrow(/missing its id/);
    expect(() => toMiniProgramAccount(null)).toThrow(/not an object/);
  });
});

describe("operator transport", () => {
  it("applies a patch group in dependency order", async () => {
    const order: string[] = [];
    const ops = operations({
      updateProfile: vi.fn(async () => { order.push("profile"); return account(); }),
      updateCredentials: vi.fn(async () => { order.push("credentials"); return account(); }),
      updateConfig: vi.fn(async () => { order.push("config"); return account(); }),
      setEnabled: vi.fn(async () => { order.push("enabled"); }),
    });
    const transport = createMiniProgramOperatorTransport(ops);
    await transport.update("iamora-1", {
      displayName: "Renamed",
      accountType: "personal",
      originalId: "gh_new",
      appSecret: "s3cret",
      providerConfig: { category: "商城" },
      enabled: false,
    });
    expect(order).toEqual(["profile", "credentials", "config", "enabled"]);
    expect(ops.updateProfile).toHaveBeenCalledWith("iamora-1", {
      displayName: "Renamed",
      accountType: "personal",
      originalId: "gh_new",
    });
    expect(ops.updateCredentials).toHaveBeenCalledWith("iamora-1", { appSecret: "s3cret" });
    expect(ops.updateConfig).toHaveBeenCalledWith("iamora-1", { category: "商城" });
    expect(ops.setEnabled).toHaveBeenCalledWith("iamora-1", false);
  });

  it("survives a write that returns no record", async () => {
    const transport = createMiniProgramOperatorTransport(operations({
      updateProfile: vi.fn(async () => undefined),
      updateConfig: vi.fn(async () => undefined),
    }));
    await expect(transport.update("iamora-1", {
      displayName: "Renamed",
      providerConfig: { note: "kept" },
    })).resolves.toMatchObject({
      miniProgramId: "iamora-1",
      displayName: "Renamed",
      providerConfig: { note: "kept" },
    });
  });

  it("fails loudly when a requested write group has no host operation", async () => {
    const transport = createMiniProgramOperatorTransport(operations({
      updateProfile: undefined,
    }));
    await expect(transport.update("iamora-1", { displayName: "Renamed" }))
      .rejects.toBeInstanceOf(MiniProgramUnsupportedError);
  });

  it("normalizes the login-check result and omits the member when unimplemented", async () => {
    const transport = createMiniProgramOperatorTransport(operations({
      runLoginCheck: vi.fn(async () => ({ status: "failed", message: "invalid secret" })),
    }));
    await expect(transport.runLoginCheck?.("iamora-1")).resolves.toMatchObject({
      accountId: "iamora-1",
      status: "failed",
      message: "invalid secret",
    });
    const withoutCheck = createMiniProgramOperatorTransport(operations({ runLoginCheck: undefined }));
    expect(withoutCheck.runLoginCheck).toBeUndefined();
  });

  it("synthesizes the created account when the host returns no record", async () => {
    const transport = createMiniProgramOperatorTransport(operations({
      create: vi.fn(async () => undefined),
    }));
    await expect(transport.create({
      appId: "wx1",
      displayName: "New",
      appSecret: "s",
      providerConfig: { category: "c" },
    })).resolves.toMatchObject({
      appId: "wx1",
      displayName: "New",
      hasAppSecret: true,
      providerConfig: { category: "c" },
    });
  });
});

describe("generated backend operations", () => {
  function port(overrides: Partial<MiniProgramOperatorBackendPort["resourceAccounts"]> = {}) {
    const resourceAccounts = {
      list: vi.fn(async () => ({ items: [RECORD] as unknown[] })),
      create: vi.fn(async (body: Record<string, unknown>): Promise<Record<string, unknown>> => ({
        ...RECORD,
        ...body,
      })),
      update: vi.fn(async (): Promise<Record<string, unknown>> => ({ ...RECORD })),
      delete: vi.fn(async () => undefined),
      miniProgramLoginChecks: { create: vi.fn(async () => ({ status: "passed" })) },
    };
    Object.assign(resourceAccounts, overrides);
    const integrations = {
      list: vi.fn(async () => ({ items: [] as unknown[] })),
      create: vi.fn(async (): Promise<Record<string, unknown>> => ({ id: "iamoi-new" })),
      update: vi.fn(async () => ({})),
    };
    return {
      resourceAccounts,
      integrations,
      backendPort: { resourceAccounts, integrations } as MiniProgramOperatorBackendPort,
    };
  }

  it("pages the bounded backend scan client-side", async () => {
    const rows = Array.from({ length: 3 }, (_value, index) => ({
      ...RECORD,
      id: `iamora-${index}`,
      providerAccountId: `wx-${index}`,
    }));
    const p = port({ list: vi.fn(async () => ({ items: rows })) });
    const ops = createMiniProgramBackendOperations(p.backendPort);
    const page = await ops.list({ page: 2, pageSize: 2, q: " wx " });
    expect(p.resourceAccounts.list).toHaveBeenCalledWith({ page: 1, pageSize: 200, q: "wx" });
    expect(page.totalItems).toBe(3);
    expect(page.items.map((item) => item.appId)).toEqual(["wx-2"]);
  });

  it("creates the login integration and the account in one setup", async () => {
    const p = port();
    const ops = createMiniProgramBackendOperations(p.backendPort);
    await ops.create({
      appId: " wx-new ",
      appSecret: " secret ",
      displayName: " New ",
      originalId: "gh_new",
      accountType: "enterprise",
      providerConfig: { category: "商城" },
    });
    expect(p.integrations.create).toHaveBeenCalledWith({
      integrationCode: "mini-program-wx-new",
      displayName: "New",
      providerCode: "wechat_mini_program",
      providerClientId: "wx-new",
      providerClientSecret: "secret",
      redirectUri: "",
      surfaceKind: "mini_program",
      enabled: true,
    });
    expect(p.resourceAccounts.create).toHaveBeenCalledWith({
      integrationId: "iamoi-new",
      providerCode: "wechat_mini_program",
      resourceAccountCode: "mini-wx-new",
      resourceAccountKind: MINI_PROGRAM_ACCOUNT_KIND,
      displayName: "New",
      providerAccountId: "wx-new",
      providerAccountType: "enterprise",
      providerAccountOriginalId: "gh_new",
      accessMode: "operator_managed",
      config: { category: "商城" },
      enabled: true,
    });
  });

  it("reuses an existing integration and refuses a duplicate AppID", async () => {
    const p = port();
    p.integrations.list.mockResolvedValueOnce({
      items: [{ id: "iamoi-existing", providerCode: "wechat_mini_program", providerClientId: "wx-new" }],
    });
    const ops = createMiniProgramBackendOperations(p.backendPort);
    await ops.create({ appId: "wx-new", appSecret: "s", displayName: "New" });
    expect(p.integrations.create).not.toHaveBeenCalled();
    expect(p.integrations.update).toHaveBeenCalledWith("iamoi-existing", { enabled: true });
    expect(p.resourceAccounts.create).toHaveBeenCalledWith(expect.objectContaining({
      integrationId: "iamoi-existing",
    }));

    const duplicate = port();
    duplicate.integrations.list.mockResolvedValueOnce({
      items: [{ id: "iamoi-existing", providerCode: "wechat_mini_program", providerClientId: "wx-new" }],
    });
    duplicate.resourceAccounts.list.mockResolvedValueOnce({
      items: [{ ...RECORD, providerAccountId: "wx-new" }],
    });
    await expect(createMiniProgramBackendOperations(duplicate.backendPort)
      .create({ appId: "wx-new", appSecret: "s", displayName: "New" }))
      .rejects.toThrow(/already exists/);
    expect(duplicate.resourceAccounts.create).not.toHaveBeenCalled();
  });

  it("refuses a draft that carries surface settings it cannot persist", async () => {
    const ops = createMiniProgramBackendOperations(port().backendPort);
    await expect(ops.create({
      appId: "wx-new",
      displayName: "New",
      environment: "trial",
    })).rejects.toBeInstanceOf(MiniProgramUnsupportedError);
  });

  it("keeps the enable switch and profile sync on the login integration", async () => {
    const p = port();
    const ops = createMiniProgramBackendOperations(p.backendPort);
    await ops.list({});
    await ops.setEnabled("iamora-1", false);
    expect(p.resourceAccounts.update).toHaveBeenCalledWith("iamora-1", { enabled: false });
    expect(p.integrations.update).toHaveBeenCalledWith("iamoi-1", { enabled: false });
    await ops.updateProfile?.("iamora-1", { displayName: "Renamed" });
    expect(p.resourceAccounts.update).toHaveBeenCalledWith("iamora-1", { displayName: "Renamed" });
    expect(p.integrations.update).toHaveBeenCalledWith("iamoi-1", { displayName: "Renamed" });
  });

  it("maps credentials, configuration, deletion, and the login check", async () => {
    const p = port();
    const ops = createMiniProgramBackendOperations(p.backendPort);
    await ops.updateCredentials?.("iamora-1", { appId: " wx-rotated ", appSecret: " rotated " });
    expect(p.resourceAccounts.update).toHaveBeenCalledWith("iamora-1", {
      providerAccountId: "wx-rotated",
      providerClientSecret: "rotated",
    });
    await ops.updateConfig?.("iamora-1", { note: "n" });
    expect(p.resourceAccounts.update).toHaveBeenCalledWith("iamora-1", { config: { note: "n" } });
    await ops.runLoginCheck?.("iamora-1");
    expect(p.resourceAccounts.miniProgramLoginChecks.create).toHaveBeenCalledWith("iamora-1", {});
    await ops.remove("iamora-1");
    expect(p.resourceAccounts.delete).toHaveBeenCalledWith("iamora-1");
    const transport = createMiniProgramBackendTransport(p.backendPort);
    await expect(transport.runLoginCheck?.("iamora-1")).resolves.toMatchObject({ status: "passed" });
  });

  it("fails when the created integration or account carries no id", async () => {
    const missingIntegration = port();
    missingIntegration.integrations.create.mockResolvedValueOnce({});
    await expect(createMiniProgramBackendOperations(missingIntegration.backendPort)
      .create({ appId: "wx-new", appSecret: "s", displayName: "New" }))
      .rejects.toThrow(/integration carried no id/);

    const missingAccount = port();
    missingAccount.resourceAccounts.create.mockResolvedValueOnce({ resourceAccountKind: "mini_program" });
    await expect(createMiniProgramBackendOperations(missingAccount.backendPort)
      .create({ appId: "wx-new", appSecret: "s", displayName: "New" }))
      .rejects.toThrow(/account carried no id/);
  });
});
