import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";

import { SdkworkIamOauthLoginFollowQrPage } from "../src";

function accountItem() {
  return {
    accountId: "iamora-1",
    appId: "wx-follow-1",
    displayName: "示例公众号",
    enabled: true,
    integrationId: "iamoi-1",
    qrLoginEnabled: true,
    verificationStatus: "verified",
  };
}

function settingsItem(overrides: Record<string, unknown> = {}) {
  return {
    accountName: "示例公众号",
    enabled: true,
    qrCode: "https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=follow-ticket",
    resourceAccountId: "iamora-1",
    scene: "follow:iamora-1",
    updatedAt: "2026-11-22T02:00:00Z",
    ...overrides,
  };
}

function makeController(overrides: Record<string, unknown> = {}) {
  return {
    createAccountFollowQrCode: vi.fn(async () => ({
      expireSeconds: 0,
      permanent: true,
      qrCode: "https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=preview-ticket",
      qrContent: "https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=preview-ticket",
      qrMode: "official_account",
      scene: "follow:iamora-1",
      ticket: "preview-ticket",
    })),
    loadLoginFollowQrSettings: vi.fn(async () => settingsItem()),
    loadScanLoginSettings: vi.fn(async () => ({
      defaultQrMode: "auto",
      enabled: true,
      modes: [],
      officialAccounts: [accountItem()],
      serverIps: [],
      urlLogin: { enabled: false, h5LoginOrigin: "" },
    })),
    saveLoginFollowQrSettings: vi.fn(async (body: Record<string, unknown>) => settingsItem(body)),
    ...overrides,
  };
}

function renderPage(controller: unknown) {
  return render(
    <SdkworkI18nProvider locale="zh-CN">
      <SdkworkIamOauthLoginFollowQrPage controller={controller as never} />
    </SdkworkI18nProvider>,
  );
}

describe("SDKWork IAM OAuth login-success follow QR page", () => {
  it("renders the configured follow QR with its account and scene", async () => {
    const controller = makeController();
    renderPage(controller);

    expect(
      await screen.findByText("登录成功页当前二维码"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("oauth-login-follow-qr-current")).toHaveAttribute(
      "src",
      "https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=follow-ticket",
    );
    expect(screen.getAllByText("示例公众号").length).toBeGreaterThan(0);
    expect(screen.getByText("follow:iamora-1")).toBeInTheDocument();
    expect(controller.loadScanLoginSettings).toHaveBeenCalledTimes(1);
  });

  it("generates a scannable preview for the selected account", async () => {
    const controller = makeController();
    renderPage(controller);

    fireEvent.click(await screen.findByRole("button", { name: "生成并预览" }));

    await waitFor(() => {
      expect(controller.createAccountFollowQrCode).toHaveBeenCalledWith("iamora-1");
    });
    expect(
      await screen.findByTestId("oauth-login-follow-qr-preview"),
    ).toHaveAttribute(
      "src",
      "https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=preview-ticket",
    );
  });

  it("saves the enabled pinned account and can regenerate the QR", async () => {
    const controller = makeController();
    renderPage(controller);

    const toggle = await screen.findByRole("switch", {
      name: "在登录成功页展示关注二维码",
    });
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(controller.saveLoginFollowQrSettings).toHaveBeenCalledWith({
        enabled: true,
        refreshQrCode: false,
        resourceAccountId: "iamora-1",
      });
    });
    expect(
      await screen.findByText("关注二维码配置已保存。"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重新生成" }));
    await waitFor(() => {
      expect(controller.saveLoginFollowQrSettings).toHaveBeenLastCalledWith({
        enabled: true,
        refreshQrCode: true,
        resourceAccountId: "iamora-1",
      });
    });
  });
});
