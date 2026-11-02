import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SdkworkIamH5I18nProvider } from "@sdkwork/iam-h5-commons";

import {
  createSdkworkIamH5UserCenterController,
  IAM_H5_USER_CENTER_I18N_CATALOG,
  SdkworkIamH5UserCenterPasswordScreen,
  SdkworkIamH5UserCenterProfileScreen,
  validateSdkworkIamH5PasswordDraft,
  type SdkworkIamH5UserCenterServicePort,
} from "../src/index";

/**
 * The user center is the first screen where a user *writes* to their own record,
 * so these cases assert the two failures that matter in production: a render must
 * not clobber what is being typed, and a locally invalid password must not spend a
 * round trip before the server repeats the same rule.
 *
 * The service double is cast at the boundary and the spies are kept separately:
 * the port types the calls the screens make, the spies type the assertions.
 */

const BASE_PROFILE = {
  displayName: "Ada Lovelace",
  email: "ada@example.com",
  id: "user-1",
  nickname: "ada",
  userId: "user-1",
  username: "ada",
};

function createServiceMock(options: { policyRejects?: boolean; profile?: unknown } = {}) {
  const profile = options.profile ?? BASE_PROFILE;
  const calls = {
    passwordUpdate: vi.fn(async (_body: Record<string, unknown>) => undefined),
    policyRetrieve: options.policyRejects
      ? vi.fn(async () => {
          throw new Error("not published");
        })
      : vi.fn(async () => ({ emailVerificationRequired: true })),
    retrieve: vi.fn(async () => profile),
    update: vi.fn(async (body: Record<string, unknown>) => ({
      ...(profile as Record<string, unknown>),
      ...body,
    })),
  };
  const service = {
    iam: {
      users: {
        current: {
          password: { update: calls.passwordUpdate },
          retrieve: calls.retrieve,
          update: calls.update,
        },
      },
    },
    system: { iam: { verificationPolicy: { retrieve: calls.policyRetrieve } } },
  } as unknown as SdkworkIamH5UserCenterServicePort;
  return { calls, service };
}

function renderProfile(service: SdkworkIamH5UserCenterServicePort, locale = "en-US") {
  const controller = createSdkworkIamH5UserCenterController({ service });
  const result = render(
    <SdkworkIamH5I18nProvider catalogs={[IAM_H5_USER_CENTER_I18N_CATALOG]} locale={locale}>
      <SdkworkIamH5UserCenterProfileScreen controller={controller} />
    </SdkworkIamH5I18nProvider>,
  );
  return { ...result, controller };
}

function renderPassword(service: SdkworkIamH5UserCenterServicePort, locale = "en-US") {
  const controller = createSdkworkIamH5UserCenterController({ service });
  const result = render(
    <SdkworkIamH5I18nProvider catalogs={[IAM_H5_USER_CENTER_I18N_CATALOG]} locale={locale}>
      <SdkworkIamH5UserCenterPasswordScreen controller={controller} />
    </SdkworkIamH5I18nProvider>,
  );
  return { ...result, controller };
}

describe("IAM H5 user-center controller", () => {
  it("normalizes the profile record and passes only the edited fields", async () => {
    const { calls, service } = createServiceMock();
    const controller = createSdkworkIamH5UserCenterController({ service });

    await expect(controller.loadProfile()).resolves.toMatchObject({
      displayName: "Ada Lovelace",
      userId: "user-1",
      username: "ada",
    });

    await controller.updateProfile({ displayName: "Ada L." });
    expect(calls.update).toHaveBeenCalledWith({ displayName: "Ada L." });
  });

  it("rejects a record with no user id instead of rendering an empty profile", async () => {
    const { service } = createServiceMock({ profile: { displayName: "ghost" } });
    const controller = createSdkworkIamH5UserCenterController({ service });
    await expect(controller.loadProfile()).rejects.toThrow(/without a user id/u);
  });

  it("treats an unpublished verification policy as no requirement", async () => {
    const { service } = createServiceMock({ policyRejects: true });
    const controller = createSdkworkIamH5UserCenterController({ service });
    await expect(controller.loadVerificationPolicy()).resolves.toEqual({});
  });
});

