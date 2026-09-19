// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Host adapter registration.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 7. Feature packages
 * depend on the typed interfaces and never call HarmonyOS system APIs, a global
 * ability context, a raw want, or an SDK singleton global.
 *
 * The ability context is deliberately not a parameter. No adapter in this slice is
 * context-backed, and accepting an unused context would advertise an integration
 * that does not exist; the single call site to change when one is needed is this
 * function.
 */
import {
  IAM_HARMONY_HOST_CAPABILITIES,
  iamHarmonyHostAdapters,
  listHostAdapters,
  registerHostAdapters,
  type HostAdapterRegistration,
  type IamHarmonyHostAdapters,
} from '@sdkwork/sdkwork-iam-harmony-mobile-host';

/** Registers every adapter this host package exposes. */
export function registerIamHarmonyHostAdapters(): IamHarmonyHostAdapters {
  const entries: HostAdapterRegistration[] = IAM_HARMONY_HOST_CAPABILITIES.map(
    (name: string) => ({ name, available: false }),
  );
  registerHostAdapters(entries);
  return iamHarmonyHostAdapters;
}

/** The registered adapters, registering them on first use. */
export function getIamHarmonyHostAdapters(): IamHarmonyHostAdapters {
  if (listHostAdapters().length === 0) {
    registerIamHarmonyHostAdapters();
  }
  return iamHarmonyHostAdapters;
}

/**
 * Reports whether the device should be treated as offline.
 *
 * `ok: false` means the adapter cannot tell, which is **not** the same as offline.
 * Treating "cannot tell" as offline would render the offline state on every cold
 * launch, and section 11 requires that state to be meaningful rather than permanent.
 */
export async function readIamHarmonyOffline(): Promise<boolean> {
  const result = await getIamHarmonyHostAdapters().networkStatus.isOnline();
  if (!result.ok) {
    return false;
  }
  return result.value === false;
}
