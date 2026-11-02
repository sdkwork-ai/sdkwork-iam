import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SdkworkIamH5I18nProvider } from "@sdkwork/iam-h5-commons";

import {
  createSdkworkIamH5AdminTenantController,
  IAM_H5_ADMIN_TENANT_I18N_CATALOG,
  SdkworkIamH5AdminTenantScreen,
  type SdkworkIamH5AdminTenantServicePort,
} from "../src/index";

/**
 * The tenant list is the operator's map of the deployment, so the cases pin what a ticket
 * depends on: the status is visible per row (a suspended tenant must not look like an
 * active one), and a tenant without an identity is dropped.
 */

function createServiceMock(items: readonly unknown[] = [
  { name: "Acme", status: "active", tenant_id: "tenant-1" },
  { id: "tenant-2", name: "Acme Labs", status: "suspended" },
  { name: "orphan" },
]) {
  const port = {
    iam: {
      tenants: {
        list: async () => ({ items, pageInfo: { hasMore: false } }),
      },
    },
  } as unknown as SdkworkIamH5AdminTenantServicePort;
  return port;
}

function renderScreen(port: SdkworkIamH5AdminTenantServicePort) {
  const controller = createSdkworkIamH5AdminTenantController(port);
  return render(
    <SdkworkIamH5I18nProvider catalogs={[IAM_H5_ADMIN_TENANT_I18N_CATALOG]} locale="en-US">
      <SdkworkIamH5AdminTenantScreen controller={controller} />
    </SdkworkIamH5I18nProvider>,
  );
}

describe("admin tenant list", () => {
  it("renders each tenant with its status", async () => {
    renderScreen(createServiceMock());

    expect(await screen.findByText("Acme")).toBeTruthy();
    expect(await screen.findByText("Acme Labs")).toBeTruthy();
    expect(await screen.findByText("active")).toBeTruthy();
    expect(await screen.findByText("suspended")).toBeTruthy();
  });

  it("drops a tenant without an identity", async () => {
    renderScreen(createServiceMock());

    expect(await screen.findByText("Acme")).toBeTruthy();
    expect(screen.queryByText("orphan")).toBeNull();
  });

  it("shows the empty state", async () => {
    renderScreen(createServiceMock([]));

    expect(await screen.findByText("No tenant exists on this deployment yet.")).toBeTruthy();
  });
});
