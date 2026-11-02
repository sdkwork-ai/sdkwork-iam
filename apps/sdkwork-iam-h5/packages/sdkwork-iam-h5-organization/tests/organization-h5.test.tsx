import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SdkworkIamH5I18nProvider } from "@sdkwork/iam-h5-commons";

import {
  createSdkworkIamH5OrganizationController,
  IAM_H5_ORGANIZATION_I18N_CATALOG,
  SdkworkIamH5OrganizationDirectoryScreen,
  type SdkworkIamH5OrganizationServicePort,
} from "../src/index";

/**
 * The directory is the first screen where a *page* of records is the whole
 * product, so these cases cover the contract the operator depends on: the wire
 * query is exactly what was asked for, unidentifiable rows are dropped instead of
 * rendering blanks, and a search that matches nothing is not the empty dataset.
 */

function createServiceMock(items: readonly unknown[] = [
  { id: "org-1", name: "Acme", organizationId: "org-1", status: "active" },
  { id: "org-2", name: "Acme Labs", organizationId: "org-2", parentId: "org-1" },
]) {
  const calls = {
    list: vi.fn(async (_params?: Record<string, unknown>) => ({
      items,
      pageInfo: { hasMore: false, page: 0, pageSize: 20, total: items.length },
    })),
  };
  const service = { iam: { organizations: { list: calls.list } } } as unknown as SdkworkIamH5OrganizationServicePort;
  return { calls, service };
}

function renderDirectory(service: SdkworkIamH5OrganizationServicePort, locale = "en-US") {
  const controller = createSdkworkIamH5OrganizationController({ service });
  return render(
    <SdkworkIamH5I18nProvider catalogs={[IAM_H5_ORGANIZATION_I18N_CATALOG]} locale={locale}>
      <SdkworkIamH5OrganizationDirectoryScreen controller={controller} />
    </SdkworkIamH5I18nProvider>,
  );
}

describe("IAM H5 organization directory controller", () => {
  it("maps rows and sends only the parameters the caller asked for", async () => {
    const { calls, service } = createServiceMock();
    const controller = createSdkworkIamH5OrganizationController({ service });

    const page = await controller.fetchOrganizationsPage({ page: 0, page_size: 20 });
    expect(page.items).toEqual([
      { id: "org-1", name: "Acme", parentId: undefined, status: "active" },
      { id: "org-2", name: "Acme Labs", parentId: "org-1", status: undefined },
    ]);
    expect(calls.list).toHaveBeenCalledWith({ page: 0, page_size: 20 });
  });

  it("omits a blank search term and trims a real one", async () => {
    const { calls, service } = createServiceMock();
    const controller = createSdkworkIamH5OrganizationController({ service });

    await controller.fetchOrganizationsPage({ page: 0, page_size: 20, q: "  " });
    expect(calls.list).toHaveBeenLastCalledWith({ page: 0, page_size: 20 });

    await controller.fetchOrganizationsPage({ page: 0, page_size: 20, q: " acme " });
    expect(calls.list).toHaveBeenLastCalledWith({ page: 0, page_size: 20, q: "acme" });
  });

  it("drops a row the server could not identify", async () => {
    const { service } = createServiceMock([{ name: "No id" }, { id: "org-9", name: "Kept" }]);
    const controller = createSdkworkIamH5OrganizationController({ service });

    const page = await controller.fetchOrganizationsPage({ page: 0, page_size: 20 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe("org-9");
  });
});

describe("IAM H5 organization directory screen", () => {
  it("renders the rows with their hierarchy hint", async () => {
    const { service } = createServiceMock();
    renderDirectory(service);

    expect(await screen.findByText("Acme")).toBeTruthy();
    expect(screen.getByText("Acme Labs")).toBeTruthy();
    // The child row shows the parent it belongs to, so a paged list is still
    // legible as a hierarchy.
    expect(screen.getByText("org-2 · org-1")).toBeTruthy();
    expect(screen.getByLabelText("Search organizations")).toBeTruthy();
  });

  it("renders the localized zh-CN copy", async () => {
    const { service } = createServiceMock();
    renderDirectory(service, "zh-CN");

    expect(await screen.findByText("组织通讯录")).toBeTruthy();
    expect(screen.getByLabelText("搜索组织")).toBeTruthy();
  });

  it("distinguishes an empty dataset from an empty search", async () => {
    const { service } = createServiceMock([]);
    renderDirectory(service);

    expect(await screen.findByText("No organizations")).toBeTruthy();
    expect(screen.getByText("This tenant does not expose an organization yet.")).toBeTruthy();
  });

  it("reports a failed first page with a retry", async () => {
    const { calls, service } = createServiceMock();
    calls.list.mockRejectedValueOnce(Object.assign(new Error("boom"), { code: 50001 }));
    renderDirectory(service);

    await waitFor(() => expect(screen.getByText("Something went wrong")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.queryByText("No organizations")).toBeNull();
  });
});
