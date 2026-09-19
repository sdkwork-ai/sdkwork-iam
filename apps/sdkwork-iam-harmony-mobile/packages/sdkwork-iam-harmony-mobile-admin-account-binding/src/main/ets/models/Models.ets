// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-admin-account-binding`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface AdminAccountBindingSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type AdminAccountBindingSdkPortResolver = () => AdminAccountBindingSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class AdminAccountBindingRoutes {
  /** Route id of `/admin/iam/account-binding`. */
  static readonly list: string = 'admin.iam.account-binding.list';
}

/** Route parameters the `admin-account-binding` pages read. */
export interface AdminAccountBindingRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `admin-account-binding` capability. */
export interface AdminAccountBindingViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface AdminAccountBindingListItem {
  readonly id: string;
  readonly labelKey: string;
}
