// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Locale helpers of `commons`.
 *
 * `I18N_SPEC.md` section 4 retires a custom locale request header in favour of
 * `Accept-Language`; nothing here may reintroduce one. This module owns locale
 * normalization and message lookup only — the loader that reads fragments lives in
 * `l10n/FragmentBundle`, outside the authored locale tree of any package.
 */

/** Default locale of this root. */
export const IAM_HARMONY_DEFAULT_LOCALE: string = 'en-US';

/** Locales this root ships fragments for. */
export const IAM_HARMONY_SUPPORTED_LOCALES: string[] = ['en-US', 'zh-CN'];

/**
 * The message shown when no locale key resolves.
 *
 * A literal rather than a key: a resolver that falls back to a key would render
 * the key itself, which reads as a defect to a user and hides the missing
 * translation from whoever is looking.
 */
export const IAM_HARMONY_UNKNOWN_ERROR: string = 'An unexpected error occurred.';

/** Normalizes a device locale onto a supported locale. */
export function normalizeLocale(locale: string | undefined): string {
  const value: string = locale === undefined ? '' : locale.trim().replace('_', '-');
  const exact: string | undefined = IAM_HARMONY_SUPPORTED_LOCALES.find(
    (candidate: string) => candidate === value,
  );
  if (exact !== undefined) return exact;
  const language: string = value.split('-')[0].toLowerCase();
  const prefix: string | undefined = IAM_HARMONY_SUPPORTED_LOCALES.find(
    (candidate: string) => candidate.split('-')[0].toLowerCase() === language,
  );
  return prefix === undefined ? IAM_HARMONY_DEFAULT_LOCALE : prefix;
}

/**
 * Resolves a locale key through a fragment map.
 *
 * Returns the key itself only when the key is non-empty and unresolved is a
 * programming error; an empty key returns the shared unknown-error copy instead,
 * because an empty string renders as a blank screen with no explanation.
 */
export function resolveMessage(
  key: string,
  fragments: Record<string, string> = {},
): string {
  const normalized: string = key.trim();
  if (normalized.length === 0) return IAM_HARMONY_UNKNOWN_ERROR;
  const found: string | undefined = fragments[normalized];
  return found === undefined ? normalized : found;
}

/**
 * Turns any thrown value into a user-safe message.
 *
 * Section 7 requires adapters to expose stable user-safe errors; the same rule
 * applies to anything that reaches a screen.
 */
export function resolveErrorMessage(error: unknown): string {
  const message: string = error instanceof Error ? error.message : '';
  return message.trim().length > 0 ? message : IAM_HARMONY_UNKNOWN_ERROR;
}
