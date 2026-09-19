// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Controller of `sdkwork-iam-harmony-mobile-user-center`.
 *
 * Section 3: this root's primary presentation pattern is controllers. The
 * controller owns the state transition and calls the service; it must not build an
 * SDK client or compose a request.
 */

import { UserCenterService } from '../../services/UserCenterService';
import {
  applyUserCenterFailure,
  applyUserCenterResult,
  createUserCenterState,
  type UserCenterState,
} from '../../state/UserCenterState';

/** Drives one `user-center` screen. */
export class UserCenterController {
  private state: UserCenterState = createUserCenterState();
  private readonly service: UserCenterService;

  constructor(service: UserCenterService) {
    this.service = service;
  }

  /** Current state, for a screen that renders without subscribing. */
  current(): UserCenterState {
    return this.state;
  }

  /** Applies a resolved list of record identifiers. */
  loaded(items: string[]): UserCenterState {
    this.state = applyUserCenterResult(this.state, items);
    return this.state;
  }

  /**
   * Applies a failure.
   *
   * Takes a locale key rather than a message so the same failure renders in the
   * active locale, and so no backend detail can reach the screen through it.
   */
  failed(errorKey: string): UserCenterState {
    this.state = applyUserCenterFailure(this.state, errorKey);
    return this.state;
  }

  /** Reads the injected SDK origin through the service. */
  baseUrl(): string {
    return this.service.baseUrl();
  }
}
