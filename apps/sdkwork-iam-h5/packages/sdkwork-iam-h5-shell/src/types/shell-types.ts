/**
 * Shell contracts for the IAM H5 client.
 *
 * The shell is deliberately router-agnostic: the application root owns the
 * router (it is the only place that can decide between browser history, a
 * Capacitor host and a native deep link), and the shell receives the matched
 * route plus a navigation callback. That keeps the shell testable without a
 * router and lets the same shell run inside the Capacitor host.
 */

import type { ReactNode } from "react";

/** One screen the shell can render. */
export interface SdkworkIamH5ShellRoute {
  /** Route identity, `<surface>.<domain>.<capability>.<screen>`. */
  id: string;
  /** Physical path for this platform. */
  path: string;
  /** Resolved, already-localized title. */
  title: string;
  /** Whether the route is reachable before sign-in. */
  access: "public" | "protected";
  /** Screen element. */
  element: ReactNode;
  /** Bottom-tab placement, when the route is a root tab. */
  tab?: {
    id: string;
    label: string;
    order: number;
  };
}

/** Props of the application shell. */
export interface SdkworkIamH5AppShellProps {
  /** Whether a session exists; a protected route is not rendered without one. */
  authenticated: boolean;
  children: ReactNode;
  /** Path the shell should mark as the active tab. */
  currentPath: string;
  /** Title of the not-signed-in surface, rendered when a guarded route is hit. */
  signInPrompt?: ReactNode;
  /** Routes the shell knows about, including their tab placement. */
  routes: readonly SdkworkIamH5ShellRoute[];
  /** Navigate to a path. */
  onNavigate: (path: string) => void;
}
