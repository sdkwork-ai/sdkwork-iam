// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Locale fragment loader of `commons`.
 *
 * Fragments are authored per capability package under
 * `src/main/ets/i18n/<locale>/iam/<capability>/*.json`, so the root needs one
 * place that turns a locale plus a set of already-imported modules into one lookup
 * table. It lives outside the authored locale tree because it is infrastructure,
 * not message copy: `I18N_SPEC.md` section 199 reserves
 * `<locale>/<domain>/<capability>/<fragment>` plus one thin boundary file for
 * authored copy.
 *
 * Registration is by `(locale, capability)` rather than by a merged key prefix, so
 * two packages cannot silently overwrite each other's keys.
 */

/** One package's fragments for one locale. */
export interface LocaleFragmentRegistration {
  readonly locale: string;
  readonly capability: string;
  readonly messages: Record<string, string>;
}

let registrations: LocaleFragmentRegistration[] = [];

export function registerLocaleFragments(registration: LocaleFragmentRegistration): void {
  registrations = registrations.filter(
    (entry: LocaleFragmentRegistration) =>
      !(entry.locale === registration.locale && entry.capability === registration.capability),
  );
  registrations.push(registration);
}

export function resetLocaleFragments(): void {
  registrations = [];
}

export function registeredCapabilities(locale: string): string[] {
  return registrations
    .filter((entry: LocaleFragmentRegistration) => entry.locale === locale)
    .map((entry: LocaleFragmentRegistration) => entry.capability)
    .sort();
}

/**
 * Merges every registered fragment of one locale.
 *
 * Later registrations win per key, and the capability name is carried in the
 * registration rather than in the key, so a key collision shows up as a
 * capability conflict a reviewer can see instead of an opaque overwrite.
 */
export function localeMessages(locale: string): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const registration of registrations) {
    if (registration.locale !== locale) continue;
    for (const key of Object.keys(registration.messages)) {
      merged[key] = registration.messages[key];
    }
  }
  return merged;
}
