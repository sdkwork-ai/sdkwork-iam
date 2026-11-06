import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSdkworkIamTenantController,
  SdkworkIamTenantApplicationsAdminWorkspace,
} from "../src";

afterEach(() => {
  cleanup();
});

describe("tenant applications admin workspace", () => {
  it("targets the current tenant without a tenant picker or page header", async () => {
    const service = {
      iam: {
        tenants: {
          list: vi.fn().mockResolvedValue({
            items: [{ code: "ACME", name: "Acme", status: "active", tenantId: "tenant-1" }],
          }),
        },
        tenantApplications: {
          list: vi.fn().mockResolvedValue({
            items: [{
              accessPermissions: ["iam.users.read"],
              appId: "app_crm_prod",
              applicationType: "pc",
              displayName: "CRM",
              environment: "production",
              instanceKey: "crm-production",
              organizationId: "0",
              primaryDomain: "crm.example.com",
              status: "enabled",
              templateId: "tmpl_crm",
              tenantApplicationId: "tapp_crm",
              tenantId: "tenant-1",
            }],
          }),
          management: {
            disable: vi.fn(),
            enable: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
          },
          summary: {
            retrieve: vi.fn().mockResolvedValue({ disabled: 0, enabled: 1, pending: 0, total: 1 }),
          },
        },
      },
    };
    const controller = createSdkworkIamTenantController({
      permissionScope: ["iam.tenant_applications.*"],
      selectedTenantId: "tenant-1",
      service: service as never,
    });

    render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamTenantApplicationsAdminWorkspace controller={controller} />
      </SdkworkI18nProvider>,
    );

    // The current tenant's applications load directly; no tenant picker
    // and no standalone page header are rendered. The only search surface is
    // the application filter form above the table.
    await screen.findByText("CRM");
    expect(screen.queryByRole("combobox", { name: "选择租户" })).toBeNull();
    expect(screen.getByRole("search")).toBeTruthy();
    expect(screen.queryByText("应用列表")).toBeNull();
    // The application type column renders from the response payload.
    expect(screen.getAllByText("PC").length).toBeGreaterThan(0);
    expect(screen.getAllByText("应用类型").length).toBeGreaterThan(0);
    expect(service.iam.tenantApplications.list).toHaveBeenCalledWith("tenant-1", { page: 1, page_size: 20 });
    await waitFor(() => expect(service.iam.tenantApplications.summary.retrieve).toHaveBeenCalledWith("tenant-1"));
  });

  it("issues a tenant application access token from the row action", async () => {
    const create = vi.fn().mockResolvedValue({
      accessCredential: "header.payload.signature",
      appId: "app_crm_prod",
      expiresAt: "2026-11-07T10:00:00Z",
      sessionId: "session-1",
      tenantApplicationId: "tapp_crm",
    });
    const service = {
      iam: {
        accessCredentials: { create },
        tenants: {
          list: vi.fn().mockResolvedValue({
            items: [{ code: "ACME", name: "Acme", status: "active", tenantId: "tenant-1" }],
          }),
        },
        tenantApplications: {
          list: vi.fn().mockResolvedValue({
            items: [{
              accessPermissions: ["iam.users.read"],
              appId: "app_crm_prod",
              applicationType: "pc",
              displayName: "CRM",
              environment: "production",
              instanceKey: "crm-production",
              organizationId: "0",
              status: "enabled",
              templateId: "tmpl_crm",
              tenantApplicationId: "tapp_crm",
              tenantId: "tenant-1",
            }],
          }),
          summary: {
            retrieve: vi.fn().mockResolvedValue({ disabled: 0, enabled: 1, pending: 0, total: 1 }),
          },
        },
      },
    };
    const controller = createSdkworkIamTenantController({
      permissionScope: ["iam.access_credentials.create"],
      selectedTenantId: "tenant-1",
      service: service as never,
    });

    render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamTenantApplicationsAdminWorkspace controller={controller} />
      </SdkworkI18nProvider>,
    );

    await screen.findByText("CRM");
    fireEvent.click(screen.getByRole("button", { name: "访问令牌" }));

    expect(await screen.findByText("应用访问令牌")).toBeTruthy();
    expect(create).toHaveBeenCalledWith({
      organizationId: "0",
      tenantApplicationId: "tapp_crm",
      tenantId: "tenant-1",
    });
    expect(screen.getByText(/\*{8}/)).toBeTruthy();
    expect(screen.queryByText("header.payload.signature")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "显示令牌" }));
    expect(screen.getByText("header.payload.signature")).toBeTruthy();
  });
});
