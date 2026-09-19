// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Canonical IAM route identity registry for the sdkwork-iam-h5 **admin**
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

export type IamH5AdminRouteSurface = 'admin';

export interface IamH5AdminRouteContribution {
  id: string;
  surface: IamH5AdminRouteSurface;
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

export const IAMH5ADMIN_ROUTE_CONTRIBUTIONS: readonly IamH5AdminRouteContribution[] = [
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
    presentation: { h5Mobile: 'stack' },
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
    presentation: { h5Mobile: 'stack' },
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
    presentation: { h5Mobile: 'stack' },
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
    presentation: { h5Mobile: 'stack' },
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
    presentation: { h5Mobile: 'stack' },
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
    presentation: { h5Mobile: 'stack' },
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
    presentation: { h5Mobile: 'stack' },
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
    presentation: { h5Mobile: 'stack' },
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
    presentation: { h5Mobile: 'stack' },
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
    presentation: { h5Mobile: 'stack' },
  },
];

export function listIamH5AdminRouteIds(): readonly string[] {
  return IAMH5ADMIN_ROUTE_CONTRIBUTIONS.map((route) => route.id);
}

export function findIamH5AdminRoute(id: string): IamH5AdminRouteContribution | undefined {
  return IAMH5ADMIN_ROUTE_CONTRIBUTIONS.find((route) => route.id === id);
}

export function listIamH5AdminRoutesByCapability(
  capability: string,
): readonly IamH5AdminRouteContribution[] {
  return IAMH5ADMIN_ROUTE_CONTRIBUTIONS.filter((route) => route.capability === capability);
}
