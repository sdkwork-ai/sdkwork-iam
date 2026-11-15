import { useMemo, type ReactNode } from "react";

import {
  SdkworkOfficialAccountsPanel,
  type OfficialAccountsController,
} from "@sdkwork/iam-pc-official-accounts";
import type { DriveUploadImageService } from "@sdkwork/drive-upload-image-core";
import type {
  SdkworkIamOauthAccountConfig,
  SdkworkIamOauthAccountKind,
  SdkworkIamOauthAdminController,
  SdkworkIamOauthPagePermissions,
} from "../types/oauth-admin-types";
import { readOfficialDomainSets } from "../utils/official-account-domains";
import { createIamOauthOfficialAccountController } from "../services/official-account-operator-operations";
import { officialAccountCapabilitiesOf } from "../services/official-account-capabilities";

/**
 * Compatibility shell for the retired account-setup section.
 *
 * The official-account admin page now renders
 * `SdkworkOfficialAccountsPanel` directly from
 * `@sdkwork/iam-pc-official-accounts`; the mini-program page renders its own
 * shared panel. This module keeps the historical export name (and the pure
 * WeChat domain/secret helpers that were owned here) for callers that still
 * import them, and delegates rendering to the shared panel instead of carrying
 * a second CRUD implementation.
 *
 * The legacy presentation-only props (`accounts`, `common`, `messages`,
 * `listPageInfo`, `status`, `switchMessages`, `onChanged`) are accepted for
 * source compatibility and ignored: the shared controller owns its own list and
 * status, and the shared panel owns its copy.
 *
 * @deprecated Render `SdkworkOfficialAccountsPanel` (operator capabilities)
 * directly; this shell only exists so a stale import keeps working.
 */
export function OauthAccountSetupSection({
  controller,
  disabled = false,
  driveUploadImageService,
  initialOpen = false,
  kind,
  officialAccounts,
  onOpenCustomMenu,
  permissions,
}: {
  controller: SdkworkIamOauthAdminController;
  /** Retired busy flag; the shared controller publishes its own status. */
  disabled?: boolean;
  driveUploadImageService?: DriveUploadImageService;
  initialOpen?: boolean;
  kind: SdkworkIamOauthAccountKind;
  /** Pre-built shared operator controller. Omitted: built over `controller`. */
  officialAccounts?: OfficialAccountsController;
  onOpenCustomMenu?: (resourceAccountId: string) => void;
  permissions?: SdkworkIamOauthPagePermissions;
  /** Retired presentation props, accepted and ignored. */
  accounts?: readonly unknown[];
  common?: unknown;
  listPageInfo?: unknown;
  messages?: unknown;
  onChanged?: () => void;
  status?: string;
  switchMessages?: unknown;
}): ReactNode {
  const shared = useMemo(
    () => officialAccounts ?? createIamOauthOfficialAccountController(controller),
    [controller, officialAccounts],
  );
  const capabilities = useMemo(
    () => officialAccountCapabilitiesOf(permissions),
    [permissions],
  );
  // The section only ever rendered the official-account channel; the
  // mini-program page has its own shared panel.
  if (kind !== "official_account") return null;
  return (
    <SdkworkOfficialAccountsPanel
      capabilities={{ ...capabilities, editCredentials: capabilities.editCredentials && !disabled }}
      controller={shared}
      driveUploadImageService={driveUploadImageService}
      initialOpen={initialOpen}
      onOpenCustomMenu={onOpenCustomMenu}
    />
  );
}

/** Mini-program legal-domain categories, in the console's display order. */
const DOMAIN_KEYS = ["request", "socket", "uploadFile", "downloadFile", "business"] as const;

/** The WeChat console's Token / EncodingAESKey alphabet. */
const WECHAT_SECRET_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Generates a random alphanumeric secret with the WeChat console alphabet.
 * @param length - the number of characters to produce.
 * @returns a fresh secret of exactly `length` letters/digits.
 */
function randomWechatSecret(length: number): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  let result = "";
  for (let index = 0; index < length; index += 1) {
    result += WECHAT_SECRET_CHARS[values[index] % WECHAT_SECRET_CHARS.length];
  }
  return result;
}

/** WeChat server-config token: 3-32 alphanumeric characters; 32 is generated. */
export function generateWechatToken(): string {
  return randomWechatSecret(32);
}

/** WeChat EncodingAESKey: exactly 43 alphanumeric characters. */
export function generateWechatEncodingAesKey(): string {
  return randomWechatSecret(43);
}

/** One configured domain and the protected-domain sets it appears under. */
export type ConfiguredDomain = {
  domain: string;
  kinds: string[];
};

/**
 * Collects every configured domain and the protected-domain sets it appears
 * under, deduplicated per domain.
 *
 * Official accounts contribute the three console sets; a legacy `webDomain`
 * folds into the web-authorization set exactly as `readOfficialDomainSets` does,
 * so the account's verification-file checklist never lists the same host twice
 * or shows a set the drawer no longer renders.
 *
 * @param config - the account's provider configuration document.
 * @param kind - `mini_program` or `official_account`.
 * @returns the deduplicated domain list.
 */
export function collectConfiguredDomains(
  config: SdkworkIamOauthAccountConfig,
  kind: string,
): ConfiguredDomain[] {
  const byDomain = new Map<string, string[]>();
  const add = (value: string, domainKind: string) => {
    const normalized = value.trim().replace(/^(https?|wss?):\/\//u, "").replace(/\/+$/u, "");
    if (!normalized) {
      return;
    }
    const kinds = byDomain.get(normalized) ?? [];
    if (!kinds.includes(domainKind)) {
      kinds.push(domainKind);
    }
    byDomain.set(normalized, kinds);
  };
  if (kind === "mini_program") {
    // Mini program domains: request / socket / uploadFile / downloadFile
    // legal domains plus web-view business domains.
    for (const key of DOMAIN_KEYS) {
      for (const value of config.domains?.[key] ?? []) {
        add(value, key);
      }
    }
    return [...byDomain.entries()].map(([domain, kinds]) => ({ domain, kinds }));
  }
  // Official account domains: the three WeChat console sets. All three share
  // the account's single verification file.
  const sets = readOfficialDomainSets(config);
  for (const value of sets.webAuthDomains) {
    add(value, "webAuth");
  }
  for (const value of sets.jsSecureDomains) {
    add(value, "jsSecure");
  }
  for (const value of sets.businessDomains) {
    add(value, "business");
  }
  return [...byDomain.entries()].map(([domain, kinds]) => ({ domain, kinds }));
}
