import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SdkworkIamH5I18nProvider } from "@sdkwork/iam-h5-commons";

import {
  createSdkworkIamH5TenantController,
  IAM_H5_TENANT_I18N_CATALOG,
  SdkworkIamH5TenantOverviewScreen,
  type SdkworkIamH5TenantServicePort,
} from "../src/index";

/**
 * The tenant overview is the first H5 capability ported from the PC console, so
 * these cases assert the three things that make it a product screen rather than a
 * placeholder: it reads the **app-api** port (never the backend tenant resource),
 * it keeps a failed next page from erasing loaded rows, and its copy comes from
 * the catalog instead of literals.
 */

function createServiceMock(overrides: {
  memberships?: unknown;
  organizations?: unknown;
  runtime?: unknown;
} = {}) {
  return {
    iam: {
      organizationMemberships: {
        list: vi.fn().mockResolvedValue(
          overrides.memberships ?? {
            items: [
              {
                displayName: "Ada Lovelace",
                id: "mem-1",
                organizationId: "org-1",
                roleCode: "owner",
                userId: "user-1",
              },
            ],
            pageInfo: { hasMore: false, page: 0, pageSize: 20, total: 1 },
          },
        ),
      },
      organizations: {
        list: vi.fn().mockResolvedValue(
          overrides.organizations ?? {
            items: [
              { id: "org-1", name: "Acme", organizationId: "org-1", status: "active" },
            ],
            pageInfo: { hasMore: false, page: 0, pageSize: 20, total: 1 },
          },
        ),
      },
    },
    system: {
      iam: {
        runtime: {
          retrieve: vi.fn().mockResolvedValue(
            overrides.runtime ?? {
              deploymentMode: "standalone",
              environment: "development",
              tenantId: "tenant-1",
              userId: "user-1",
            },
          ),
        },
      },
    },
  } satisfies SdkworkIamH5TenantServicePort;
}

function renderScreen(service: SdkworkIamH5TenantServicePort, locale = "en-US") {
  const controller = createSdkworkIamH5TenantController({ service });
  const result = render(
    <SdkworkIamH5I18nProvider catalogs={[IAM_H5_TENANT_I18N_CATALOG]} locale={locale}>
      <SdkworkIamH5TenantOverviewScreen controller={controller} />
    </SdkworkIamH5I18nProvider>,
  );
  return { ...result, controller };
}

describe("IAM H5 tenant controller", () => {
  it("reads the session context, organizations and memberships from the app port", async () => {
    const service = createServiceMock();
    const controller = createSdkworkIamH5TenantController({ service });

    await expect(controller.loadRuntime()).resolves.toEqual({
      deploymentMode: "standalone",
      environment: "development",
      tenantId: "tenant-1",
      userId: "user-1",
    });

    const organizations = await controller.fetchOrganizationsPage({ page: 0, page_size: 20 });
    expect(organizations.items).toEqual([
      { id: "org-1", name: "Acme", parentId: undefined, status: "active" },
    ]);
    expect(service.iam.organizations.list).toHaveBeenCalledWith({ page: 0, page_size: 20 });

    const memberships = await controller.fetchMembershipsPage({ page: 0, page_size: 20 });
    expect(memberships.items).toHaveLength(1);
    expect(memberships.items[0]).toMatchObject({ roleCode: "owner", userId: "user-1" });
    // The backend tenant resource belongs to another tier; reaching it from the
    // app surface would be a surface-boundary defect, so it must stay untouched.
    expect("tenants" in service.iam).toBe(false);
  });

  it("sends a trimmed search term only when one was typed", async () => {
    const service = createServiceMock();
    const controller = createSdkworkIamH5TenantController({ service });

    await controller.fetchOrganizationsPage({ page: 1, page_size: 20, q: "  acme  " });
    expect(service.iam.organizations.list).toHaveBeenLastCalledWith({
      page: 1,
      page_size: 20,
      q: "acme",
    });

    await controller.fetchOrganizationsPage({ page: 0, page_size: 20, q: "   " });
    expect(service.iam.organizations.list).toHaveBeenLastCalledWith({ page: 0, page_size: 20 });
  });

  it("drops rows the server could not identify instead of rendering blank entries", async () => {
    const service = createServiceMock({
      organizations: { items: [{ name: "No id" }, { id: "org-2", name: "Beta" }] },
    });
    const controller = createSdkworkIamH5TenantController({ service });

    const page = await controller.fetchOrganizationsPage({ page: 0, page_size: 20 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe("org-2");
    // A bare `{ items }` envelope reports no pageInfo, so the list must treat it
    // as the last page rather than promising a next one that does not exist.
    expect(page.hasMore).toBe(false);
  });
});

describe("IAM H5 tenant overview screen", () => {
  it("renders the session, organizations and memberships with catalog copy", async () => {
    const service = createServiceMock();
    renderScreen(service);

    expect(await screen.findByText("tenant-1")).toBeTruthy();
    expect(screen.getByText("development")).toBeTruthy();
    expect(await screen.findByText("Acme")).toBeTruthy();
    expect(await screen.findByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByText("Organizations")).toBeTruthy();
    expect(screen.getByText("My memberships")).toBeTruthy();
    expect(screen.getByLabelText("Search organizations")).toBeTruthy();
  });

  it("renders the localized copy for zh-CN", async () => {
    const service = createServiceMock();
    renderScreen(service, "zh-CN");

    expect(await screen.findByText("当前会话")).toBeTruthy();
    expect(screen.getByText("我的成员关系")).toBeTruthy();
    expect(screen.getByLabelText("搜索组织")).toBeTruthy();
  });

  it("shows an empty state when the tenant exposes no organization", async () => {
    const service = createServiceMock({
      organizations: { items: [], pageInfo: { hasMore: false } },
    });
    renderScreen(service);

    expect(await screen.findByText("No organizations")).toBeTruthy();
    expect(screen.getByText("This tenant does not expose an organization yet.")).toBeTruthy();
  });

  it("keeps the loaded rows and offers a retry when the next page fails", async () => {
    const service = createServiceMock({
      organizations: {
        items: [{ id: "org-1", name: "Acme" }],
        pageInfo: { hasMore: true, page: 0, pageSize: 1, total: 3 },
      },
    });
    const { controller } = renderScreen(service);
    expect(controller).toBeDefined();
    const firstPage = await screen.findByText("Acme");
    expect(firstPage).toBeTruthy();

    // Second page fails: the first row must stay on screen, and the failure is a
    // notice rather than an error screen that would throw the rows away.
    service.iam.organizations.list.mockRejectedValueOnce(
      Object.assign(new Error("boom"), { code: 50001 }),
    );
    screen.getByRole("button", { name: "Load more" }).click();

    await waitFor(() => {
      expect(screen.getByText("Acme")).toBeTruthy();
    });
    expect(await screen.findByText(/Unable to load more/)).toBeTruthy();
    expect(screen.queryByText("No organizations")).toBeNull();
  });
});
