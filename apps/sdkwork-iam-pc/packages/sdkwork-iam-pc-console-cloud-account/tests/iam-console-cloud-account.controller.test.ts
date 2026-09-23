import { describe, expect, it, vi } from "vitest";

import {
  createSdkworkIamConsoleCloudAccountController,
  SdkworkIamCloudAccountCredentialWriteError,
} from "../src/index";

function serviceStub() {
  const providerAccounts = {
    create: vi.fn(),
    credentials: {
      create: vi.fn(),
      list: vi.fn().mockResolvedValue({ items: [] }),
    },
    delete: vi.fn().mockResolvedValue({ accepted: true }),
    list: vi.fn().mockResolvedValue({ items: [] }),
    resolve: vi.fn(),
    retrieve: vi.fn(),
    setDefault: vi.fn(),
    update: vi.fn(),
  };
  return {
    providerAccounts,
    providerCredentials: { revoke: vi.fn().mockResolvedValue({ accepted: true }) },
  };
}

function accountItem(overrides: Record<string, unknown> = {}) {
  return {
    accountCode: "prod-storage",
    capabilityCodes: [],
    credentialConfigured: true,
    credentialCount: "1",
    displayName: "Production object storage",
    environment: "production",
    id: "acct-1",
    isDefault: false,
    scopeType: "user",
    vendorCode: "aliyun",
    ...overrides,
  };
}

