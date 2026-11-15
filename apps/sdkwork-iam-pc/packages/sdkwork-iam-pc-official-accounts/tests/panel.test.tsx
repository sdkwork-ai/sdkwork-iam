import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react";

import {
  DEFAULT_OPERATOR_CAPABILITIES,
  DEFAULT_SELF_SERVICE_CAPABILITIES,
  SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG,
  SdkworkOfficialAccountsPanel,
  createOfficialAccountsController,
} from "../src";
import type {
  OfficialAccountsCapabilities,
  OfficialAccountsTransport,
  OfficialAccount,
} from "../src";

const ACCOUNT: OfficialAccount = {
  id: "acc-1",
  appId: "wx1234567890abcdef",
  displayName: "Example Account",
  accountType: "service",
  hasAppSecret: true,
  hasNotifyToken: false,
  hasEncodingAesKey: false,
  notifyEncryptMode: "compatible",
  jsSecureDomains: ["api.example.com"],
  webAuthDomains: [],
  businessDomains: [],
  customMenu: { buttons: [] },
  enabled: true,
  status: "active",
};

function memoryTransport(
  overrides: Partial<OfficialAccountsTransport> = {},
): OfficialAccountsTransport {
  return {
    list: vi.fn(async () => ({ items: [ACCOUNT], totalItems: 1, page: 1, pageSize: 20 })),
    create: vi.fn(async (draft) => ({ ...ACCOUNT, displayName: draft.displayName })),
    update: vi.fn(async (_id, patch) => ({ ...ACCOUNT, ...patch })),
    delete: vi.fn(async () => undefined),
    updateConfig: vi.fn(async () => ACCOUNT),
    loadCustomMenu: vi.fn(async (id) => ({ accountId: id, menu: { buttons: [] } })),
    saveCustomMenu: vi.fn(async (id, menu) => ({ accountId: id, menu })),
    publishCustomMenu: vi.fn(async (id) => ({ accountId: id, published: true })),
    setEnabled: vi.fn(async () => undefined),
    setQrLogin: vi.fn(async () => undefined),
    createFollowQrCode: vi.fn(async () => ({
      qrCode: "https://example.test/qr",
      scene: "follow:acc-1",
    })),
    runVerification: vi.fn(async () => undefined),
    ...overrides,
  };
}

function bench(
  capabilities: OfficialAccountsCapabilities,
  overrides: Partial<OfficialAccountsTransport> = {},
) {
  const transport = memoryTransport(overrides);
  const controller = createOfficialAccountsController(transport, capabilities);
  const rendered = render(
    <SdkworkThemeProvider themeColor="tech-blue" themeSelection="dark">
      <SdkworkI18nProvider catalogs={[SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG]} locale="en-US">
        <SdkworkOfficialAccountsPanel capabilities={capabilities} controller={controller} />
      </SdkworkI18nProvider>
    </SdkworkThemeProvider>,
  );
  return { ...rendered, controller, transport };
}

