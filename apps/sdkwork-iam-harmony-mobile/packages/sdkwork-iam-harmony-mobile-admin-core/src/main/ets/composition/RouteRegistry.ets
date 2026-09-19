// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Canonical IAM route identity registry of the `admin` tier.
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md section 4 (the route registry
 * belongs to the tier's core package) and section 7 (route identity). `id` follows
 * `<surface>.<domain>.<capability>.<screen>` and is identical across every IAM client
 * root and every tier; only `pagePath` and `harmonyNative` are Harmony-specific.
 *
 * This registry holds the 10 `admin` route(s) and imports no other package,
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

/** Every route of the `admin` surface, in canonical order. */
export const iamHarmonyMobileAdminCoreRouteContributions: RouteContribution[] = [
  {
    id: 'admin.iam.oauth.providers',
    surface: 'admin',
    capability: 'oauth',
    screen: 'providers',
    pagePath: 'pages/admin/admin-oauth/AdminOauthProviders',
    titleKey: 'iam.admin.oauth.providers.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.oauth',
  },
  {
    id: 'admin.iam.tenant.list',
    surface: 'admin',
    capability: 'tenant',
    screen: 'list',
    pagePath: 'pages/admin/admin-tenant/AdminTenantList',
    titleKey: 'iam.admin.tenant.list.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.tenants',
  },
  {
    id: 'admin.iam.organization.tree',
    surface: 'admin',
    capability: 'organization',
    screen: 'tree',
    pagePath: 'pages/admin/admin-organization/AdminOrganizationTree',
    titleKey: 'iam.admin.organization.tree.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.organizations',
  },
  {
    id: 'admin.iam.permission.roles',
    surface: 'admin',
    capability: 'permission',
    screen: 'roles',
    pagePath: 'pages/admin/admin-permission/AdminPermissionRoles',
    titleKey: 'iam.admin.permission.roles.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.roles',
  },
  {
    id: 'admin.iam.permission.permissions',
    surface: 'admin',
    capability: 'permission',
    screen: 'permissions',
    pagePath: 'pages/admin/admin-permission/AdminPermissionPermissions',
    titleKey: 'iam.admin.permission.permissions.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.permissions',
  },
  {
    id: 'admin.iam.permission.policies',
    surface: 'admin',
    capability: 'permission',
    screen: 'policies',
    pagePath: 'pages/admin/admin-permission/AdminPermissionPolicies',
    titleKey: 'iam.admin.permission.policies.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.policies',
  },
  {
    id: 'admin.iam.permission.authorizations',
    surface: 'admin',
    capability: 'permission',
    screen: 'authorizations',
    pagePath: 'pages/admin/admin-permission/AdminPermissionAuthorizations',
    titleKey: 'iam.admin.permission.authorizations.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.role_bindings',
  },
  {
    id: 'admin.iam.account-binding.list',
    surface: 'admin',
    capability: 'account-binding',
    screen: 'list',
    pagePath: 'pages/admin/admin-account-binding/AdminAccountBindingList',
    titleKey: 'iam.admin.accountBinding.list.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.account_binding',
  },
  {
    id: 'admin.iam.user.list',
    surface: 'admin',
    capability: 'user',
    screen: 'list',
    pagePath: 'pages/admin/admin-user/AdminUserList',
    titleKey: 'iam.admin.user.list.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.users',
  },
  {
    id: 'admin.iam.audit.events',
    surface: 'admin',
    capability: 'audit',
    screen: 'events',
    pagePath: 'pages/admin/admin-audit/AdminAuditEvents',
    titleKey: 'iam.admin.audit.events.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.audit_events',
    additionalPermissionHints: ['iam.security_events'],
  },
];

/** Route ids of the `admin` surface, in registry order. */
export function iamHarmonyMobileAdminCoreRouteIds(): string[] {
  return iamHarmonyMobileAdminCoreRouteContributions.map((entry: RouteContribution) => entry.id);
}

/** Routes of one capability token, for that capability's own contribution list. */
export function iamHarmonyMobileAdminCoreRoutesByCapability(capability: string): RouteContribution[] {
  return iamHarmonyMobileAdminCoreRouteContributions.filter(
    (entry: RouteContribution) => entry.capability === capability,
  );
}

/** Finds one route by its cross-client route id. */
export function findIamHarmonyMobileAdminCoreRoute(id: string): RouteContribution | undefined {
  return iamHarmonyMobileAdminCoreRouteContributions.find((entry: RouteContribution) => entry.id === id);
}
