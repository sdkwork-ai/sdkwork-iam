// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-tenant`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface TenantSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type TenantSdkPortResolver = () => TenantSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class TenantRoutes {
  /** Route id of `/tenant`. */
  static readonly overview: string = 'app.iam.tenant.overview';
}

/** Route parameters the `tenant` pages read. */
export interface TenantRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `tenant` capability. */
export interface TenantViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface TenantListItem {
  readonly id: string;
  readonly labelKey: string;
}
