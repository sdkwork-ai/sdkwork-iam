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
  type SdkworkIamDomainVerification,
  type SdkworkIamOfficialAccountsApi,
} from "../src";

const RECORD = {
  officialAccountId: "acc-1",
  appId: "wx1234567890abcdef",
  displayName: "Example Account",
  accountType: "service",
  hasAppSecret: true,
  enabled: true,
  status: "active",
  customMenu: { buttons: [] },
  notifyEncryptMode: "compatible",
  jsSecureDomains: ["api.example.com"],
  webAuthDomains: ["auth.example.com"],
  businessDomains: ["h5.example.com"],
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
  {
    page = false,
    drive,
    domainVerification,
    notifyBaseUrl,
    serverIps,
  }: {
    page?: boolean;
    drive?: DriveUploadImageService;
    domainVerification?: SdkworkIamDomainVerification;
    notifyBaseUrl?: string;
    serverIps?: readonly string[];
  } = {},
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
              domainVerification={domainVerification}
              driveUploadImageService={drive}
              notifyBaseUrl={notifyBaseUrl}
              serverIps={serverIps}
            />
          )
          : (
            <SdkworkIamOfficialAccountsPanel
              controller={controller}
              domainVerification={domainVerification}
              driveUploadImageService={drive}
              notifyBaseUrl={notifyBaseUrl}
              serverIps={serverIps}
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

/** The committed value of one domain row (rows are inline-editable inputs). */
function domainRowValue(label: string, index = 0): string {
  const input = screen.getByLabelText(`${label} ${index + 1}`) as HTMLInputElement;
  return input.value;
}

/** The add-field input for one protected-domain set. */
function domainInput(label: string): HTMLInputElement {
  return screen.getByLabelText(label) as HTMLInputElement;
}

/** Types one domain into a protected-domain editor and commits it with Enter. */
function addDomain(label: string, value: string): void {
  const input = domainInput(label);
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: "Enter" });
}

/** Activates the drawer's domain tab. */
function openDomainsTab(): void {
  fireEvent.click(screen.getByRole("tab", { name: "Domains" }));
}

/** Activates the drawer's server-information tab. */
function openServerTab(): void {
  fireEvent.click(screen.getByRole("tab", { name: "Server info" }));
}

/** The text of the visible tab panel. */
function activeTabPanelText(): string {
  const panel = Array.from(document.querySelectorAll('[role="tabpanel"]'))
    .find((candidate) => !candidate.hasAttribute("hidden"));
  return panel?.textContent ?? "";
}

/** The hidden state of one tab panel. */
function tabPanelHidden(id: string): boolean {
  return document.getElementById(id)?.hasAttribute("hidden") ?? false;
}

