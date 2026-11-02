import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SdkworkIamH5I18nProvider } from "@sdkwork/iam-h5-commons";

import {
  createSdkworkIamH5AdminPolicyController,
  createSdkworkIamH5AdminRoleController,
  IAM_H5_ADMIN_PERMISSION_I18N_CATALOG,
  SdkworkIamH5AdminPolicyScreen,
  SdkworkIamH5AdminRoleScreen,
  type SdkworkIamH5AdminPermissionServicePort,
} from "../src/index";

/**
 * Roles and policies are the same catalog shape with different columns, so the cases pin
 * what distinguishes them: a role shows its name when it has one, and a policy's effect is
 * on the row because "allow" and "deny" are otherwise indistinguishable by name.
 */

function createServiceMock(options: { policies?: readonly unknown[]; roles?: readonly unknown[] } = {}) {
  const port = {
    iam: {
      policies: {
        list: async () => ({
          items: options.policies ?? [
            { code: "allow-self-read", effect: "allow", policy_id: "pol-1" },
            { code: "deny-admin", effect: "deny", policy_id: "pol-2" },
          ],
          pageInfo: { hasMore: false },
        }),
      },
      roles: {
        list: async () => ({
          items: options.roles ?? [
            { id: "role-1", code: "tenant-admin", name: "Tenant admin" },
            { code: "auditor", roleId: "role-2" },
            { name: "no identity" },
          ],
          pageInfo: { hasMore: false },
        }),
      },
    },
  } as unknown as SdkworkIamH5AdminPermissionServicePort;
  return port;
}

function renderRoles(port: SdkworkIamH5AdminPermissionServicePort) {
  return render(
    <SdkworkIamH5I18nProvider catalogs={[IAM_H5_ADMIN_PERMISSION_I18N_CATALOG]} locale="en-US">
      <SdkworkIamH5AdminRoleScreen controller={createSdkworkIamH5AdminRoleController(port)} />
    </SdkworkIamH5I18nProvider>,
  );
}

function renderPolicies(port: SdkworkIamH5AdminPermissionServicePort) {
  return render(
    <SdkworkIamH5I18nProvider catalogs={[IAM_H5_ADMIN_PERMISSION_I18N_CATALOG]} locale="en-US">
      <SdkworkIamH5AdminPolicyScreen controller={createSdkworkIamH5AdminPolicyController(port)} />
    </SdkworkIamH5I18nProvider>,
  );
}

describe("admin role catalog", () => {
  it("shows the role name when it has one and the code otherwise", async () => {
    renderRoles(createServiceMock());

    expect(await screen.findByText("Tenant admin")).toBeTruthy();
    expect(await screen.findByText("auditor")).toBeTruthy();
  });

  it("drops a role without an identity", async () => {
    renderRoles(createServiceMock());

    expect(await screen.findByText("Tenant admin")).toBeTruthy();
    expect(screen.queryByText("no identity")).toBeNull();
  });

  it("shows the empty state", async () => {
    renderRoles(createServiceMock({ roles: [] }));

    expect(await screen.findByText("This tenant has no role yet.")).toBeTruthy();
  });
});

describe("admin policy catalog", () => {
  it("shows each policy's effect", async () => {
    renderPolicies(createServiceMock());

    expect(await screen.findByText("allow-self-read")).toBeTruthy();
    expect(await screen.findByText("deny-admin")).toBeTruthy();
    // Both effects must be readable on the row, not inferred from the code.
    expect(await screen.findByText("allow")).toBeTruthy();
    expect(await screen.findByText("deny")).toBeTruthy();
  });

  it("shows the empty state", async () => {
    renderPolicies(createServiceMock({ policies: [] }));

    expect(await screen.findByText("This tenant has no policy yet.")).toBeTruthy();
  });
});
