// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Controller of `sdkwork-iam-harmony-mobile-admin-permission`.
 *
 * Section 3: this root's primary presentation pattern is controllers. The
 * controller owns the state transition and calls the service; it must not build an
 * SDK client or compose a request.
 */

import { AdminPermissionService } from '../../services/AdminPermissionService';
import {
  applyAdminPermissionFailure,
  applyAdminPermissionResult,
  createAdminPermissionState,
  type AdminPermissionState,
} from '../../state/AdminPermissionState';

/** Drives one `admin-permission` screen. */
export class AdminPermissionController {
  private state: AdminPermissionState = createAdminPermissionState();
  private readonly service: AdminPermissionService;

  constructor(service: AdminPermissionService) {
    this.service = service;
  }

  /** Current state, for a screen that renders without subscribing. */
  current(): AdminPermissionState {
    return this.state;
  }

  /** Applies a resolved list of record identifiers. */
  loaded(items: string[]): AdminPermissionState {
    this.state = applyAdminPermissionResult(this.state, items);
    return this.state;
  }

  /**
   * Applies a failure.
   *
   * Takes a locale key rather than a message so the same failure renders in the
   * active locale, and so no backend detail can reach the screen through it.
   */
  failed(errorKey: string): AdminPermissionState {
    this.state = applyAdminPermissionFailure(this.state, errorKey);
    return this.state;
  }

  /** Reads the injected SDK origin through the service. */
  baseUrl(): string {
    return this.service.baseUrl();
  }
}
