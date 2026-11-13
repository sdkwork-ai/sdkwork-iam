import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react";

import {
  createSdkworkIamOfficialAccountsClient,
  SDKWORK_IAM_OFFICIAL_ACCOUNTS_I18N_CATALOG,
  SdkworkIamOfficialAccountsController,
  SdkworkIamOfficialAccountsPage,
  SdkworkIamOfficialAccountsPanel,
  type SdkworkIamOfficialAccountsApi,
} from "../src";

const RECORD = {
  officialAccountId: "acc-1",
  appId: "wx1234567890abcdef",
  displayName: "BirdCoder",
  accountType: "service",
  hasAppSecret: true,
  enabled: true,
  status: "active",
  customMenu: { buttons: [] },
};

function bench(
  overrides: Partial<SdkworkIamOfficialAccountsApi> = {},
  { page = false }: { page?: boolean } = {},
) {
  const api: SdkworkIamOfficialAccountsApi = {
    list: vi.fn(async () => ({
      items: [RECORD],
      pageInfo: { mode: "offset" as const, page: 1, pageSize: 20, totalItems: "1" },
    })),
    create: vi.fn(async (body: Record<string, unknown>) => ({ ...RECORD, ...body })),
    update: vi.fn(async (_id: string, body?: Record<string, unknown>) => ({ ...RECORD, ...body })),
    delete: vi.fn(async () => undefined),
    ...overrides,
  };
  const controller = new SdkworkIamOfficialAccountsController(
    createSdkworkIamOfficialAccountsClient(api),
  );
  render(
    <SdkworkThemeProvider themeColor="tech-blue" themeSelection="dark">
      <SdkworkI18nProvider
        catalogs={[SDKWORK_IAM_OFFICIAL_ACCOUNTS_I18N_CATALOG]}
        locale="en-US"
      >
        {page
          ? <SdkworkIamOfficialAccountsPage controller={controller} />
          : <SdkworkIamOfficialAccountsPanel controller={controller} />}
      </SdkworkI18nProvider>
    </SdkworkThemeProvider>,
  );
  return { api, controller };
}

describe("official-account panel", () => {
  it("lists the caller's accounts and reports the total", async () => {
    bench();
    expect(await screen.findByText("BirdCoder")).toBeTruthy();
    expect(screen.getByText("wx1234567890abcdef")).toBeTruthy();
    expect(screen.getByText("1 total")).toBeTruthy();
  });

  it("leaves the heading to the page wrapper", async () => {
    bench({}, { page: true });
    expect(await screen.findByText("BirdCoder")).toBeTruthy();
    expect(screen.getByText("Official Accounts")).toBeTruthy();
    expect(screen.getByLabelText("Search name or AppID")).toBeTruthy();
  });

  it("opens the create drawer and validates before submitting", async () => {
    const { api } = bench();
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Enter the account name.")).toBeTruthy();
    expect(api.create).not.toHaveBeenCalled();
  });

  it("creates an account with the typed fields", async () => {
    const { api } = bench();
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    fireEvent.change(screen.getByLabelText("Account name"), {
      target: { value: "New channel" },
    });
    fireEvent.change(screen.getByLabelText("AppID"), {
      target: { value: "wxnew123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({ wechatAppId: "wxnew123456", displayName: "New channel" }),
      );
    });
  });

  it("opens the menu draft editor for one account", async () => {
    bench();
    fireEvent.click(await screen.findByRole("button", { name: "Custom menu" }));
    expect(await screen.findByRole("button", { name: "Add top-level menu" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add top-level menu" }));
    expect(screen.getByText("Menu name · 1")).toBeTruthy();
  });

  it("deletes an account after confirmation", async () => {
    const { api } = bench();
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete", hidden: false }));
    await waitFor(() => { expect(api.delete).toHaveBeenCalledWith("acc-1"); });
  });
});
