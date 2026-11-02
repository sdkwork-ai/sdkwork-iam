/**
 * Contract of the admin account-binding settings screen.
 *
 * Two failures matter on a policy editor and neither would show up in a parity count: a policy
 * the server never reported rendered as "everything off", and a write without the operator
 * asking for one. The cases pin both, plus the guard against clearing every capability at once.
 */

import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SdkworkIamH5I18nProvider } from "@sdkwork/iam-h5-commons";

import { IAM_H5_ADMIN_ACCOUNT_BINDING_I18N_CATALOG } from "../src/i18n/index.js";
import { SdkworkIamH5AdminAccountBindingScreen } from "../src/pages/AccountBindingAdminScreen.js";
import type {
  SdkworkIamH5AdminAccountBindingController,
  SdkworkIamH5AdminAccountBindingPolicy,
} from "../src/types/admin-account-binding-types.js";

function renderScreen(policy: SdkworkIamH5AdminAccountBindingPolicy, save = vi.fn(async () => {})) {
  const controller: SdkworkIamH5AdminAccountBindingController = {
    loadPolicy: vi.fn(async () => policy),
    savePolicy: save,
  };
  render(
    <SdkworkIamH5I18nProvider catalogs={[IAM_H5_ADMIN_ACCOUNT_BINDING_I18N_CATALOG]} locale="en-US">
      <SdkworkIamH5AdminAccountBindingScreen controller={controller} />
    </SdkworkIamH5I18nProvider>,
  );
  return { controller, save };
}

const twoOn: SdkworkIamH5AdminAccountBindingPolicy = {
  contactEnabled: true,
  emailEnabled: true,
  oauthEnabled: false,
  selfServiceUnlinkEnabled: false,
};

describe("admin account-binding settings", () => {
  it("renders the saved policy in its switches", async () => {
    renderScreen(twoOn);

    await waitFor(() => expect(screen.getByLabelText("Contact binding")).toBeChecked());
    expect(screen.getByLabelText("Email binding")).toBeChecked();
    expect(screen.getByLabelText("Third-party sign-in")).not.toBeChecked();
    expect(screen.getByLabelText("Self-service unlink")).not.toBeChecked();
  });

  it("does not write anything until the operator saves", async () => {
    const { save } = renderScreen(twoOn);
    await waitFor(() => expect(screen.getByLabelText("Email binding")).toBeChecked());

    fireEvent.click(screen.getByLabelText("Email binding"));
    expect(save).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save policy" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const savedArg = (save.mock.calls as unknown[][])[0]?.[0];
    expect(savedArg).toEqual({
      contactEnabled: true,
      emailEnabled: false,
      oauthEnabled: false,
      selfServiceUnlinkEnabled: false,
    });
  });

  it("refuses to clear every capability in one action", async () => {
    const oneOn: SdkworkIamH5AdminAccountBindingPolicy = {
      contactEnabled: true,
      emailEnabled: false,
      oauthEnabled: false,
      selfServiceUnlinkEnabled: false,
    };
    const { save } = renderScreen(oneOn);
    await waitFor(() => expect(screen.getByLabelText("Contact binding")).toBeChecked());

    fireEvent.click(screen.getByLabelText("Contact binding"));
    fireEvent.click(screen.getByRole("button", { name: "Save policy" }));

    expect(save).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.getByText(/This would disable every binding capability/),
      ).toBeInTheDocument(),
    );
  });
});
