// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-user`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface UserSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type UserSdkPortResolver = () => UserSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class UserRoutes {
  /** Route id of `/user/directory`. */
  static readonly list: string = 'app.iam.user.list';
}

/** Route parameters the `user` pages read. */
export interface UserRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `user` capability. */
export interface UserViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface UserListItem {
  readonly id: string;
  readonly labelKey: string;
}