describe("@sdkwork/iam-pc-console-cloud-account", () => {
  it("pins the personal tab to mine and the shared tabs to their scope level", async () => {
    const stub = serviceStub();
    const controller = createSdkworkIamConsoleCloudAccountController({ service: { iam: stub } as never });

    // The controller hands the service the wire-normalized query the paginated list
    // session produces: `page_size` plus stringified booleans. The service translates
    // `page_size` into the `pageSize` key the generated SDK reads.
    await controller.listMyAccounts();
    expect(stub.providerAccounts.list).toHaveBeenLastCalledWith({ mine: "true", page_size: 20 });

    await controller.listScopeAccounts("organization", { organizationId: "org-1" });
    expect(stub.providerAccounts.list).toHaveBeenLastCalledWith({
      includePlatform: "false",
      organizationId: "org-1",
      page_size: 20,
      scopeType: "organization",
    });

    await controller.listScopeAccounts("tenant");
    expect(stub.providerAccounts.list).toHaveBeenLastCalledWith({
      includePlatform: "false",
      page_size: 20,
      scopeType: "tenant",
    });
  });

  it("asks for the platform level only when the platform level is what was asked for", async () => {
    const stub = serviceStub();
    const controller = createSdkworkIamConsoleCloudAccountController({ service: { iam: stub } as never });

    // `includePlatform` is the only flag that admits the operator's global rows, so
    // it is derived from the level rather than sent on every shared tab: a tenant or
    // organization walk that asked for platform rows would state a wider request
    // than the one being made.
    await controller.listScopeAccounts("platform");
    expect(stub.providerAccounts.list).toHaveBeenLastCalledWith({
      includePlatform: "true",
      page_size: 20,
      scopeType: "platform",
    });
  });

  it("leaves platform out of an unqualified listing but honours an explicit request", async () => {
    const stub = serviceStub();
    const controller = createSdkworkIamConsoleCloudAccountController({ service: { iam: stub } as never });

    // An unqualified listing means "every account that is about me". A caller that
    // really wants the global defaults has to say so, and the server still decides
    // whether it gets them.
    await controller.listAccounts();
    expect(stub.providerAccounts.list).toHaveBeenLastCalledWith({
      includePlatform: "false",
      page_size: 20,
    });

    await controller.listAccounts({ includePlatform: true });
    expect(stub.providerAccounts.list).toHaveBeenLastCalledWith({
      includePlatform: "true",
      page_size: 20,
    });
  });

  it("keeps `mine` the only scope signal on the personal tab", async () => {
    const stub = serviceStub();
    const controller = createSdkworkIamConsoleCloudAccountController({ service: { iam: stub } as never });

    // A caller that passes a level or an owner alongside `mine` must not get both:
    // the server already pins the walk to the caller's own accounts, and a second
    // signal would contradict it.
    await controller.listMyAccounts({ ownerUserId: "someone-else", scopeType: "tenant" });

    expect(stub.providerAccounts.list).toHaveBeenLastCalledWith({ mine: "true", page_size: 20 });
  });

  it("drops blank optionals from a create body and keeps the required three", async () => {
    const stub = serviceStub();
    stub.providerAccounts.create.mockResolvedValue(accountItem());
    const controller = createSdkworkIamConsoleCloudAccountController({ service: { iam: stub } as never });

    await controller.createAccount({
      accountCode: "  prod-storage  ",
      capabilityCodes: ["dns", "  dns ", ""],
      displayName: "  Production object storage  ",
      isDefault: true,
      organizationId: "   ",
      scopeType: "organization",
      vendorCode: "aliyun",
    });

    expect(stub.providerAccounts.create).toHaveBeenCalledWith({
      accountCode: "prod-storage",
      capabilityCodes: ["dns", "dns"],
      displayName: "Production object storage",
      isDefault: true,
      scopeType: "organization",
      vendorCode: "aliyun",
    });
  });

  it("refuses a create that is missing one of the three required fields", async () => {
    const stub = serviceStub();
    const controller = createSdkworkIamConsoleCloudAccountController({ service: { iam: stub } as never });

    await expect(
      controller.createAccount({ accountCode: "", displayName: "Anything", vendorCode: "aws" }),
    ).rejects.toThrow("accountCode is required");
    expect(stub.providerAccounts.create).not.toHaveBeenCalled();
  });

  it("clears the sibling default of the same level, vendor, and environment", async () => {
    const stub = serviceStub();
    stub.providerAccounts.list.mockResolvedValue({
      items: [
        accountItem({ id: "acct-1", isDefault: true }),
        accountItem({ id: "acct-2", isDefault: false }),
        // Another environment keeps its own default: the server scopes a default to
        // vendor + environment, not vendor alone.
        accountItem({ environment: "sandbox", id: "acct-3", isDefault: true }),
        // A different vendor keeps its own default too, which is why the comparison
        // must read `vendorCode` off the decoded record rather than compare two
        // undefined values.
        accountItem({ id: "acct-4", isDefault: true, vendorCode: "aws" }),
      ],
    });
    stub.providerAccounts.setDefault.mockResolvedValue(
      accountItem({ id: "acct-2", isDefault: true }),
    );
    const controller = createSdkworkIamConsoleCloudAccountController({ service: { iam: stub } as never });

    await controller.listMyAccounts();
    await controller.setDefaultAccount("acct-2");

    expect(stub.providerAccounts.setDefault).toHaveBeenCalledWith("acct-2", {});
    const state = controller.getState();
    expect(state.accounts.map((account) => account.vendorCode)).toEqual([
      "aliyun",
      "aliyun",
      "aliyun",
      "aws",
    ]);
    expect(state.accounts.find((account) => account.id === "acct-1")?.isDefault).toBe(false);
    expect(state.accounts.find((account) => account.id === "acct-2")?.isDefault).toBe(true);
    expect(state.accounts.find((account) => account.id === "acct-3")?.isDefault).toBe(true);
    expect(state.accounts.find((account) => account.id === "acct-4")?.isDefault).toBe(true);
  });

  it("reads credential envelopes without ever exposing a ciphertext field", async () => {
    const stub = serviceStub();
    stub.providerAccounts.credentials.list.mockResolvedValue({
      items: [
        {
          credentialKind: "access_key_pair",
          credentialName: "default",
          credentialVersion: "3",
          id: "cred-1",
          maskedLabel: "LTAI****1234",
          providerAccountId: "acct-1",
          secretFingerprint: "sha256:abcdef",
          status: "active",
        },
      ],
    });
    const controller = createSdkworkIamConsoleCloudAccountController({ service: { iam: stub } as never });

    const credentials = await controller.listCredentials("acct-1");

    expect(stub.providerAccounts.credentials.list).toHaveBeenCalledWith("acct-1", { page_size: 100 });
    expect(credentials).toEqual([
      expect.objectContaining({
        credentialName: "default",
        credentialVersion: "3",
        id: "cred-1",
        maskedLabel: "LTAI****1234",
        providerAccountId: "acct-1",
      }),
    ]);
    expect(Object.keys(credentials[0] ?? {})).not.toContain("secretCiphertext");
  });

  it("rotates by creating into the same slot and revokes by credential id", async () => {
    const stub = serviceStub();
    stub.providerAccounts.credentials.create.mockResolvedValue({
      credentialName: "default",
      id: "cred-2",
      providerAccountId: "acct-1",
    });
    stub.providerAccounts.credentials.list.mockResolvedValue({
      items: [{ credentialName: "default", id: "cred-2", providerAccountId: "acct-1" }],
    });
    const controller = createSdkworkIamConsoleCloudAccountController({ service: { iam: stub } as never });

    const created = await controller.createCredential("acct-1", {
      accessKeyId: "LTAI1234",
      credentialName: "default",
      secretAccessKey: "  ",
    });

    expect(stub.providerAccounts.credentials.create).toHaveBeenCalledWith("acct-1", {
      accessKeyId: "LTAI1234",
      credentialName: "default",
    });
    expect(created?.id).toBe("cred-2");

    await controller.revokeCredential("acct-1", "cred-2");

    // Revocation is addressed by credential id on the account-center route set, not
    // under the account, because a slot's superseded rows are revocable too.
    expect(stub.providerCredentials.revoke).toHaveBeenCalledWith("cred-2");
    expect(controller.getState().credentials).toEqual([]);
  });

  it("reads the resolution preview's string counts as numbers", async () => {
    const stub = serviceStub();
    stub.providerAccounts.resolve.mockResolvedValue({
      account: accountItem({ scopeType: "organization" }),
      candidatesByScope: [
        { count: "2", scopeType: "organization" },
        { count: "1", scopeType: "tenant" },
      ],
      matchedByDefault: true,
      matchedScope: "organization",
    });
    const controller = createSdkworkIamConsoleCloudAccountController({ service: { iam: stub } as never });

    const resolution = await controller.resolveAccount({ vendorCode: "aliyun" });

    expect(stub.providerAccounts.resolve).toHaveBeenCalledWith({ vendorCode: "aliyun" });
    // int64 crosses the wire as a string (API_SPEC §13.6), so the counts must be
    // parsed rather than rendered raw.
    expect(resolution?.candidatesByScope).toEqual([
      { count: 2, scopeType: "organization" },
      { count: 1, scopeType: "tenant" },
    ]);
    expect(resolution?.matchedByDefault).toBe(true);
    expect(resolution?.account?.id).toBe("acct-1");
  });

  it("drops a deleted account from the listing and its credentials from the selection", async () => {
    const stub = serviceStub();
    stub.providerAccounts.list.mockResolvedValue({ items: [accountItem(), accountItem({ id: "acct-2" })] });
    const controller = createSdkworkIamConsoleCloudAccountController({ service: { iam: stub } as never });

    await controller.listMyAccounts();
    await controller.selectAccount("acct-1");
    await controller.deleteAccount("acct-1");

    expect(stub.providerAccounts.delete).toHaveBeenCalledWith("acct-1");
    const state = controller.getState();
    expect(state.accounts.map((account) => account.id)).toEqual(["acct-2"]);
    expect(state.selectedAccount).toBeUndefined();
    expect(state.credentials).toEqual([]);
  });

  /**
   * Registration writes the credential too, as a second request.
   *
   * `providerAccounts.create` stores an account and nothing else, while an account
   * with no credential resolves to nothing: listed, selectable, unusable. The pair
   * is therefore issued together, and the interesting case is what happens when
   * they split — the account exists and the credential does not, which is neither
   * success nor failure.
   */
  describe("registering the account together with its credential", () => {
    it("writes the credential against the account it just registered", async () => {
      const stub = serviceStub();
      stub.providerAccounts.create.mockResolvedValue(accountItem({ id: "acct-9" }));
      stub.providerAccounts.credentials.create.mockResolvedValue({ id: "cred-9" });
      const controller = createSdkworkIamConsoleCloudAccountController({ service: { iam: stub } as never });

      const created = await controller.createAccount(
        { accountCode: "prod-storage", displayName: "Production object storage", vendorCode: "aliyun" },
        {
          accessKeyId: "LTAI1234",
          credentialKind: "access_key_pair",
          secretAccessKey: "  secret  ",
        },
      );

      // Addressed by the id the *server* returned, not by anything the console
      // guessed, and trimmed like every other write body here.
      expect(stub.providerAccounts.credentials.create).toHaveBeenCalledWith("acct-9", {
        accessKeyId: "LTAI1234",
        credentialKind: "access_key_pair",
        secretAccessKey: "secret",
      });
      expect(created.id).toBe("acct-9");
      expect(controller.getState().accounts.map((account) => account.id)).toEqual(["acct-9"]);
    });

    it("issues no credential request when none was given", async () => {
      const stub = serviceStub();
      stub.providerAccounts.create.mockResolvedValue(accountItem());
      const controller = createSdkworkIamConsoleCloudAccountController({ service: { iam: stub } as never });

      await controller.createAccount({
        accountCode: "prod-storage",
        displayName: "Production object storage",
        vendorCode: "aliyun",
      });

      // An identity shape that holds no secret here registers an account and
      // nothing else — the request must not be sent with an empty body, which the
      // server would have to reject.
      expect(stub.providerAccounts.credentials.create).not.toHaveBeenCalled();
    });

    it("says which half landed when the credential write is the one that fails", async () => {
      const stub = serviceStub();
      stub.providerAccounts.create.mockResolvedValue(accountItem({ id: "acct-9" }));
      stub.providerAccounts.credentials.create.mockRejectedValue(new Error("slot is taken"));
      const controller = createSdkworkIamConsoleCloudAccountController({ service: { iam: stub } as never });

      const failure = await controller
        .createAccount(
          { accountCode: "prod-storage", displayName: "Production object storage", vendorCode: "aliyun" },
          { accessKeyId: "LTAI1234", credentialKind: "access_key_pair", secretAccessKey: "secret" },
        )
        .then(() => undefined)
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(SdkworkIamCloudAccountCredentialWriteError);
      const writeError = failure as SdkworkIamCloudAccountCredentialWriteError;
      // The account is carried, so the caller can name it and hand it back to the
      // operator instead of reporting a registration that did not happen.
      expect(writeError.account.id).toBe("acct-9");
      // And the reason is carried too: "the credential was refused" is only
      // actionable together with why.
      expect((writeError.credentialCause as Error).message).toBe("slot is taken");
      // The half that did land is in the listing — that is the whole point of
      // reporting this separately from a failed registration.
      expect(controller.getState().accounts.map((account) => account.id)).toEqual(["acct-9"]);
    });
  });
});
