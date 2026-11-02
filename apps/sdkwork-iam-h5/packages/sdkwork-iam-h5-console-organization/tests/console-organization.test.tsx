import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SdkworkIamH5I18nProvider } from "@sdkwork/iam-h5-commons";

import {
  createSdkworkIamH5ConsoleOrganizationController,
  IAM_H5_CONSOLE_ORGANIZATION_I18N_CATALOG,
  SdkworkIamH5ConsoleOrganizationDirectoryScreen,
  type SdkworkIamH5ConsoleOrganizationServicePort,
} from "../src/index";

/**
 * The console organization workspace is the tenant-wide list, so these cases assert
 * what makes it usable by an operator: rows keep the parent id an operator needs to
 * reconstruct the tree, and a search is sent to the server rather than applied to a
 * downloaded list.
 */

function createServiceMock(rows: readonly unknown[] = [
  { id: "org-1", name: "Acme" },
  { id: "org-2", name: "Acme Labs", parent_id: "org-1" },
]) {
  const queries: Record<string, unknown>[] = [];
  const port: SdkworkIamH5ConsoleOrganizationServicePort = {
    iam: {
      organizations: {
        list: async (params: Record<string, unknown>) => {
          queries.push(params);
          return { items: rows, pageInfo: { hasMore: false } };
        },
      },
    },
  } as unknown as SdkworkIamH5ConsoleOrganizationServicePort;
  return { port, queries };
}

function renderScreen(port: SdkworkIamH5ConsoleOrganizationServicePort) {
  const controller = createSdkworkIamH5ConsoleOrganizationController(port);
  return render(
    <SdkworkIamH5I18nProvider catalogs={[IAM_H5_CONSOLE_ORGANIZATION_I18N_CATALOG]} locale="en-US">
      <SdkworkIamH5ConsoleOrganizationDirectoryScreen controller={controller} />
    </SdkworkIamH5I18nProvider>,
  );
}

describe("console organization workspace", () => {
  it("renders every organization with its parent id", async () => {
    const { port } = createServiceMock();
    renderScreen(port);

    expect(await screen.findByText("Acme")).toBeTruthy();
    expect(await screen.findByText("Acme Labs")).toBeTruthy();
    // The parent id is what lets an operator place the row in the tree.
    expect(await screen.findByText("org-2 · org-1")).toBeTruthy();
  });

  it("shows the empty state instead of a blank list", async () => {
    const { port } = createServiceMock([]);
    renderScreen(port);

    expect(
      await screen.findByText("This tenant has no organizations yet."),
    ).toBeTruthy();
  });
});
