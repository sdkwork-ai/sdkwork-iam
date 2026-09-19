// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Host adapter registry.
 *
 * Section 7: the registry is readable as static metadata so a feature can ask "is
 * this capability available on this host?" during render without constructing an
 * adapter or touching the platform. An adapter that reports `unsupported` is
 * registered and honestly reports itself unavailable, which is what lets a screen
 * render a permission-denied or unavailable state instead of crashing.
 *
 * Declared here rather than reusing the app core's contracts so this module has no
 * import at all: a registry read during render must not be able to fail because a
 * package it only nominally depends on did not resolve.
 */

/** One registered adapter. */
export interface HostAdapterRegistration {
  readonly name: string;
  readonly available: boolean;
}

let registrations: HostAdapterRegistration[] = [];

export function registerHostAdapters(entries: HostAdapterRegistration[]): void {
  registrations = entries;
}

export function listHostAdapters(): HostAdapterRegistration[] {
  return registrations;
}

export function hasHostCapability(name: string): boolean {
  return registrations.some((entry: HostAdapterRegistration) => entry.name === name && entry.available);
}
