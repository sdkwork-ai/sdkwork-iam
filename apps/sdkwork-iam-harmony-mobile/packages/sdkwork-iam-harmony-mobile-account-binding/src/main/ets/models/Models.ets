// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-account-binding`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface AccountBindingSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type AccountBindingSdkPortResolver = () => AccountBindingSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class AccountBindingRoutes {
  /** Route id of `/user/account-binding`. */
  static readonly list: string = 'app.iam.account-binding.list';
}

/** Route parameters the `account-binding` pages read. */
export interface AccountBindingRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `account-binding` capability. */
export interface AccountBindingViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface AccountBindingListItem {
  readonly id: string;
  readonly labelKey: string;
}
