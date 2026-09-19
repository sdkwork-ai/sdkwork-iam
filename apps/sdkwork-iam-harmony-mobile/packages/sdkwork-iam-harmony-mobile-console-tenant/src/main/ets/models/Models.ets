// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-console-tenant`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface ConsoleTenantSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type ConsoleTenantSdkPortResolver = () => ConsoleTenantSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class ConsoleTenantRoutes {
  /** Route id of `/console/iam/tenant`. */
  static readonly overview: string = 'console.iam.tenant.overview';
}

/** Route parameters the `console-tenant` pages read. */
export interface ConsoleTenantRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `console-tenant` capability. */
export interface ConsoleTenantViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface ConsoleTenantListItem {
  readonly id: string;
  readonly labelKey: string;
}
