import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react";

import {
  DEFAULT_OPERATOR_CAPABILITIES,
  SDKWORK_MINI_PROGRAM_I18N_CATALOG,
  SdkworkMiniProgramPanel,
  createMiniProgramController,
  type MiniProgramAccount,
  type MiniProgramCapabilities,
  type MiniProgramProviderConfig,
  type MiniProgramTransport,
} from "../src";

const ACCOUNT: MiniProgramAccount = {
  miniProgramId: "iamora-1",
  tenantId: "t1",
  organizationId: "0",
  appId: "wx1234567890abcdef",
  displayName: "Shop mini program",
  originalId: "gh_123456",
  accountType: "enterprise",
  environment: "release",
  accessMode: "operator_authorized_account",
  ownerScope: "tenant",
  integrationId: "iamoi-1",
  hasAppSecret: true,
  enabled: true,
  status: "active",
  loginCheckStatus: "unknown",
  providerConfig: {
    category: "商城",
    note: "kept",
    logoUrl: "drive://logo",
  } as unknown as MiniProgramProviderConfig,
};

function memoryTransport(overrides: Partial<MiniProgramTransport> = {}): MiniProgramTransport {
  return {
    list: vi.fn(async () => ({ items: [ACCOUNT], totalItems: 1, page: 1, pageSize: 20 })),
    create: vi.fn(async () => ACCOUNT),
    update: vi.fn(async () => ACCOUNT),
    delete: vi.fn(async () => undefined),
    setEnabled: vi.fn(async () => undefined),
    runLoginCheck: vi.fn(async () => ({ accountId: "iamora-1", status: "passed" as const })),
    ...overrides,
  };
}

function bench(
  capabilities: MiniProgramCapabilities,
  overrides: Partial<MiniProgramTransport> = {},
) {
  const transport = memoryTransport(overrides);
  const controller = createMiniProgramController(transport, capabilities);
  const rendered = render(
    <SdkworkThemeProvider themeColor="tech-blue" themeSelection="dark">
      <SdkworkI18nProvider catalogs={[SDKWORK_MINI_PROGRAM_I18N_CATALOG]} locale="en-US">
        <SdkworkMiniProgramPanel capabilities={capabilities} controller={controller} />
      </SdkworkI18nProvider>
    </SdkworkThemeProvider>,
  );
  return { ...rendered, controller, transport };
}

describe("mini-program panel", () => {
  it("lists the mini-program accounts of the caller", async () => {
    bench(DEFAULT_OPERATOR_CAPABILITIES);
    expect(await screen.findByText("Shop mini program")).toBeTruthy();
    expect(screen.getByText("wx1234567890abcdef")).toBeTruthy();
    expect(screen.getByText("1 total")).toBeTruthy();
    expect(screen.getByText("Enterprise · Release")).toBeTruthy();
  });

  it("validates the create drawer before touching the transport", async () => {
    const { transport } = bench(DEFAULT_OPERATOR_CAPABILITIES);
    fireEvent.click(await screen.findByRole("button", { name: "Add mini program" }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(await screen.findByText("Enter the display name.")).toBeTruthy();
    expect(screen.getByText("Enter the AppID.")).toBeTruthy();
    expect(screen.getByText("Enter the AppSecret.")).toBeTruthy();
    expect(transport.create).not.toHaveBeenCalled();
  });

  it("creates an account from the drawer", async () => {
    const { transport } = bench(DEFAULT_OPERATOR_CAPABILITIES);
    fireEvent.click(await screen.findByRole("button", { name: "Add mini program" }));
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: " New mini " } });
    fireEvent.change(screen.getByLabelText("AppID", { selector: "input" }), { target: { value: "wx-new" } });
    fireEvent.change(screen.getByLabelText("AppSecret"), { target: { value: "secret" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Storefront" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => {
      expect(transport.create).toHaveBeenCalledWith({
        appId: "wx-new",
        displayName: "New mini",
        appSecret: "secret",
        accountType: "personal",
        providerConfig: { category: "Storefront" },
      });
    });
  });

  it("merges the edited settings into the stored provider configuration", async () => {
    const { transport } = bench(DEFAULT_OPERATOR_CAPABILITIES);
    fireEvent.click(await screen.findByRole("button", { name: "Shop mini program" }));
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Renamed" } });
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "new note" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(transport.update).toHaveBeenCalledWith("iamora-1", {
        displayName: "Renamed",
        providerConfig: {
          category: "商城",
          note: "new note",
          logoUrl: "drive://logo",
        },
      });
    });
  });

  it("toggles and deletes only when the surface allows it", async () => {
    const allowed = bench(DEFAULT_OPERATOR_CAPABILITIES);
    fireEvent.click(await screen.findByRole("switch", { name: /Enable Shop mini program/u }));
    await waitFor(() => {
      expect(allowed.transport.setEnabled).toHaveBeenCalledWith("iamora-1", false);
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!);
    await waitFor(() => {
      expect(allowed.transport.delete).toHaveBeenCalledWith("iamora-1");
    });
    allowed.unmount();

    bench({ ...DEFAULT_OPERATOR_CAPABILITIES, deleteAccount: false, setEnabled: false });
    expect(await screen.findByText("Shop mini program")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("runs the login check from the edit drawer", async () => {
    const { transport } = bench(DEFAULT_OPERATOR_CAPABILITIES);
    fireEvent.click(await screen.findByRole("button", { name: "Shop mini program" }));
    fireEvent.click(screen.getByRole("button", { name: "Login check" }));
    await waitFor(() => {
      expect(transport.runLoginCheck).toHaveBeenCalledWith("iamora-1");
    });
    expect(await screen.findByText("Login check queued")).toBeTruthy();
  });

  it("hides credential editing when the surface forbids it", async () => {
    bench({ ...DEFAULT_OPERATOR_CAPABILITIES, editCredentials: false });
    expect(await screen.findByText("Shop mini program")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add mini program" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Shop mini program" }));
    expect(screen.queryByLabelText("AppSecret")).toBeNull();
    expect(screen.getByText("This surface does not allow that action")).toBeTruthy();
  });
});

describe("mini-program message catalog", () => {
  function flattenKeys(value: unknown, prefix = ""): string[] {
    if (typeof value !== "object" || value === null) return [prefix];
    return Object.entries(value as Record<string, unknown>)
      .flatMap(([key, nested]) => flattenKeys(nested, prefix === "" ? key : `${prefix}.${key}`))
      .sort();
  }

  it("keeps zh-CN and en-US key sets identical", () => {
    const locales = SDKWORK_MINI_PROGRAM_I18N_CATALOG.locales;
    expect(flattenKeys(locales["zh-CN"])).toEqual(flattenKeys(locales["en-US"]));
  });

  it("keeps every message non-empty in both locales", () => {
    const locales = SDKWORK_MINI_PROGRAM_I18N_CATALOG.locales;
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
