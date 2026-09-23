import { describe, expect, it, vi } from "vitest";

import { createSdkworkIamService } from "../src/index.ts";

/**
 * The list-query hand-off between this facade and the generated SDK clients.
 *
 * Every generated `list` declares its page size as `pageSize` and emits the wire
 * query name `page_size` itself: `buildQueryString` only serialises the parameter
 * list spelled out inside the method, so a key the method does not read is never
 * sent. Handing the client the *wire* spelling therefore loses the page size
 * silently — the request still succeeds and the server falls back to its own
 * default page.
 *
 * `sdkwork-iam-runtime` pins that SDK behaviour against a stubbed fetch; this file
 * pins this facade's side of the bargain.
 */
describe("IAM service list query hand-off", () => {
  it("hands the generated SDK the page-size spelling it reads", async () => {
    const backendClient = {
      iam: {
        tenants: { list: vi.fn().mockResolvedValue({ items: [] }) },
      },
    };
    const service = createSdkworkIamService({
      appbaseAppClient: {},
      appbaseBackendClient: backendClient as never,
    });

    await service.iam.tenants.list({ page_size: 20, status: "active" });

    // `pageSize`, not `page_size`: the SDK maps it to the wire query name itself.
    expect(backendClient.iam.tenants.list).toHaveBeenCalledWith({
      pageSize: 20,
      status: "active",
    });
  });

  it("carries the page size through the cloud account facade as well", async () => {
    const providerAccounts = {
      credentials: { list: vi.fn().mockResolvedValue({ items: [] }) },
      list: vi.fn().mockResolvedValue({ items: [] }),
    };
    const service = createSdkworkIamService({
      appbaseAppClient: {},
      appbaseBackendClient: { iam: { providerAccounts } } as never,
    });

    await service.iam.providerAccounts.list({ mine: true, page_size: 40 });
    await service.iam.providerAccounts.credentials.list("acct-1", { page_size: 40 });

    expect(providerAccounts.list).toHaveBeenCalledWith({ mine: "true", pageSize: 40 });
    expect(providerAccounts.credentials.list).toHaveBeenCalledWith("acct-1", { pageSize: 40 });
  });
});
