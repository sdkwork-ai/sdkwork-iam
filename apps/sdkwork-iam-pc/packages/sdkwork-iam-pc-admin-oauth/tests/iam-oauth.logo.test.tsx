import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";

import {
  SdkworkIamOauthOfficialAccountsPage,
} from "../src";
import type { SdkworkIamOauthAdminController } from "../src/types/oauth-admin-types";

/**
 * OAuth account-logo adoption regression (`DRIVE_SPEC.md` §18).
 *
 * The official-account page renders the shared panel; its edit drawer's logo
 * field is the shared `DriveUploadImage` component. A stored `drive://`
 * reference resolves through the host-injected bounded preview reader and never
 * becomes an `<img src>` or a data-URL payload.
 */

function createUploadService() {
  return {
    resolvePreview: vi.fn().mockResolvedValue("blob:logo-preview"),
    upload: vi.fn().mockResolvedValue({
      metadata: { drive: { nodeId: "node-9", spaceId: "space-1" } },
      source: "drive" as const,
      uri: "drive://spaces/space-1/nodes/node-9",
    }),
  };
}

function createController(account: unknown): SdkworkIamOauthAdminController {
  return {
    getState: () => ({
      integrations: [],
      listPageInfo: {},
      resourceAccounts: [account],
      status: "idle",
    }),
    listResourceAccountPage: () => Promise.resolve({
      items: [account],
      pageInfo: { page: 1, pageSize: 20, totalItems: "1" },
    }),
    load: () => Promise.resolve(),
  } as never;
}

const officialAccount = {
  // The account config travels as the serialized `providerConfigJson` the
  // backend persists (`readAccountConfig` parses it), so the drive reference
  // must ride inside that JSON string.
  providerConfigJson: JSON.stringify({ logoUrl: "drive://spaces/space-1/nodes/node-1" }),
  displayName: "My official account",
  id: "account-1",
  providerAccountId: "gh-account-1",
  resourceAccountKind: "official_account",
};

describe("oauth account logo upload adoption", () => {
  it("renders the shared upload component in the edit drawer without any data-URL path", async () => {
    const uploadService = createUploadService();
    const { unmount } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthOfficialAccountsPage
          controller={createController(officialAccount)}
          driveUploadImageService={uploadService as never}
        />
      </SdkworkI18nProvider>,
    );
    fireEvent.click(await screen.findByText("My official account"));

    // The edit drawer's logo field is the shared component: the stored drive
    // reference seeds its bounded preview (never a data: URI).
    await screen.findByText("公众号 Logo");
    await waitFor(() => expect(uploadService.resolvePreview).toHaveBeenCalledWith(
      expect.objectContaining({ uri: "drive://spaces/space-1/nodes/node-1" }),
    ));
    expect(document.querySelector("img[src^='data:image']")).toBeNull();
    unmount();
  });

  it("keeps the logo read-only instead of offering a URL field when no upload capability is injected", async () => {
    const { unmount } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthOfficialAccountsPage
          controller={createController({ ...officialAccount, providerConfigJson: undefined })}
        />
      </SdkworkI18nProvider>,
    );
    fireEvent.click(await screen.findByText("My official account"));

    expect(await screen.findByText("公众号 Logo")).toBeTruthy();
    // Without a host capability there is no pick control and no URL input:
    // the field states that uploads are unavailable. (The hidden
    // domain-verification picker belongs to the domains tab, not the logo.)
    expect(document.querySelector("[data-official-account-logo] input[type='file']")).toBeNull();
    expect(document.querySelector("input[type='url']")).toBeNull();
    expect(screen.getByText("当前环境未启用 Logo 上传。")).toBeTruthy();
    unmount();
  });
});
