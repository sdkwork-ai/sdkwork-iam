import { describe, expect, it, vi } from "vitest";

import { createSdkworkIamH5AccountBindingController, DEFAULT_H5_ACCOUNT_BINDING_POLICY } from "../src/index";

/**
 * Controller-level contract of the account-binding surface: what it sends, what it
 * refuses, and which defaults apply when the deployment publishes no policy.
 */

function createServiceMock(options: { links?: readonly unknown[]; policy?: unknown; policyRejects?: boolean } = {}) {
  const calls = {
    bindEmail: vi.fn(async (body: Record<string, unknown>) => ({ userId: "1", ...body })),
    deleteLink: vi.fn(async (id: string) => ({ id })),
    listLinks: vi.fn(async (params?: Record<string, unknown>) => ({
      items: options.links ?? [{ accountLinkId: "link-1", id: "link-1", provider: "github" }],
      pageInfo: { hasMore: false, page: 0, pageSize: 20 },
    })),
    policy: options.policyRejects
      ? vi.fn(async () => {
          throw new Error("policy unavailable");
        })
      : vi.fn(async () => options.policy ?? {}),
    unbindEmail: vi.fn(async (body: Record<string, unknown>) => ({ userId: "1", ...body })),
  };
  return {
    calls,
    service: {
      iam: { users: { current: { emailBindings: { create: calls.bindEmail, delete: calls.unbindEmail } } } },
      oauth: { accountLinks: { delete: calls.deleteLink, list: calls.listLinks } },
      system: { iam: { accountBindingPolicy: { retrieve: calls.policy } } },
    } as never,
  };
}

describe("@sdkwork/iam-h5-account-binding controller", () => {
  it("normalizes a published policy", async () => {
    const { service } = createServiceMock({
      policy: {
        contactBinding: { enabled: true, emailEnabled: true, phoneEnabled: false },
        oauthBinding: { enabled: true, selfServiceLinkEnabled: true, selfServiceUnlinkEnabled: false },
      },
    });
    const controller = createSdkworkIamH5AccountBindingController({ service });

    await expect(controller.loadPolicy()).resolves.toMatchObject({
      contactBinding: { emailEnabled: true, enabled: true, phoneEnabled: false },
      oauthBinding: { selfServiceLinkEnabled: true, selfServiceUnlinkEnabled: false },
    });
  });

  it("falls back to the conservative defaults when the deployment publishes nothing", async () => {
    const { service } = createServiceMock();
    const controller = createSdkworkIamH5AccountBindingController({ service });

    const policy = await controller.loadPolicy();
    // Silence is not permission: self-service unlinking stays denied.
    expect(policy.oauthBinding.selfServiceUnlinkEnabled).toBe(
      DEFAULT_H5_ACCOUNT_BINDING_POLICY.oauthBinding.selfServiceUnlinkEnabled,
    );
    expect(policy.oauthBinding.selfServiceUnlinkEnabled).toBe(false);
  });

  it("rejects when the policy endpoint itself fails", async () => {
    const { service } = createServiceMock({ policyRejects: true });
    const controller = createSdkworkIamH5AccountBindingController({ service });
    await expect(controller.loadPolicy()).rejects.toThrow(/policy unavailable/u);
  });

  it("returns a page of links, dropping records without an id", async () => {
    const { calls, service } = createServiceMock({
      // The first record carries no id at all; the second carries only `id`,
      // which is a valid identifier for a link.
      links: [{ provider: "unidentifiable" }, { id: "link-2", provider: "wechat" }],
    });
    const controller = createSdkworkIamH5AccountBindingController({ service });

    const page = await controller.fetchAccountLinksPage({ page: 1, page_size: 10, q: "  " });
    expect(page.items).toEqual([
      { accountLinkId: "link-2", id: "link-2", provider: "wechat", providerUserId: undefined },
    ]);
    expect(calls.listLinks).toHaveBeenCalledWith({ page: 1, page_size: 10 });
  });

  it("trims the email and code it sends", async () => {
    const { calls, service } = createServiceMock();
    const controller = createSdkworkIamH5AccountBindingController({ service });

    await controller.bindEmail({ email: "  alice@example.com ", verificationCode: " 123456 " });
    await controller.unbindEmail({ password: "secret" });

    expect(calls.bindEmail).toHaveBeenCalledWith({ email: "alice@example.com", verificationCode: "123456" });
    expect(calls.unbindEmail).toHaveBeenCalledWith({ password: "secret" });
  });

  it("refuses an empty link id instead of issuing a delete for the wrong row", async () => {
    const { calls, service } = createServiceMock();
    const controller = createSdkworkIamH5AccountBindingController({ service });

    await expect(controller.unlinkAccountLink("   ")).rejects.toThrow(/accountLinkId is required/u);
    expect(calls.deleteLink).not.toHaveBeenCalled();
  });
});
