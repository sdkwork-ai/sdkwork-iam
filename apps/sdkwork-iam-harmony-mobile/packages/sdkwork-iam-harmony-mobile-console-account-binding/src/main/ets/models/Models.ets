// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-console-account-binding`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface ConsoleAccountBindingSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type ConsoleAccountBindingSdkPortResolver = () => ConsoleAccountBindingSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class ConsoleAccountBindingRoutes {
  /** Route id of `/console/iam/account-binding`. */
  static readonly list: string = 'console.iam.account-binding.list';
}

/** Route parameters the `console-account-binding` pages read. */
export interface ConsoleAccountBindingRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `console-account-binding` capability. */
export interface ConsoleAccountBindingViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface ConsoleAccountBindingListItem {
  readonly id: string;
  readonly labelKey: string;
}