describe("IAM H5 password draft validation", () => {
  it("accepts a matching, long-enough draft", () => {
    expect(
      validateSdkworkIamH5PasswordDraft({
        confirmPassword: "new-password",
        newPassword: "new-password",
        oldPassword: "old-password",
      }),
    ).toBeUndefined();
  });

  it("names the first problem it finds", () => {
    expect(
      validateSdkworkIamH5PasswordDraft({ confirmPassword: "x", newPassword: "x", oldPassword: " " }),
    ).toBe("old-password-required");
    expect(
      validateSdkworkIamH5PasswordDraft({ confirmPassword: "short", newPassword: "short", oldPassword: "old" }),
    ).toBe("new-password-too-short");
    expect(
      validateSdkworkIamH5PasswordDraft({
        confirmPassword: "different-one",
        newPassword: "new-password",
        oldPassword: "old",
      }),
    ).toBe("confirm-mismatch");
  });
});

describe("IAM H5 user-center profile screen", () => {
  it("shows the account identifiers and the verification requirement", async () => {
    const { service } = createServiceMock();
    renderProfile(service);

    expect(await screen.findByText("user-1")).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(await screen.findByText(/Binding changes require verification/u)).toBeTruthy();
  });

  it("seeds the form from the record and saves what the user typed", async () => {
    const { calls, service } = createServiceMock();
    renderProfile(service);

    const displayName = (await screen.findByLabelText("Display name")) as HTMLInputElement;
    expect(displayName.value).toBe("Ada Lovelace");

    fireEvent.change(displayName, { target: { value: "Ada L." } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => expect(calls.update).toHaveBeenCalled());
    expect(calls.update).toHaveBeenCalledWith({ displayName: "Ada L.", nickname: "ada" });
    expect(await screen.findByText("Profile saved")).toBeTruthy();
  });

  it("renders the localized copy and the password link", async () => {
    const { service } = createServiceMock();
    const onOpenPassword = vi.fn();
    const controller = createSdkworkIamH5UserCenterController({ service });
    render(
      <SdkworkIamH5I18nProvider catalogs={[IAM_H5_USER_CENTER_I18N_CATALOG]} locale="zh-CN">
        <SdkworkIamH5UserCenterProfileScreen controller={controller} onOpenPassword={onOpenPassword} />
      </SdkworkIamH5I18nProvider>,
    );

    expect(await screen.findByText("账号")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "修改密码" }));
    expect(onOpenPassword).toHaveBeenCalledTimes(1);
  });
});

describe("IAM H5 user-center password screen", () => {
  it("blocks a mismatched draft locally and never calls the server", async () => {
    const { calls, service } = createServiceMock();
    renderPassword(service);

    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "old-password" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "different-one" } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("The two new passwords do not match.")).toBeTruthy();
    expect(calls.passwordUpdate).not.toHaveBeenCalled();
  });

  it("submits a valid draft, clears the fields and reports success", async () => {
    const { calls, service } = createServiceMock();
    const onChanged = vi.fn();
    const controller = createSdkworkIamH5UserCenterController({ service });
    render(
      <SdkworkIamH5I18nProvider catalogs={[IAM_H5_USER_CENTER_I18N_CATALOG]} locale="en-US">
        <SdkworkIamH5UserCenterPasswordScreen controller={controller} onChanged={onChanged} />
      </SdkworkIamH5I18nProvider>,
    );

    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "old-password" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "new-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(calls.passwordUpdate).toHaveBeenCalledWith({
      confirmPassword: "new-password",
      newPassword: "new-password",
      oldPassword: "old-password",
    });
    expect(await screen.findByText("Password updated")).toBeTruthy();
    expect((screen.getByLabelText("Current password") as HTMLInputElement).value).toBe("");
  });
});
