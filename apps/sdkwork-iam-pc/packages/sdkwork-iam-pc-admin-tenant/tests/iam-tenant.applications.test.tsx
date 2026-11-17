import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { describe, expect, it, vi } from "vitest";

import {
  createSdkworkIamTenantController,
  SdkworkIamTenantAdminWorkspace,
} from "../src";

const storedApplication = {
  accessPermissions: ["iam.users.read"],
  appId: "app_crm_prod",
  applicationType: "pc",
  deployApplicationId: "deploy-crm",
  displayName: "CRM",
  environment: "production",
  instanceKey: "crm-production",
  organizationId: "0",
  primaryDomain: "crm.example.com",
  status: "enabled",
  tenantApplicationId: "tapp_crm",
  tenantId: "tenant-1",
};

function createApplicationsService() {
  const provision = vi.fn().mockResolvedValue({
    ...storedApplication,
    status: "pending_config",
    tenantApplicationId: "tapp_new",
  });
  const service = {
    iam: {
      tenants: {
        list: vi.fn().mockResolvedValue({
          items: [{ code: "ACME", name: "Acme", status: "active", tenantId: "tenant-1" }],
        }),
        members: { list: vi.fn().mockResolvedValue({ items: [] }) },
      },
      tenantApplications: {
        list: vi.fn().mockResolvedValue({ items: [storedApplication] }),
        management: {
          create: provision,
          disable: vi.fn(),
          enable: vi.fn(),
          update: vi.fn(),
        },
        summary: {
          retrieve: vi.fn().mockResolvedValue({ disabled: 0, enabled: 1, pending: 0, total: 1 }),
        },
      },
    },
  };
  return { provision, service };
}

function renderApplicationsWorkspace(service: ReturnType<typeof createApplicationsService>["service"]) {
  const controller = createSdkworkIamTenantController({
    permissionScope: ["iam.tenant_applications.*"],
    service: service as never,
  });

  return render(
    <SdkworkI18nProvider locale="zh-CN">
      <SdkworkIamTenantAdminWorkspace controller={controller} />
    </SdkworkI18nProvider>,
  );
}

describe("tenant application workspace", () => {
  it("opens a tenant application workspace with summary, list, and provisioning flow", async () => {
    const { service } = createApplicationsService();
    renderApplicationsWorkspace(service);

    await screen.findByText("Acme");
    fireEvent.click(screen.getByRole("button", { name: "管理" }));

    await screen.findByText("CRM");
    // The table header row was removed: the filter form sits directly above
    // the table and the register action moved into the same row.
    expect(screen.getAllByRole("search").length).toBeGreaterThan(0);
    expect(screen.getByText("crm.example.com")).toBeTruthy();
    expect(screen.getByText("应用总数")).toBeTruthy();
    expect(service.iam.tenantApplications.list).toHaveBeenCalledWith("tenant-1", { page: 1, page_size: 20 });

    fireEvent.click(screen.getByRole("button", { name: "开通应用" }));
    expect(screen.getByText("开通租户应用")).toBeTruthy();
    // The retired template field is replaced by the deploy application the
    // installation serves.
    expect(screen.getByLabelText(/部署应用 ID/u)).toBeTruthy();
    expect(screen.getByPlaceholderText("例如 deploy-cloudrouter")).toBeTruthy();
    expect(screen.queryByText("已注册应用标识")).toBeNull();

    await waitFor(() => expect(service.iam.tenantApplications.summary.retrieve).toHaveBeenCalledWith("tenant-1"));
  });

  it("names the missing deploy application and provisions with the new command shape", async () => {
    const { provision, service } = createApplicationsService();
    renderApplicationsWorkspace(service);

    await screen.findByText("Acme");
    fireEvent.click(screen.getByRole("button", { name: "管理" }));
    await screen.findByText("CRM");
    fireEvent.click(screen.getByRole("button", { name: "开通应用" }));

    const drawer = await screen.findByRole("dialog");
    fireEvent.change(within(drawer).getByLabelText(/应用名称/u), { target: { value: "Billing" } });
    fireEvent.click(within(drawer).getByRole("button", { name: "开通应用" }));

    // The deploy application anchors the installation, so a submit without it
    // must name that field instead of failing opaquely.
    expect(await screen.findByText("请填写部署应用 ID。")).toBeTruthy();
    expect(screen.getByText("请选择应用类型。")).toBeTruthy();
    expect(provision).not.toHaveBeenCalled();

    fireEvent.change(within(drawer).getByLabelText(/部署应用 ID/u), { target: { value: "deploy-billing" } });
    expect((within(drawer).getByLabelText(/实例标识/u) as HTMLInputElement).value).toBe("deploy-billing-production");

    fireEvent.click(within(drawer).getByRole("combobox", { name: "应用类型" }));
    fireEvent.click(await screen.findByRole("option", { name: "PC" }));

    fireEvent.click(within(drawer).getByRole("button", { name: "开通应用" }));

    await waitFor(() => expect(provision).toHaveBeenCalledTimes(1));
    expect(provision).toHaveBeenCalledWith("tenant-1", {
      accessPermissions: [],
      applicationType: "pc",
      deployApplicationId: "deploy-billing",
      displayName: "Billing",
      environment: "production",
      instanceKey: "deploy-billing-production",
      organizationId: "0",
    });
    const [, payload] = provision.mock.calls[0] ?? [];
    expect(payload).not.toHaveProperty("templateId");
    expect(payload).not.toHaveProperty("appKey");
  });

  it("blocks a runtime config that is not a JSON object and forwards a valid one", async () => {
    const { provision, service } = createApplicationsService();
    renderApplicationsWorkspace(service);

    await screen.findByText("Acme");
    fireEvent.click(screen.getByRole("button", { name: "管理" }));
    await screen.findByText("CRM");
    fireEvent.click(screen.getByRole("button", { name: "开通应用" }));

    const drawer = await screen.findByRole("dialog");
    fireEvent.change(within(drawer).getByLabelText(/应用名称/u), { target: { value: "Billing" } });
    fireEvent.change(within(drawer).getByLabelText(/部署应用 ID/u), { target: { value: "deploy-billing" } });
    fireEvent.click(within(drawer).getByRole("combobox", { name: "应用类型" }));
    fireEvent.click(await screen.findByRole("option", { name: "PC" }));

    const runtimeConfig = within(drawer).getByLabelText(/运行时配置/u);
    fireEvent.change(runtimeConfig, { target: { value: "[1, 2]" } });
    expect(await screen.findByText("运行时配置必须是合法的 JSON 对象。")).toBeTruthy();
    fireEvent.click(within(drawer).getByRole("button", { name: "开通应用" }));
    expect(provision).not.toHaveBeenCalled();

    fireEvent.change(runtimeConfig, { target: { value: '{"oauth":{"relyingParty":{"clientId":"cloudrouter"}}}' } });
    expect(screen.queryByText("运行时配置必须是合法的 JSON 对象。")).toBeNull();
    fireEvent.click(within(drawer).getByRole("button", { name: "开通应用" }));

    await waitFor(() => expect(provision).toHaveBeenCalledTimes(1));
    expect(provision).toHaveBeenCalledWith("tenant-1", expect.objectContaining({
      runtimeConfig: { oauth: { relyingParty: { clientId: "cloudrouter" } } },
    }));
  });
});
