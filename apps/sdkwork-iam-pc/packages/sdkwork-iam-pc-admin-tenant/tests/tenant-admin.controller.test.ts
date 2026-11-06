import { describe, expect, it, vi } from "vitest";

import { createSdkworkIamTenantController } from "../src/index";

/**
 * Tenant controller wire contract (`DRIVE_SPEC.md` §18, IAM_SPEC tenant
 * lifecycle).
 *
 * The backend create handler requires both `code` and `name`, the update
 * handler reads camelCase profile columns, and removing the stored logo is an
 * explicit `logo: null` patch. These tests pin those shapes so the drawer and
 * the backend cannot drift apart.
 */

const tenantRecord = {
  address: "上海市浦东新区",
  code: "acme",
  contactEmail: "contact@acme.example",
  contactPhone: "+86 138 0000 0000",
  description: "客户租户",
  id: "tenant-1",
  industryCategory: "internet",
  logo: {
    kind: "image",
    metadata: { drive: { nodeId: "node-1", spaceId: "space-1" } },
    source: "drive",
    uri: "drive://spaces/space-1/nodes/node-1",
  },
  name: "Acme",
  status: "active",
  tenantId: "tenant-1",
};

function createService() {
  const create = vi.fn().mockResolvedValue(tenantRecord);
  const update = vi.fn().mockResolvedValue(tenantRecord);
  const service = {
    iam: {
      tenants: {
        create,
        delete: vi.fn().mockResolvedValue(undefined),
        list: vi.fn().mockResolvedValue([]),
        members: {
          create: vi.fn(),
          delete: vi.fn(),
          list: vi.fn(),
          update: vi.fn(),
        },
        retrieve: vi.fn().mockResolvedValue(tenantRecord),
        update,
      },
    },
  };
  return { create, service, update };
}

describe("tenant administration controller", () => {
  it("rejects a create without the code the backend requires", async () => {
    const { create, service } = createService();
    const controller = createSdkworkIamTenantController({ service: service as never });

    await expect(controller.createTenant({ name: "Acme" })).rejects.toThrow(/code/u);
    expect(create).not.toHaveBeenCalled();
  });

  it("sends the tenant profile as camelCase wire fields and maps them back", async () => {
    const { create, service } = createService();
    const controller = createSdkworkIamTenantController({ service: service as never });

    const created = await controller.createTenant({
      address: tenantRecord.address,
      code: "acme",
      contactEmail: tenantRecord.contactEmail,
      contactPhone: tenantRecord.contactPhone,
      description: tenantRecord.description,
      industryCategory: tenantRecord.industryCategory,
      name: "Acme",
    });

    expect(create).toHaveBeenCalledWith({
      address: tenantRecord.address,
      code: "acme",
      contactEmail: tenantRecord.contactEmail,
      contactPhone: tenantRecord.contactPhone,
      description: tenantRecord.description,
      industryCategory: tenantRecord.industryCategory,
      name: "Acme",
    });
    expect(created).toMatchObject({
      address: tenantRecord.address,
      industryCategory: tenantRecord.industryCategory,
      logo: expect.objectContaining({ source: "drive", uri: "drive://spaces/space-1/nodes/node-1" }),
      name: "Acme",
      status: "active",
      tenantId: "tenant-1",
    });
  });

  it("sends explicit clears for removed profile values and the stored logo", async () => {
    const { service, update } = createService();
    const controller = createSdkworkIamTenantController({ service: service as never });

    await controller.updateTenant("tenant-1", {
      description: "",
      logo: undefined,
      logoUrl: "",
      name: "Acme",
    });

    expect(update).toHaveBeenCalledWith("tenant-1", {
      description: "",
      logo: null,
      name: "Acme",
    });
  });

  it("leaves absent optional values out of the update payload", async () => {
    const { service, update } = createService();
    const controller = createSdkworkIamTenantController({ service: service as never });

    await controller.updateTenant("tenant-1", { name: "Acme", status: "suspended" });

    expect(update).toHaveBeenCalledWith("tenant-1", { name: "Acme", status: "suspended" });
  });
});
