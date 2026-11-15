import type { SdkworkIamOauthAccountConfig } from "../types/oauth-admin-types";

import { buildStandardCallbackUri } from "./oauth-admin-utils";

/**
 * WeChat 公众号 protected-domain rules (公众平台 → 设置与开发 → 公众号设置 →
 * 功能设置), shared by the official-account developer-configuration drawer.
 *
 * The console exposes three independent domain sets. They are NOT
 * interchangeable, and each carries its own cap:
 *
 * - **JS 接口安全域名 (≤5)** — pages that call the JS-SDK. The console covers a
 *   configured parent domain's legal subdomains, so a set is usually one entry.
 * - **网页授权域名 (≤2)** — the OAuth 网页授权 callback page must live on one
 *   of these; this set therefore owns the account's callback URL.
 * - **业务域名 (≤3)** — pages that open inside WeChat without the browser
 *   re-layout; the console also accepts a single domain-plus-path form.
 *
 * Every set rejects IP addresses, explicit ports, query strings, wildcards and
 * short links, and the console requires the domain to be ICP-filed. The console
 * also allows only three saves per calendar month, which is why this module
 * validates shape locally before any write reaches the backend.
 */
export const JS_SECURE_DOMAIN_LIMIT = 5;
export const WEB_AUTH_DOMAIN_LIMIT = 2;
export const BUSINESS_DOMAIN_LIMIT = 3;

/** The three protected-domain sets, in the console's own order. */
export const OFFICIAL_DOMAIN_SET_KEYS = [
  "jsSecureDomains",
  "webAuthDomains",
  "businessDomains",
] as const;

/** One official-account protected-domain set. */
export type OfficialDomainSetKey = typeof OFFICIAL_DOMAIN_SET_KEYS[number];

/** Console rule of one protected-domain set. */
export interface OfficialDomainSetRule {
  /** Whether the console accepts the `example.com/path` form. */
  allowPath: boolean;
  key: OfficialDomainSetKey;
  /** Console cap for the set. */
  limit: number;
}

/** The console rules, in rendering order: JS-SDK, web auth, business. */
export const OFFICIAL_DOMAIN_SET_RULES: readonly OfficialDomainSetRule[] = [
  { allowPath: false, key: "jsSecureDomains", limit: JS_SECURE_DOMAIN_LIMIT },
  { allowPath: false, key: "webAuthDomains", limit: WEB_AUTH_DOMAIN_LIMIT },
  { allowPath: true, key: "businessDomains", limit: BUSINESS_DOMAIN_LIMIT },
];

/** Upper bound the WeChat console enforces for one stored domain value. */
const MAX_DOMAIN_LENGTH = 253;

/** A dotted host with an alphabetic TLD; IP literals and short links fail. */
const DOMAIN_HOST_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/u;

/** The optional business-domain path (`example.com/mp`). */
const DOMAIN_PATH_PATTERN = /^(?:\/[A-Za-z0-9._~-]+)+$/u;

/** A pasted `https://`/`http://` prefix the console itself never stores. */
const SCHEME_PREFIX_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//iu;

/**
 * Normalizes one domain typed or pasted into a protected-domain editor.
 *
 * A pasted absolute URL is reduced to the part the WeChat console stores: the
 * scheme is dropped, the value is lower-cased, and a trailing slash is removed.
 * The result must be a dotted host (an ICP-filed domain in the console's terms)
 * and, only for the business-domain set, may carry a path.
 *
 * @param input - the raw editor value.
 * @param options.allowPath - accept the console's `example.com/path` form.
 * @returns the normalized `host`/`host/path`, or `undefined` when the console
 *   would reject the value (empty, IP literal, port, query, wildcard, ...).
 */
