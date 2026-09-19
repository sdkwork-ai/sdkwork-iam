// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Controller of `sdkwork-iam-harmony-mobile-auth`.
 *
 * Section 3: this root's primary presentation pattern is controllers. The
 * controller owns the state transition and calls the service; it must not build an
 * SDK client or compose a request.
 */

import { AuthService } from '../../services/AuthService';
import {
  applyAuthFailure,
  applyAuthResult,
  createAuthState,
  type AuthState,
} from '../../state/AuthState';

/** Drives one `auth` screen. */
export class AuthController {
  private state: AuthState = createAuthState();
  private readonly service: AuthService;

  constructor(service: AuthService) {
    this.service = service;
  }

  /** Current state, for a screen that renders without subscribing. */
  current(): AuthState {
    return this.state;
  }

  /** Applies a resolved list of record identifiers. */
  loaded(items: string[]): AuthState {
    this.state = applyAuthResult(this.state, items);
    return this.state;
  }

  /**
   * Applies a failure.
   *
   * Takes a locale key rather than a message so the same failure renders in the
   * active locale, and so no backend detail can reach the screen through it.
   */
  failed(errorKey: string): AuthState {
    this.state = applyAuthFailure(this.state, errorKey);
    return this.state;
  }

  /** Reads the injected SDK origin through the service. */
  baseUrl(): string {
    return this.service.baseUrl();
  }
}
