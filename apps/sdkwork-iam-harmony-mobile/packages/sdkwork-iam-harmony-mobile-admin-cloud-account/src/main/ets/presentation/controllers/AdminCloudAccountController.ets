// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Controller of `sdkwork-iam-harmony-mobile-admin-cloud-account`.
 *
 * Section 3: this root's primary presentation pattern is controllers. The
 * controller owns the state transition and calls the service; it must not build an
 * SDK client or compose a request.
 */

import { AdminCloudAccountService } from '../../services/AdminCloudAccountService';
import {
  applyAdminCloudAccountFailure,
  applyAdminCloudAccountResult,
  createAdminCloudAccountState,
  type AdminCloudAccountState,
} from '../../state/AdminCloudAccountState';

/** Drives one `admin-cloud-account` screen. */
export class AdminCloudAccountController {
  private state: AdminCloudAccountState = createAdminCloudAccountState();
  private readonly service: AdminCloudAccountService;

  constructor(service: AdminCloudAccountService) {
    this.service = service;
  }

  /** Current state, for a screen that renders without subscribing. */
  current(): AdminCloudAccountState {
    return this.state;
  }

  /** Applies a resolved list of record identifiers. */
  loaded(items: string[]): AdminCloudAccountState {
    this.state = applyAdminCloudAccountResult(this.state, items);
    return this.state;
  }

  /**
   * Applies a failure.
   *
   * Takes a locale key rather than a message so the same failure renders in the
   * active locale, and so no backend detail can reach the screen through it.
   */
  failed(errorKey: string): AdminCloudAccountState {
    this.state = applyAdminCloudAccountFailure(this.state, errorKey);
    return this.state;
  }

  /** Reads the injected SDK origin through the service. */
  baseUrl(): string {
    return this.service.baseUrl();
  }
}
