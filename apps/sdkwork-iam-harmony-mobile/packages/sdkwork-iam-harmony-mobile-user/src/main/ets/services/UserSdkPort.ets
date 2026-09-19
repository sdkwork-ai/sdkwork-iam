// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Injected SDK port holder of `sdkwork-iam-harmony-mobile-user`.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 6. Runtime
 * bootstrap constructs the generated SDK client and injects it; capability
 * services only ever receive it. This module is the injection seam, so the
 * services never construct a client and never fall back to raw request APIs.
 *
 * PREREQUISITE, stated rather than hidden: the SDK generation chain emits
 * TypeScript, Dart, Kotlin, Swift, C#, Go, Java, Python and Rust targets for
 * `sdkwork-iam-app-sdk`; no ArkTS target exists yet (see `sdks/README.md`).
 * Until one lands nothing can satisfy `UserSdkPort`, so resolution fails with
 * a named, user-safe error instead of a fabricated transport. The capability
 * renders that as its error state, which is why the app still boots and the
 * shell, session, routing and locale layers stay verifiable.
 *
 * Registration replaces rather than accumulates: bootstrap calls it once, and a
 * later call (for example after a profile switch) must replace the client instead
 * of leaving two transports alive against different origins.
 */

import { type UserSdkPort, type UserSdkPortResolver } from '../models/Models';

/** Stable code surfaced to the UI so an error state is not string-matched. */
export const IAM_HARMONY_USER_SDK_UNAVAILABLE_CODE: string = 'harmony-user-sdk-unavailable';

/**
 * User-safe resolution failure.
 *
 * Carries no origin, token or stack detail: this instance is what reaches a phone
 * screen through the screen-state error message.
 */
export class UserSdkUnavailableError extends Error {
  readonly code: string = IAM_HARMONY_USER_SDK_UNAVAILABLE_CODE;

  constructor(message: string) {
    super(message);
    this.name = 'UserSdkUnavailableError';
  }
}

const UNAVAILABLE_MESSAGE: string =
  'The generated ArkTS IAM app SDK client is not registered for harmony-native yet.';

let registeredPort: UserSdkPort | undefined = undefined;

/** Registers the client constructed by the root bootstrap. */
export function registerUserSdkPort(port: UserSdkPort): void {
  registeredPort = port;
}

export function isUserSdkPortRegistered(): boolean {
  return registeredPort !== undefined;
}

/**
 * Resolves the registered client, or fails with a named error.
 *
 * Called lazily from inside a service method rather than at import time so a
 * missing transport cannot break module loading — that would take down the shell
 * and the session screen along with this capability.
 */
export function resolveUserSdkPort(): UserSdkPort {
  const port: UserSdkPort | undefined = registeredPort;
  if (port === undefined) {
    throw new UserSdkUnavailableError(UNAVAILABLE_MESSAGE);
  }
  return port;
}

/**
 * Clears the registered client.
 *
 * Logout and profile switches must call this together with the session store and
 * the realtime bridges (section 6).
 */
export function resetUserSdkPort(): void {
  registeredPort = undefined;
}

/** The resolver every service in this package is constructed with. */
export const resolveUserSdkPortResolver: UserSdkPortResolver = resolveUserSdkPort;
