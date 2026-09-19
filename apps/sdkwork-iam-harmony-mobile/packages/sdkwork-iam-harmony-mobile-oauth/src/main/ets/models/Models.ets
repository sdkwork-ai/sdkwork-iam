// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-oauth`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface OauthSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type OauthSdkPortResolver = () => OauthSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class OauthRoutes {
  /** Route id of `/oauth/providers`. */
  static readonly providers: string = 'app.iam.oauth.providers';
}

/** Route parameters the `oauth` pages read. */
export interface OauthRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `oauth` capability. */
export interface OauthViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface OauthListItem {
  readonly id: string;
  readonly labelKey: string;
}
