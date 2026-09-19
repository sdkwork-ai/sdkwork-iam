// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-user-center`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface UserCenterSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type UserCenterSdkPortResolver = () => UserCenterSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class UserCenterRoutes {
  /** Route id of `/user/profile`. */
  static readonly profile: string = 'app.iam.user-center.profile';

  /** Route id of `/user/password`. */
  static readonly password: string = 'app.iam.user-center.password';
}

/** Route parameters the `user-center` pages read. */
export interface UserCenterRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `user-center` capability. */
export interface UserCenterViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface UserCenterListItem {
  readonly id: string;
  readonly labelKey: string;
}