describe("official-account panel", () => {
  it("lists the caller's accounts and reports the total", async () => {
    bench();
    expect(await screen.findByText("Example Account")).toBeTruthy();
    expect(screen.getByText("wx1234567890abcdef")).toBeTruthy();
    expect(screen.getByText("1 total")).toBeTruthy();
  });

  it("leaves the heading to the page wrapper", async () => {
    bench({}, { page: true });
    expect(await screen.findByText("Example Account")).toBeTruthy();
    expect(screen.getByText("Official Accounts")).toBeTruthy();
    expect(screen.getByLabelText("Search name, AppID, or original ID")).toBeTruthy();
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
    expect(screen.getByText("JPG, PNG, or WebP up to 5 MB.")).toBeTruthy();
    expect(screen.getByText("Use a square image of at least 300×300.")).toBeTruthy();
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
    fireEvent.click(await screen.findByRole("button", { name: "Example Account" }));
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

});

describe("official-account drawer tabs", () => {
  it("pairs basic info with the WeChat domain configuration in tabs", async () => {
    bench({}, { drive: driveService() });
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    expect(
      screen.getByRole("tab", { name: "Basic info" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(activeTabPanelText()).toContain("Official-account logo");
    expect(activeTabPanelText()).toContain("Server configuration (message push)");
    expect(tabPanelHidden("official-account-panel-basic")).toBe(false);
    expect(tabPanelHidden("official-account-panel-domains")).toBe(true);
    openDomainsTab();
    expect(
      screen.getByRole("tab", { name: "Domains" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(tabPanelHidden("official-account-panel-basic")).toBe(true);
    expect(tabPanelHidden("official-account-panel-domains")).toBe(false);
    expect(activeTabPanelText()).toContain("JS interface security domains");
    expect(screen.getByText("JS interface security domains")).toBeTruthy();
    expect(screen.getByText("Web-authorization domains")).toBeTruthy();
    expect(screen.getByText("Business domains")).toBeTruthy();
    expect(screen.getByText("0/5")).toBeTruthy();
    expect(screen.getByText("0/2")).toBeTruthy();
    expect(screen.getByText("0/3")).toBeTruthy();
    expect(activeTabPanelText()).not.toContain("Server configuration (message push)");
  });

  it("normalizes domains and rejects invalid or duplicate entries", async () => {
    bench();
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    openDomainsTab();
    addDomain("JS interface security domains", "  API.Example.com ");
    expect(domainRowValue("JS interface security domains")).toBe("api.example.com");
    expect(screen.getByText("1/5")).toBeTruthy();

    addDomain("JS interface security domains", "https://bad.example.com");
    expect(screen.getByText("Enter a valid domain such as api.example.com.")).toBeTruthy();

    addDomain("JS interface security domains", "api.example.com");
    expect(screen.getByText("That domain is already in the list.")).toBeTruthy();
  });

  it("edits an existing domain inline and commits it on blur", async () => {
    const { api } = bench();
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    fireEvent.change(screen.getByLabelText("Account name"), {
      target: { value: "New channel" },
    });
    fireEvent.change(screen.getByLabelText("AppID"), {
      target: { value: "wxnew123456" },
    });
    openDomainsTab();
    addDomain("JS interface security domains", "api.example.com");

    const row = screen.getByLabelText("JS interface security domains 1") as HTMLInputElement;
    fireEvent.change(row, { target: { value: "  H5.Example.com " } });
    fireEvent.blur(row);
    expect(domainRowValue("JS interface security domains")).toBe("h5.example.com");
    expect(screen.getByText("1/5")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({ jsSecureDomains: ["h5.example.com"] }),
      );
    });
  });

  it("rejects an invalid inline edit and keeps the stored domain", async () => {
    bench();
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    openDomainsTab();
    addDomain("JS interface security domains", "api.example.com");

    const row = screen.getByLabelText("JS interface security domains 1") as HTMLInputElement;
    fireEvent.change(row, { target: { value: "https://bad.example.com" } });
    fireEvent.blur(row);
    expect(screen.getByText("Enter a valid domain such as api.example.com.")).toBeTruthy();
    expect(domainRowValue("JS interface security domains")).toBe("api.example.com");
  });

  it("keeps the add control available at the WeChat domain limit", async () => {
    bench();
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    openDomainsTab();
    addDomain("Business domains", "a.example.com");
    addDomain("Business domains", "b.example.com");
    addDomain("Business domains", "c.example.com");
    expect(screen.getByText("3/3")).toBeTruthy();

    addDomain("Business domains", "d.example.com");
    expect(
      screen.getByText("This set allows at most 3 domains; remove one first."),
    ).toBeTruthy();
    expect(domainInput("Business domains")).toBeTruthy();
  });

  it("shows the platform-standard callback URL and copies it", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    try {
      bench({}, { notifyBaseUrl: "https://api.example.test/" });
      fireEvent.click(await screen.findByRole("button", { name: "Example Account" }));
      const url = "https://api.example.test/iam/v3/api/iam/oauth/official_accounts/acc-1/wechat/notify";
      expect(screen.getByText(url)).toBeTruthy();
      expect(screen.queryByLabelText("Callback URL")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(url);
      });
      expect(await screen.findByText("Copied")).toBeTruthy();
    } finally {
      Reflect.deleteProperty(navigator, "clipboard");
    }
  });

  it("generates WeChat-standard Token and EncodingAESKey values", async () => {
    const { api } = bench();
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Token" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate EncodingAESKey" }));
    const token = (screen.getByLabelText("Token") as HTMLInputElement).value;
    const aesKey = (screen.getByLabelText("EncodingAESKey") as HTMLInputElement).value;
    expect(token).toMatch(/^[A-Za-z0-9]{3,32}$/);
    expect(aesKey).toMatch(/^[A-Za-z0-9]{43}$/);

    fireEvent.click(screen.getByRole("button", { name: "Generate Token" }));
    expect((screen.getByLabelText("Token") as HTMLInputElement).value).not.toBe(token);

    fireEvent.change(screen.getByLabelText("Account name"), {
      target: { value: "New channel" },
    });
    fireEvent.change(screen.getByLabelText("AppID"), {
      target: { value: "wxnew123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notifyToken: expect.stringMatching(/^[A-Za-z0-9]{3,32}$/),
          notifyEncodingAesKey: expect.stringMatching(/^[A-Za-z0-9]{43}$/),
        }),
      );
    });
  });

  it("copies the Token and EncodingAESKey values", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    try {
      bench();
      fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
      const copyToken = screen.getByRole("button", { name: "Copy Token" }) as HTMLButtonElement;
      expect(copyToken.disabled).toBe(true);

      fireEvent.click(screen.getByRole("button", { name: "Generate Token" }));
      const token = (screen.getByLabelText("Token") as HTMLInputElement).value;
      fireEvent.click(screen.getByRole("button", { name: "Copy Token" }));
      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(token);
      });
      expect(await screen.findByText("Copied")).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: "Generate EncodingAESKey" }));
      const aesKey = (screen.getByLabelText("EncodingAESKey") as HTMLInputElement).value;
      fireEvent.click(screen.getByRole("button", { name: "Copy EncodingAESKey" }));
      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(aesKey);
      });
    } finally {
      Reflect.deleteProperty(navigator, "clipboard");
    }
  });

  it("changes account type and encryption mode through the selects", async () => {
    const { api } = bench();
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    fireEvent.change(screen.getByLabelText("Account name"), {
      target: { value: "New channel" },
    });
    fireEvent.change(screen.getByLabelText("AppID"), {
      target: { value: "wxnew123456" },
    });

    const accountType = screen.getByLabelText("Account type") as HTMLSelectElement;
    expect(accountType.tagName).toBe("SELECT");
    fireEvent.change(accountType, { target: { value: "subscription" } });
    expect(accountType.value).toBe("subscription");

    const encryptMode = screen.getByLabelText("Message encryption mode") as HTMLSelectElement;
    fireEvent.change(encryptMode, { target: { value: "safe" } });
    expect(encryptMode.value).toBe("safe");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountType: "subscription",
          notifyEncryptMode: "safe",
        }),
      );
    });
  });

  it("defers the callback URL until the new account is saved", async () => {
    bench({}, { notifyBaseUrl: "https://api.example.test" });
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    expect(
      screen.getByText("The standard callback URL appears once the account is saved."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Copy" })).toBeNull();
  });

  it("persists the domain sets and encryption mode of an edited account", async () => {
    const { api } = bench();
    fireEvent.click(await screen.findByRole("button", { name: "Example Account" }));
    openDomainsTab();
    expect(domainRowValue("JS interface security domains")).toBe("api.example.com");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(api.update).toHaveBeenCalledWith(
        "acc-1",
        expect.objectContaining({
          jsSecureDomains: ["api.example.com"],
          webAuthDomains: ["auth.example.com"],
          businessDomains: ["h5.example.com"],
          notifyEncryptMode: "compatible",
        }),
      );
    });
  });

  it("carries an added domain and the default encryption mode into create", async () => {
    const { api } = bench();
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    fireEvent.change(screen.getByLabelText("Account name"), {
      target: { value: "New channel" },
    });
    fireEvent.change(screen.getByLabelText("AppID"), {
      target: { value: "wxnew123456" },
    });
    openDomainsTab();
    addDomain("JS interface security domains", "api.example.com");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({
          jsSecureDomains: ["api.example.com"],
          notifyEncryptMode: "plaintext",
        }),
      );
    });
  });
});

