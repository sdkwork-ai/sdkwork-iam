// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Controller of `sdkwork-iam-harmony-mobile-console-organization`.
 *
 * Section 3: this root's primary presentation pattern is controllers. The
 * controller owns the state transition and calls the service; it must not build an
 * SDK client or compose a request.
 */

import { ConsoleOrganizationService } from '../../services/ConsoleOrganizationService';
import {
  applyConsoleOrganizationFailure,
  applyConsoleOrganizationResult,
  createConsoleOrganizationState,
  type ConsoleOrganizationState,
} from '../../state/ConsoleOrganizationState';

/** Drives one `console-organization` screen. */
export class ConsoleOrganizationController {
  private state: ConsoleOrganizationState = createConsoleOrganizationState();
  private readonly service: ConsoleOrganizationService;

  constructor(service: ConsoleOrganizationService) {
    this.service = service;
  }

  /** Current state, for a screen that renders without subscribing. */
  current(): ConsoleOrganizationState {
    return this.state;
  }

  /** Applies a resolved list of record identifiers. */
  loaded(items: string[]): ConsoleOrganizationState {
    this.state = applyConsoleOrganizationResult(this.state, items);
    return this.state;
  }

  /**
   * Applies a failure.
   *
   * Takes a locale key rather than a message so the same failure renders in the
   * active locale, and so no backend detail can reach the screen through it.
   */
  failed(errorKey: string): ConsoleOrganizationState {
    this.state = applyConsoleOrganizationFailure(this.state, errorKey);
    return this.state;
  }

  /** Reads the injected SDK origin through the service. */
  baseUrl(): string {
    return this.service.baseUrl();
  }
}
