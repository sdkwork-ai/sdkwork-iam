// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Controller of `sdkwork-iam-harmony-mobile-admin-organization`.
 *
 * Section 3: this root's primary presentation pattern is controllers. The
 * controller owns the state transition and calls the service; it must not build an
 * SDK client or compose a request.
 */

import { AdminOrganizationService } from '../../services/AdminOrganizationService';
import {
  applyAdminOrganizationFailure,
  applyAdminOrganizationResult,
  createAdminOrganizationState,
  type AdminOrganizationState,
} from '../../state/AdminOrganizationState';

/** Drives one `admin-organization` screen. */
export class AdminOrganizationController {
  private state: AdminOrganizationState = createAdminOrganizationState();
  private readonly service: AdminOrganizationService;

  constructor(service: AdminOrganizationService) {
    this.service = service;
  }

  /** Current state, for a screen that renders without subscribing. */
  current(): AdminOrganizationState {
    return this.state;
  }

  /** Applies a resolved list of record identifiers. */
  loaded(items: string[]): AdminOrganizationState {
    this.state = applyAdminOrganizationResult(this.state, items);
    return this.state;
  }

  /**
   * Applies a failure.
   *
   * Takes a locale key rather than a message so the same failure renders in the
   * active locale, and so no backend detail can reach the screen through it.
   */
  failed(errorKey: string): AdminOrganizationState {
    this.state = applyAdminOrganizationFailure(this.state, errorKey);
    return this.state;
  }

  /** Reads the injected SDK origin through the service. */
  baseUrl(): string {
    return this.service.baseUrl();
  }
}
