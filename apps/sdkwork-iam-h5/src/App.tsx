// SDKWORK-IAM-H5-BOOTSTRAP: authored application composition.
/**
 * Root composition boundary for the IAM H5 client.
 *
 * It owns exactly four things: the shared runtime (one IAM service), the session
 * subscription that drives the guard, the path router, and the route → screen
 * table. No business logic lives here — each screen comes from its capability
 * package and receives its own controller (`APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC`
 * section 5).
 *
 * Only routes whose capability package ships a real screen are registered. A route
 * the model knows about but this root cannot render yet is *absent* rather than
 * rendered as a placeholder, so a missing screen shows up as navigation that does
 * not exist instead of a convincing empty page.
 */

import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";

import {
  createSdkworkIamH5AuthController,
  SdkworkIamH5AuthLoginSurface,
} from "@sdkwork/iam-h5-auth";
import { SdkworkIamH5EmptyState, SdkworkIamH5I18nProvider, SdkworkIamH5Screen } from "@sdkwork/iam-h5-commons";
import { createIamH5SessionStore, type IamH5RouteContribution, type IamH5SessionStore } from "@sdkwork/iam-h5-core";
import { SdkworkIamH5AppShell, type SdkworkIamH5ShellRoute } from "@sdkwork/iam-h5-shell";
import {
  createSdkworkIamH5TenantController,
  IAM_H5_TENANT_I18N_CATALOG,
  SdkworkIamH5TenantOverviewScreen,
} from "@sdkwork/iam-h5-tenant";

import { useIamH5HistoryRoute } from "./bootstrap/history-router";
import { createIamH5BootstrapRuntime } from "./bootstrap/iamService";
import { IAM_H5_SHELL_I18N_CATALOG } from "./i18n/index";

export interface AppProps {
  routes: readonly IamH5RouteContribution[];
  /** Overrides the browser locale; mainly for tests and embedded hosts. */
  locale?: string | null;
}

/** Path the shell lands on after a successful sign-in. */
const POST_LOGIN_PATH = "/tenant";
/** Path rendered when no registered route matches. */
const FALLBACK_PATH = "/auth/login";

/**
 * The IAM H5 application.
 * @param props - route contributions and an optional locale override.
 * @returns the composed application.
 */
export function App({ locale, routes: routeContributions }: AppProps): ReactElement {
  const sessionStore = useMemo<IamH5SessionStore>(() => createIamH5SessionStore(), []);
  const [bootstrap] = useState(() => createIamH5BootstrapRuntime(sessionStore));
  const [session, setSession] = useState(() => sessionStore.get());
  const { navigate, path, replace } = useIamH5HistoryRoute();

  useEffect(() => {
    const unsubscribe = sessionStore.subscribe(setSession);
    return () => {
      unsubscribe();
    };
  }, [sessionStore]);

  useEffect(() => () => bootstrap.detach(), [bootstrap]);

  const resolvedLocale = locale ?? (typeof navigator === "undefined" ? undefined : navigator.language);
  const shellMessages = IAM_H5_SHELL_I18N_CATALOG.resolveMessages(resolvedLocale);
  const tenantMessages = IAM_H5_TENANT_I18N_CATALOG.resolveMessages(resolvedLocale);

  const authController = useMemo(
    () => createSdkworkIamH5AuthController(bootstrap.runtime.service),
    [bootstrap],
  );
  const tenantController = useMemo(
    () => createSdkworkIamH5TenantController(bootstrap.runtime.service),
    [bootstrap],
  );

  const handleAuthenticated = useCallback(() => {
    // The service's commit bridge already wrote the session into the store; this
    // only moves the user off the sign-in screen.
    replace(POST_LOGIN_PATH);
  }, [replace]);

  const authenticated = session !== undefined;

  const registeredRoutes = useMemo<SdkworkIamH5ShellRoute[]>(() => {
    const byId = (id: string) => routeContributions.find((entry) => entry.id === id);
    const loginRoute = byId("app.iam.auth.login");
    const tenantRoute = byId("app.iam.tenant.overview");
    const routes: SdkworkIamH5ShellRoute[] = [];

    if (loginRoute) {
      routes.push({
        access: "public",
        element: (
          <SdkworkIamH5AuthLoginSurface
            controller={authController}
            locale={resolvedLocale}
            onAuthenticated={handleAuthenticated}
          />
        ),
        id: loginRoute.id,
        path: loginRoute.path,
        title: shellMessages.loginTitle,
      });
    }
    if (tenantRoute) {
      routes.push({
        access: "protected",
        element: <SdkworkIamH5TenantOverviewScreen controller={tenantController} />,
        id: tenantRoute.id,
        path: tenantRoute.path,
        tab: { id: "tenant", label: tenantMessages.overview.title, order: 10 },
        title: tenantMessages.overview.title,
      });
    }
    return routes;
  }, [
    authController,
    handleAuthenticated,
    resolvedLocale,
    routeContributions,
    shellMessages.loginTitle,
    tenantController,
    tenantMessages.overview.title,
  ]);

  const activeRoute = registeredRoutes.find((entry) => entry.path === path);

  return (
    <SdkworkIamH5I18nProvider
      catalogs={[IAM_H5_SHELL_I18N_CATALOG, IAM_H5_TENANT_I18N_CATALOG]}
      locale={resolvedLocale}
    >
      <SdkworkIamH5AppShell
        authenticated={authenticated}
        currentPath={path}
        onNavigate={navigate}
        routes={registeredRoutes}
        signInPrompt={
          <SdkworkIamH5EmptyState
            action={{ label: shellMessages.loginTitle, onClick: () => replace(FALLBACK_PATH) }}
            description={shellMessages.guard.detail}
            title={shellMessages.guard.title}
          />
        }
      >
        {activeRoute ? (
          activeRoute.element
        ) : (
          <SdkworkIamH5Screen title={shellMessages.notFound.title}>
            <SdkworkIamH5EmptyState
              action={{ label: shellMessages.notFound.action, onClick: () => replace(FALLBACK_PATH) }}
              description={shellMessages.notFound.detail}
              title={shellMessages.notFound.title}
            />
          </SdkworkIamH5Screen>
        )}
      </SdkworkIamH5AppShell>
    </SdkworkIamH5I18nProvider>
  );
}
