// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Canonical IAM route identity registry for the sdkwork-iam-mini-program **admin**
 * surface.
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md §7 (route identity) and §4
 * (the route registry belongs to the tier's core package). `id` follows
 * `<surface>.<domain>.<capability>.<screen>` and is identical across every IAM
 * client root and every tier; only `presentation` and the mini program
 * placement are platform-specific.
 *
 * This registry holds the 10 `admin`-surface route(s). The other tiers
 * own theirs in their own core package, so no tier has to depend on another.
 */

export type IamMpAdminRouteSurface = 'admin';

export interface IamMpAdminRouteContribution {
  id: string;
  surface: IamMpAdminRouteSurface;
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

export const IAMMPADMIN_ROUTE_CONTRIBUTIONS: readonly IamMpAdminRouteContribution[] = [
  {
    id: 'admin.iam.oauth.providers',
    surface: 'admin',
    domain: 'iam',
    capability: 'oauth',
    screen: 'providers',
    path: '/admin/iam/oauth',
    titleKey: 'iam.admin.oauth.providers.title',
    auth: 'required',
    permissionHint: 'iam.oauth',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'admin-oauth', pagePath: 'pages/providers/index' },
  },
  {
    id: 'admin.iam.tenant.list',
    surface: 'admin',
    domain: 'iam',
    capability: 'tenant',
    screen: 'list',
    path: '/admin/iam/tenants',
    titleKey: 'iam.admin.tenant.list.title',
    auth: 'required',
    permissionHint: 'iam.tenants',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'admin-tenant', pagePath: 'pages/list/index' },
  },
  {
    id: 'admin.iam.organization.tree',
    surface: 'admin',
    domain: 'iam',
    capability: 'organization',
    screen: 'tree',
    path: '/admin/iam/organizations',
    titleKey: 'iam.admin.organization.tree.title',
    auth: 'required',
    permissionHint: 'iam.organizations',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'admin-organization', pagePath: 'pages/tree/index' },
  },
  {
    id: 'admin.iam.permission.roles',
    surface: 'admin',
    domain: 'iam',
    capability: 'permission',
    screen: 'roles',
    path: '/admin/iam/roles',
    titleKey: 'iam.admin.permission.roles.title',
    auth: 'required',
    permissionHint: 'iam.roles',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'admin-permission', pagePath: 'pages/roles/index' },
  },
  {
    id: 'admin.iam.permission.permissions',
    surface: 'admin',
    domain: 'iam',
    capability: 'permission',
    screen: 'permissions',
    path: '/admin/iam/permissions',
    titleKey: 'iam.admin.permission.permissions.title',
    auth: 'required',
    permissionHint: 'iam.permissions',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'admin-permission', pagePath: 'pages/permissions/index' },
  },
  {
    id: 'admin.iam.permission.policies',
    surface: 'admin',
    domain: 'iam',
    capability: 'permission',
    screen: 'policies',
    path: '/admin/iam/policies',
    titleKey: 'iam.admin.permission.policies.title',
    auth: 'required',
    permissionHint: 'iam.policies',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'admin-permission', pagePath: 'pages/policies/index' },
  },
  {
    id: 'admin.iam.permission.authorizations',
    surface: 'admin',
    domain: 'iam',
    capability: 'permission',
    screen: 'authorizations',
    path: '/admin/iam/authorizations',
    titleKey: 'iam.admin.permission.authorizations.title',
    auth: 'required',
    permissionHint: 'iam.role_bindings',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'admin-permission', pagePath: 'pages/authorizations/index' },
  },
  {
    id: 'admin.iam.account-binding.list',
    surface: 'admin',
    domain: 'iam',
    capability: 'account-binding',
    screen: 'list',
    path: '/admin/iam/account-binding',
    titleKey: 'iam.admin.accountBinding.list.title',
    auth: 'required',
    permissionHint: 'iam.account_binding',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'admin-account-binding', pagePath: 'pages/list/index' },
  },
  {
    id: 'admin.iam.user.list',
    surface: 'admin',
    domain: 'iam',
    capability: 'user',
    screen: 'list',
    path: '/admin/iam/users',
    titleKey: 'iam.admin.user.list.title',
    auth: 'required',
    permissionHint: 'iam.users',
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'admin-user', pagePath: 'pages/list/index' },
  },
  {
    id: 'admin.iam.audit.events',
    surface: 'admin',
    domain: 'iam',
    capability: 'audit',
    screen: 'events',
    path: '/admin/iam/audit',
    titleKey: 'iam.admin.audit.events.title',
    auth: 'required',
    permissionHint: 'iam.audit_events',
    additionalPermissionHints: ['iam.security_events'],
    presentation: { miniProgram: 'subpackagePage' },
    miniProgram: { subpackage: 'admin-audit', pagePath: 'pages/events/index' },
  },
];

export function listIamMpAdminRouteIds(): readonly string[] {
  return IAMMPADMIN_ROUTE_CONTRIBUTIONS.map((route) => route.id);
}

export function findIamMpAdminRoute(id: string): IamMpAdminRouteContribution | undefined {
  return IAMMPADMIN_ROUTE_CONTRIBUTIONS.find((route) => route.id === id);
}

export function listIamMpAdminRoutesByCapability(
  capability: string,
): readonly IamMpAdminRouteContribution[] {
  return IAMMPADMIN_ROUTE_CONTRIBUTIONS.filter((route) => route.capability === capability);
}
