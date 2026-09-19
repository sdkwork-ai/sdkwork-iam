// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Canonical IAM route identity registry of the `app` tier.
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md section 4 (the route registry
 * belongs to the tier's core package) and section 7 (route identity). `id` follows
 * `<surface>.<domain>.<capability>.<screen>` and is identical across every IAM client
 * root and every tier; only `pagePath` and `harmonyNative` are Harmony-specific.
 *
 * This registry holds the 12 `app` route(s) and imports no other package,
 * because section 5 forbids `core` from depending on a capability package. The tier
 * shell joins the capability slices into composition order; this file is the single
 * place the identities are authored.
 */

/** Authentication mode of a route contribution. */
export type RouteAuth = 'public' | 'required';

/** HarmonyOS presentation of a route contribution (section 8). */
export type HarmonyRoutePresentation = 'page' | 'tab' | 'dialog' | 'sheet';

/**
 * One route of this tier.
 *
 * Route metadata must not declare API URLs, SDK methods, access tokens or signing
 * material (section 8), so this interface has no transport field.
 */
export interface RouteContribution {
  /** Cross-client route id, identical in every IAM client root. */
  readonly id: string;
  /** Route surface tier: `app`, `console` or `admin`. */
  readonly surface: string;
  /** Domain capability token. */
  readonly capability: string;
  /** Screen token within the capability. */
  readonly screen: string;
  /** Physical HarmonyOS page path. Physical paths may differ per platform. */
  readonly pagePath: string;
  /** Locale key of the screen title. */
  readonly titleKey: string;
  /** Whether the route requires an authenticated session. */
  readonly auth: RouteAuth;
  /** HarmonyOS presentation pattern. */
  readonly harmonyNative: HarmonyRoutePresentation;
  /** Primary permission hint, when the route is permission-gated. */
  readonly permissionHint?: string;
  /** Additional permission hints the route accepts. */
  readonly additionalPermissionHints?: string[];
}

/** Every route of the `app` surface, in canonical order. */
export const iamHarmonyMobileCoreRouteContributions: RouteContribution[] = [
  {
    id: 'app.iam.auth.login',
    surface: 'app',
    capability: 'auth',
    screen: 'login',
    pagePath: 'pages/auth/AuthLogin',
    titleKey: 'iam.auth.login.title',
    auth: 'public',
    harmonyNative: 'page',
  },
  {
    id: 'app.iam.auth.register',
    surface: 'app',
    capability: 'auth',
    screen: 'register',
    pagePath: 'pages/auth/AuthRegister',
    titleKey: 'iam.auth.register.title',
    auth: 'public',
    harmonyNative: 'page',
  },
  {
    id: 'app.iam.auth.forgot-password',
    surface: 'app',
    capability: 'auth',
    screen: 'forgot-password',
    pagePath: 'pages/auth/AuthForgotPassword',
    titleKey: 'iam.auth.forgotPassword.title',
    auth: 'public',
    harmonyNative: 'page',
  },
  {
    id: 'app.iam.auth.oauth-callback',
    surface: 'app',
    capability: 'auth',
    screen: 'oauth-callback',
    pagePath: 'pages/auth/AuthOauthCallback',
    titleKey: 'iam.auth.oauthCallback.title',
    auth: 'public',
    harmonyNative: 'page',
  },
  {
    id: 'app.iam.auth.context-selection',
    surface: 'app',
    capability: 'auth',
    screen: 'context-selection',
    pagePath: 'pages/auth/AuthContextSelection',
    titleKey: 'iam.auth.contextSelection.title',
    auth: 'required',
    harmonyNative: 'page',
  },
  {
    id: 'app.iam.user-center.profile',
    surface: 'app',
    capability: 'user-center',
    screen: 'profile',
    pagePath: 'pages/user-center/UserCenterProfile',
    titleKey: 'iam.userCenter.profile.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.self',
  },
  {
    id: 'app.iam.user-center.password',
    surface: 'app',
    capability: 'user-center',
    screen: 'password',
    pagePath: 'pages/user-center/UserCenterPassword',
    titleKey: 'iam.userCenter.password.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.self',
  },
  {
    id: 'app.iam.account-binding.list',
    surface: 'app',
    capability: 'account-binding',
    screen: 'list',
    pagePath: 'pages/account-binding/AccountBindingList',
    titleKey: 'iam.accountBinding.list.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.self',
  },
  {
    id: 'app.iam.user.list',
    surface: 'app',
    capability: 'user',
    screen: 'list',
    pagePath: 'pages/user/UserList',
    titleKey: 'iam.user.list.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.users.read',
  },
  {
    id: 'app.iam.tenant.overview',
    surface: 'app',
    capability: 'tenant',
    screen: 'overview',
    pagePath: 'pages/tenant/TenantOverview',
    titleKey: 'iam.tenant.overview.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.tenants.read',
  },
  {
    id: 'app.iam.organization.directory',
    surface: 'app',
    capability: 'organization',
    screen: 'directory',
    pagePath: 'pages/organization/OrganizationDirectory',
    titleKey: 'iam.organization.directory.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.organizations.read',
  },
  {
    id: 'app.iam.oauth.providers',
    surface: 'app',
    capability: 'oauth',
    screen: 'providers',
    pagePath: 'pages/oauth/OauthProviders',
    titleKey: 'iam.oauth.providers.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.oauth.read',
  },
];

/** Route ids of the `app` surface, in registry order. */
export function iamHarmonyMobileCoreRouteIds(): string[] {
  return iamHarmonyMobileCoreRouteContributions.map((entry: RouteContribution) => entry.id);
}

/** Routes of one capability token, for that capability's own contribution list. */
export function iamHarmonyMobileCoreRoutesByCapability(capability: string): RouteContribution[] {
  return iamHarmonyMobileCoreRouteContributions.filter(
    (entry: RouteContribution) => entry.capability === capability,
  );
}

/** Finds one route by its cross-client route id. */
export function findIamHarmonyMobileCoreRoute(id: string): RouteContribution | undefined {
  return iamHarmonyMobileCoreRouteContributions.find((entry: RouteContribution) => entry.id === id);
}
