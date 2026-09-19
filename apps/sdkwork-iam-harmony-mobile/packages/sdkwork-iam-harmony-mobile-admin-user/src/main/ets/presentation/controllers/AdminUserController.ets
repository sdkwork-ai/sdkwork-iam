// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Controller of `sdkwork-iam-harmony-mobile-admin-user`.
 *
 * Section 3: this root's primary presentation pattern is controllers. The
 * controller owns the state transition and calls the service; it must not build an
 * SDK client or compose a request.
 */

import { AdminUserService } from '../../services/AdminUserService';
import {
  applyAdminUserFailure,
  applyAdminUserResult,
  createAdminUserState,
  type AdminUserState,
} from '../../state/AdminUserState';

/** Drives one `admin-user` screen. */
export class AdminUserController {
  private state: AdminUserState = createAdminUserState();
  private readonly service: AdminUserService;

  constructor(service: AdminUserService) {
    this.service = service;
  }

  /** Current state, for a screen that renders without subscribing. */
  current(): AdminUserState {
    return this.state;
  }

  /** Applies a resolved list of record identifiers. */
  loaded(items: string[]): AdminUserState {
    this.state = applyAdminUserResult(this.state, items);
    return this.state;
  }

  /**
   * Applies a failure.
   *
   * Takes a locale key rather than a message so the same failure renders in the
   * active locale, and so no backend detail can reach the screen through it.
   */
  failed(errorKey: string): AdminUserState {
    this.state = applyAdminUserFailure(this.state, errorKey);
    return this.state;
  }

  /** Reads the injected SDK origin through the service. */
  baseUrl(): string {
    return this.service.baseUrl();
  }
}
