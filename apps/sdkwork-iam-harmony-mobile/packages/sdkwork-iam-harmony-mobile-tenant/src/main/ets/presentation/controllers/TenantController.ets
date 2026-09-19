// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Controller of `sdkwork-iam-harmony-mobile-tenant`.
 *
 * Section 3: this root's primary presentation pattern is controllers. The
 * controller owns the state transition and calls the service; it must not build an
 * SDK client or compose a request.
 */

import { TenantService } from '../../services/TenantService';
import {
  applyTenantFailure,
  applyTenantResult,
  createTenantState,
  type TenantState,
} from '../../state/TenantState';

/** Drives one `tenant` screen. */
export class TenantController {
  private state: TenantState = createTenantState();
  private readonly service: TenantService;

  constructor(service: TenantService) {
    this.service = service;
  }

  /** Current state, for a screen that renders without subscribing. */
  current(): TenantState {
    return this.state;
  }

  /** Applies a resolved list of record identifiers. */
  loaded(items: string[]): TenantState {
    this.state = applyTenantResult(this.state, items);
    return this.state;
  }

  /**
   * Applies a failure.
   *
   * Takes a locale key rather than a message so the same failure renders in the
   * active locale, and so no backend detail can reach the screen through it.
   */
  failed(errorKey: string): TenantState {
    this.state = applyTenantFailure(this.state, errorKey);
    return this.state;
  }

  /** Reads the injected SDK origin through the service. */
  baseUrl(): string {
    return this.service.baseUrl();
  }
}
