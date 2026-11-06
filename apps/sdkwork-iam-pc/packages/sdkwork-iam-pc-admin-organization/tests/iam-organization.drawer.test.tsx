import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SdkworkIamOrganizationAdminWorkspace } from "../src";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";

/**
 * Create/edit organization drawer regression.
 *
 * The backend organization create handler requires both `code` and `name`, so
 * the drawer must block an incomplete submit locally instead of surfacing a
 * 400 as an opaque operation failure. The drawer also groups its fields into
 * identity / profile / contact sections and loads the whole hierarchy for the
 * parent picker rather than the current table page.
 */

function createController() {
  const organization = { code: "platform", id: "org-1", name: "Platform", organizationId: "org-1" };
  return {
    getState: () => ({ departments: [], departmentAssignments: [], departmentTree: [], memberships: [], organizations: [], positions: [], roleBindings: [], status: "idle", tree: [] }),
    createOrganization: vi.fn().mockResolvedValue({ code: "north", id: "org-2", name: "North", organizationId: "org-2" }),
    listDepartments: vi.fn().mockResolvedValue([]),
    listMemberships: vi.fn().mockResolvedValue([]),
    listOrganizations: vi.fn().mockResolvedValue([organization]),
    listPositions: vi.fn().mockResolvedValue([]),
    listRoleBindings: vi.fn().mockResolvedValue([]),
    loadMoreOrganizations: vi.fn().mockResolvedValue([]),
    selectOrganization: vi.fn().mockResolvedValue(organization),
    updateOrganization: vi.fn().mockImplementation(async (_id: string, body: Record<string, unknown>) => ({ ...organization, ...body })),
  };
}

const writePermissions = {
  departments: { create: false, delete: false, read: false, update: false },
  memberships: { create: false, read: false, update: false },
  organizations: { create: true, delete: false, update: true },
  positions: { read: false },
  roleBindings: { read: false },
} as const;

function renderWorkspace(controller: ReturnType<typeof createController>) {
  return render(
    <SdkworkI18nProvider locale="zh-CN">
      <SdkworkIamOrganizationAdminWorkspace controller={controller as never} permissions={writePermissions} />
    </SdkworkI18nProvider>,
  );
}

async function openCreateDrawer() {
  await screen.findByText("Platform");
  fireEvent.click(screen.getByRole("button", { name: "创建组织" }));
  await screen.findByLabelText(/名称/u);
}

describe("organization create drawer", () => {
  it("groups the form into scannable sections and marks the required identifiers", async () => {
    const controller = createController();
    renderWorkspace(controller);
    await openCreateDrawer();

    expect(screen.getByRole("heading", { name: "基本信息" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "组织资料" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "联系方式" })).toBeTruthy();
    // The backend requires both identifiers; the copy tells the operator why.
    expect(screen.getByText("唯一标识，创建后用于组织路径。支持字母、数字、连字符和下划线。")).toBeTruthy();
    expect(screen.getByText("0/200")).toBeTruthy();
  });

  it("loads the whole tenant hierarchy for the parent picker when the drawer opens", async () => {
    const controller = createController();
    renderWorkspace(controller);
    await openCreateDrawer();

    expect(controller.listOrganizations).toHaveBeenCalledWith({ page: 1, page_size: 200 });
  });

  it("blocks an incomplete submit and names the missing fields", async () => {
    const controller = createController();
    renderWorkspace(controller);
    await openCreateDrawer();

    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    expect(await screen.findByText("请填写组织名称。")).toBeTruthy();
    expect(screen.getByText("请填写组织编码。")).toBeTruthy();
    expect(controller.createOrganization).not.toHaveBeenCalled();
  });

  it("rejects an invalid code and a malformed contact email before calling the backend", async () => {
    const controller = createController();
    renderWorkspace(controller);
    await openCreateDrawer();

    fireEvent.change(screen.getByLabelText(/名称/u), { target: { value: "North" } });
    fireEvent.change(screen.getByLabelText(/编码/u), { target: { value: "north orgs" } });
    fireEvent.change(screen.getByLabelText(/联系邮箱/u), { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    expect(await screen.findByText("编码需以字母或数字开头，仅支持字母、数字、连字符和下划线，最长 64 个字符。")).toBeTruthy();
    expect(screen.getByText("请输入有效的邮箱地址。")).toBeTruthy();
    expect(controller.createOrganization).not.toHaveBeenCalled();
  });

  it("creates the organization once the required identifiers are valid", async () => {
    const controller = createController();
    renderWorkspace(controller);
    await openCreateDrawer();

    fireEvent.change(screen.getByLabelText(/名称/u), { target: { value: "North" } });
    fireEvent.change(screen.getByLabelText(/编码/u), { target: { value: "north" } });
    fireEvent.change(screen.getByLabelText(/行业分类/u), { target: { value: "互联网" } });
    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => expect(controller.createOrganization).toHaveBeenCalledWith(expect.objectContaining({
      code: "north",
      industryCategory: "互联网",
      name: "North",
      organizationKind: "enterprise",
    })));
  });
});

describe("organization edit drawer", () => {
  it("seeds the draft from the stored organization and keeps the code editable", async () => {
    const controller = createController();
    renderWorkspace(controller);
    await screen.findByText("Platform");
    fireEvent.click(screen.getByRole("button", { name: "编辑组织" }));

    const code = await screen.findByLabelText(/编码/u) as HTMLInputElement;
    expect(code.value).toBe("platform");
    expect((screen.getByLabelText(/名称/u) as HTMLInputElement).value).toBe("Platform");
    // Edit mode adds the lifecycle status control the create flow does not
    // expose (new organizations start active on the backend).
    const statusTriggers = screen.getAllByRole("combobox");
    expect(statusTriggers.length).toBeGreaterThanOrEqual(3);
  });
});
