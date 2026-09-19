// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Canonical IAM route identity registry for the sdkwork-iam-mini-program **application**
 * surface.
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md §7 (route identity) and §4
 * (the route registry belongs to the tier's core package). `id` follows
 * `<surface>.<domain>.<capability>.<screen>` and is identical across every IAM
 * client root and every tier; only `presentation` and the mini program
 * placement are platform-specific.
 *
 * This registry holds the 12 `app`-surface route(s). The other tiers
 * own theirs in their own core package, so no tier has to depend on another.
 */

export type IamMpRouteSurface = 'app';

export interface IamMpRouteContribution {
  id: string;
  surface: IamMpRouteSurface;
  domain: string;
  capability: string;
  screen: string;
  /** Physical path for this platform. Physical paths may differ per platform. */
  path: string;
  titleKey: string;
  auth: 'public' | 'required';
  permissionHint?: string;
  additionalPermissionHints?: readonly string[];
  presentation: Record<string, string>;
  miniProgram?: { subpackage?: string; pagePath: string };
}

export const IAMMP_ROUTE_CONTRIBUTIONS: readonly IamMpRouteContribution[] = [
  {
    id: 'app.iam.auth.login',
    surface: 'app',
    domain: 'iam',
    capability: 'auth',
    screen: 'login',
    path: '/auth/login',
    titleKey: 'iam.auth.login.title',
    auth: 'public',
    presentation: { miniProgram: 'page' },
    miniProgram: { pagePath: 'pages/login/index' },
  },
  {
    id: 'app.iam.auth.register',
    surface: 'app',
    domain: 'iam',
    capability: 'auth',
    screen: 'register',
    path: '/auth/register',
    titleKey: 'iam.auth.register.title',
    auth: 'public',
    presentation: { miniProgram: 'page' },
    miniProgram: { pagePath: 'pages/register/index' },
  },
  {
    id: 'app.iam.auth.forgot-password',
    surface: 'app',
    domain: 'iam',
    capability: 'auth',
    screen: 'forgot-password',
    path: '/auth/forgot-password',
    titleKey: 'iam.auth.forgotPassword.title',
    auth: 'public',
    presentation: { miniProgram: 'page' },
    miniProgram: { pagePath: 'pages/forgot-password/index' },
  },
  {
    id: 'app.iam.auth.oauth-callback',
    surface: 'app',
    domain: 'iam',
    capability: 'auth',
    screen: 'oauth-callback',
    path: '/auth/oauth/callback',
    titleKey: 'iam.auth.oauthCallback.title',
    auth: 'public',
    presentation: { miniProgram: 'page' },
    miniProgram: { pagePath: 'pages/oauth-callback/index' },
  },
  {
    id: 'app.iam.auth.context-selection',
    surface: 'app',
    domain: 'iam',
    capability: 'auth',
    screen: 'context-selection',
    path: '/auth/login/context',
    titleKey: 'iam.auth.contextSelection.title',
    auth: 'required',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { pagePath: 'pages/context-selection/index' },
  },
  {
    id: 'app.iam.user-center.profile',
    surface: 'app',
    domain: 'iam',
    capability: 'user-center',
    screen: 'profile',
    path: '/user/profile',
    titleKey: 'iam.userCenter.profile.title',
    auth: 'required',
    permissionHint: 'iam.self',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'app-user-center', pagePath: 'pages/profile/index' },
  },
  {
    id: 'app.iam.user-center.password',
    surface: 'app',
    domain: 'iam',
    capability: 'user-center',
    screen: 'password',
    path: '/user/password',
    titleKey: 'iam.userCenter.password.title',
    auth: 'required',
    permissionHint: 'iam.self',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'app-user-center', pagePath: 'pages/password/index' },
  },
  {
    id: 'app.iam.account-binding.list',
    surface: 'app',
    domain: 'iam',
    capability: 'account-binding',
    screen: 'list',
    path: '/user/account-binding',
    titleKey: 'iam.accountBinding.list.title',
    auth: 'required',
    permissionHint: 'iam.self',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'app-account-binding', pagePath: 'pages/list/index' },
  },
  {
    id: 'app.iam.user.list',
    surface: 'app',
    domain: 'iam',
    capability: 'user',
    screen: 'list',
    path: '/user/directory',
    titleKey: 'iam.user.list.title',
    auth: 'required',
    permissionHint: 'iam.users.read',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'app-user', pagePath: 'pages/list/index' },
  },
  {
    id: 'app.iam.tenant.overview',
    surface: 'app',
    domain: 'iam',
    capability: 'tenant',
    screen: 'overview',
    path: '/tenant',
    titleKey: 'iam.tenant.overview.title',
    auth: 'required',
    permissionHint: 'iam.tenants.read',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'app-tenant', pagePath: 'pages/overview/index' },
  },
  {
    id: 'app.iam.organization.directory',
    surface: 'app',
    domain: 'iam',
    capability: 'organization',
    screen: 'directory',
    path: '/organizations',
    titleKey: 'iam.organization.directory.title',
    auth: 'required',
    permissionHint: 'iam.organizations.read',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'app-organization', pagePath: 'pages/directory/index' },
  },
  {
    id: 'app.iam.oauth.providers',
    surface: 'app',
    domain: 'iam',
    capability: 'oauth',
    screen: 'providers',
    path: '/oauth/providers',
    titleKey: 'iam.oauth.providers.title',
    auth: 'required',
    permissionHint: 'iam.oauth.read',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'app-oauth', pagePath: 'pages/providers/index' },
  },
];

export function listIamMpRouteIds(): readonly string[] {
  return IAMMP_ROUTE_CONTRIBUTIONS.map((route) => route.id);
}

export function findIamMpRoute(id: string): IamMpRouteContribution | undefined {
  return IAMMP_ROUTE_CONTRIBUTIONS.find((route) => route.id === id);
}

export function listIamMpRoutesByCapability(
  capability: string,
): readonly IamMpRouteContribution[] {
  return IAMMP_ROUTE_CONTRIBUTIONS.filter((route) => route.capability === capability);
}
