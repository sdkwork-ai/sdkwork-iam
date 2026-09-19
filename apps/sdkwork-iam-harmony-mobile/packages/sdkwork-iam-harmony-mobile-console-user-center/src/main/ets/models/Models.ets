// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-console-user-center`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface ConsoleUserCenterSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type ConsoleUserCenterSdkPortResolver = () => ConsoleUserCenterSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class ConsoleUserCenterRoutes {
  /** Route id of `/console/iam/user`. */
  static readonly profile: string = 'console.iam.user-center.profile';
}

/** Route parameters the `console-user-center` pages read. */
export interface ConsoleUserCenterRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `console-user-center` capability. */
export interface ConsoleUserCenterViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface ConsoleUserCenterListItem {
  readonly id: string;
  readonly labelKey: string;
}
