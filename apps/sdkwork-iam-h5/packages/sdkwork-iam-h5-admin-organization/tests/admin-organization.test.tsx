import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SdkworkIamH5I18nProvider } from "@sdkwork/iam-h5-commons";

import {
  createSdkworkIamH5AdminOrganizationController,
  IAM_H5_ADMIN_ORGANIZATION_I18N_CATALOG,
  SdkworkIamH5AdminOrganizationScreen,
  type SdkworkIamH5AdminOrganizationServicePort,
} from "../src/index";

/**
 * The tree is read by indentation, so the cases pin the flatten: depth order matches the
 * server's nesting, and a node without an identity takes its subtree with it instead of
 * leaving children at the wrong level.
 */

function createServiceMock(tree: unknown = {
  items: [
    {
      children: [{ id: "org-1-1", name: "Platform" }],
      id: "org-1",
      name: "Engineering",
    },
    { id: "org-2", name: "Operations" },
  ],
}) {
  const port = {
    iam: {
      organizations: {
        tree: {
          retrieve: async () => tree,
        },
      },
    },
  } as unknown as SdkworkIamH5AdminOrganizationServicePort;
  return port;
}

function renderScreen(port: SdkworkIamH5AdminOrganizationServicePort) {
  const controller = createSdkworkIamH5AdminOrganizationController(port);
  return render(
    <SdkworkIamH5I18nProvider catalogs={[IAM_H5_ADMIN_ORGANIZATION_I18N_CATALOG]} locale="en-US">
      <SdkworkIamH5AdminOrganizationScreen controller={controller} />
    </SdkworkIamH5I18nProvider>,
  );
}

describe("admin organization tree", () => {
  it("indents a child under its parent", async () => {
    renderScreen(createServiceMock());

    // Root at depth 0, child at depth 1: the indentation is the only signal of nesting.
    expect(await screen.findByText("Engineering")).toBeTruthy();
    expect(await screen.findByText("— Platform")).toBeTruthy();
    expect(await screen.findByText("Operations")).toBeTruthy();
  });

  it("drops a node without an identity together with its subtree", async () => {
    renderScreen(
      createServiceMock({
        items: [
          { children: [{ id: "orphan-child", name: "Stray child" }], name: "No identity" },
          { id: "org-2", name: "Operations" },
        ],
      }),
    );

    expect(await screen.findByText("Operations")).toBeTruthy();
    expect(screen.queryByText("No identity")).toBeNull();
    // Its child must not be promoted to a root either.
    expect(screen.queryByText("Stray child")).toBeNull();
  });

  it("shows the empty state for a tenant with no organization", async () => {
    renderScreen(createServiceMock({ items: [] }));

    expect(await screen.findByText("This tenant has no organization yet.")).toBeTruthy();
  });
});
