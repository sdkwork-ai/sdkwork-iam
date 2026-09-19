// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Screen state vocabulary of this root.
 *
 * `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 11 requires UI coverage for
 * loading, success, empty, validation-error, permission-denied, offline and
 * unknown-error. A closed union means a page cannot invent a state the shared view
 * does not render, and a new state cannot be added without updating both.
 */
export type ScreenState =
  | 'loading'
  | 'success'
  | 'empty'
  | 'validation-error'
  | 'permission-denied'
  | 'offline'
  | 'unknown-error'
  | 'error';
