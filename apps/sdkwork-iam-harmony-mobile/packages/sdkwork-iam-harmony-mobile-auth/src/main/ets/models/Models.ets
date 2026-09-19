// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-auth`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface AuthSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type AuthSdkPortResolver = () => AuthSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class AuthRoutes {
  /** Route id of `/auth/login`. */
  static readonly login: string = 'app.iam.auth.login';

  /** Route id of `/auth/register`. */
  static readonly register: string = 'app.iam.auth.register';

  /** Route id of `/auth/forgot-password`. */
  static readonly forgot-password: string = 'app.iam.auth.forgot-password';

  /** Route id of `/auth/oauth/callback`. */
  static readonly oauth-callback: string = 'app.iam.auth.oauth-callback';

  /** Route id of `/auth/login/context`. */
  static readonly context-selection: string = 'app.iam.auth.context-selection';
}

/** Route parameters the `auth` pages read. */
export interface AuthRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `auth` capability. */
export interface AuthViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface AuthListItem {
  readonly id: string;
  readonly labelKey: string;
}