describe("official accounts panel", () => {
  it("lists the official accounts of the caller in self-service mode", async () => {
    bench(DEFAULT_SELF_SERVICE_CAPABILITIES);
    expect(await screen.findByText("Example Account")).toBeTruthy();
    expect(screen.getByText("wx1234567890abcdef")).toBeTruthy();
    expect(screen.getByText("1 total")).toBeTruthy();
  });

  it("keeps the create drawer's credential and domain validation", async () => {
    const { transport } = bench(DEFAULT_SELF_SERVICE_CAPABILITIES);
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Enter the account name.")).toBeTruthy();
    expect(transport.create).not.toHaveBeenCalled();
  });

  it("deletes an account only when the surface allows it", async () => {
    const allowed = bench(DEFAULT_SELF_SERVICE_CAPABILITIES);
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete", hidden: false }));
    await waitFor(() => {
      expect(allowed.transport.delete).toHaveBeenCalledWith("acc-1");
    });
    allowed.unmount();

    bench({ ...DEFAULT_SELF_SERVICE_CAPABILITIES, deleteAccount: false });
    expect(await screen.findByText("Example Account")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("hides the domain surface when domain management is off", async () => {
    bench({ ...DEFAULT_SELF_SERVICE_CAPABILITIES, manageDomains: false });
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    expect(screen.queryByRole("tab", { name: "Domains" })).toBeNull();
    expect(document.getElementById("official-account-panel-domains")).toBeNull();
    expect(screen.getByRole("tab", { name: "Basic info" })).toBeTruthy();
  });

  it("hides the message-push configuration when notify management is off", async () => {
    bench({ ...DEFAULT_SELF_SERVICE_CAPABILITIES, manageNotify: false });
    fireEvent.click(await screen.findByRole("button", { name: "Add official account" }));
    expect(screen.queryByText("Server configuration (message push)")).toBeNull();
    expect(screen.queryByLabelText("Token")).toBeNull();
    expect(screen.getByText("Official-account logo")).toBeTruthy();
  });

  it("locks the credentials when the surface forbids editing them", async () => {
    bench({ ...DEFAULT_SELF_SERVICE_CAPABILITIES, editCredentials: false });
    // The add action is part of the credential capability; the row still opens
    // the drawer, where the credential fields are locked behind a notice.
    expect(await screen.findByText("Example Account")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add official account" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Example Account" }));
    expect(screen.queryByLabelText("AppSecret")).toBeNull();
    expect(await screen.findByText(/does not allow changing the AppID or AppSecret/)).toBeTruthy();
  });

  it("renders the operator posture without the self-service server tab", async () => {
    bench(DEFAULT_OPERATOR_CAPABILITIES);
    fireEvent.click(await screen.findByRole("button", { name: "Example Account" }));
    expect(screen.queryByRole("tab", { name: "Server info" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Domains" })).toBeTruthy();
    expect(screen.getByText("Default account for scan login")).toBeTruthy();
  });

  it("opens the shared menu workspace and gates publishing by capability", async () => {
    const menuAccount: OfficialAccount = {
      ...ACCOUNT,
      customMenu: { buttons: [{ key: "menu-0", name: "Help", type: "click", message: "HELP" }] },
    };
    const menuTransport = (): Partial<OfficialAccountsTransport> => ({
      list: vi.fn(async () => ({ items: [menuAccount], totalItems: 1, page: 1, pageSize: 20 })),
    });
    const operator = bench(DEFAULT_OPERATOR_CAPABILITIES, menuTransport());
    fireEvent.click(await screen.findByRole("button", { name: "Custom menu" }));
    expect(await screen.findByTestId("custom-menu-modal")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => {
      expect(operator.transport.update).toHaveBeenCalledWith("acc-1", expect.objectContaining({
        customMenu: { buttons: [{ key: "menu-0", name: "Help", type: "click", message: "HELP" }] },
      }));
    });
    fireEvent.click(screen.getByRole("button", { name: "Save & publish" }));
    fireEvent.click(await screen.findByRole("button", { name: "Publish menu" }));
    await waitFor(() => {
      expect(operator.transport.publishCustomMenu).toHaveBeenCalledWith("acc-1", {
        buttons: [{ key: "menu-0", name: "Help", type: "click", message: "HELP" }],
      });
    });
    operator.unmount();

    bench(DEFAULT_SELF_SERVICE_CAPABILITIES, menuTransport());
    fireEvent.click(await screen.findByRole("button", { name: "Custom menu" }));
    const publish = screen.getByRole("button", { name: "Save & publish" }) as HTMLButtonElement;
    expect(publish.disabled).toBe(true);
  });

  it("annotates a self-managed account on an operator surface", async () => {
    bench(DEFAULT_OPERATOR_CAPABILITIES, {
      list: vi.fn(async () => ({
        items: [{ ...ACCOUNT, accessMode: "self_managed_account" as const }],
        totalItems: 1,
        page: 1,
        pageSize: 20,
      })),
    });
    expect(await screen.findByText("Self-managed")).toBeTruthy();
  });

  it("shows organization and maintainer columns on an operator surface", async () => {
    bench(DEFAULT_OPERATOR_CAPABILITIES, {
      list: vi.fn(async () => ({
        items: [{
          ...ACCOUNT,
          originalId: "gh_1234567890ab",
          organizationId: "iamorg-1",
          organizationName: "Acme Org",
          maintainerUserId: "iamu-1",
          maintainerDisplayName: "Li Ming",
          maintainerUsername: "liming",
        }],
        totalItems: 1,
        page: 1,
        pageSize: 20,
      })),
    });
    // The identifiers column distinguishes two channels with the same name.
    expect(await screen.findByText("gh_1234567890ab")).toBeTruthy();
    expect(screen.getByText("Account identifiers")).toBeTruthy();
    expect(screen.getByText("Organization")).toBeTruthy();
    expect(screen.getByText("Acme Org")).toBeTruthy();
    expect(screen.getByText("Maintainer")).toBeTruthy();
    expect(screen.getByText("Li Ming")).toBeTruthy();
  });

  it("falls back to the platform organization and the maintainer id", async () => {
    bench(DEFAULT_OPERATOR_CAPABILITIES, {
      list: vi.fn(async () => ({
        items: [{ ...ACCOUNT, organizationId: "0", maintainerUserId: "iamu-77" }],
        totalItems: 1,
        page: 1,
        pageSize: 20,
      })),
    });
    expect(await screen.findByText("Platform")).toBeTruthy();
    expect(screen.getByText("iamu-77")).toBeTruthy();
  });

  it("omits the owner columns on a self-service surface", async () => {
    bench(DEFAULT_SELF_SERVICE_CAPABILITIES);
    expect(await screen.findByText("Example Account")).toBeTruthy();
    expect(screen.queryByText("Organization")).toBeNull();
    expect(screen.queryByText("Maintainer")).toBeNull();
    expect(screen.queryByText("Acme Org")).toBeNull();
  });

  it("generates the follow QR from the operator row action", async () => {
    const { transport } = bench(DEFAULT_OPERATOR_CAPABILITIES);
    await screen.findByText("Example Account");
    fireEvent.click(await screen.findByRole("button", { name: "Follow QR" }));
    await waitFor(() => {
      expect(transport.createFollowQrCode).toHaveBeenCalledWith("acc-1");
    });
    const image = await screen.findByAltText("Example Account");
    expect(image.getAttribute("src")).toBe("https://example.test/qr");
    expect(screen.getByText("Scene: follow:acc-1")).toBeTruthy();
    expect(screen.getByText("This QR code does not expire and can stay in service.")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Close" }).at(-1)!);
    await waitFor(() => {
      expect(screen.queryByText("Scene: follow:acc-1")).toBeNull();
    });
  });

  it("hides the follow QR action when the capability is off", async () => {
    bench(DEFAULT_SELF_SERVICE_CAPABILITIES);
    expect(await screen.findByText("Example Account")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Follow QR" })).toBeNull();
  });

  it("opens the add drawer on mount when the host deep-links to it", async () => {
    const transport = memoryTransport();
    const controller = createOfficialAccountsController(
      transport,
      DEFAULT_OPERATOR_CAPABILITIES,
    );
    render(
      <SdkworkThemeProvider themeColor="tech-blue" themeSelection="dark">
        <SdkworkI18nProvider catalogs={[SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG]} locale="en-US">
          <SdkworkOfficialAccountsPanel
            capabilities={DEFAULT_OPERATOR_CAPABILITIES}
            controller={controller}
            initialOpen
          />
        </SdkworkI18nProvider>
      </SdkworkThemeProvider>,
    );
    expect(await screen.findByRole("heading", { name: "Add official account" })).toBeTruthy();
    expect(screen.getByLabelText("AppID")).toBeTruthy();
  });
});

describe("official accounts message catalog", () => {
  function flattenKeys(value: unknown, prefix = ""): string[] {
    if (typeof value !== "object" || value === null) return [prefix];
    return Object.entries(value as Record<string, unknown>)
      .flatMap(([key, nested]) => flattenKeys(nested, prefix === "" ? key : `${prefix}.${key}`))
      .sort();
  }

  it("keeps zh-CN and en-US key sets identical", () => {
    const locales = SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG.locales;
    expect(flattenKeys(locales["zh-CN"])).toEqual(flattenKeys(locales["en-US"]));
  });

  it("keeps every message non-empty in both locales", () => {
    const locales = SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG.locales;
    for (const locale of ["zh-CN", "en-US"] as const) {
      for (const key of flattenKeys(locales[locale])) {
        const value = key.split(".").reduce<unknown>(
          (node, segment) => (typeof node === "object" && node !== null
            ? (node as Record<string, unknown>)[segment]
            : undefined),
          locales[locale],
        );
        expect(typeof value).toBe("string");
        expect((value as string).trim()).not.toBe("");
      }
    }
  });
});
