// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-admin-organization`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface AdminOrganizationSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type AdminOrganizationSdkPortResolver = () => AdminOrganizationSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class AdminOrganizationRoutes {
  /** Route id of `/admin/iam/organizations`. */
  static readonly tree: string = 'admin.iam.organization.tree';
}

/** Route parameters the `admin-organization` pages read. */
export interface AdminOrganizationRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `admin-organization` capability. */
export interface AdminOrganizationViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface AdminOrganizationListItem {
  readonly id: string;
  readonly labelKey: string;
}
