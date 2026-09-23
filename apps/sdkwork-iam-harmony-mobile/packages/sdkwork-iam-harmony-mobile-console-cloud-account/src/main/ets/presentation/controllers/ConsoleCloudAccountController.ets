// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Controller of `sdkwork-iam-harmony-mobile-console-cloud-account`.
 *
 * Section 3: this root's primary presentation pattern is controllers. The
 * controller owns the state transition and calls the service; it must not build an
 * SDK client or compose a request.
 */

import { ConsoleCloudAccountService } from '../../services/ConsoleCloudAccountService';
import {
  applyConsoleCloudAccountFailure,
  applyConsoleCloudAccountResult,
  createConsoleCloudAccountState,
  type ConsoleCloudAccountState,
} from '../../state/ConsoleCloudAccountState';

/** Drives one `console-cloud-account` screen. */
export class ConsoleCloudAccountController {
  private state: ConsoleCloudAccountState = createConsoleCloudAccountState();
  private readonly service: ConsoleCloudAccountService;

  constructor(service: ConsoleCloudAccountService) {
    this.service = service;
  }

  /** Current state, for a screen that renders without subscribing. */
  current(): ConsoleCloudAccountState {
    return this.state;
  }

  /** Applies a resolved list of record identifiers. */
  loaded(items: string[]): ConsoleCloudAccountState {
    this.state = applyConsoleCloudAccountResult(this.state, items);
    return this.state;
  }

  /**
   * Applies a failure.
   *
   * Takes a locale key rather than a message so the same failure renders in the
   * active locale, and so no backend detail can reach the screen through it.
   */
  failed(errorKey: string): ConsoleCloudAccountState {
    this.state = applyConsoleCloudAccountFailure(this.state, errorKey);
    return this.state;
  }

  /** Reads the injected SDK origin through the service. */
  baseUrl(): string {
    return this.service.baseUrl();
  }
}
