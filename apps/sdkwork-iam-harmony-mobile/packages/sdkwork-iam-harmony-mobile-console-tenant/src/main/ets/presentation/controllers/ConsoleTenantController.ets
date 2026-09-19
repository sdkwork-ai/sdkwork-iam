// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Controller of `sdkwork-iam-harmony-mobile-console-tenant`.
 *
 * Section 3: this root's primary presentation pattern is controllers. The
 * controller owns the state transition and calls the service; it must not build an
 * SDK client or compose a request.
 */

import { ConsoleTenantService } from '../../services/ConsoleTenantService';
import {
  applyConsoleTenantFailure,
  applyConsoleTenantResult,
  createConsoleTenantState,
  type ConsoleTenantState,
} from '../../state/ConsoleTenantState';

/** Drives one `console-tenant` screen. */
export class ConsoleTenantController {
  private state: ConsoleTenantState = createConsoleTenantState();
  private readonly service: ConsoleTenantService;

  constructor(service: ConsoleTenantService) {
    this.service = service;
  }

  /** Current state, for a screen that renders without subscribing. */
  current(): ConsoleTenantState {
    return this.state;
  }

  /** Applies a resolved list of record identifiers. */
  loaded(items: string[]): ConsoleTenantState {
    this.state = applyConsoleTenantResult(this.state, items);
    return this.state;
  }

  /**
   * Applies a failure.
   *
   * Takes a locale key rather than a message so the same failure renders in the
   * active locale, and so no backend detail can reach the screen through it.
   */
  failed(errorKey: string): ConsoleTenantState {
    this.state = applyConsoleTenantFailure(this.state, errorKey);
    return this.state;
  }

  /** Reads the injected SDK origin through the service. */
  baseUrl(): string {
    return this.service.baseUrl();
  }
}
