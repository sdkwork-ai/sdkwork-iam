// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-console-cloud-account`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface ConsoleCloudAccountSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type ConsoleCloudAccountSdkPortResolver = () => ConsoleCloudAccountSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class ConsoleCloudAccountRoutes {
  /** Route id of `/console/iam/cloud-accounts`. */
  static readonly list: string = 'console.iam.cloud-account.list';
}

/** Route parameters the `console-cloud-account` pages read. */
export interface ConsoleCloudAccountRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `console-cloud-account` capability. */
export interface ConsoleCloudAccountViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface ConsoleCloudAccountListItem {
  readonly id: string;
  readonly labelKey: string;
}
