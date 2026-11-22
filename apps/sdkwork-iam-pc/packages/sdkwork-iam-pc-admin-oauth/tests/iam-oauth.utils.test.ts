import { describe, expect, it } from "vitest";

import {
  buildProviderPlatforms,
  formatResourceLabel,
  readAuthorizationStatus,
  readEnabled,
  readProviderClientSecret,
  templateMessage,
} from "../src/utils/oauth-admin-utils";
import {
  collectConfiguredDomains,
  generateWechatEncodingAesKey,
  generateWechatToken,
} from "../src/components/oauth-account-setup-section";
import {
  buildAccountCallbackUri,
  buildDomainVerifyFileUrl,
  findOfficialDomainIssues,
  isWechatVerifyFileName,
  normalizeOfficialDomain,
  normalizeOfficialDomainConfig,
  readCallbackHost,
  readOfficialDomainSets,
} from "../src/utils/official-account-domains";

describe("SDKWork IAM OAuth admin utils", () => {
  describe("templateMessage", () => {
    it("replaces {key} placeholders", () => {
      expect(templateMessage("Configured integrations ({count})", { count: "3" }))
        .toBe("Configured integrations (3)");
      expect(templateMessage("登录 {name} 账号", { name: "微信" })).toBe("登录 微信 账号");
    });
  });

  describe("formatResourceLabel", () => {
    it("falls back to the default copy when none is provided", () => {
      expect(formatResourceLabel({ displayName: "WeChat login", providerCode: "wechat", enabled: true }))
        .toBe("WeChat login (wechat) [enabled]");
      expect(formatResourceLabel({}))
        .toBe("Resource");
    });

    it("localizes status markers with the provided copy", () => {
      const copy = { disabled: "已禁用", enabled: "已启用", resource: "资源" };
      expect(formatResourceLabel({ displayName: "微信登录", providerCode: "wechat", enabled: true }, copy))
        .toBe("微信登录 (wechat) [已启用]");
      expect(formatResourceLabel({ displayName: "微信登录", enabled: false }, copy))
        .toBe("微信登录 [已禁用]");
      expect(formatResourceLabel({}, copy)).toBe("资源");
    });
  });

  describe("readEnabled", () => {
    it("reads JSON booleans", () => {
      expect(readEnabled({ enabled: true })).toBe(true);
      expect(readEnabled({ enabled: false })).toBe(false);
      expect(readEnabled({ is_enabled: true })).toBe(true);
    });

    it("reads the PostgreSQL integer 0/1 shape returned by the backend", () => {
      // iam_oauth_resource_account.enabled is an INTEGER column; list
      // responses carry it as a JSON number (the actual wire shape).
      expect(readEnabled({ enabled: 0, status: "active" })).toBe(false);
      expect(readEnabled({ enabled: 1, status: "active" })).toBe(true);
      expect(readEnabled({ is_enabled: 1 })).toBe(true);
    });

    it("falls back to status only when the enabled column is absent", () => {
      expect(readEnabled({ status: "active" })).toBe(true);
      expect(readEnabled({ status: "inactive" })).toBe(false);
      expect(readEnabled({})).toBeUndefined();
    });
  });

  describe("collectConfiguredDomains", () => {
    it("collects the legacy primary domain as the web-authorization set for official accounts", () => {
      const domains = collectConfiguredDomains({
        webDomain: "app.example.com",
        domains: {
          // Mini-program legal domains are not official-account concepts.
          request: ["https://api.example.com"],
          business: ["https://open.example.com"],
        },
      }, "official_account");
      expect(domains.map((item) => item.domain)).toEqual([
        "app.example.com",
        "open.example.com",
      ]);
      const app = domains.find((item) => item.domain === "app.example.com");
      expect(app?.kinds).toEqual(["webAuth"]);
    });

    it("normalizes scheme and trailing slashes", () => {
      const domains = collectConfiguredDomains({
        webDomain: "https://app.example.com/",
        domains: { request: ["https://api.example.com"] },
      }, "official_account");
      expect(domains[0].domain).toBe("app.example.com");
    });

    it("collects official account JS secure and business domains", () => {
      const domains = collectConfiguredDomains({
        webDomain: "app.example.com",
        jsSecureDomains: ["js.example.com", "app.example.com"],
        businessDomains: ["open.example.com"],
      }, "official_account");
      expect(domains.map((item) => item.domain)).toEqual([
        "app.example.com",
        "js.example.com",
        "open.example.com",
      ]);
      const app = domains.find((item) => item.domain === "app.example.com");
      expect(app?.kinds).toContain("webAuth");
      expect(app?.kinds).toContain("jsSecure");
      const js = domains.find((item) => item.domain === "js.example.com");
      expect(js?.kinds).toEqual(["jsSecure"]);
    });

    it("keeps legacy mini-program-shaped business domains visible", () => {
      const domains = collectConfiguredDomains({
        webDomain: "app.example.com",
        domains: { business: ["open.example.com"] },
      }, "official_account");
      const open = domains.find((item) => item.domain === "open.example.com");
      expect(open?.kinds).toEqual(["business"]);
    });

    it("returns an empty list without configured domains", () => {
      expect(collectConfiguredDomains({}, "official_account")).toEqual([]);
    });

    it("collects mini program legal domains without the web authorization domain", () => {
      const domains = collectConfiguredDomains({
        webDomain: "app.example.com",
        domains: {
          request: ["https://api.example.com"],
          socket: ["wss://ws.example.com"],
          business: ["https://open.example.com"],
        },
      }, "mini_program");
      expect(domains.map((item) => item.domain)).toEqual([
        "api.example.com",
        "ws.example.com",
        "open.example.com",
      ]);
      expect(domains.some((item) => item.domain === "app.example.com")).toBe(false);
    });
  });

  describe("official account protected-domain rules", () => {
    it("normalizes what the WeChat console stores", () => {
      expect(normalizeOfficialDomain("  HTTPS://App.Example.com/ ")).toBe("app.example.com");
      expect(normalizeOfficialDomain("app.example.com")).toBe("app.example.com");
      expect(normalizeOfficialDomain("sub.app.example.co.uk")).toBe("sub.app.example.co.uk");
    });

    it("rejects what the console rejects", () => {
      // Blank, IP literals, ports, query strings, wildcards and relative hosts.
      expect(normalizeOfficialDomain("")).toBeUndefined();
      expect(normalizeOfficialDomain("192.168.1.1")).toBeUndefined();
      expect(normalizeOfficialDomain("app.example.com:8443")).toBeUndefined();
      expect(normalizeOfficialDomain("app.example.com?x=1")).toBeUndefined();
      expect(normalizeOfficialDomain("*.example.com")).toBeUndefined();
      expect(normalizeOfficialDomain("localhost")).toBeUndefined();
      // A path is only valid on the business-domain set.
      expect(normalizeOfficialDomain("app.example.com/mp")).toBeUndefined();
    });

    it("accepts the business-domain path form", () => {
      expect(normalizeOfficialDomain("app.example.com/mp", { allowPath: true }))
        .toBe("app.example.com/mp");
      expect(normalizeOfficialDomain("https://app.example.com/mp/", { allowPath: true }))
        .toBe("app.example.com/mp");
    });

    it("folds the legacy shapes into the three console sets", () => {
      const sets = readOfficialDomainSets({
        domains: { business: ["open.example.com"] },
        jsSecureDomains: ["js.example.com"],
        webDomain: "app.example.com",
      });
      expect(sets.webAuthDomains).toEqual(["app.example.com"]);
      expect(sets.businessDomains).toEqual(["open.example.com"]);
      expect(sets.jsSecureDomains).toEqual(["js.example.com"]);
    });

    it("keeps a saved empty set instead of resurrecting the legacy value", () => {
      const sets = readOfficialDomainSets({
        businessDomains: [],
        domains: { business: ["open.example.com"] },
        webAuthDomains: [],
        webDomain: "app.example.com",
      });
      expect(sets.webAuthDomains).toEqual([]);
      expect(sets.businessDomains).toEqual([]);
    });

    it("prefers the dedicated web-authorization set over the legacy primary domain", () => {
      const sets = readOfficialDomainSets({
        webAuthDomains: ["auth.example.com"],
        webDomain: "app.example.com",
      });
      expect(sets.webAuthDomains).toEqual(["auth.example.com"]);
    });

    it("reports every stored value the console would reject", () => {
      const issues = findOfficialDomainIssues({
        businessDomains: ["open.example.com"],
        jsSecureDomains: ["js.example.com", "127.0.0.1"],
        webAuthDomains: ["https://auth.example.com"],
      });
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ index: 1, key: "jsSecureDomains", value: "127.0.0.1" });
    });

    it("normalizes, de-duplicates and retires the legacy business array on save", () => {
      const config = normalizeOfficialDomainConfig({
        domains: { business: ["open.example.com"] },
        jsSecureDomains: ["JS.Example.com", "js.example.com"],
        webDomain: "app.example.com",
      });
      expect(config.jsSecureDomains).toEqual(["js.example.com"]);
      expect(config.webAuthDomains).toEqual(["app.example.com"]);
      expect(config.businessDomains).toEqual(["open.example.com"]);
      expect(config.domains).toBeUndefined();
    });

    it("derives the callback URL from the first web-authorization domain", () => {
      expect(buildAccountCallbackUri({ webAuthDomains: ["auth.example.com"], webDomain: "app.example.com" }))
        .toBe("https://auth.example.com/oauth/callback");
      // Legacy accounts without the dedicated set keep their primary domain.
      expect(buildAccountCallbackUri({ webDomain: "app.example.com" }))
        .toBe("https://app.example.com/oauth/callback");
      expect(buildAccountCallbackUri({})).toBe("");
    });

    it("builds the console's verification-file address for hosts and paths", () => {
      expect(buildDomainVerifyFileUrl("app.example.com", "MP_verify_abc.txt"))
        .toBe("https://app.example.com/MP_verify_abc.txt");
      expect(buildDomainVerifyFileUrl("app.example.com/mp", "MP_verify_abc.txt"))
        .toBe("https://app.example.com/mp/MP_verify_abc.txt");
      expect(buildDomainVerifyFileUrl("app.example.com", "  ")).toBe("");
    });

    it("recognizes the issued verification-file name", () => {
      expect(isWechatVerifyFileName("MP_verify_gbyldF3oaEWKmrmn.txt")).toBe(true);
      expect(isWechatVerifyFileName("MP_verify.txt")).toBe(false);
      expect(isWechatVerifyFileName("verify.txt")).toBe(false);
    });

    it("reads the callback host for the console's callback-domain rule", () => {
      expect(readCallbackHost("https://App.Example.com/oauth/callback")).toBe("app.example.com");
      expect(readCallbackHost("not a url")).toBe("");
      expect(readCallbackHost("")).toBe("");
    });
  });

  describe("wechat secret generation", () => {
    it("generates a 32-character alphanumeric token", () => {
      const token = generateWechatToken();
      expect(token).toHaveLength(32);
      expect(/^[A-Za-z0-9]{32}$/u.test(token)).toBe(true);
    });

    it("generates a 43-character alphanumeric EncodingAESKey", () => {
      const key = generateWechatEncodingAesKey();
      expect(key).toHaveLength(43);
      expect(/^[A-Za-z0-9]{43}$/u.test(key)).toBe(true);
    });
  });

  describe("readAuthorizationStatus", () => {
    it("reads the authorization status from the account row", () => {
      expect(readAuthorizationStatus({ authorizationStatus: "authorized" })).toBe("authorized");
      expect(readAuthorizationStatus({ authorization_status: "pending" })).toBe("pending");
      expect(readAuthorizationStatus({})).toBe("");
    });
  });

  describe("readProviderClientSecret", () => {
    it("reads the echoed provider client secret from the account row", () => {
      expect(readProviderClientSecret({ providerClientSecret: "wx-secret-1" })).toBe("wx-secret-1");
      expect(readProviderClientSecret({ provider_client_secret: "wx-secret-2" })).toBe("wx-secret-2");
      expect(readProviderClientSecret({ providerClientSecret: "  " })).toBe("");
      expect(readProviderClientSecret({})).toBe("");
    });
  });

  describe("buildProviderPlatforms", () => {
    it("deduplicates catalog entries with the tenant entry winning", () => {
      const catalog = [
        { id: "global", providerCode: "wechat", providerName: "WeChat", ownerTenantId: "0" },
        { id: "tenant", providerCode: "wechat", providerName: "Tenant WeChat", ownerTenantId: "t1" },
      ];
      const platforms = buildProviderPlatforms(catalog, [], "en-US");
      expect(platforms).toHaveLength(1);
      expect(platforms[0].providerCode).toBe("wechat");
      expect(platforms[0].displayName).toBe("Tenant WeChat");
    });

    it("resolves display names by locale", () => {
      const catalog = [
        { providerCode: "wechat", providerName: "WeChat", providerDisplayName: "微信" },
      ];
      expect(buildProviderPlatforms(catalog, [], "zh-CN")[0].displayName).toBe("微信");
      expect(buildProviderPlatforms(catalog, [], "en-US")[0].displayName).toBe("WeChat");
    });

    it("keeps configured providers that are missing from the catalog", () => {
      const integrations = [
        { id: "iamoi-1", providerCode: "custom_oidc", enabled: true },
      ];
      const platforms = buildProviderPlatforms([], integrations, "en-US");
      expect(platforms).toHaveLength(1);
      expect(platforms[0].providerCode).toBe("custom_oidc");
      expect(platforms[0].integrations[0].integrationId).toBe("iamoi-1");
      expect(platforms[0].integrations[0].enabled).toBe(true);
    });

    it("groups integrations by provider code", () => {
      const catalog = [{ providerCode: "github", providerName: "GitHub" }];
      const integrations = [
        { id: "iamoi-1", providerCode: "github", enabled: false },
        { id: "iamoi-2", providerCode: "github", enabled: true },
      ];
      const platforms = buildProviderPlatforms(catalog, integrations, "en-US");
      expect(platforms[0].integrations).toHaveLength(2);
    });

    it("ignores integrations without a provider code", () => {
      const platforms = buildProviderPlatforms([], [{ id: "iamoi-1" }], "en-US");
      expect(platforms).toHaveLength(0);
    });
  });
});
