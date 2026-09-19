// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Controller of `sdkwork-iam-harmony-mobile-console-account-binding`.
 *
 * Section 3: this root's primary presentation pattern is controllers. The
 * controller owns the state transition and calls the service; it must not build an
 * SDK client or compose a request.
 */

import { ConsoleAccountBindingService } from '../../services/ConsoleAccountBindingService';
import {
  applyConsoleAccountBindingFailure,
  applyConsoleAccountBindingResult,
  createConsoleAccountBindingState,
  type ConsoleAccountBindingState,
} from '../../state/ConsoleAccountBindingState';

/** Drives one `console-account-binding` screen. */
export class ConsoleAccountBindingController {
  private state: ConsoleAccountBindingState = createConsoleAccountBindingState();
  private readonly service: ConsoleAccountBindingService;

  constructor(service: ConsoleAccountBindingService) {
    this.service = service;
  }

  /** Current state, for a screen that renders without subscribing. */
  current(): ConsoleAccountBindingState {
    return this.state;
  }

  /** Applies a resolved list of record identifiers. */
  loaded(items: string[]): ConsoleAccountBindingState {
    this.state = applyConsoleAccountBindingResult(this.state, items);
    return this.state;
  }

  /**
   * Applies a failure.
   *
   * Takes a locale key rather than a message so the same failure renders in the
   * active locale, and so no backend detail can reach the screen through it.
   */
  failed(errorKey: string): ConsoleAccountBindingState {
    this.state = applyConsoleAccountBindingFailure(this.state, errorKey);
    return this.state;
  }

  /** Reads the injected SDK origin through the service. */
  baseUrl(): string {
    return this.service.baseUrl();
  }
}
