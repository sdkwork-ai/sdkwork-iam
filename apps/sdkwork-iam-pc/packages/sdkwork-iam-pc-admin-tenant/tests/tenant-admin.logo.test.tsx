import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SdkworkIamTenantAdminWorkspace } from "../src";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";

/**
 * Tenant profile + logo adoption regression (`DRIVE_SPEC.md` §18).
 *
 * The drawer used to collect only name and code. It now renders the shared
 * Drive upload placeholder for the tenant logo, validates the identifiers the
 * backend requires, and groups the persisted profile columns into scannable
 * sections.
 */

const uploadedLogoValue = {
  metadata: { drive: { nodeId: "node-9", spaceId: "space-1" } },
  source: "drive" as const,
  uri: "drive://spaces/space-1/nodes/node-9",
};

const tenantRecord = {
  code: "acme",
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

function createController() {
  return {
    createTenant: vi.fn().mockResolvedValue({ code: "new", id: "tenant-2", name: "New", tenantId: "tenant-2" }),
    createTenantMember: vi.fn(),
    deleteTenant: vi.fn(),
    getApplicationCapabilities: () => ({ canEnable: true, canProvision: true, canUpdate: true }),
    getState: () => ({
      applications: [],
      applicationSummary: { disabled: 0, enabled: 0, pending: 0, total: 0 },
      listPageInfo: undefined,
      members: [],
      status: "idle",
      tenants: [],
    }),
    listTenantApplications: vi.fn().mockResolvedValue([]),
    listTenantMembers: vi.fn().mockResolvedValue([]),
    listTenants: vi.fn().mockResolvedValue([tenantRecord]),
    loadMoreTenantApplications: vi.fn().mockResolvedValue([]),
    loadMoreTenantMembers: vi.fn().mockResolvedValue([]),
    loadMoreTenants: vi.fn().mockResolvedValue([]),
    provisionTenantApplication: vi.fn(),
    removeTenantMember: vi.fn(),
    retrieveTenantApplicationSummary: vi.fn().mockResolvedValue({ disabled: 0, enabled: 0, pending: 0, total: 0 }),
    selectTenant: vi.fn().mockResolvedValue(tenantRecord),
    setTenantApplicationEnabled: vi.fn(),
    updateTenant: vi.fn().mockImplementation(async (_id: string, body: Record<string, unknown>) => ({ ...tenantRecord, ...body })),
    updateTenantApplication: vi.fn(),
    updateTenantMember: vi.fn(),
  };
}

function createUploadService() {
  return {
    resolvePreview: vi.fn().mockResolvedValue("blob:preview"),
    upload: vi.fn().mockResolvedValue(uploadedLogoValue),
  };
}

const writePermissions = {
  members: { create: false, delete: false, read: false, update: false },
  tenants: { create: true, delete: false, update: true },
} as const;

function renderWorkspace(
  controller: ReturnType<typeof createController>,
  uploadService?: ReturnType<typeof createUploadService>,
) {
  return render(
    <SdkworkI18nProvider locale="zh-CN">
      <SdkworkIamTenantAdminWorkspace
        controller={controller as never}
        driveUploadImageService={uploadService as never}
        permissions={writePermissions}
      />
    </SdkworkI18nProvider>,
  );
}

describe("tenant profile drawer", () => {
  it("groups the persisted profile columns into sections and validates the required identifiers", async () => {
    const controller = createController();
    renderWorkspace(controller);

    await screen.findByText("Acme");
    fireEvent.click(screen.getByRole("button", { name: "创建租户" }));
    await screen.findByLabelText(/名称/u);

    expect(screen.getByRole("heading", { name: "基本信息" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "租户资料" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "联系方式" })).toBeTruthy();
    expect(screen.getByText("租户唯一标识，创建后用于租户隔离与审计。支持字母、数字、连字符和下划线。")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    expect(await screen.findByText("请填写租户名称。")).toBeTruthy();
    expect(screen.getByText("请填写租户编码。")).toBeTruthy();
    expect(controller.createTenant).not.toHaveBeenCalled();
  });

  it("parks the create-mode logo pick and uploads it after the tenant exists", async () => {
    const controller = createController();
    const uploadService = createUploadService();
    renderWorkspace(controller, uploadService);

    await screen.findByText("Acme");
    fireEvent.click(screen.getByRole("button", { name: "创建租户" }));
    await screen.findByLabelText(/名称/u);

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

    await waitFor(() => expect(uploadService.upload).toHaveBeenCalledWith(expect.objectContaining({ appResourceId: "tenant-2" })));
    await waitFor(() => expect(controller.updateTenant).toHaveBeenCalledWith("tenant-2", expect.objectContaining({
      logo: expect.objectContaining({ source: "drive", uri: "drive://spaces/space-1/nodes/node-9" }),
    })));
  });

  it("seeds the edit drawer from the stored tenant and previews the drive logo", async () => {
    const controller = createController();
    const uploadService = createUploadService();
    renderWorkspace(controller, uploadService);

    await screen.findByText("Acme");
    fireEvent.click(screen.getByRole("button", { name: "编辑租户" }));
    await screen.findByRole("button", { name: "保存修改" });

    await waitFor(() => expect(uploadService.resolvePreview).toHaveBeenCalledWith({ uri: "drive://spaces/space-1/nodes/node-1" }));
    expect(document.querySelector('input[type="url"]')).toBeNull();
    expect((screen.getByLabelText(/名称/u) as HTMLInputElement).value).toBe("Acme");
    expect((screen.getByLabelText(/编码/u) as HTMLInputElement).value).toBe("acme");
    // The lifecycle select is rendered in edit mode and shows the stored state.
    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(1);
  });

  it("renders a disabled upload placeholder when no upload capability is injected", async () => {
    const controller = createController();
    renderWorkspace(controller);

    await screen.findByText("Acme");
    fireEvent.click(screen.getByRole("button", { name: "编辑租户" }));
    await screen.findByRole("button", { name: "保存修改" });

    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(screen.getByText("当前环境未启用图片上传，无法设置租户 Logo。")).toBeTruthy();
  });
});
