import { cleanup, render, within } from "@testing-library/react";
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
  OfficialAccount,
  OfficialAccountsCapabilities,
  OfficialAccountsTransport,
} from "../src";

/**
 * List-grid alignment regression (the 公众号账号 admin table).
 *
 * The sticky header and every account row render the same `grid-cols-[...]`
 * template, but the template used to end in an `auto` track for the actions
 * column. That track is resolved per cell from its own content — the header
 * label ("操作"/"Actions", a couple of `em`) versus the row's action buttons (up
 * to three permission-gated buttons, ~13rem). The `fr` tracks then divided a
 * different remainder for the header and for the rows, so the data columns
 * drifted up to ~140px left of their headers.
 *
 * A content-sized track is the only way the two can diverge, so these tests pin
 * the invariant that keeps the columns lined up: the header and the rows share
 * one template, every track is fixed or `fr`, the track count matches the cell
 * count, and the column geometry does not follow the action set.
 */

/** Official accounts whose action sets differ in width, as on a real surface. */
const ACCOUNTS: readonly OfficialAccount[] = [
  {
    id: "acc-1",
    appId: "wx1234567890abcdef",
    originalId: "gh_abcdef123456",
    displayName: "示例公众号",
    accountType: "service",
    accessMode: "self_managed_account",
    organizationId: "1001",
    organizationName: "Root Organization",
    maintainerDisplayName: "测试维护人",
    maintainerUsername: "tester",
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
  },
  {
    id: "acc-2",
    appId: "wx0987654321fedcba",
    displayName: "服务号示范账号",
    accountType: "service",
    accessMode: "operator_authorized_account",
    organizationId: "0",
    hasAppSecret: true,
    hasNotifyToken: false,
    hasEncodingAesKey: false,
    notifyEncryptMode: "plaintext",
    jsSecureDomains: [],
    webAuthDomains: [],
    businessDomains: [],
    customMenu: {
      buttons: [{ name: "产品", type: "view", url: "https://example.com/products" }],
    },
    enabled: false,
    status: "disabled",
  },
];

function memoryTransport(): OfficialAccountsTransport {
  return {
    list: vi.fn(async () => ({
      items: [...ACCOUNTS],
      totalItems: ACCOUNTS.length,
      page: 1,
      pageSize: 20,
    })),
    create: vi.fn(async (draft) => ({ ...ACCOUNTS[0], displayName: draft.displayName })),
    update: vi.fn(async (_id, patch) => ({ ...ACCOUNTS[0], ...patch })),
    delete: vi.fn(async () => undefined),
    updateConfig: vi.fn(async () => ACCOUNTS[0]),
    loadCustomMenu: vi.fn(async (id) => ({ accountId: id, menu: { buttons: [] } })),
    saveCustomMenu: vi.fn(async (id, menu) => ({ accountId: id, menu })),
    publishCustomMenu: vi.fn(async (id) => ({ accountId: id, published: true })),
    setEnabled: vi.fn(async () => undefined),
    setQrLogin: vi.fn(async () => undefined),
  };
}

/** Extracts the grid track list from a cell's `grid-cols-[...]` class. */
function gridTracks(element: Element): string[] {
  const gridClass = (element.getAttribute("class") ?? "")
    .split(/\s+/u)
    .find((token) => token.startsWith("grid-cols-["));
  if (gridClass === undefined) throw new Error("element carries no grid-cols-[...] class");
  // Tailwind arbitrary values encode spaces as underscores.
  return gridClass
    .slice("grid-cols-[".length, -1)
    .split("_");
}

/** Renders one posture at one locale and returns its header and row elements. */
async function renderedColumns(
  capabilities: OfficialAccountsCapabilities,
  locale: "zh-CN" | "en-US",
): Promise<{ header: Element; rows: Element[] }> {
  const controller = createOfficialAccountsController(memoryTransport(), capabilities);
  const view = render(
    <SdkworkThemeProvider themeColor="tech-blue" themeSelection="dark">
      <SdkworkI18nProvider catalogs={[SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG]} locale={locale}>
        <SdkworkOfficialAccountsPanel capabilities={capabilities} controller={controller} />
      </SdkworkI18nProvider>
    </SdkworkThemeProvider>,
  );
  // Wait for the controller's first load to paint the rows.
  await within(view.container).findByText(ACCOUNTS[0].displayName);
  const header = view.container.querySelector("[data-official-accounts-header]");
  if (header === null) throw new Error("official-accounts header row was not rendered");
  return {
    header,
    rows: [...view.container.querySelectorAll("[data-official-account-row]")],
  };
}

/** Every track must be caller-sized (`fr`) or fixed (`rem`); never content-sized. */
function expectNoContentSizedTrack(tracks: readonly string[]): void {
  for (const track of tracks) {
    expect(track).toMatch(/^(?:minmax\(0,\d+(?:\.\d+)?fr\)|\d+(?:\.\d+)?rem)$/u);
  }
}

describe("official accounts list grid alignment", () => {
  const postures = [
    { label: "operator", capabilities: DEFAULT_OPERATOR_CAPABILITIES, cells: 8 },
    { label: "self-service", capabilities: DEFAULT_SELF_SERVICE_CAPABILITIES, cells: 6 },
  ] as const;

  for (const { label, capabilities, cells } of postures) {
    for (const locale of ["zh-CN", "en-US"] as const) {
      it(`keeps header and row columns on one template (${label}, ${locale})`, async () => {
        const { header, rows } = await renderedColumns(capabilities, locale);
        const headerTracks = gridTracks(header);

        expect(headerTracks).toHaveLength(cells);
        expect(header.children).toHaveLength(cells);
        expectNoContentSizedTrack(headerTracks);

        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          expect(gridTracks(row)).toEqual(headerTracks);
          expect(row.children).toHaveLength(cells);
        }
      });
    }
  }

  it("does not let the permission-gated action set change the column geometry", async () => {
    const narrowCase = await renderedColumns(
      { ...DEFAULT_OPERATOR_CAPABILITIES, deleteAccount: false, manageFollowQrCode: false },
      "zh-CN",
    );
    const narrowTracks = gridTracks(narrowCase.header).join("|");
    const narrowRowTracks = narrowCase.rows.map((row) => gridTracks(row).join("|"));
    cleanup();

    const wideCase = await renderedColumns(DEFAULT_OPERATOR_CAPABILITIES, "zh-CN");
    const wideTracks = gridTracks(wideCase.header).join("|");

    // The action column is fixed, so hiding buttons cannot reflow the columns.
    expect(narrowRowTracks.every((tracks) => tracks === narrowTracks)).toBe(true);
    expect(narrowTracks).toEqual(wideTracks);
  });
});
