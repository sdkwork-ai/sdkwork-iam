import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SdkworkIamH5I18nProvider } from "@sdkwork/iam-h5-commons";

import {
  createSdkworkIamH5ConsoleUserCenterController,
  IAM_H5_CONSOLE_USER_CENTER_I18N_CATALOG,
  SdkworkIamH5ConsoleUserCenterProfileScreen,
  type SdkworkIamH5ConsoleUserCenterServicePort,
} from "../src/index";

/**
 * The console profile pairs the caller's record with the tenant's verification policy,
 * so the cases pin both halves and the tolerance that matters: a deployment with no
 * published policy still shows the account.
 */

function createServiceMock(options: { account?: unknown; policyThrows?: boolean } = {}) {
  const port = {
    iam: {
      users: {
        current: {
          retrieve: async () =>
            options.account ?? {
              display_name: "Ada",
              email: "ada@example.com",
              user_id: "user-1",
            },
        },
      },
    },
    system: {
      iam: {
        verificationPolicy: {
          retrieve: async () => {
            if (options.policyThrows) throw new Error("not published");
            return { emailVerification: { required: true } };
          },
        },
      },
    },
  } as unknown as SdkworkIamH5ConsoleUserCenterServicePort;
  return port;
}

function renderScreen(port: SdkworkIamH5ConsoleUserCenterServicePort) {
  const controller = createSdkworkIamH5ConsoleUserCenterController(port);
  return render(
    <SdkworkIamH5I18nProvider catalogs={[IAM_H5_CONSOLE_USER_CENTER_I18N_CATALOG]} locale="en-US">
      <SdkworkIamH5ConsoleUserCenterProfileScreen controller={controller} />
    </SdkworkIamH5I18nProvider>,
  );
}

describe("console user-center profile", () => {
  it("shows the caller's record", async () => {
    renderScreen(createServiceMock());

    expect(await screen.findByText("user-1")).toBeTruthy();
    expect(await screen.findByText("Ada")).toBeTruthy();
    expect(await screen.findByText("ada@example.com")).toBeTruthy();
  });

  it("shows which verifications the tenant requires", async () => {
    renderScreen(createServiceMock());

    expect(await screen.findByText("Email verification")).toBeTruthy();
    // One required, the rest optional: the row must read "Optional" rather than be
    // omitted, or an operator cannot tell a policy gap from an unasked question.
    expect((await screen.findAllByText("Optional")).length).toBe(2);
    expect((await screen.findAllByText("Required")).length).toBe(1);
  });

  it("still shows the account when the policy is unpublished", async () => {
    renderScreen(createServiceMock({ policyThrows: true }));

    expect(await screen.findByText("user-1")).toBeTruthy();
    expect((await screen.findAllByText("Optional")).length).toBe(3);
  });
});
