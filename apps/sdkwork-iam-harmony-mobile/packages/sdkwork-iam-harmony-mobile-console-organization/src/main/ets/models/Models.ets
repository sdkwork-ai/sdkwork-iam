// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-console-organization`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface ConsoleOrganizationSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type ConsoleOrganizationSdkPortResolver = () => ConsoleOrganizationSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class ConsoleOrganizationRoutes {
  /** Route id of `/console/iam/organizations`. */
  static readonly directory: string = 'console.iam.organization.directory';
}

/** Route parameters the `console-organization` pages read. */
export interface ConsoleOrganizationRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `console-organization` capability. */
export interface ConsoleOrganizationViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface ConsoleOrganizationListItem {
  readonly id: string;
  readonly labelKey: string;
}