export function normalizeOfficialDomain(
  input: string,
  options: { allowPath?: boolean } = {},
): string | undefined {
  let value = input.trim().toLowerCase();
  if (value === "") {
    return undefined;
  }
  value = value.replace(SCHEME_PREFIX_PATTERN, "").replace(/\/+$/u, "");
  const pathStart = value.indexOf("/");
  const host = pathStart === -1 ? value : value.slice(0, pathStart);
  const path = pathStart === -1 ? "" : value.slice(pathStart);
  // A colon is the console's "port" rejection; `@`, `?`, `#`, and whitespace
  // all mean the operator pasted something that is not a bare domain.
  if (/[:@?#\s]/u.test(value)) {
    return undefined;
  }
  if (host.length === 0 || `${host}${path}`.length > MAX_DOMAIN_LENGTH) {
    return undefined;
  }
  if (!DOMAIN_HOST_PATTERN.test(host)) {
    return undefined;
  }
  if (path !== "" && (options.allowPath !== true || !DOMAIN_PATH_PATTERN.test(path))) {
    return undefined;
  }
  return `${host}${path}`;
}

/** The reason a stored value failed validation. */
export type OfficialDomainIssueReason = "invalid";

/** One stored value that the WeChat console would reject. */
export interface OfficialDomainIssue {
  /** 0-based position inside the set, so the row can show the error inline. */
  index: number;
  key: OfficialDomainSetKey;
  reason: OfficialDomainIssueReason;
  /** The stored value as-is (may be blank or already normalized). */
  value: string;
}

/**
 * Reads the three protected-domain sets out of an account configuration,
 * normalizing legacy shapes on the way:
 *
 * - a business domain saved under the old mini-program-shaped
 *   `domains.business` array is surfaced in the business set while
 *   `businessDomains` is still absent;
 * - a legacy single `webDomain` is treated as the web-authorization domain
 *   while `webAuthDomains` is still absent, because that is exactly how the
 *   account's callback URL was provisioned before this set existed.
 *
 * The fallbacks key off the dedicated field being absent, not empty: once the
 * operator saves the set (even as an empty list), the legacy value no longer
 * comes back.
 *
 * @param config - the stored account configuration (may be absent).
 * @returns fresh arrays for the three sets, safe to edit in place.
 */
export function readOfficialDomainSets(
  config: SdkworkIamOauthAccountConfig | undefined,
): Record<OfficialDomainSetKey, string[]> {
  const webDomain = config?.webDomain?.trim() ?? "";
  const webAuthDomains = config?.webAuthDomains !== undefined
    ? [...config.webAuthDomains]
    : webDomain ? [webDomain] : [];
  const businessDomains = config?.businessDomains !== undefined
    ? [...config.businessDomains]
    : [...(config?.domains?.business ?? [])];
  return {
    businessDomains,
    jsSecureDomains: [...(config?.jsSecureDomains ?? [])],
    webAuthDomains,
  };
}

/**
 * Finds every stored value the console would reject, across all three sets.
 *
 * Used at submit time so a bad entry never reaches the backend (and never burns
 * one of the console's three monthly saves).
 *
 * @param config - the account configuration being saved.
 * @returns one issue per offending value, in set-then-row order.
 */
export function findOfficialDomainIssues(
  config: SdkworkIamOauthAccountConfig | undefined,
): OfficialDomainIssue[] {
  const sets = readOfficialDomainSets(config);
  const issues: OfficialDomainIssue[] = [];
  for (const rule of OFFICIAL_DOMAIN_SET_RULES) {
    sets[rule.key].forEach((value, index) => {
      if (normalizeOfficialDomain(value, { allowPath: rule.allowPath }) === undefined) {
        issues.push({ index, key: rule.key, reason: "invalid", value });
      }
    });
  }
  return issues;
}

/**
 * Produces the configuration to persist: every set normalized to the console's
 * bare-host shape, de-duplicated per set, with the legacy mini-program-shaped
 * business array folded into `businessDomains`.
 *
 * Invalid values are dropped here; call {@link findOfficialDomainIssues} first
 * to keep them from being discarded silently.
 *
 * @param config - the edited account configuration.
 * @returns a new configuration object safe to send to the backend.
 */
export function normalizeOfficialDomainConfig(
  config: SdkworkIamOauthAccountConfig | undefined,
): SdkworkIamOauthAccountConfig {
  const sets = readOfficialDomainSets(config);
  const next: SdkworkIamOauthAccountConfig = { ...(config ?? {}) };
  for (const rule of OFFICIAL_DOMAIN_SET_RULES) {
    const normalized: string[] = [];
    for (const value of sets[rule.key]) {
      const domain = normalizeOfficialDomain(value, { allowPath: rule.allowPath });
      if (domain !== undefined && !normalized.includes(domain)) {
        normalized.push(domain);
      }
    }
    next[rule.key] = normalized;
  }
  if (next.domains !== undefined) {
    // The legacy mini-program shape no longer feeds the official account; keep
    // any sibling keys so a mis-classified row is not stripped wholesale.
    const { business: _legacyBusiness, ...rest } = next.domains;
    if (Object.keys(rest).length === 0) {
      delete next.domains;
    } else {
      next.domains = rest;
    }
  }
  return next;
}

/**
 * Reads the host of a callback URL, for the console's rule that the OAuth
 * callback page must live on a configured 网页授权域名.
 *
 * @param uri - the configured callback URL.
 * @returns the lower-cased host, or an empty string when the URL is unparsable.
 */
export function readCallbackHost(uri: string): string {
  const value = uri.trim();
  if (value === "") {
    return "";
  }
  try {
    const parsed = new URL(value);
    return parsed.host.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Resolves the domain that owns the account's OAuth callback URL.
 *
 * WeChat requires the callback page to live on a 网页授权域名, so the first
 * configured web-authorization domain wins. A legacy account that only has the
 * former primary `webDomain` keeps using it until the operator adds the
 * dedicated set.
 *
 * @param config - the account configuration.
 * @returns the normalized host, or an empty string when nothing is configured.
 */
export function resolveCallbackDomain(
  config: SdkworkIamOauthAccountConfig | undefined,
): string {
  const [webAuthDomain] = readOfficialDomainSets(config).webAuthDomains;
  const normalized = normalizeOfficialDomain(webAuthDomain ?? "");
  if (normalized !== undefined) {
    return normalized;
  }
  return normalizeOfficialDomain(config?.webDomain ?? "") ?? "";
}

/**
 * Builds the account's standard OAuth callback URL from its web-authorization
 * domain.
 *
 * @param config - the account configuration.
 * @returns `https://{webAuthDomain}/auth/oauth/callback`, or an empty string
 *   when no usable domain is configured.
 */
export function buildAccountCallbackUri(
  config: SdkworkIamOauthAccountConfig | undefined,
): string {
  return buildStandardCallbackUri(resolveCallbackDomain(config));
}

/**
 * Builds the public URL the WeChat console fetches to verify one domain.
 *
 * The console issues one `MP_verify_<token>.txt` per official account and
 * expects that same file at the root of every configured domain; a domain
 * configured with a path expects it inside that path.
 *
 * @param domain - a configured domain (`app.example.com` or `app.example.com/mp`).
 * @param fileName - the issued file name (`MP_verify_xxxxxxxx.txt`).
 * @returns the https URL, or an empty string when either input is unusable.
 */
export function buildDomainVerifyFileUrl(domain: string, fileName: string): string {
  const normalized = normalizeOfficialDomain(domain, { allowPath: true });
  const name = fileName.trim();
  if (normalized === undefined || name === "") {
    return "";
  }
  return `https://${normalized}/${encodeURIComponent(name)}`;
}

/**
 * Checks whether a file name has the shape the WeChat console issues
 * (`MP_verify_` + letters/digits + `.txt`).
 *
 * @param fileName - the candidate file name.
 * @returns whether the name matches the console's issued-file shape.
 */
export function isWechatVerifyFileName(fileName: string): boolean {
  return /^MP_verify_[A-Za-z0-9]{8,64}\.txt$/u.test(fileName.trim());
}
