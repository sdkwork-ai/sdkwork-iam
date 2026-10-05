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
 * The logo field used to persist a locally-read base64 data URL — a fake
 * upload. These tests pin the shared-component adoption: list rows with a
 * `drive://` logo reference resolve their display through the host-injected
 * bounded preview reader, the edit drawer renders the shared
 * `DriveUploadImage` component, and no data-URL read exists anywhere.
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
    listPageResource: () => Promise.resolve([]),
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
  it("resolves a drive-backed row logo through the bounded preview reader", async () => {
    const uploadService = createUploadService();
    const { unmount } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthOfficialAccountsPage
          controller={createController(officialAccount)}
          driveUploadImageService={uploadService as never}
        />
      </SdkworkI18nProvider>,
    );
    await screen.findByText("My official account");
    // Presentation-only resolution: the drive:// reference never becomes an
    // <img src> directly; the bounded preview URL stands in for display.
    await waitFor(() => expect(uploadService.resolvePreview).toHaveBeenCalledWith(expect.objectContaining({ uri: "drive://spaces/space-1/nodes/node-1" })));
    await waitFor(() => expect(document.querySelector("img[src='blob:logo-preview']")).not.toBeNull());
    unmount();
  });

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
    await screen.findByText("My official account");
    fireEvent.click(screen.getByTitle("操作"));
    // The edit drawer's logo field is the shared component: the stored drive
    // reference seeds its bounded preview (never a data: URI), and the
    // section's pick control disappears in favour of the component's own.
    await screen.findByText("公众号图标");
    await waitFor(() => expect(uploadService.resolvePreview).toHaveBeenCalledWith(expect.objectContaining({ uri: "drive://spaces/space-1/nodes/node-1" })));
    expect(document.querySelector("img[src^='data:image']")).toBeNull();
    unmount();
  });

  it("degrades to the external-URL field when no upload capability is injected", async () => {
    const { unmount } = render(
      <SdkworkI18nProvider locale="zh-CN">
        <SdkworkIamOauthOfficialAccountsPage controller={createController({ ...officialAccount, config: {} })} />
      </SdkworkI18nProvider>,
    );
    await screen.findByText("My official account");
    fireEvent.click(screen.getByTitle("操作"));
    expect(await screen.findByText("公众号图标")).toBeTruthy();
    // Without a host capability there is no pick control: a local data-URL
    // read would be a fake upload, so only the external-URL input remains.
    expect(document.querySelector("input[type='file']")).toBeNull();
    unmount();
  });
});
