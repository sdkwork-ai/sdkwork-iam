import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  SdkworkIamH5AppShell,
  resolveSdkworkIamH5ShellTabs,
  type SdkworkIamH5ShellRoute,
} from "../src/index";

/**
 * The shell is the only place a route's access is decided visually, so these
 * cases assert the guard, the tab assembly and the fact that the shell renders the
 * screen it was handed rather than substituting one of its own.
 */

function route(overrides: Partial<SdkworkIamH5ShellRoute> = {}): SdkworkIamH5ShellRoute {
  return {
    access: "protected",
    element: <div data-testid="screen">screen</div>,
    id: "app.iam.tenant.overview",
    path: "/tenant",
    tab: { id: "tenant", label: "Tenant", order: 10 },
    title: "Tenant",
    ...overrides,
  };
}

describe("SDKWork IAM H5 app shell", () => {
  it("renders the screen for a protected route once a session exists", () => {
    render(
      <SdkworkIamH5AppShell
        authenticated
        currentPath="/tenant"
        onNavigate={() => undefined}
        routes={[route()]}
      >
        <div data-testid="screen">screen</div>
      </SdkworkIamH5AppShell>,
    );

    expect(screen.getByTestId("screen")).toBeTruthy();
  });

  it("draws the sign-in prompt instead of a protected screen without a session", () => {
    render(
      <SdkworkIamH5AppShell
        authenticated={false}
        currentPath="/tenant"
        onNavigate={() => undefined}
        routes={[route()]}
        signInPrompt={<p>sign in first</p>}
      >
        <div data-testid="screen">screen</div>
      </SdkworkIamH5AppShell>,
    );

    expect(screen.queryByTestId("screen")).toBeNull();
    expect(screen.getByText("sign in first")).toBeTruthy();
  });

  it("never blocks a public route, even without a session", () => {
    render(
      <SdkworkIamH5AppShell
        authenticated={false}
        currentPath="/auth/login"
        onNavigate={() => undefined}
        routes={[
          route({
            access: "public",
            element: <div data-testid="screen">login</div>,
            id: "app.iam.auth.login",
            path: "/auth/login",
            tab: undefined,
            title: "Sign in",
          }),
        ]}
      >
        <div data-testid="screen">login</div>
      </SdkworkIamH5AppShell>,
    );

    expect(screen.getByTestId("screen")).toBeTruthy();
  });

  it("renders the tab bar only when the catalog offers more than one tab", () => {
    const single = [
      route(),
      route({
        access: "public",
        element: <div />,
        id: "app.iam.auth.login",
        path: "/auth/login",
        tab: undefined,
        title: "Sign in",
      }),
    ];
    const { rerender } = render(
      <SdkworkIamH5AppShell
        authenticated
        currentPath="/tenant"
        onNavigate={() => undefined}
        routes={single}
      >
        <div data-testid="screen">screen</div>
      </SdkworkIamH5AppShell>,
    );
    // One tab is not a tab bar: a strip with a single entry is noise, and the
    // mobile standard keeps the root page chromeless in that case.
    expect(screen.queryByRole("navigation", { name: "Primary" })).toBeNull();

    rerender(
      <SdkworkIamH5AppShell
        authenticated
        currentPath="/tenant"
        onNavigate={() => undefined}
        routes={[
          ...single,
          route({
            element: <div />,
            id: "app.iam.account-binding.list",
            path: "/user/account-binding",
            tab: { id: "bindings", label: "Bindings", order: 20 },
            title: "Bindings",
          }),
        ]}
      >
        <div data-testid="screen">screen</div>
      </SdkworkIamH5AppShell>,
    );

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bindings" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tenant" }).getAttribute("aria-current")).toBe("page");
  });

  it("navigates from a tab and orders tabs by their declared order", () => {
    const onNavigate = vi.fn();
    render(
      <SdkworkIamH5AppShell
        authenticated
        currentPath="/tenant"
        onNavigate={onNavigate}
        routes={[
          route({
            element: <div />,
            id: "app.iam.account-binding.list",
            path: "/user/account-binding",
            tab: { id: "bindings", label: "Bindings", order: 5 },
            title: "Bindings",
          }),
          route(),
        ]}
      >
        <div data-testid="screen">screen</div>
      </SdkworkIamH5AppShell>,
    );

    const items = resolveSdkworkIamH5ShellTabs([
      route(),
      route({
        element: <div />,
        id: "app.iam.account-binding.list",
        path: "/user/account-binding",
        tab: { id: "bindings", label: "Bindings", order: 5 },
        title: "Bindings",
      }),
    ]);
    expect(items.map((item) => item.path)).toEqual(["/user/account-binding", "/tenant"]);

    screen.getByRole("button", { name: "Bindings" }).click();
    expect(onNavigate).toHaveBeenCalledWith("/user/account-binding");
  });
});
