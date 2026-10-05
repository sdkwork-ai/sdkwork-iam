import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createSdkworkIamOrganizationController, SdkworkIamOrganizationAdminWorkspace } from "../src";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";

/**
 * Logo upload adoption regression (`DRIVE_SPEC.md` §18).
 *
 * The logo field used to persist a locally-read base64 data URL — a fake
 * upload. These tests pin the shared-component adoption: the edit drawer
 * uploads through the host-injected `DriveUploadImageService`, create mode
 * parks the file and attaches it after the organization exists, and a host
 * without either capability degrades to the external-URL field instead of any
 * local read.
 */

function createController(overrides: Record<string, unknown> = {}) {
  const organization = {
    id: "org-1",
    logo: {
      kind: "image",
      metadata: { drive: { nodeId: "node-1", spaceId: "space-1" } },
      source: "drive",
      uri: "drive://spaces/space-1/nodes/node-1",
    },
    logoUrl: "",
    name: "Platform",
    organizationId: "org-1",
  };
  return {
    getState: () => ({ departments: [], departmentAssignments: [], departmentTree: [], memberships: [], organizations: [], positions: [], roleBindings: [], status: "idle", tree: [] }),
    createOrganization: vi.fn().mockResolvedValue({ id: "org-2", name: "New", organizationId: "org-2" }),
    listDepartments: vi.fn().mockResolvedValue([]),
    listMemberships: vi.fn().mockResolvedValue([]),
    listOrganizations: vi.fn().mockResolvedValue([organization]),
    listPositions: vi.fn().mockResolvedValue([]),
    listRoleBindings: vi.fn().mockResolvedValue([]),
    loadMoreOrganizations: vi.fn().mockResolvedValue([]),
    selectOrganization: vi.fn().mockResolvedValue(organization),
    updateOrganization: vi.fn().mockImplementation(async (_id: string, body: Record<string, unknown>) => ({ id: "org-1", name: "Platform", organizationId: "org-1", ...body })),
    ...overrides,
  };
}

function createUploadService() {
  return {
    resolvePreview: vi.fn().mockResolvedValue("blob:preview"),
    upload: vi.fn().mockResolvedValue({
      metadata: { drive: { nodeId: "node-9", spaceId: "space-1" } },
      source: "drive" as const,
      uri: "drive://spaces/space-1/nodes/node-9",
    }),
  };
}

function createLogoService() {
  return {
    attachLogo: vi.fn().mockResolvedValue({
      kind: "image",
      metadata: { drive: { nodeId: "node-9", spaceId: "space-1" } },
      source: "drive",
      uri: "drive://spaces/space-1/nodes/node-9",
    }),
    resolveLogoUrl: vi.fn().mockResolvedValue("blob:preview"),
  };
}

const writePermissions = {
  departments: { create: false, delete: false, read: false, update: false },
  memberships: { create: false, read: false, update: false },
  organizations: { create: true, delete: false, update: true },
  positions: { read: false },
  roleBindings: { read: false },
} as const;

