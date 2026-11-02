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
  createSdkworkIamH5AccountBindingController,
  IAM_H5_ACCOUNT_BINDING_I18N_CATALOG,
  SdkworkIamH5AccountBindingScreen,
} from "@sdkwork/iam-h5-account-binding";
import {
  createSdkworkIamH5AuthController,
  SDKWORK_IAM_H5_AUTH_I18N_CATALOG,
  SdkworkIamH5AuthCallbackSurface,
  SdkworkIamH5AuthLoginSurface,
} from "@sdkwork/iam-h5-auth";
import { SdkworkIamH5EmptyState, SdkworkIamH5I18nProvider, SdkworkIamH5Screen } from "@sdkwork/iam-h5-commons";
import {
  createSdkworkIamH5AdminAuditController,
  IAM_H5_ADMIN_AUDIT_I18N_CATALOG,
  SdkworkIamH5AdminAuditScreen,
} from "@sdkwork/iam-h5-admin-audit";
import {
  createSdkworkIamH5AdminPermissionController,
  createSdkworkIamH5AdminPolicyController,
  createSdkworkIamH5AdminRoleController,
  IAM_H5_ADMIN_PERMISSION_I18N_CATALOG,
  SdkworkIamH5AdminPermissionScreen,
  SdkworkIamH5AdminPolicyScreen,
  SdkworkIamH5AdminRoleScreen,
} from "@sdkwork/iam-h5-admin-permission";
import {
  createSdkworkIamH5ConsoleAccountBindingController,
  IAM_H5_CONSOLE_ACCOUNT_BINDING_I18N_CATALOG,
  SdkworkIamH5ConsoleAccountBindingScreen,
} from "@sdkwork/iam-h5-console-account-binding";
import {
  createSdkworkIamH5ConsoleOrganizationController,
  IAM_H5_CONSOLE_ORGANIZATION_I18N_CATALOG,
  SdkworkIamH5ConsoleOrganizationDirectoryScreen,
} from "@sdkwork/iam-h5-console-organization";
import {
  createSdkworkIamH5ConsoleUserCenterController,
  IAM_H5_CONSOLE_USER_CENTER_I18N_CATALOG,
  SdkworkIamH5ConsoleUserCenterProfileScreen,
} from "@sdkwork/iam-h5-console-user-center";
import {
  createSdkworkIamH5ConsoleTenantController,
  IAM_H5_CONSOLE_TENANT_I18N_CATALOG,
  SdkworkIamH5ConsoleTenantOverviewScreen,
} from "@sdkwork/iam-h5-console-tenant";
import { createIamH5SessionStore, type IamH5RouteContribution, type IamH5SessionStore } from "@sdkwork/iam-h5-core";
import { SdkworkIamH5AppShell, type SdkworkIamH5ShellRoute } from "@sdkwork/iam-h5-shell";
import {
  createSdkworkIamH5OAuthProviderController,
  IAM_H5_OAUTH_I18N_CATALOG,
  SdkworkIamH5OAuthProviderScreen,
} from "@sdkwork/iam-h5-oauth";
import {
  createSdkworkIamH5OrganizationController,
  IAM_H5_ORGANIZATION_I18N_CATALOG,
  SdkworkIamH5OrganizationDirectoryScreen,
} from "@sdkwork/iam-h5-organization";
import {
  createSdkworkIamH5TenantController,
  IAM_H5_TENANT_I18N_CATALOG,
  SdkworkIamH5TenantOverviewScreen,
} from "@sdkwork/iam-h5-tenant";
import {
  createSdkworkIamH5UserCenterController,
  IAM_H5_USER_CENTER_I18N_CATALOG,
  SdkworkIamH5UserCenterPasswordScreen,
  SdkworkIamH5UserCenterProfileScreen,
} from "@sdkwork/iam-h5-user-center";

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
  const userCenterMessages = IAM_H5_USER_CENTER_I18N_CATALOG.resolveMessages(resolvedLocale);
  const organizationMessages = IAM_H5_ORGANIZATION_I18N_CATALOG.resolveMessages(resolvedLocale);
  const accountBindingMessages = IAM_H5_ACCOUNT_BINDING_I18N_CATALOG.resolveMessages(resolvedLocale);
  const oauthMessages = IAM_H5_OAUTH_I18N_CATALOG.resolveMessages(resolvedLocale);
  const authMessages = SDKWORK_IAM_H5_AUTH_I18N_CATALOG.resolveMessages(resolvedLocale);
  const consoleTenantMessages = IAM_H5_CONSOLE_TENANT_I18N_CATALOG.resolveMessages(resolvedLocale);
  const consoleOrganizationMessages =
    IAM_H5_CONSOLE_ORGANIZATION_I18N_CATALOG.resolveMessages(resolvedLocale);
  const consoleAccountBindingMessages =
    IAM_H5_CONSOLE_ACCOUNT_BINDING_I18N_CATALOG.resolveMessages(resolvedLocale);
  const consoleUserCenterMessages =
    IAM_H5_CONSOLE_USER_CENTER_I18N_CATALOG.resolveMessages(resolvedLocale);
  const adminPermissionMessages =
    IAM_H5_ADMIN_PERMISSION_I18N_CATALOG.resolveMessages(resolvedLocale);
  const adminAuditMessages = IAM_H5_ADMIN_AUDIT_I18N_CATALOG.resolveMessages(resolvedLocale);

  const authController = useMemo(
    () => createSdkworkIamH5AuthController(bootstrap.runtime.service),
    [bootstrap],
  );
  const tenantController = useMemo(
    () => createSdkworkIamH5TenantController(bootstrap.runtime.service),
    [bootstrap],
  );
  const userCenterController = useMemo(
    () => createSdkworkIamH5UserCenterController(bootstrap.runtime.service),
    [bootstrap],
  );
  const organizationController = useMemo(
    () => createSdkworkIamH5OrganizationController(bootstrap.runtime.service),
    [bootstrap],
  );
  const accountBindingController = useMemo(
    () => createSdkworkIamH5AccountBindingController(bootstrap.runtime.service),
    [bootstrap],
  );
  const oauthProviderController = useMemo(
    () => createSdkworkIamH5OAuthProviderController(bootstrap.runtime.service),
    [bootstrap],
  );
  const consoleTenantController = useMemo(
    () => createSdkworkIamH5ConsoleTenantController(bootstrap.runtime.service),
    [bootstrap],
  );
  const consoleOrganizationController = useMemo(
    () => createSdkworkIamH5ConsoleOrganizationController(bootstrap.runtime.service),
    [bootstrap],
  );
  const consoleAccountBindingController = useMemo(
    () => createSdkworkIamH5ConsoleAccountBindingController(bootstrap.runtime.service),
    [bootstrap],
  );
  const consoleUserCenterController = useMemo(
    () => createSdkworkIamH5ConsoleUserCenterController(bootstrap.runtime.service),
    [bootstrap],
  );
  const adminPermissionController = useMemo(
    () => createSdkworkIamH5AdminPermissionController(bootstrap.adminService),
    [bootstrap],
  );
  const adminRoleController = useMemo(
    () => createSdkworkIamH5AdminRoleController(bootstrap.adminService),
    [bootstrap],
  );
  const adminPolicyController = useMemo(
    () => createSdkworkIamH5AdminPolicyController(bootstrap.adminService),
    [bootstrap],
  );
  const adminAuditController = useMemo(
    () => createSdkworkIamH5AdminAuditController(bootstrap.adminService),
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
    const registerRoute = byId("app.iam.auth.register");
    const forgotRoute = byId("app.iam.auth.forgot-password");
    const callbackRoute = byId("app.iam.auth.oauth-callback");
    const tenantRoute = byId("app.iam.tenant.overview");
    const organizationRoute = byId("app.iam.organization.directory");
    const profileRoute = byId("app.iam.user-center.profile");
    const passwordRoute = byId("app.iam.user-center.password");
    const accountBindingRoute = byId("app.iam.account-binding.list");
    const oauthProviderRoute = byId("app.iam.oauth.providers");
    const consoleTenantRoute = byId("console.iam.tenant.overview");
    const consoleOrganizationRoute = byId("console.iam.organization.directory");
    const consoleAccountBindingRoute = byId("console.iam.account-binding.list");
    const consoleUserCenterRoute = byId("console.iam.user-center.profile");
    const adminPermissionRoute = byId("admin.iam.permission.permissions");
    const adminRoleRoute = byId("admin.iam.permission.roles");
    const adminPolicyRoute = byId("admin.iam.permission.policies");
    const adminAuditRoute = byId("admin.iam.audit.events");
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
    if (registerRoute) {
      routes.push({
        access: "public",
        element: (
          <SdkworkIamH5AuthLoginSurface
            controller={authController}
            initialMode="register"
            locale={resolvedLocale}
            onAuthenticated={handleAuthenticated}
          />
        ),
        id: registerRoute.id,
        path: registerRoute.path,
        title: authMessages.modes.register,
      });
    }
    if (forgotRoute) {
      routes.push({
        access: "public",
        element: (
          <SdkworkIamH5AuthLoginSurface
            controller={authController}
            initialMode="forgot"
            locale={resolvedLocale}
            onAuthenticated={handleAuthenticated}
          />
        ),
        id: forgotRoute.id,
        path: forgotRoute.path,
        title: authMessages.modes.forgot,
      });
    }
    if (callbackRoute) {
      routes.push({
        access: "public",
        element: (
          <SdkworkIamH5AuthCallbackSurface
            controller={authController}
            locale={resolvedLocale}
            onAuthenticated={handleAuthenticated}
            onScanLoginCompleted={handleAuthenticated}
          />
        ),
        id: callbackRoute.id,
        path: callbackRoute.path,
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
    if (organizationRoute) {
      routes.push({
        access: "protected",
        element: <SdkworkIamH5OrganizationDirectoryScreen controller={organizationController} />,
        id: organizationRoute.id,
        path: organizationRoute.path,
        tab: { id: "organizations", label: organizationMessages.directory.title, order: 20 },
        title: organizationMessages.directory.title,
      });
    }
    if (profileRoute) {
      routes.push({
        access: "protected",
        element: (
          <SdkworkIamH5UserCenterProfileScreen
            controller={userCenterController}
            onOpenOAuthProviders={
              oauthProviderRoute ? () => navigate(oauthProviderRoute.path) : undefined
            }
            onOpenPassword={passwordRoute ? () => navigate(passwordRoute.path) : undefined}
          />
        ),
        id: profileRoute.id,
        path: profileRoute.path,
        tab: { id: "profile", label: userCenterMessages.profile.title, order: 30 },
        title: userCenterMessages.profile.title,
      });
    }
    if (passwordRoute) {
      routes.push({
        access: "protected",
        element: (
          <SdkworkIamH5UserCenterPasswordScreen
            controller={userCenterController}
            onBack={() => replace(profileRoute?.path ?? FALLBACK_PATH)}
          />
        ),
        id: passwordRoute.id,
        path: passwordRoute.path,
        title: userCenterMessages.password.title,
      });
    }
    if (accountBindingRoute) {
      routes.push({
        access: "protected",
        element: (
          <SdkworkIamH5AccountBindingScreen
            controller={accountBindingController}
            onBack={() => replace(profileRoute?.path ?? FALLBACK_PATH)}
          />
        ),
        id: accountBindingRoute.id,
        path: accountBindingRoute.path,
        tab: { id: "bindings", label: accountBindingMessages.binding.title, order: 25 },
        title: accountBindingMessages.binding.title,
      });
    }
    if (oauthProviderRoute) {
      routes.push({
        access: "protected",
        element: (
          <SdkworkIamH5OAuthProviderScreen
            controller={oauthProviderController}
            onAuthorize={(url) => {
              // The host owns navigation: this root is the browser build, so the
              // only thing to decide is that it leaves the current document.
              if (typeof window !== "undefined") window.location.assign(url);
            }}
            onBack={() => replace(profileRoute?.path ?? FALLBACK_PATH)}
          />
        ),
        id: oauthProviderRoute.id,
        path: oauthProviderRoute.path,
        title: oauthMessages.providers.title,
      });
    }
    if (consoleTenantRoute) {
      routes.push({
        access: "protected",
        element: <SdkworkIamH5ConsoleTenantOverviewScreen controller={consoleTenantController} />,
        id: consoleTenantRoute.id,
        path: consoleTenantRoute.path,
        title: consoleTenantMessages.overview.title,
      });
    }
    if (consoleOrganizationRoute) {
      routes.push({
        access: "protected",
        element: (
          <SdkworkIamH5ConsoleOrganizationDirectoryScreen
            controller={consoleOrganizationController}
          />
        ),
        id: consoleOrganizationRoute.id,
        path: consoleOrganizationRoute.path,
        title: consoleOrganizationMessages.directory.title,
      });
    }
    if (consoleAccountBindingRoute) {
      routes.push({
        access: "protected",
        element: (
          <SdkworkIamH5ConsoleAccountBindingScreen controller={consoleAccountBindingController} />
        ),
        id: consoleAccountBindingRoute.id,
        path: consoleAccountBindingRoute.path,
        title: consoleAccountBindingMessages.list.title,
      });
    }
    if (consoleUserCenterRoute) {
      routes.push({
        access: "protected",
        element: <SdkworkIamH5ConsoleUserCenterProfileScreen controller={consoleUserCenterController} />,
        id: consoleUserCenterRoute.id,
        path: consoleUserCenterRoute.path,
        title: consoleUserCenterMessages.profile.title,
      });
    }
    if (adminPermissionRoute) {
      routes.push({
        access: "protected",
        element: <SdkworkIamH5AdminPermissionScreen controller={adminPermissionController} />,
        id: adminPermissionRoute.id,
        path: adminPermissionRoute.path,
        title: adminPermissionMessages.permissions.title,
      });
    }
    if (adminRoleRoute) {
      routes.push({
        access: "protected",
        element: <SdkworkIamH5AdminRoleScreen controller={adminRoleController} />,
        id: adminRoleRoute.id,
        path: adminRoleRoute.path,
        title: adminPermissionMessages.roles.title,
      });
    }
    if (adminPolicyRoute) {
      routes.push({
        access: "protected",
        element: <SdkworkIamH5AdminPolicyScreen controller={adminPolicyController} />,
        id: adminPolicyRoute.id,
        path: adminPolicyRoute.path,
        title: adminPermissionMessages.policies.title,
      });
    }
    if (adminAuditRoute) {
      routes.push({
        access: "protected",
        element: <SdkworkIamH5AdminAuditScreen controller={adminAuditController} />,
        id: adminAuditRoute.id,
        path: adminAuditRoute.path,
        title: adminAuditMessages.events.title,
      });
    }
    return routes;
  }, [
    accountBindingController,
    accountBindingMessages.binding.title,
    authController,
    authMessages.modes.forgot,
    authMessages.modes.register,
    consoleTenantController,
    consoleTenantMessages.overview.title,
    consoleOrganizationController,
    consoleOrganizationMessages.directory.title,
    consoleAccountBindingController,
    consoleAccountBindingMessages.list.title,
    consoleUserCenterController,
    consoleUserCenterMessages.profile.title,
    adminPermissionController,
    adminPermissionMessages.permissions.title,
    adminPermissionMessages.roles.title,
    adminPermissionMessages.policies.title,
    adminRoleController,
    adminPolicyController,
    adminAuditController,
    adminAuditMessages.events.title,
    handleAuthenticated,
    navigate,
    oauthMessages.providers.title,
    oauthProviderController,
    organizationController,
    organizationMessages.directory.title,
    replace,
    resolvedLocale,
    routeContributions,
    shellMessages.loginTitle,
    tenantController,
    tenantMessages.overview.title,
    userCenterController,
    userCenterMessages.password.title,
    userCenterMessages.profile.title,
  ]);

  const activeRoute = registeredRoutes.find((entry) => entry.path === path);

  return (
    <SdkworkIamH5I18nProvider
      catalogs={[
        IAM_H5_SHELL_I18N_CATALOG,
        IAM_H5_TENANT_I18N_CATALOG,
        IAM_H5_USER_CENTER_I18N_CATALOG,
        IAM_H5_ORGANIZATION_I18N_CATALOG,
        IAM_H5_ACCOUNT_BINDING_I18N_CATALOG,
        IAM_H5_OAUTH_I18N_CATALOG,
      ]}
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
