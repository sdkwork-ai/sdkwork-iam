import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react";
import type { DriveUploadImageService } from "@sdkwork/drive-upload-image-core";

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

const DRIVE_LOGO_URI = "drive://spaces/space-1/nodes/node-1";

/** In-memory Drive image-upload capability injected by the host. */
function driveService(): DriveUploadImageService {
  return {
    upload: vi.fn(async () => ({ uri: DRIVE_LOGO_URI, source: "drive" as const })),
    resolvePreview: vi.fn(async ({ uri }: { uri: string }) => uri),
  } as DriveUploadImageService;
}

/** Build a picked PNG the upload field accepts. */
function logoFile(): File {
  return new File([new Uint8Array([137, 80, 78, 71])], "logo.png", { type: "image/png" });
}

function bench(
  overrides: Partial<SdkworkIamOfficialAccountsApi> = {},
  { page = false, drive }: { page?: boolean; drive?: DriveUploadImageService } = {},
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
  const rendered = render(
    <SdkworkThemeProvider themeColor="tech-blue" themeSelection="dark">
      <SdkworkI18nProvider
        catalogs={[SDKWORK_IAM_OFFICIAL_ACCOUNTS_I18N_CATALOG]}
        locale="en-US"
      >
        {page
          ? (
            <SdkworkIamOfficialAccountsPage
              controller={controller}
              driveUploadImageService={drive}
            />
          )
          : (
            <SdkworkIamOfficialAccountsPanel
              controller={controller}
              driveUploadImageService={drive}
            />
          )}
      </SdkworkI18nProvider>
    </SdkworkThemeProvider>,
  );
  return { api, controller, container: rendered.container };
}

/** The single hidden picker the shared Drive field renders. */
function logoPicker(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (input === null) throw new Error("logo picker not rendered");
  return input;
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

  it("renders the shared Drive upload field instead of a logo URL input", async () => {
    bench({}, { drive: driveService() });
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    expect(screen.getByText("Official-account logo")).toBeTruthy();
    expect(screen.queryByLabelText("Logo URL")).toBeNull();
    expect(document.querySelector('input[type="file"]')).not.toBeNull();
  });

  it("explains an unavailable upload capability instead of offering a URL input", async () => {
    const { container } = bench();
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    expect(screen.getByText("Logo uploads are not available in this environment.")).toBeTruthy();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it("uploads an edited account's logo against the account id", async () => {
    const drive = driveService();
    const { api } = bench({}, { drive });
    fireEvent.click(await screen.findByRole("button", { name: "BirdCoder" }));
    fireEvent.change(logoPicker(), { target: { files: [logoFile()] } });
    await waitFor(() => {
      expect(drive.upload).toHaveBeenCalledWith(
        expect.objectContaining({ appResourceId: "acc-1" }),
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(api.update).toHaveBeenCalledWith(
        "acc-1",
        expect.objectContaining({ logoUrl: DRIVE_LOGO_URI }),
      );
    });
  });

  it("parks a create-mode logo pick and attaches it after the account exists", async () => {
    const drive = driveService();
    const { api } = bench({}, { drive });
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    fireEvent.change(screen.getByLabelText("Account name"), {
      target: { value: "New channel" },
    });
    fireEvent.change(screen.getByLabelText("AppID"), {
      target: { value: "wxnew123456" },
    });
    fireEvent.change(logoPicker(), { target: { files: [logoFile()] } });
    expect(drive.upload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(api.create).toHaveBeenCalled();
      expect(drive.upload).toHaveBeenCalledWith(
        expect.objectContaining({ appResourceId: "acc-1" }),
      );
      expect(api.update).toHaveBeenCalledWith(
        "acc-1",
        expect.objectContaining({ logoUrl: DRIVE_LOGO_URI }),
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
    fireEvent.click(screen.getByRole("button", { name: "Delete", hidden: false }));
    await waitFor(() => { expect(api.delete).toHaveBeenCalledWith("acc-1"); });
  });
});
