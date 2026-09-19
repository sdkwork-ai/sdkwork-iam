// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Controller of `sdkwork-iam-harmony-mobile-account-binding`.
 *
 * Section 3: this root's primary presentation pattern is controllers. The
 * controller owns the state transition and calls the service; it must not build an
 * SDK client or compose a request.
 */

import { AccountBindingService } from '../../services/AccountBindingService';
import {
  applyAccountBindingFailure,
  applyAccountBindingResult,
  createAccountBindingState,
  type AccountBindingState,
} from '../../state/AccountBindingState';

/** Drives one `account-binding` screen. */
export class AccountBindingController {
  private state: AccountBindingState = createAccountBindingState();
  private readonly service: AccountBindingService;

  constructor(service: AccountBindingService) {
    this.service = service;
  }

  /** Current state, for a screen that renders without subscribing. */
  current(): AccountBindingState {
    return this.state;
  }

  /** Applies a resolved list of record identifiers. */
  loaded(items: string[]): AccountBindingState {
    this.state = applyAccountBindingResult(this.state, items);
    return this.state;
  }

  /**
   * Applies a failure.
   *
   * Takes a locale key rather than a message so the same failure renders in the
   * active locale, and so no backend detail can reach the screen through it.
   */
  failed(errorKey: string): AccountBindingState {
    this.state = applyAccountBindingFailure(this.state, errorKey);
    return this.state;
  }

  /** Reads the injected SDK origin through the service. */
  baseUrl(): string {
    return this.service.baseUrl();
  }
}
