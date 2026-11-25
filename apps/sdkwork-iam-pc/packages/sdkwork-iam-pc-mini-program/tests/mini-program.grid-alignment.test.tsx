import { render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react";

import {
  DEFAULT_OPERATOR_CAPABILITIES,
  SDKWORK_MINI_PROGRAM_I18N_CATALOG,
  SdkworkMiniProgramPanel,
  createMiniProgramController,
} from "../src";
import type {
  MiniProgramAccount,
  MiniProgramCapabilities,
  MiniProgramProviderConfig,
  MiniProgramTransport,
} from "../src";

/**
 * List-grid alignment regression.
 *
 * The sticky header and every account row render one `grid-cols-[...]`
 * template. The template used to end in an `auto` track for the actions
 * column, which is resolved per cell from its own content — the header label
 * ("操作"/"Actions") versus the row's action buttons — so the `fr` tracks split
 * a different remainder and the data columns drifted left of their headers.
 *
 * A content-sized track is the only way the header and rows can diverge, so
 * these tests pin the invariant: one template for both, every track fixed or
 * `fr`, one cell per track, and the geometry independent of the action set.
 */

const ACCOUNT: MiniProgramAccount = {
  miniProgramId: "iamora-1",
  tenantId: "t1",
  organizationId: "0",
  appId: "wx1234567890abcdef",
  displayName: "商城小程序",
  originalId: "gh_123456",
  accountType: "enterprise",
  environment: "release",
  releaseChannel: "gray",
  accessMode: "operator_authorized_account",
  ownerScope: "tenant",
  integrationId: "iamoi-1",
  hasAppSecret: true,
  enabled: true,
  status: "active",
  loginCheckStatus: "unknown",
  providerConfig: { category: "商城", note: "kept" } as unknown as MiniProgramProviderConfig,
};

function memoryTransport(): MiniProgramTransport {
  return {
    list: vi.fn(async () => ({ items: [ACCOUNT], totalItems: 1, page: 1, pageSize: 20 })),
    create: vi.fn(async () => ACCOUNT),
    update: vi.fn(async () => ACCOUNT),
    delete: vi.fn(async () => undefined),
    setEnabled: vi.fn(async () => undefined),
    runLoginCheck: vi.fn(async () => ({ accountId: ACCOUNT.miniProgramId, status: "passed" as const })),
  };
}

/** Extracts the grid track list from a cell's `grid-cols-[...]` class. */
function gridTracks(element: Element): string[] {
  const gridClass = (element.getAttribute("class") ?? "")
    .split(/\s+/u)
    .find((token) => token.startsWith("grid-cols-["));
  if (gridClass === undefined) throw new Error("element carries no grid-cols-[...] class");
  return gridClass.slice("grid-cols-[".length, -1).split("_");
}

async function renderedColumns(
  capabilities: MiniProgramCapabilities,
  locale: "zh-CN" | "en-US",
): Promise<{ header: Element; rows: Element[] }> {
  const controller = createMiniProgramController(memoryTransport(), capabilities);
  const view = render(
    <SdkworkThemeProvider themeColor="tech-blue" themeSelection="dark">
      <SdkworkI18nProvider catalogs={[SDKWORK_MINI_PROGRAM_I18N_CATALOG]} locale={locale}>
        <SdkworkMiniProgramPanel capabilities={capabilities} controller={controller} />
      </SdkworkI18nProvider>
    </SdkworkThemeProvider>,
  );
  await within(view.container).findByText(ACCOUNT.displayName);
  const header = view.container.querySelector("[data-mini-program-header]");
  if (header === null) throw new Error("mini-program header row was not rendered");
  return { header, rows: [...view.container.querySelectorAll("[data-mini-program-row]")] };
}

describe("mini-program list grid alignment", () => {
  for (const locale of ["zh-CN", "en-US"] as const) {
    it(`keeps header and row columns on one template (${locale})`, async () => {
      const { header, rows } = await renderedColumns(DEFAULT_OPERATOR_CAPABILITIES, locale);
      const headerTracks = gridTracks(header);

      expect(headerTracks).toHaveLength(5);
      expect(header.children).toHaveLength(5);
      for (const track of headerTracks) {
        expect(track).toMatch(/^(?:minmax\(0,\d+(?:\.\d+)?fr\)|\d+(?:\.\d+)?rem)$/u);
      }

      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(gridTracks(row)).toEqual(headerTracks);
        expect(row.children).toHaveLength(5);
      }
    });
  }

  it("keeps the geometry when the delete action is not granted", async () => {
    const wide = await renderedColumns(DEFAULT_OPERATOR_CAPABILITIES, "zh-CN");
    const wideTracks = gridTracks(wide.header).join("|");

    const narrow = await renderedColumns(
      { ...DEFAULT_OPERATOR_CAPABILITIES, deleteAccount: false },
      "zh-CN",
    );
    expect(gridTracks(narrow.header).join("|")).toEqual(wideTracks);
    expect(narrow.rows.map((row) => gridTracks(row).join("|")))
      .toEqual([wideTracks]);
  });
});
