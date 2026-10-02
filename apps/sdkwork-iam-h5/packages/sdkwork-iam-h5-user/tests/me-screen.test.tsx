import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SdkworkIamService } from "@sdkwork/iam-service";

import {
  IAMH5USER_USERCENTER_I18N_FRAGMENTS,
  SdkworkIamH5UserCenterMeScreen,
} from "../src/index";

function createService(overrides?: {
  deleteSession?: ReturnType<typeof vi.fn>;
  retrieveSession?: ReturnType<typeof vi.fn>;
  retrieveUser?: ReturnType<typeof vi.fn>;
}): SdkworkIamService {
  const service = {
    auth: {
      sessions: {
        current: {
          delete: overrides?.deleteSession ?? vi.fn().mockResolvedValue(undefined),
          retrieve:
            overrides?.retrieveSession
            ?? vi.fn().mockResolvedValue({
              accessToken: "access-token",
              authToken: "auth-token",
              context: {
                appId: "app",
                authLevel: "standard",
                organizationId: "org-1",
                tenantId: "tenant-1",
                userId: "user-1",
              },
            }),
        },
      },
    },
    iam: {
      users: {
        current: {
          retrieve:
            overrides?.retrieveUser
            ?? vi.fn().mockResolvedValue({
              displayName: "Alice",
              email: "alice@example.com",
              id: "user-1",
              username: "alice",
            }),
        },
      },
    },
  };
  return service as unknown as SdkworkIamService;
}

afterEach(() => {
  cleanup();
});

describe("<SdkworkIamH5UserCenterMeScreen>", () => {
  it("renders the hero, context card, menu and sign-out action once ready", async () => {
    render(<SdkworkIamH5UserCenterMeScreen service={createService()} />);

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeDefined();
    });
    expect(screen.getByText("alice")).toBeDefined();
    expect(screen.getByText("Account")).toBeDefined();
    expect(screen.getByText("Connected accounts")).toBeDefined();
    expect(screen.getByText("Tenant")).toBeDefined();
    expect(screen.getByText("tenant-1")).toBeDefined();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeDefined();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("localizes copy through the injected zh-CN fragment", async () => {
    render(
      <SdkworkIamH5UserCenterMeScreen
        messages={IAMH5USER_USERCENTER_I18N_FRAGMENTS["zh-CN"]}
        service={createService()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("我的")).toBeDefined();
    });
    expect(screen.getByRole("button", { name: "退出登录" })).toBeDefined();
    expect(screen.getByText("租户")).toBeDefined();
  });

  it("shows the error state with retry and recovers", async () => {
    const retrieveUser = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValue({ displayName: "Alice", id: "user-1" });
    const service = createService({ retrieveUser });
    render(<SdkworkIamH5UserCenterMeScreen service={service} />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("network down");

    screen.getByRole("button", { name: "Retry" }).click();
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeDefined();
    });
    expect(retrieveUser).toHaveBeenCalledTimes(2);
  });

  it("signs out through the controller and reports completion", async () => {
    const deleteSession = vi.fn().mockResolvedValue(undefined);
    const onSignedOut = vi.fn();
    render(
      <SdkworkIamH5UserCenterMeScreen
        onSignedOut={onSignedOut}
        service={createService({ deleteSession })}
      />,
    );

    const signOut = await screen.findByRole("button", { name: "Sign out" });
    signOut.click();

    await waitFor(() => {
      expect(deleteSession).toHaveBeenCalled();
      expect(onSignedOut).toHaveBeenCalled();
    });
  });

  it("dispatches screen intents to the host navigation hook", async () => {
    const onNavigate = vi.fn();
    render(<SdkworkIamH5UserCenterMeScreen onNavigate={onNavigate} service={createService()} />);

    const profileItem = await screen.findByRole("button", { name: /^Profile/ });
    profileItem.click();

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith("profile");
    });
  });

  it("lets hosts replace a region through the appearance slots", async () => {
    function CustomHero() {
      return <section data-slot-hero="custom" />;
    }
    render(
      <SdkworkIamH5UserCenterMeScreen
        appearance={{ slots: { Hero: CustomHero } }}
        service={createService()}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector("[data-slot-hero='custom']")).not.toBeNull();
    });
    expect(screen.queryByText("Alice")).toBeNull();
  });
});
