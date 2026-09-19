// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Use-case orchestration of `sdkwork-iam-harmony-mobile-auth`.
 *
 * Section 6: this package consumes `/app/v3/api` through the generated
 * ArkTS app SDK client that the bootstrap injected. The service receives its
 * collaborators through the resolver, so it never constructs a client and never
 * composes raw HTTP or manual authorization headers.
 */

import { type AuthSdkPort, type AuthSdkPortResolver } from '../models/Models';

/** Physical paths this package's routes resolve to on HarmonyOS. */
export const IAM_HARMONY_AUTH_ROUTE_PATHS: Record<string, string> = {
  'app.iam.auth.login': '/auth/login',
  'app.iam.auth.register': '/auth/register',
  'app.iam.auth.forgot-password': '/auth/forgot-password',
  'app.iam.auth.oauth-callback': '/auth/oauth/callback',
  'app.iam.auth.context-selection': '/auth/login/context',
};

/** Validation, route resolution and error mapping of the `auth` capability. */
export class AuthService {
  private readonly resolvePort: AuthSdkPortResolver;

  constructor(resolvePort: AuthSdkPortResolver) {
    this.resolvePort = resolvePort;
  }

  /**
   * Maps a physical HarmonyOS page path back to its cross-client route id.
   *
   * Section 8 resolves a deep link to a route id before converting it into a
   * navigation action, so the reverse lookup lives beside the forward one.
   */
  routeIdForPagePath(pagePath: string): string | undefined {
    let found: string | undefined = undefined;
    // Iterated by key rather than through `Object.entries` destructuring: ArkTS
    // rejects a destructuring declaration binding, which the ArkUI template packages
    // avoid everywhere.
    for (const id of Object.keys(IAM_HARMONY_AUTH_ROUTE_PATHS)) {
      if (IAM_HARMONY_AUTH_ROUTE_PATHS[id] === pagePath) {
        found = id;
      }
    }
    return found;
  }

  /**
   * Reads the injected SDK base URL.
   *
   * Deliberately returns just the origin: the generated transport owns API path
   * prefixing (`ENVIRONMENT_SPEC.md` section 5.1.4.1), so a service that appended
   * `/app/v3/api` here would double it at request time.
   */
  baseUrl(): string {
    return this.resolvePort().baseUrl;
  }
}