describe("official-account domain verification files", () => {
  function verificationPort(
    overrides: Partial<SdkworkIamDomainVerification> = {},
  ): SdkworkIamDomainVerification {
    return {
      read: vi.fn(async () => ({ managed: true })),
      upload: vi.fn(async (_domain: string, file: { fileName: string }) => ({
        managed: true,
        fileName: file.fileName,
      })),
      ...overrides,
    };
  }

  function pickVerificationFile(file: File): void {
    const input = document.querySelector(
      "input[data-domain-verification-input]",
    ) as HTMLInputElement | null;
    if (input === null) throw new Error("verification picker not rendered");
    fireEvent.change(input, { target: { files: [file] } });
  }

  it("uploads the WeChat verification file for a managed domain", async () => {
    const verification = verificationPort();
    bench({}, { domainVerification: verification });
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    openDomainsTab();
    addDomain("JS interface security domains", "api.example.com");
    await waitFor(() => {
      expect(verification.read).toHaveBeenCalledWith("api.example.com");
    });
    expect(await screen.findByText("No verification file uploaded")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Upload verification file" }));
    pickVerificationFile(
      new File(["verify-token"], "MP_verify_abc123.txt", { type: "text/plain" }),
    );
    await waitFor(() => {
      expect(verification.upload).toHaveBeenCalledWith("api.example.com", {
        fileName: "MP_verify_abc123.txt",
        content: "verify-token",
      });
    });
    expect(await screen.findByText("Uploaded MP_verify_abc123.txt")).toBeTruthy();
  });

  it("states that an unmanaged domain cannot host the verification file", async () => {
    const verification = verificationPort({
      read: vi.fn(async () => ({ managed: false })),
    });
    bench({}, { domainVerification: verification });
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    openDomainsTab();
    addDomain("JS interface security domains", "api.example.com");
    expect(
      await screen.findByText(/not managed by this platform/),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Upload verification file" })).toBeNull();
  });

  it("rejects a picked file that is not a WeChat verification txt", async () => {
    const verification = verificationPort();
    bench({}, { domainVerification: verification });
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    openDomainsTab();
    addDomain("JS interface security domains", "api.example.com");
    await screen.findByText("No verification file uploaded");
    fireEvent.click(screen.getByRole("button", { name: "Upload verification file" }));
    pickVerificationFile(new File(["verify-token"], "verify.html", { type: "text/html" }));
    expect(await screen.findByText(/Choose the .txt file WeChat generated/)).toBeTruthy();
    expect(verification.upload).not.toHaveBeenCalled();
  });
});

describe("official-account server info tab", () => {
  it("lists the deployment server IPs and copies them", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    try {
      bench({}, { serverIps: ["1.2.3.4", "5.6.7.8"] });
      fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
      openServerTab();
      expect(screen.getByText("2 IPs")).toBeTruthy();
      expect(screen.getByText("1.2.3.4")).toBeTruthy();
      expect(screen.getByText("5.6.7.8")).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: "Copy all" }));
      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith("1.2.3.4\n5.6.7.8");
      });

      fireEvent.click(screen.getAllByRole("button", { name: "Copy" })[0] as HTMLElement);
      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith("1.2.3.4");
      });
      expect(await screen.findByText("Copied")).toBeTruthy();
    } finally {
      Reflect.deleteProperty(navigator, "clipboard");
    }
  });

  it("explains an unpublished server IP list", async () => {
    bench();
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    openServerTab();
    expect(screen.getByText(/publishes no server IPs/)).toBeTruthy();
  });
});

describe("official-account panel actions", () => {
  it("opens the menu draft editor for one account", async () => {
    bench();
    fireEvent.click(await screen.findByRole("button", { name: "Custom menu" }));
    expect(await screen.findByRole("button", { name: "Add top-level menu" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add top-level menu" }));
    expect(screen.getByTestId("custom-menu-editor")).toBeTruthy();
  });

  it("deletes an account after confirmation", async () => {
    const { api } = bench();
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete", hidden: false }));
    await waitFor(() => { expect(api.delete).toHaveBeenCalledWith("acc-1"); });
  });
});
