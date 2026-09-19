// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Controller of `sdkwork-iam-harmony-mobile-user`.
 *
 * Section 3: this root's primary presentation pattern is controllers. The
 * controller owns the state transition and calls the service; it must not build an
 * SDK client or compose a request.
 */

import { UserService } from '../../services/UserService';
import {
  applyUserFailure,
  applyUserResult,
  createUserState,
  type UserState,
} from '../../state/UserState';

/** Drives one `user` screen. */
export class UserController {
  private state: UserState = createUserState();
  private readonly service: UserService;

  constructor(service: UserService) {
    this.service = service;
  }

  /** Current state, for a screen that renders without subscribing. */
  current(): UserState {
    return this.state;
  }

  /** Applies a resolved list of record identifiers. */
  loaded(items: string[]): UserState {
    this.state = applyUserResult(this.state, items);
    return this.state;
  }

  /**
   * Applies a failure.
   *
   * Takes a locale key rather than a message so the same failure renders in the
   * active locale, and so no backend detail can reach the screen through it.
   */
  failed(errorKey: string): UserState {
    this.state = applyUserFailure(this.state, errorKey);
    return this.state;
  }

  /** Reads the injected SDK origin through the service. */
  baseUrl(): string {
    return this.service.baseUrl();
  }
}
