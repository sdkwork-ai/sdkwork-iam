// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Presentation state of `sdkwork-iam-harmony-mobile-auth`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this
 * root uses controllers, so the state object is a plain value and the controller
 * is what replaces it.
 */

import { type ScreenState } from '@sdkwork/sdkwork-iam-harmony-mobile-commons';

/** State of the `auth` capability. */
export interface AuthState {
  /** Which of the required screen states is active (section 11). */
  readonly status: ScreenState;
  /** Locale key of the last user-safe failure, or undefined after a success. */
  readonly errorKey?: string;
  /** Identifiers of the records currently displayed. */
  readonly items: string[];
}

/** The state a screen renders before its first request resolves. */
export function createAuthState(): AuthState {
  return { status: 'loading', items: [] };
}

/**
 * Applies a result to the previous state.
 *
 * Returns a new value rather than mutating, so a controller can hand the previous
 * state to a comparison or a test without it changing underneath.
 */
export function applyAuthResult(
  state: AuthState,
  items: string[],
): AuthState {
  return {
    status: items.length === 0 ? 'empty' : 'success',
    items,
    errorKey: undefined,
  };
}

/** Applies a user-safe failure. */
export function applyAuthFailure(
  state: AuthState,
  errorKey: string,
): AuthState {
  return { status: 'error', items: state.items, errorKey };
}
