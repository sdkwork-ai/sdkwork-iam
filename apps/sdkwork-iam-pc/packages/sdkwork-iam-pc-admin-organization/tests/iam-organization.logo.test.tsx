import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createSdkworkIamOrganizationController, SdkworkIamOrganizationAdminWorkspace } from "../src";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";

/**
 * Logo upload adoption regression (`DRIVE_SPEC.md` §18).
 *
 * The logo field used to persist a locally-read base64 data URL, then briefly
 * accepted a pasted image URL. Both are fake upload paths: these tests pin the
 * single shared-component flow — edit uploads immediately against the
 * organization id, create parks the pick in the component controller and the
 * workspace flushes it after the organization exists, and a host without the
 * capability renders a disabled placeholder instead of a URL input.
 */

const uploadedLogoValue = {
  metadata: { drive: { nodeId: "node-9", spaceId: "space-1" } },
  source: "drive" as const,
  uri: "drive://spaces/space-1/nodes/node-9",
};

function createController(overrides: Record<string, unknown> = {}) {
  const organization = {
    code: "platform",
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
    createOrganization: vi.fn().mockResolvedValue({ code: "new", id: "org-2", name: "New", organizationId: "org-2" }),
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
    upload: vi.fn().mockResolvedValue(uploadedLogoValue),
  };
}

const writePermissions = {
  departments: { create: false, delete: false, read: false, update: false },
  memberships: { create: false, read: false, update: false },
  organizations: { create: true, delete: false, update: true },
  positions: { read: false },
  roleBindings: { read: false },
} as const;

function renderWorkspace(controller: ReturnType<typeof createController>, uploadService?: ReturnType<typeof createUploadService>) {
  return render(
    <SdkworkI18nProvider locale="zh-CN">
      <SdkworkIamOrganizationAdminWorkspace
        controller={controller as never}
        driveUploadImageService={uploadService as never}
        permissions={writePermissions}
      />
    </SdkworkI18nProvider>,
  );
}

describe("organization logo upload adoption", () => {
  it("renders the shared placeholder upload component in the edit drawer and previews the stored drive snapshot", async () => {
    const controller = createController();
    const uploadService = createUploadService();
    renderWorkspace(controller, uploadService);

    await screen.findByText("Platform");
    fireEvent.click(screen.getByRole("button", { name: "查看详情" }));
    await screen.findByText("正在管理 Platform");
    // The detail header resolves the drive-backed snapshot through the same
    // bounded preview reader — presentation-only, never persisted.
    await waitFor(() => expect(uploadService.resolvePreview).toHaveBeenCalledWith({ uri: "drive://spaces/space-1/nodes/node-1" }));

    fireEvent.click(screen.getByRole("button", { name: "编辑组织" }));
    await screen.findByRole("button", { name: "保存修改" });
    // The stored drive snapshot seeds the shared component, which previews
    // through its own service — no data-URL read exists.
    await waitFor(() => expect(uploadService.resolvePreview).toHaveBeenCalledWith({ uri: "drive://spaces/space-1/nodes/node-1" }));
    // The placeholder upload surface is the only pick affordance: no separate
    // "upload" button beside a preview, and no image-URL input.
    expect(screen.queryByPlaceholderText("Logo 图片链接")).toBeNull();
    expect(document.querySelector('input[type="url"]')).toBeNull();
    expect(screen.getByRole("button", { name: "更换 Logo" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "保存修改" }));
    await waitFor(() => expect(controller.updateOrganization).toHaveBeenCalledWith("org-1", expect.objectContaining({
      logo: expect.objectContaining({ source: "drive", uri: "drive://spaces/space-1/nodes/node-1" }),
    })));
  });

  it("parks the create-mode pick in the shared controller and uploads it after the organization exists", async () => {
    const controller = createController();
    const uploadService = createUploadService();
    renderWorkspace(controller, uploadService);

    await screen.findByText("Platform");
    fireEvent.click(screen.getByRole("button", { name: "创建组织" }));
    await screen.findByLabelText(/名称/u);

    // The drawer body exposes the shared placeholder — not a Button that
    // proxies a hidden input.
    expect(screen.getByRole("button", { name: "上传 Logo" })).toBeTruthy();
    expect(screen.getByText("支持 PNG、JPG、WebP，文件不超过 2 MB。建议使用 1:1 正方形图片。")).toBeTruthy();

    const file = new File(["logo-bytes"], "logo.png", { type: "image/png" });
    const picker = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(picker).not.toBeNull();
    Object.defineProperty(picker, "files", { value: [file] });
    fireEvent.change(picker);

    fireEvent.change(screen.getByLabelText(/名称/u), { target: { value: "New" } });
    fireEvent.change(screen.getByLabelText(/编码/u), { target: { value: "new" } });
    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    // Persist first, upload second (DRIVE_SPEC.md section 18.3): the parked
    // pick uploads through the shared service against the created id.
    await waitFor(() => expect(uploadService.upload).toHaveBeenCalledWith(expect.objectContaining({ appResourceId: "org-2" })));
    await waitFor(() => expect(controller.updateOrganization).toHaveBeenCalledWith("org-2", expect.objectContaining({
      logo: expect.objectContaining({ source: "drive", uri: "drive://spaces/space-1/nodes/node-9" }),
    })));
  });

  it("renders a disabled upload placeholder instead of an image-URL field when no upload capability is injected", async () => {
    const controller = createController();
    renderWorkspace(controller);

    await screen.findByText("Platform");
    fireEvent.click(screen.getByRole("button", { name: "编辑组织" }));
    await screen.findByRole("button", { name: "保存修改" });

    // No pick affordance without a host capability, and no URL fallback: a
    // local data-URL read or a pasted link would be a fake upload.
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(document.querySelector('input[type="url"]')).toBeNull();
    expect(screen.getByText("当前环境未启用图片上传，无法设置组织 Logo。")).toBeTruthy();
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
