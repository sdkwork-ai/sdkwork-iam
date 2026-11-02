/**
 * Locale bundles for the IAM H5 kit.
 *
 * The kit owns a minimal catalog mechanism instead of importing
 * `@sdkwork/i18n-pc-react`: that package is the **PC** React i18n binding, and
 * `APP_MOBILE_REACT_UI_SPEC.md` section 2 forbids a mobile package from
 * importing PC page, layout or runtime components. The mechanism here is the
 * small contract the mobile surfaces actually need — a namespace, a default
 * locale, per-locale message trees, and a resolver — so a capability package
 * ships its own fragment and no package carries a whole-app locale monolith
 * (`I18N_SPEC.md` section 6.1).
 */

import { createContext, createElement, useContext, useMemo, type ReactElement, type ReactNode } from "react";

/** One locale's message tree of `T`. */
export interface SdkworkIamH5LocaleBundle<TMessages> {
  readonly locale: string;
  readonly messages: TMessages;
}

/** A namespace-scoped catalog over a closed locale set. */
export interface SdkworkIamH5MessageCatalog<TMessages> {
  /** Namespace the catalog is registered under, e.g. `iam.h5.tenant`. */
  readonly namespace: string;
  /** Locale returned when a requested locale is missing or malformed. */
  readonly defaultLocale: string;
  /** Whether the catalog carries a bundle for one locale. */
  readonly hasLocale: (locale: string | null | undefined) => boolean;
  /** Locales the catalog carries, in declaration order. */
  readonly locales: readonly string[];
  /** Messages for one locale, falling back to the default locale. */
  readonly resolveMessages: (locale: string | null | undefined) => TMessages;
}

/**
 * Create a catalog from per-locale bundles.
 * @param options - namespace, default locale and bundles.
 * @returns a catalog whose `resolveMessages` never returns `undefined`.
 * @throws when the default locale has no bundle, which would make every lookup
 *   fall through to nothing and surface as "label missing" in production.
 */
export function createSdkworkIamH5MessageCatalog<TMessages>(options: {
  namespace: string;
  defaultLocale: string;
  bundles: readonly SdkworkIamH5LocaleBundle<TMessages>[];
}): SdkworkIamH5MessageCatalog<TMessages> {
  const { namespace, defaultLocale, bundles } = options;
  const byLocale = new Map<string, TMessages>();
  for (const bundle of bundles) {
    if (byLocale.has(bundle.locale)) {
      throw new Error(`iam-h5 i18n: duplicate locale ${bundle.locale} in ${namespace}`);
    }
    byLocale.set(bundle.locale, bundle.messages);
  }
  const fallback = byLocale.get(defaultLocale);
  if (fallback === undefined) {
    throw new Error(`iam-h5 i18n: catalog ${namespace} has no default locale ${defaultLocale}`);
  }
  return {
    hasLocale: (locale) => (locale ? byLocale.has(normalizeLocaleTag(locale)) : false),
    locales: bundles.map((bundle) => bundle.locale),
    namespace,
    defaultLocale,
    resolveMessages: (locale) => {
      if (!locale) return fallback;
      return byLocale.get(normalizeLocaleTag(locale)) ?? fallback;
    },
  };
}

/**
 * Normalize a BCP-47 tag to the `xx-YY` form the bundles use.
 *
 * A host commonly reports `zh_CN` or `zh-cn`; both must reach the `zh-CN`
 * bundle instead of silently falling back to English.
 * @param locale - raw tag.
 * @returns the normalized tag.
 */
export function normalizeLocaleTag(locale: string): string {
  const [language = "", region = ""] = locale.trim().replace(/_/gu, "-").split("-");
  if (!language) return "";
  const lowerLanguage = language.toLowerCase();
  return region ? `${lowerLanguage}-${region.toUpperCase()}` : lowerLanguage;
}

/** Lookup table the provider publishes: namespace → resolver for one locale. */
type IamH5MessageResolver = (locale: string | null | undefined) => unknown;

interface IamH5I18nContextValue {
  readonly locale: string;
  readonly resolvers: ReadonlyMap<string, IamH5MessageResolver>;
}

const IamH5I18nContext = createContext<IamH5I18nContextValue | null>(null);

/** Props of {@link SdkworkIamH5I18nProvider}. */
export interface SdkworkIamH5I18nProviderProps {
  /** Catalogs registered for this subtree. */
  catalogs: readonly SdkworkIamH5MessageCatalog<unknown>[];
  children: ReactNode;
  /** Active locale; each catalog falls back to its own default when unset. */
  locale?: string | null;
}

/**
 * Provide the registered catalogs to the subtree.
 *
 * A catalog absent from `catalogs` is not an error at render time: the hook
 * throws, which turns a missing registration into a caught render failure with
 * the namespace in the message instead of a screen full of blank labels.
 */
export function SdkworkIamH5I18nProvider({
  catalogs,
  children,
  locale,
}: SdkworkIamH5I18nProviderProps): ReactElement {
  const value = useMemo<IamH5I18nContextValue>(() => {
    const resolvers = new Map<string, IamH5MessageResolver>();
    for (const catalog of catalogs) {
      resolvers.set(catalog.namespace, (requested) => catalog.resolveMessages(requested));
    }
    return { locale: locale ?? "", resolvers };
  }, [catalogs, locale]);

  return createElement(IamH5I18nContext.Provider, { value }, children);
}

/**
 * Read one catalog's messages for the active locale.
 * @param catalog - the capability's catalog.
 * @returns the locale's messages.
 * @throws when no provider registered the catalog's namespace.
 */
export function useSdkworkIamH5Messages<TMessages>(
  catalog: SdkworkIamH5MessageCatalog<TMessages>,
): TMessages {
  const context = useContext(IamH5I18nContext);
  const registered = context?.resolvers.get(catalog.namespace);
  if (!context || !registered) {
    throw new Error(
      `iam-h5 i18n: catalog ${catalog.namespace} is not registered with SdkworkIamH5I18nProvider`,
    );
  }
  return registered(context.locale) as TMessages;
}
