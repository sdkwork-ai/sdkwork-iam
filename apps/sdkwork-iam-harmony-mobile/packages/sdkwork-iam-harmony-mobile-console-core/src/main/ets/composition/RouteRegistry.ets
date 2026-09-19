// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Canonical IAM route identity registry of the `console` tier.
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md section 4 (the route registry
 * belongs to the tier's core package) and section 7 (route identity). `id` follows
 * `<surface>.<domain>.<capability>.<screen>` and is identical across every IAM client
 * root and every tier; only `pagePath` and `harmonyNative` are Harmony-specific.
 *
 * This registry holds the 4 `console` route(s) and imports no other package,
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

/** Every route of the `console` surface, in canonical order. */
export const iamHarmonyMobileConsoleCoreRouteContributions: RouteContribution[] = [
  {
    id: 'console.iam.tenant.overview',
    surface: 'console',
    capability: 'tenant',
    screen: 'overview',
    pagePath: 'pages/console/console-tenant/ConsoleTenantOverview',
    titleKey: 'iam.console.tenant.overview.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.tenant_console',
  },
  {
    id: 'console.iam.organization.directory',
    surface: 'console',
    capability: 'organization',
    screen: 'directory',
    pagePath: 'pages/console/console-organization/ConsoleOrganizationDirectory',
    titleKey: 'iam.console.organization.directory.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.organization_console',
  },
  {
    id: 'console.iam.account-binding.list',
    surface: 'console',
    capability: 'account-binding',
    screen: 'list',
    pagePath: 'pages/console/console-account-binding/ConsoleAccountBindingList',
    titleKey: 'iam.console.accountBinding.list.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.account_binding_console',
  },
  {
    id: 'console.iam.user-center.profile',
    surface: 'console',
    capability: 'user-center',
    screen: 'profile',
    pagePath: 'pages/console/console-user-center/ConsoleUserCenterProfile',
    titleKey: 'iam.console.userCenter.profile.title',
    auth: 'required',
    harmonyNative: 'page',
    permissionHint: 'iam.user_console',
  },
];

/** Route ids of the `console` surface, in registry order. */
export function iamHarmonyMobileConsoleCoreRouteIds(): string[] {
  return iamHarmonyMobileConsoleCoreRouteContributions.map((entry: RouteContribution) => entry.id);
}

/** Routes of one capability token, for that capability's own contribution list. */
export function iamHarmonyMobileConsoleCoreRoutesByCapability(capability: string): RouteContribution[] {
  return iamHarmonyMobileConsoleCoreRouteContributions.filter(
    (entry: RouteContribution) => entry.capability === capability,
  );
}

/** Finds one route by its cross-client route id. */
export function findIamHarmonyMobileConsoleCoreRoute(id: string): RouteContribution | undefined {
  return iamHarmonyMobileConsoleCoreRouteContributions.find((entry: RouteContribution) => entry.id === id);
}
