// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Controller of `sdkwork-iam-harmony-mobile-admin-account-binding`.
 *
 * Section 3: this root's primary presentation pattern is controllers. The
 * controller owns the state transition and calls the service; it must not build an
 * SDK client or compose a request.
 */

import { AdminAccountBindingService } from '../../services/AdminAccountBindingService';
import {
  applyAdminAccountBindingFailure,
  applyAdminAccountBindingResult,
  createAdminAccountBindingState,
  type AdminAccountBindingState,
} from '../../state/AdminAccountBindingState';

/** Drives one `admin-account-binding` screen. */
export class AdminAccountBindingController {
  private state: AdminAccountBindingState = createAdminAccountBindingState();
  private readonly service: AdminAccountBindingService;

  constructor(service: AdminAccountBindingService) {
    this.service = service;
  }

  /** Current state, for a screen that renders without subscribing. */
  current(): AdminAccountBindingState {
    return this.state;
  }

  /** Applies a resolved list of record identifiers. */
  loaded(items: string[]): AdminAccountBindingState {
    this.state = applyAdminAccountBindingResult(this.state, items);
    return this.state;
  }

  /**
   * Applies a failure.
   *
   * Takes a locale key rather than a message so the same failure renders in the
   * active locale, and so no backend detail can reach the screen through it.
   */
  failed(errorKey: string): AdminAccountBindingState {
    this.state = applyAdminAccountBindingFailure(this.state, errorKey);
    return this.state;
  }

  /** Reads the injected SDK origin through the service. */
  baseUrl(): string {
    return this.service.baseUrl();
  }
}
