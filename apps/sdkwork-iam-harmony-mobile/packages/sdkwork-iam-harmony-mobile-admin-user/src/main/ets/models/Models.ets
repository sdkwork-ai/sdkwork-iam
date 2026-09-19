// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-admin-user`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface AdminUserSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type AdminUserSdkPortResolver = () => AdminUserSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class AdminUserRoutes {
  /** Route id of `/admin/iam/users`. */
  static readonly list: string = 'admin.iam.user.list';
}

/** Route parameters the `admin-user` pages read. */
export interface AdminUserRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `admin-user` capability. */
export interface AdminUserViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface AdminUserListItem {
  readonly id: string;
  readonly labelKey: string;
}
