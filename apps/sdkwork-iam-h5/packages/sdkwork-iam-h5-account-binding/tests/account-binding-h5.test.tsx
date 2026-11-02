import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SdkworkIamH5I18nProvider } from "@sdkwork/iam-h5-commons";

import {
  createSdkworkIamH5AccountBindingController,
  IAM_H5_ACCOUNT_BINDING_I18N_CATALOG,
  SdkworkIamH5AccountBindingScreen,
  type SdkworkIamH5AccountBindingServicePort,
} from "../src/index";

/**
 * Account binding is where a user can remove their own sign-in methods, so the two
 * behaviours that matter are: the policy decides which controls exist at all, and
 * removing a link takes a deliberate second tap.
 */

function createServiceMock(options: {
  links?: readonly unknown[];
  policy?: unknown;
} = {}) {
  const calls = {
    bindEmail: vi.fn(async (_body: Record<string, unknown>) => ({ userId: "1" })),
    deleteLink: vi.fn(async (_id: string) => ({ id: _id })),
    listLinks: vi.fn(async (_params?: Record<string, unknown>) => ({
      items: options.links ?? [
        { accountLinkId: "link-1", id: "link-1", provider: "github", providerUserId: "octocat" },
      ],
      pageInfo: { hasMore: false, page: 0, pageSize: 20 },
    })),
    policy: vi.fn(async () =>
      options.policy ?? {
        contactBinding: { emailChangeEnabled: true, emailEnabled: true, enabled: true, phoneEnabled: false },
        oauthBinding: { enabled: true, selfServiceLinkEnabled: true, selfServiceUnlinkEnabled: true },
      }),
    unbindEmail: vi.fn(async (_body: Record<string, unknown>) => ({ userId: "1" })),
  };
  const service = {
    iam: {
      users: {
        current: { emailBindings: { create: calls.bindEmail, delete: calls.unbindEmail } },
      },
    },
    oauth: { accountLinks: { delete: calls.deleteLink, list: calls.listLinks } },
    system: { iam: { accountBindingPolicy: { retrieve: calls.policy } } },
  } as unknown as SdkworkIamH5AccountBindingServicePort;
  return { calls, service };
}

function renderScreen(service: SdkworkIamH5AccountBindingServicePort, locale = "en-US") {
  const controller = createSdkworkIamH5AccountBindingController({ service });
  return render(
    <SdkworkIamH5I18nProvider catalogs={[IAM_H5_ACCOUNT_BINDING_I18N_CATALOG]} locale={locale}>
      <SdkworkIamH5AccountBindingScreen controller={controller} />
    </SdkworkIamH5I18nProvider>,
  );
}

describe("IAM H5 account-binding screen", () => {
  it("shows the allowed operations and the linked identities", async () => {
    const { service } = createServiceMock();
    renderScreen(service);

    expect(await screen.findByText("What this tenant allows")).toBeTruthy();
    expect(screen.getByText("Linked sign-in accounts")).toBeTruthy();
    expect(await screen.findByText("github")).toBeTruthy();
    expect(screen.getByText("octocat")).toBeTruthy();
    // Four of the five policy flags are allowed in this fixture; the denied one is
    // the phone binding, which is the only "Not allowed" badge.
    expect(screen.getAllByText("Allowed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not allowed")).toHaveLength(1);
  });

  it("hides the email region when the policy disallows email binding", async () => {
    const { service } = createServiceMock({
      policy: {
        contactBinding: { emailEnabled: false, enabled: true, phoneEnabled: false },
        oauthBinding: { enabled: true, selfServiceUnlinkEnabled: false },
      },
    });
    renderScreen(service);

    await screen.findByText("What this tenant allows");
    expect(screen.queryByLabelText("Email address")).toBeNull();
    // Unlinking is denied too, so the row offers no destructive control.
    expect(await screen.findByText("github")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Unlink" })).toBeNull();
  });

  it("binds an email and refreshes the list", async () => {
    const { calls, service } = createServiceMock();
    renderScreen(service);

    fireEvent.change(await screen.findByLabelText("Email address"), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Verification code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Bind email" }));

    await waitFor(() => expect(calls.bindEmail).toHaveBeenCalled());
    expect(calls.bindEmail).toHaveBeenCalledWith({
      email: "alice@example.com",
      verificationCode: "123456",
    });
    expect(await screen.findByText("Email bound")).toBeTruthy();
    expect(calls.listLinks).toHaveBeenCalledTimes(2);
  });

  it("asks for confirmation before unlinking and then removes the link", async () => {
    const { calls, service } = createServiceMock();
    renderScreen(service);

    const unlinkButton = await screen.findByRole("button", { name: "Unlink" });
    fireEvent.click(unlinkButton);
    // First tap only arms the action: nothing has been deleted yet.
    expect(calls.deleteLink).not.toHaveBeenCalled();
    expect(screen.getByText(/Unlinking removes this sign-in method/u)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(calls.deleteLink).toHaveBeenCalledWith("link-1"));
    expect(await screen.findByText("Account unlinked")).toBeTruthy();
  });

  it("cancels an armed unlink without calling the server", async () => {
    const { calls, service } = createServiceMock();
    renderScreen(service);

    fireEvent.click(await screen.findByRole("button", { name: "Unlink" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(calls.deleteLink).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Unlink" })).toBeTruthy();
  });
});
