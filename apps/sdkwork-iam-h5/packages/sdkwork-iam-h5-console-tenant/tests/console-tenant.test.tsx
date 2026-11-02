import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SdkworkIamH5I18nProvider } from "@sdkwork/iam-h5-commons";

import {
  createSdkworkIamH5ConsoleTenantController,
  IAM_H5_CONSOLE_TENANT_I18N_CATALOG,
  SdkworkIamH5ConsoleTenantOverviewScreen,
  type SdkworkIamH5ConsoleTenantServicePort,
} from "../src/index";

/**
 * The console workspace answers a different question from the app surface, so these
 * cases assert what makes it a console screen rather than a copy: it reads the tenant
 * identity and the *policy* an operator needs, and a disabled policy reads as "not
 * allowed" instead of disappearing.
 */

function createServiceMock(overrides: {
  organizations?: unknown;
  policy?: unknown;
  runtime?: unknown;
} = {}): SdkworkIamH5ConsoleTenantServicePort {
  const organizations = overrides.organizations ?? {
    items: [
      { id: "org-1", name: "Acme" },
      { id: "org-2", name: "Acme Labs", parent_id: "org-1" },
    ],
    pageInfo: { hasMore: false },
  };
  const runtime = overrides.runtime ?? {
    environment: "development",
    tenant_id: "tenant-1",
    user_id: "user-1",
  };
  const policy = overrides.policy ?? {
    contactBinding: { emailEnabled: true, enabled: true },
    oauthBinding: { enabled: true, selfServiceLinkEnabled: false },
  };
  return {
    iam: {
      organizations: {
        list: async () => organizations,
      },
    },
    oauth: {},
    system: {
      iam: {
        accountBindingPolicy: {
          retrieve: async () => policy,
        },
        runtime: {
          retrieve: async () => runtime,
        },
      },
    },
  } as unknown as SdkworkIamH5ConsoleTenantServicePort;
}

function renderScreen(port: SdkworkIamH5ConsoleTenantServicePort) {
  const controller = createSdkworkIamH5ConsoleTenantController(port);
  return render(
    <SdkworkIamH5I18nProvider catalogs={[IAM_H5_CONSOLE_TENANT_I18N_CATALOG]} locale="en-US">
      <SdkworkIamH5ConsoleTenantOverviewScreen controller={controller} />
    </SdkworkIamH5I18nProvider>,
  );
}

describe("console tenant workspace", () => {
  it("shows the tenant identity and its organizations", async () => {
    renderScreen(createServiceMock());

    expect(await screen.findByText("tenant-1")).toBeTruthy();
    expect(await screen.findByText("development")).toBeTruthy();
    expect(await screen.findByText("Acme")).toBeTruthy();
    expect(await screen.findByText("Acme Labs")).toBeTruthy();
  });

  it("reports a disabled self-service policy as not allowed", async () => {
    renderScreen(createServiceMock());

    // The policy row exists either way: an operator must be able to read "not
    // allowed" rather than infer it from a missing row.
    expect(await screen.findByText("Self-service unlink")).toBeTruthy();
    expect((await screen.findAllByText("Not allowed")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("Allowed")).length).toBeGreaterThan(0);
  });

  it("treats an unpublished policy as nothing enabled", async () => {
    renderScreen(
      createServiceMock({
        policy: {
          retrieve: () => {
            throw new Error("not published");
          },
        },
      }),
    );

    // The workspace still renders: a missing policy is not a reason to lose the
    // tenant identity an operator came for.
    expect(await screen.findByText("tenant-1")).toBeTruthy();
    expect((await screen.findAllByText("Not allowed")).length).toBe(4);
  });
});