describe("organization logo upload adoption", () => {
  it("renders the shared upload component in the edit drawer and resolves the stored drive snapshot through the service", async () => {
    const controller = createController();
    const uploadService = createUploadService();
    const logoService = createLogoService();
    render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOrganizationAdminWorkspace
          controller={controller as never}
          driveUploadImageService={uploadService as never}
          logoService={logoService}
          permissions={writePermissions}
        />
      </SdkworkI18nProvider>,
    );

    await screen.findByText("Platform");
    fireEvent.click(screen.getByRole("button", { name: "查看详情" }));
    await screen.findByText("正在管理 Platform");
    // The detail header resolves the drive-backed snapshot through the bounded
    // preview reader — presentation-only, never persisted.
    await waitFor(() => expect(logoService.resolveLogoUrl).toHaveBeenCalledWith(expect.objectContaining({ uri: "drive://spaces/space-1/nodes/node-1" })));

    fireEvent.click(screen.getByRole("button", { name: "编辑组织" }));
    await screen.findByRole("button", { name: "保存修改" });
    // The stored drive snapshot seeds the shared component, which previews
    // through its own service — the data-URL reader is gone.
    await waitFor(() => expect(uploadService.resolvePreview).toHaveBeenCalledWith(expect.objectContaining({ uri: "drive://spaces/space-1/nodes/node-1" })));

    fireEvent.click(screen.getByRole("button", { name: "保存修改" }));
    await waitFor(() => expect(controller.updateOrganization).toHaveBeenCalledWith("org-1", expect.objectContaining({
      logo: expect.objectContaining({ source: "drive", uri: "drive://spaces/space-1/nodes/node-1" }),
    })));
  });

  it("parks the create-mode pick and attaches it after the organization exists", async () => {
    const controller = createController();
    const logoService = createLogoService();
    const uploadService = createUploadService();
    render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOrganizationAdminWorkspace
          controller={controller as never}
          driveUploadImageService={uploadService as never}
          logoService={logoService}
          permissions={writePermissions}
        />
      </SdkworkI18nProvider>,
    );

    await screen.findByText("Platform");
    fireEvent.click(screen.getByRole("button", { name: "创建组织" }));
    await screen.findByLabelText("名称");

    const file = new File(["logo-bytes"], "logo.png", { type: "image/png" });
    const picker = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(picker).not.toBeNull();
    Object.defineProperty(picker, "files", { value: [file] });
    fireEvent.change(picker);

    fireEvent.change(screen.getByLabelText("名称"), { target: { value: "New" } });
    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => expect(logoService.attachLogo).toHaveBeenCalledWith("org-2", file));
    // Attach = upload against the new id, then a follow-up update carrying the
    // media resource (persist first, upload second — §18.3).
    await waitFor(() => expect(controller.updateOrganization).toHaveBeenCalledWith("org-2", expect.objectContaining({
      logo: expect.objectContaining({ source: "drive" }),
    })));
  });

  it("offers only the external-URL field when no upload capability is injected", async () => {
    const controller = createController();
    render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOrganizationAdminWorkspace
          controller={controller as never}
          permissions={writePermissions}
        />
      </SdkworkI18nProvider>,
    );

    await screen.findByText("Platform");
    fireEvent.click(screen.getByRole("button", { name: "编辑组织" }));
    await screen.findByRole("button", { name: "保存修改" });

    // No pick affordance without a host capability: a local data-URL read
    // would be a fake upload, so the field degrades to the URL input.
    expect(screen.queryByRole("button", { name: "上传图片" })).toBeNull();
    expect(screen.getByPlaceholderText("Logo 图片链接")).not.toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it("sends the drive logo as the media-resource object the backend snapshot contract accepts", async () => {
    const service = {
      iam: {
        organizations: {
          create: vi.fn(),
          delete: vi.fn(),
          list: vi.fn().mockResolvedValue([]),
          retrieve: vi.fn().mockResolvedValue({ name: "Target", organizationId: "org-9" }),
          update: vi.fn().mockResolvedValue({ name: "Target", organizationId: "org-9" }),
        },
      },
    };
    const controller = createSdkworkIamOrganizationController(service as never);
    const logo = {
      kind: "image",
      metadata: { drive: { nodeId: "node-9", spaceId: "space-1" } },
      source: "drive",
      uri: "drive://spaces/space-1/nodes/node-9",
    };

    await controller.updateOrganization("org-9", { logo, logoUrl: "" });

    expect(service.iam.organizations.update).toHaveBeenCalledTimes(1);
    const payload = service.iam.organizations.update.mock.calls[0][1] as Record<string, unknown>;
    // The `logo` object is what `read_logo_snapshot` stores in
    // `logo_resource_snapshot`; the empty external-URL string must NOT
    // overwrite the attached resource.
    expect(payload.logo).toEqual(logo);
    expect(payload.logoUrl).toBeUndefined();
  });
});
