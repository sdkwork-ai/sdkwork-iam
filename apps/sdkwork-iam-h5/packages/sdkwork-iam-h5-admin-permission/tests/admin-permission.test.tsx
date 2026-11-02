import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SdkworkIamH5I18nProvider } from "@sdkwork/iam-h5-commons";

import {
  createSdkworkIamH5AdminPermissionController,
  IAM_H5_ADMIN_PERMISSION_I18N_CATALOG,
  SdkworkIamH5AdminPermissionScreen,
  type SdkworkIamH5AdminPermissionServicePort,
} from "../src/index";

/**
 * The admin catalog is the backend-api surface, so the cases assert what an operator
 * depends on: the row shows resource and action together, and a record with no identity
 * is dropped rather than rendered as a row that could never be managed.
 */

function createServiceMock(items: readonly unknown[] = [
  { code: "iam.user.read", id: "perm-1", action: "read", resource: "user" },
  { name: "iam.user.write", permission_id: "perm-2", action: "write", resource: "user" },
  { code: "broken" },
]) {
  const queries: Record<string, unknown>[] = [];
  const port = {
    iam: {
      permissions: {
        list: async (params?: Record<string, unknown>) => {
          queries.push(params ?? {});
          return { items, pageInfo: { hasMore: false } };
        },
      },
    },
  } as unknown as SdkworkIamH5AdminPermissionServicePort;
  return { port, queries };
}

function renderScreen(port: SdkworkIamH5AdminPermissionServicePort) {
  const controller = createSdkworkIamH5AdminPermissionController(port);
  return render(
    <SdkworkIamH5I18nProvider catalogs={[IAM_H5_ADMIN_PERMISSION_I18N_CATALOG]} locale="en-US">
      <SdkworkIamH5AdminPermissionScreen controller={controller} />
    </SdkworkIamH5I18nProvider>,
  );
}

describe("admin permission catalog", () => {
  it("renders each permission with its resource and action", async () => {
    const { port } = createServiceMock();
    renderScreen(port);

    expect(await screen.findByText("iam.user.read")).toBeTruthy();
    expect(await screen.findByText("user · read")).toBeTruthy();
    expect(await screen.findByText("iam.user.write")).toBeTruthy();
  });

  it("drops a record that carries no identity", async () => {
    const { port } = createServiceMock();
    renderScreen(port);

    expect(await screen.findByText("iam.user.read")).toBeTruthy();
    // "broken" has no id, so an operator could never manage it: it must not appear.
    expect(screen.queryByText("broken")).toBeNull();
  });

  it("shows the empty state when the tenant has no permission", async () => {
    const { port } = createServiceMock([]);
    renderScreen(port);

    expect(await screen.findByText("This tenant has no permission yet.")).toBeTruthy();
  });
});
