// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Host adapter capability registry of `sdkwork-iam-harmony-mobile-core`.
 *
 * Section 7: renderer and feature code route through the declared capability set;
 * a direct platform branch on a HarmonyOS global is forbidden. The registry is
 * static metadata so a feature can ask "is clipboard available on this host?"
 * during render without touching the platform.
 */
export const iamHarmonyMobileCoreHostCapabilities: string[] = [
  'secureStorage',
  'networkStatus',
  'appLifecycle',
  'deepLinks',
  'filePicker',
  'pushNotifications',
  'clipboard',
  'deviceInfo',
];

export function hasIamHarmonyMobileCoreHostCapability(capability: string): boolean {
  return iamHarmonyMobileCoreHostCapabilities.includes(capability);
}
