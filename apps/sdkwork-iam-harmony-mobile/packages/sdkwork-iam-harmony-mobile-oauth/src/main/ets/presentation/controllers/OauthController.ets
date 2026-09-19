// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Controller of `sdkwork-iam-harmony-mobile-oauth`.
 *
 * Section 3: this root's primary presentation pattern is controllers. The
 * controller owns the state transition and calls the service; it must not build an
 * SDK client or compose a request.
 */

import { OauthService } from '../../services/OauthService';
import {
  applyOauthFailure,
  applyOauthResult,
  createOauthState,
  type OauthState,
} from '../../state/OauthState';

/** Drives one `oauth` screen. */
export class OauthController {
  private state: OauthState = createOauthState();
  private readonly service: OauthService;

  constructor(service: OauthService) {
    this.service = service;
  }

  /** Current state, for a screen that renders without subscribing. */
  current(): OauthState {
    return this.state;
  }

  /** Applies a resolved list of record identifiers. */
  loaded(items: string[]): OauthState {
    this.state = applyOauthResult(this.state, items);
    return this.state;
  }

  /**
   * Applies a failure.
   *
   * Takes a locale key rather than a message so the same failure renders in the
   * active locale, and so no backend detail can reach the screen through it.
   */
  failed(errorKey: string): OauthState {
    this.state = applyOauthFailure(this.state, errorKey);
    return this.state;
  }

  /** Reads the injected SDK origin through the service. */
  baseUrl(): string {
    return this.service.baseUrl();
  }
}
