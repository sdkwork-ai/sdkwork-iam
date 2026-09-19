// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-admin-oauth`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface AdminOauthSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type AdminOauthSdkPortResolver = () => AdminOauthSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class AdminOauthRoutes {
  /** Route id of `/admin/iam/oauth`. */
  static readonly providers: string = 'admin.iam.oauth.providers';
}

/** Route parameters the `admin-oauth` pages read. */
export interface AdminOauthRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `admin-oauth` capability. */
export interface AdminOauthViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface AdminOauthListItem {
  readonly id: string;
  readonly labelKey: string;
}
