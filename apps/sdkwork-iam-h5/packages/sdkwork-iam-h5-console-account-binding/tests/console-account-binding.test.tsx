import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SdkworkIamH5I18nProvider } from "@sdkwork/iam-h5-commons";

import {
  createSdkworkIamH5ConsoleAccountBindingController,
  IAM_H5_CONSOLE_ACCOUNT_BINDING_I18N_CATALOG,
  SdkworkIamH5ConsoleAccountBindingScreen,
  type SdkworkIamH5ConsoleAccountBindingServicePort,
} from "../src/index";

/**
 * The console binding screen is where an operator answers "can this user remove this
 * themselves, and what are they signed in with", so the cases pin the policy gate and
 * the fact that a not-allowed policy is reported rather than hidden.
 */

function createServiceMock(options: { links?: readonly unknown[]; policy?: unknown } = {}) {
  const removed: string[] = [];
  const port = {
    oauth: {
      accountLinks: {
        delete: async (id: string) => {
          removed.push(id);
        },
        list: async () => ({
          items: options.links ?? [
            { accountLinkId: "link-1", provider: "github", providerUserId: "octocat" },
          ],
          pageInfo: { hasMore: false },
        }),
      },
    },
    system: {
      iam: {
        accountBindingPolicy: {
          retrieve: async () =>
            options.policy ?? {
              contactBinding: { emailEnabled: true, enabled: true },
              oauthBinding: { enabled: true, selfServiceLinkEnabled: true },
            },
        },
      },
    },
  } as unknown as SdkworkIamH5ConsoleAccountBindingServicePort;
  return { port, removed };
}

function renderScreen(port: SdkworkIamH5ConsoleAccountBindingServicePort) {
  const controller = createSdkworkIamH5ConsoleAccountBindingController(port);
  return render(
    <SdkworkIamH5I18nProvider catalogs={[IAM_H5_CONSOLE_ACCOUNT_BINDING_I18N_CATALOG]} locale="en-US">
      <SdkworkIamH5ConsoleAccountBindingScreen controller={controller} />
    </SdkworkIamH5I18nProvider>,
  );
}

describe("console account-binding workspace", () => {
  it("lists the user's linked identities", async () => {
    const { port } = createServiceMock();
    renderScreen(port);

    expect(await screen.findByText("github")).toBeTruthy();
    expect(await screen.findByText("octocat")).toBeTruthy();
  });

  it("offers removal only when the tenant grants self-service unlink", async () => {
    const { port, removed } = createServiceMock();
    renderScreen(port);

    const button = await screen.findByRole("button", { name: "Remove" });
    expect(button).toBeTruthy();
    expect(removed).toEqual([]);
  });

  it("reports a not-allowed policy instead of hiding the row", async () => {
    const { port } = createServiceMock({
      policy: { contactBinding: {}, oauthBinding: { enabled: true } },
    });
    renderScreen(port);

    // The policy row must be readable: an operator needs to know the user *cannot*
    // remove it, not merely find no button.
    await waitFor(async () => {
      const denied = await screen.findAllByText("Not allowed");
      expect(denied.length).toBeGreaterThan(0);
    });
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
  });

  it("shows the empty state when the user has no linked identity", async () => {
    const { port } = createServiceMock({ links: [] });
    renderScreen(port);

    expect(await screen.findByText("This user has no linked identities.")).toBeTruthy();
  });
});
