// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Canonical IAM route identity registry for the sdkwork-iam-mini-program **console**
 * surface.
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md §7 (route identity) and §4
 * (the route registry belongs to the tier's core package). `id` follows
 * `<surface>.<domain>.<capability>.<screen>` and is identical across every IAM
 * client root and every tier; only `presentation` and the mini program
 * placement are platform-specific.
 *
 * This registry holds the 4 `console`-surface route(s). The other tiers
 * own theirs in their own core package, so no tier has to depend on another.
 */

export type IamMpConsoleRouteSurface = 'console';

export interface IamMpConsoleRouteContribution {
  id: string;
  surface: IamMpConsoleRouteSurface;
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

export const IAMMPCONSOLE_ROUTE_CONTRIBUTIONS: readonly IamMpConsoleRouteContribution[] = [
  {
    id: 'console.iam.tenant.overview',
    surface: 'console',
    domain: 'iam',
    capability: 'tenant',
    screen: 'overview',
    path: '/console/iam/tenant',
    titleKey: 'iam.console.tenant.overview.title',
    auth: 'required',
    permissionHint: 'iam.tenant_console',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'console-tenant', pagePath: 'pages/overview/index' },
  },
  {
    id: 'console.iam.organization.directory',
    surface: 'console',
    domain: 'iam',
    capability: 'organization',
    screen: 'directory',
    path: '/console/iam/organizations',
    titleKey: 'iam.console.organization.directory.title',
    auth: 'required',
    permissionHint: 'iam.organization_console',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'console-organization', pagePath: 'pages/directory/index' },
  },
  {
    id: 'console.iam.account-binding.list',
    surface: 'console',
    domain: 'iam',
    capability: 'account-binding',
    screen: 'list',
    path: '/console/iam/account-binding',
    titleKey: 'iam.console.accountBinding.list.title',
    auth: 'required',
    permissionHint: 'iam.account_binding_console',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'console-account-binding', pagePath: 'pages/list/index' },
  },
  {
    id: 'console.iam.user-center.profile',
    surface: 'console',
    domain: 'iam',
    capability: 'user-center',
    screen: 'profile',
    path: '/console/iam/user',
    titleKey: 'iam.console.userCenter.profile.title',
    auth: 'required',
    permissionHint: 'iam.user_console',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'console-user-center', pagePath: 'pages/profile/index' },
  },
];

export function listIamMpConsoleRouteIds(): readonly string[] {
  return IAMMPCONSOLE_ROUTE_CONTRIBUTIONS.map((route) => route.id);
}

export function findIamMpConsoleRoute(id: string): IamMpConsoleRouteContribution | undefined {
  return IAMMPCONSOLE_ROUTE_CONTRIBUTIONS.find((route) => route.id === id);
}

export function listIamMpConsoleRoutesByCapability(
  capability: string,
): readonly IamMpConsoleRouteContribution[] {
  return IAMMPCONSOLE_ROUTE_CONTRIBUTIONS.filter((route) => route.capability === capability);
}
