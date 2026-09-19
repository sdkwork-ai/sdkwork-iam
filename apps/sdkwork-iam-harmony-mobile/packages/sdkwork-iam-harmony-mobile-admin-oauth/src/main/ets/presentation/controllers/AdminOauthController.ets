// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Controller of `sdkwork-iam-harmony-mobile-admin-oauth`.
 *
 * Section 3: this root's primary presentation pattern is controllers. The
 * controller owns the state transition and calls the service; it must not build an
 * SDK client or compose a request.
 */

import { AdminOauthService } from '../../services/AdminOauthService';
import {
  applyAdminOauthFailure,
  applyAdminOauthResult,
  createAdminOauthState,
  type AdminOauthState,
} from '../../state/AdminOauthState';

/** Drives one `admin-oauth` screen. */
export class AdminOauthController {
  private state: AdminOauthState = createAdminOauthState();
  private readonly service: AdminOauthService;

  constructor(service: AdminOauthService) {
    this.service = service;
  }

  /** Current state, for a screen that renders without subscribing. */
  current(): AdminOauthState {
    return this.state;
  }

  /** Applies a resolved list of record identifiers. */
  loaded(items: string[]): AdminOauthState {
    this.state = applyAdminOauthResult(this.state, items);
    return this.state;
  }

  /**
   * Applies a failure.
   *
   * Takes a locale key rather than a message so the same failure renders in the
   * active locale, and so no backend detail can reach the screen through it.
   */
  failed(errorKey: string): AdminOauthState {
    this.state = applyAdminOauthFailure(this.state, errorKey);
    return this.state;
  }

  /** Reads the injected SDK origin through the service. */
  baseUrl(): string {
    return this.service.baseUrl();
  }
}
