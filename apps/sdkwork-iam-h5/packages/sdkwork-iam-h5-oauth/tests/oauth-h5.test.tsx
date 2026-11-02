import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SdkworkIamH5I18nProvider } from "@sdkwork/iam-h5-commons";

import {
  createSdkworkIamH5OAuthProviderController,
  IAM_H5_OAUTH_I18N_CATALOG,
  SdkworkIamH5OAuthProviderScreen,
  type SdkworkIamH5OAuthProviderServicePort,
} from "../src/index";

/**
 * Sign-in providers are a redirect surface: the screen's job is to list what the
 * deployment offers and to hand a minted URL to the host. These cases pin the
 * seam — the URL is minted by the controller, navigated by the host, and a provider
 * the server marks disabled cannot start a flow.
 */

function createServiceMock(options: {
  providers?: readonly unknown[];
  url?: string | undefined;
} = {}) {
  const calls = {
    createUrl: vi.fn(async (_params?: Record<string, unknown>) => ({ authorizationUrl: options.url ?? "https://idp.example.com/authorize?x=1" })),
    list: vi.fn(async (_params?: Record<string, unknown>) => ({
      items: options.providers ?? [
        { enabled: true, provider: "github", displayName: "GitHub" },
        { enabled: false, provider: "wechat", displayName: "WeChat" },
      ],
      pageInfo: { hasMore: false, page: 0, pageSize: 20 },
    })),
  };
  const service = {
    oauth: {
      authorizationUrls: { create: calls.createUrl },
      providers: { list: calls.list },
    },
  } as unknown as SdkworkIamH5OAuthProviderServicePort;
  return { calls, service };
}

function renderScreen(
  service: SdkworkIamH5OAuthProviderServicePort,
  onAuthorize = vi.fn(),
  locale = "en-US",
) {
  const controller = createSdkworkIamH5OAuthProviderController({ service });
  const result = render(
    <SdkworkIamH5I18nProvider catalogs={[IAM_H5_OAUTH_I18N_CATALOG]} locale={locale}>
      <SdkworkIamH5OAuthProviderScreen controller={controller} onAuthorize={onAuthorize} />
    </SdkworkIamH5I18nProvider>,
  );
  return { ...result, controller, onAuthorize };
}

describe("IAM H5 OAuth provider controller", () => {
  it("maps the catalog and drops records without a provider code", async () => {
    const { service } = createServiceMock({
      providers: [{ displayName: "no code" }, { code: "google", displayName: "Google" }],
    });
    const controller = createSdkworkIamH5OAuthProviderController({ service });

    const page = await controller.fetchProvidersPage({ page: 0, page_size: 20 });
    expect(page.items).toEqual([{ code: "google", displayName: "Google" }]);
  });

  it("accepts the three URL spellings a provider shim may answer with", async () => {
    const spellings = ["authorizationUrl", "url", "redirectUrl"] as const;
    for (const key of spellings) {
      const service = {
        oauth: {
          authorizationUrls: { create: vi.fn(async () => ({ [key]: "https://idp.example.com/a" })) },
          providers: { list: vi.fn(async () => ({ items: [] })) },
        },
      } as unknown as SdkworkIamH5OAuthProviderServicePort;
      const controller = createSdkworkIamH5OAuthProviderController({ service });
      await expect(controller.createAuthorizationUrl("github")).resolves.toBe("https://idp.example.com/a");
    }
  });

  it("refuses an empty provider code and a URL-less answer", async () => {
    const { calls, service } = createServiceMock();
    const controller = createSdkworkIamH5OAuthProviderController({ service });

    await expect(controller.createAuthorizationUrl("  ")).rejects.toThrow(/providerCode is required/u);
    expect(calls.createUrl).not.toHaveBeenCalled();

    const emptyService = createServiceMock({ url: "" }).service;
    await expect(
      createSdkworkIamH5OAuthProviderController({ service: emptyService }).createAuthorizationUrl("github"),
    ).rejects.toThrow(/returned no URL/u);
  });
});

describe("IAM H5 OAuth provider screen", () => {
  it("lists providers and mints a URL for the chosen one", async () => {
    const { calls, service } = createServiceMock();
    const onAuthorize = vi.fn();
    renderScreen(service, onAuthorize);

    expect(await screen.findByText("GitHub")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(onAuthorize).toHaveBeenCalled());
    expect(calls.createUrl).toHaveBeenCalledWith({ provider: "github" });
    expect(onAuthorize).toHaveBeenCalledWith("https://idp.example.com/authorize?x=1", {
      code: "github",
      displayName: "GitHub",
      enabled: true,
    });
  });

  it("does not offer a flow for a provider the server disabled", async () => {
    const { service } = createServiceMock();
    renderScreen(service);

    expect(await screen.findByText("WeChat")).toBeTruthy();
    expect(screen.getByText("Unavailable")).toBeTruthy();
    // Only the enabled provider has a Continue control.
    expect(screen.getAllByRole("button", { name: "Continue" })).toHaveLength(1);
  });

  it("reports a failed URL mint instead of navigating", async () => {
    const { service } = createServiceMock();
    const controller = createSdkworkIamH5OAuthProviderController({ service });
    const onAuthorize = vi.fn();
    render(
      <SdkworkIamH5I18nProvider catalogs={[IAM_H5_OAUTH_I18N_CATALOG]} locale="en-US">
        <SdkworkIamH5OAuthProviderScreen
          controller={{
            ...controller,
            createAuthorizationUrl: async () => {
              throw Object.assign(new Error("idp down"), { code: 50201 });
            },
          }}
          onAuthorize={onAuthorize}
        />
      </SdkworkIamH5I18nProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
    expect(await screen.findByText(/idp down/u)).toBeTruthy();
    expect(onAuthorize).not.toHaveBeenCalled();
  });

  it("renders the localized zh-CN copy", async () => {
    const { service } = createServiceMock();
    renderScreen(service, vi.fn(), "zh-CN");

    expect(await screen.findByText("可用渠道")).toBeTruthy();
    expect(screen.getByLabelText("搜索渠道")).toBeTruthy();
  });
});
