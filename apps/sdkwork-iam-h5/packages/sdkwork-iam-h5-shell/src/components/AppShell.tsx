/**
 * The IAM H5 application shell.
 *
 * Responsibilities, and nothing else (`APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md`
 * section 5): decide whether the requested route may render, draw the bottom tab
 * bar from the route catalog, and provide the layout. Business screens, services
 * and controllers live in capability packages.
 */

import { useState } from "react";

import {
  SdkworkIamH5EmptyState,
  SdkworkIamH5Screen,
  SdkworkIamH5TabBar,
  ensureSdkworkIamH5KitStyles,
  type SdkworkIamH5TabItem,
} from "@sdkwork/iam-h5-commons";

import type { SdkworkIamH5AppShellProps, SdkworkIamH5ShellRoute } from "../types/shell-types.js";

/**
 * Render the active route inside the shell chrome.
 * @param props - see {@link SdkworkIamH5AppShellProps}.
 * @returns the shell element.
 */
export function SdkworkIamH5AppShell({
  authenticated,
  children,
  currentPath,
  onNavigate,
  routes,
  signInPrompt,
}: SdkworkIamH5AppShellProps) {
  useState(() => ensureSdkworkIamH5KitStyles());

  const activeRoute = routes.find((route) => route.path === currentPath);
  const tabItems: SdkworkIamH5TabItem[] = routes
    .flatMap((route) =>
      route.tab
        ? [{ id: route.tab.id, label: route.tab.label, order: route.tab.order, path: route.path }]
        : [],
    )
    .sort((left, right) => left.order - right.order)
    .map(({ id, label, path }) => ({ id, label, path }));

  // A guarded route without a session shows the sign-in prompt instead of the
  // screen: the visual decision belongs to the shell, while every authorization
  // decision stays on the server.
  if (activeRoute && activeRoute.access === "protected" && !authenticated) {
    return (
      <SdkworkIamH5Screen title={activeRoute.title}>
        {signInPrompt ?? (
          <SdkworkIamH5EmptyState
            description="Sign in to continue."
            title="Sign-in required"
          />
        )}
      </SdkworkIamH5Screen>
    );
  }

  return (
    <div className="sdkwork-iam-h5" style={{ minBlockSize: "100dvh" }}>
      <div style={{ display: "flex", flex: "1 1 auto", flexDirection: "column", minBlockSize: 0 }}>
        {children}
      </div>
      {tabItems.length > 1 ? (
        <SdkworkIamH5TabBar
          activePath={currentPath}
          items={tabItems}
          onNavigate={onNavigate}
        />
      ) : null}
    </div>
  );
}

/**
 * Build the ordered tab list of a route catalog.
 *
 * Exported separately so the root can assert in a test that every tab points at a
 * route the shell actually knows.
 * @param routes - route catalog.
 * @returns tab items in display order.
 */
export function resolveSdkworkIamH5ShellTabs(
  routes: readonly SdkworkIamH5ShellRoute[],
): readonly SdkworkIamH5TabItem[] {
  return routes
    .flatMap((route) =>
      route.tab ? [{ id: route.tab.id, label: route.tab.label, order: route.tab.order, path: route.path }] : [],
    )
    .sort((left, right) => left.order - right.order)
    .map(({ id, label, path }) => ({ id, label, path }));
}
