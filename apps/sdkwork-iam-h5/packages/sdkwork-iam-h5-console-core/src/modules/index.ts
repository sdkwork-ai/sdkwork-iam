// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Canonical IAM route identity registry for the sdkwork-iam-h5 **console**
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

export type IamH5ConsoleRouteSurface = 'console';

export interface IamH5ConsoleRouteContribution {
  id: string;
  surface: IamH5ConsoleRouteSurface;
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

export const IAMH5CONSOLE_ROUTE_CONTRIBUTIONS: readonly IamH5ConsoleRouteContribution[] = [
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
    presentation: { h5Mobile: 'stack' },
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
    presentation: { h5Mobile: 'stack' },
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
    presentation: { h5Mobile: 'stack' },
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
    presentation: { h5Mobile: 'stack' },
  },
];

export function listIamH5ConsoleRouteIds(): readonly string[] {
  return IAMH5CONSOLE_ROUTE_CONTRIBUTIONS.map((route) => route.id);
}

export function findIamH5ConsoleRoute(id: string): IamH5ConsoleRouteContribution | undefined {
  return IAMH5CONSOLE_ROUTE_CONTRIBUTIONS.find((route) => route.id === id);
}

export function listIamH5ConsoleRoutesByCapability(
  capability: string,
): readonly IamH5ConsoleRouteContribution[] {
  return IAMH5CONSOLE_ROUTE_CONTRIBUTIONS.filter((route) => route.capability === capability);
}
