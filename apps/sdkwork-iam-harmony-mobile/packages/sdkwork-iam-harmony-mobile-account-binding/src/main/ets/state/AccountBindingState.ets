// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Presentation state of `sdkwork-iam-harmony-mobile-account-binding`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this
 * root uses controllers, so the state object is a plain value and the controller
 * is what replaces it.
 */

import { type ScreenState } from '@sdkwork/sdkwork-iam-harmony-mobile-commons';

/** State of the `account-binding` capability. */
export interface AccountBindingState {
  /** Which of the required screen states is active (section 11). */
  readonly status: ScreenState;
  /** Locale key of the last user-safe failure, or undefined after a success. */
  readonly errorKey?: string;
  /** Identifiers of the records currently displayed. */
  readonly items: string[];
}

/** The state a screen renders before its first request resolves. */
export function createAccountBindingState(): AccountBindingState {
  return { status: 'loading', items: [] };
}

/**
 * Applies a result to the previous state.
 *
 * Returns a new value rather than mutating, so a controller can hand the previous
 * state to a comparison or a test without it changing underneath.
 */
export function applyAccountBindingResult(
  state: AccountBindingState,
  items: string[],
): AccountBindingState {
  return {
    status: items.length === 0 ? 'empty' : 'success',
    items,
    errorKey: undefined,
  };
}

/** Applies a user-safe failure. */
export function applyAccountBindingFailure(
  state: AccountBindingState,
  errorKey: string,
): AccountBindingState {
  return { status: 'error', items: state.items, errorKey };
}
