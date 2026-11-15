// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Session and context store of `sdkwork-iam-harmony-mobile-console-core`.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` sections 5 and 6. The
 * application owns exactly one session/context record, in
 * `sdkwork-iam-harmony-mobile-core`; this tier re-exports it under its own symbol names rather
 * than declaring a second record. A per-tier record is the defect this file used to
 * have: login commits the app-tier store only, so the console and admin clients read
 * a session nothing writes.
 *
 * The wrapper functions exist instead of an aliased `export { … } from` statement so
 * every binding this tier publishes keeps an explicit, typed signature.
 */
import {
  clearIamHarmonyMobileCoreSession,
  commitIamHarmonyMobileCoreSession,
  isIamHarmonyMobileCoreSessionComplete,
  readIamHarmonyMobileCoreSession,
  resolveIamHarmonyMobileCoreAccessToken,
  resolveIamHarmonyMobileCoreAuthToken,
  writeIamHarmonyMobileCoreSession,
  type IamHarmonyMobileCoreSession,
} from '@sdkwork/sdkwork-iam-harmony-mobile-core';

export type IamHarmonyMobileConsoleCoreSession = IamHarmonyMobileCoreSession;

export function readIamHarmonyMobileConsoleCoreSession(): IamHarmonyMobileConsoleCoreSession | undefined {
  return readIamHarmonyMobileCoreSession();
}

export function writeIamHarmonyMobileConsoleCoreSession(session: IamHarmonyMobileConsoleCoreSession | undefined): void {
  writeIamHarmonyMobileCoreSession(session);
}

export function commitIamHarmonyMobileConsoleCoreSession(session: IamHarmonyMobileConsoleCoreSession): IamHarmonyMobileConsoleCoreSession {
  return commitIamHarmonyMobileCoreSession(session);
}

export function clearIamHarmonyMobileConsoleCoreSession(): void {
  clearIamHarmonyMobileCoreSession();
}

export function resolveIamHarmonyMobileConsoleCoreAccessToken(
  session: IamHarmonyMobileConsoleCoreSession | undefined,
): string | undefined {
  return resolveIamHarmonyMobileCoreAccessToken(session);
}

export function resolveIamHarmonyMobileConsoleCoreAuthToken(
  session: IamHarmonyMobileConsoleCoreSession | undefined,
): string | undefined {
  return resolveIamHarmonyMobileCoreAuthToken(session);
}

export function isIamHarmonyMobileConsoleCoreSessionComplete(session: IamHarmonyMobileConsoleCoreSession | undefined): boolean {
  return isIamHarmonyMobileCoreSessionComplete(session);
}
