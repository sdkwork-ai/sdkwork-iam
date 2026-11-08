/**
 * Host-supplied product branding for the shared auth surfaces.
 *
 * The IAM auth pages are mounted by every SDKWork application, so they must
 * not hard-code the IAM product identity: the host passes the brand operators
 * configure in that application's admin surface. Every field is optional so an
 * unconfigured host keeps the shipped IAM identity.
 */
export interface SdkworkAuthBrand {
  /** Product name rendered in the auth header. */
  name?: string;
  /** Delivery URL of the product logo rendered in the auth header. */
  logoUrl?: string;
}

/** Shipped brand name shown when the host supplies none. */
export const SDKWORK_AUTH_DEFAULT_BRAND_NAME = "SDKWork IAM";

/** Shipped mark shown when the host supplies no logo. */
export const SDKWORK_AUTH_DEFAULT_BRAND_MARK = "IAM";

export function resolveSdkworkAuthBrandName(
  brand?: SdkworkAuthBrand | null,
): string {
  const name = brand?.name?.trim();
  return name ? name : SDKWORK_AUTH_DEFAULT_BRAND_NAME;
}

export function resolveSdkworkAuthBrandLogoUrl(
  brand?: SdkworkAuthBrand | null,
): string | undefined {
  const logoUrl = brand?.logoUrl?.trim();
  return logoUrl ? logoUrl : undefined;
}

/**
 * Short fallback mark for a host that configures a name but no logo.
 *
 * Two words read as their initials (`Cloud Router` -> `CR`); a single word
 * keeps its first two characters so CJK names also produce a readable mark.
 */
export function resolveSdkworkAuthBrandMark(name: string): string {
  const normalized = name.trim();
  if (!normalized || normalized === SDKWORK_AUTH_DEFAULT_BRAND_NAME) {
    return SDKWORK_AUTH_DEFAULT_BRAND_MARK;
  }
  const words = normalized.split(/\s+/u).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((word) => Array.from(word)[0] ?? "")
      .join("")
      .toUpperCase();
  }
  return Array.from(words[0] ?? "").slice(0, 2).join("").toUpperCase();
}
