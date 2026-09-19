// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Controller of `sdkwork-iam-harmony-mobile-console-user-center`.
 *
 * Section 3: this root's primary presentation pattern is controllers. The
 * controller owns the state transition and calls the service; it must not build an
 * SDK client or compose a request.
 */

import { ConsoleUserCenterService } from '../../services/ConsoleUserCenterService';
import {
  applyConsoleUserCenterFailure,
  applyConsoleUserCenterResult,
  createConsoleUserCenterState,
  type ConsoleUserCenterState,
} from '../../state/ConsoleUserCenterState';

/** Drives one `console-user-center` screen. */
export class ConsoleUserCenterController {
  private state: ConsoleUserCenterState = createConsoleUserCenterState();
  private readonly service: ConsoleUserCenterService;

  constructor(service: ConsoleUserCenterService) {
    this.service = service;
  }

  /** Current state, for a screen that renders without subscribing. */
  current(): ConsoleUserCenterState {
    return this.state;
  }

  /** Applies a resolved list of record identifiers. */
  loaded(items: string[]): ConsoleUserCenterState {
    this.state = applyConsoleUserCenterResult(this.state, items);
    return this.state;
  }

  /**
   * Applies a failure.
   *
   * Takes a locale key rather than a message so the same failure renders in the
   * active locale, and so no backend detail can reach the screen through it.
   */
  failed(errorKey: string): ConsoleUserCenterState {
    this.state = applyConsoleUserCenterFailure(this.state, errorKey);
    return this.state;
  }

  /** Reads the injected SDK origin through the service. */
  baseUrl(): string {
    return this.service.baseUrl();
  }
}
