// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-organization`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface OrganizationSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type OrganizationSdkPortResolver = () => OrganizationSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class OrganizationRoutes {
  /** Route id of `/organizations`. */
  static readonly directory: string = 'app.iam.organization.directory';
}

/** Route parameters the `organization` pages read. */
export interface OrganizationRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `organization` capability. */
export interface OrganizationViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface OrganizationListItem {
  readonly id: string;
  readonly labelKey: string;
}
