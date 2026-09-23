import { describe, expect, it } from "vitest";

import {
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_SECRET,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SESSION_TOKEN,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_BEARER_TOKEN,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SECRET_TEXT,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SERVICE_ACCOUNT_JSON,
  IAM_CLOUD_ACCOUNT_KNOWN_VENDOR_CODES,
  IAM_CLOUD_ACCOUNT_PERMISSION_MANAGE_SHARED,
  IAM_CLOUD_ACCOUNT_PLATFORM_TENANT_ID,
  IAM_CLOUD_ACCOUNT_REGIONS_BY_VENDOR,
  IAM_CLOUD_ACCOUNT_SCOPE_ORGANIZATION,
  IAM_CLOUD_ACCOUNT_SCOPE_PLATFORM,
  IAM_CLOUD_ACCOUNT_SCOPE_TENANT,
  IAM_CLOUD_ACCOUNT_SCOPE_USER,
  IAM_CLOUD_ACCOUNT_SECRETLESS_TYPES,
  IAM_CLOUD_ACCOUNT_SINGLE_SECRET_CREDENTIAL_KINDS,
  IAM_CLOUD_ACCOUNT_TYPE_FEDERATED_IDENTITY,
  IAM_CLOUD_ACCOUNT_TYPE_LONG_TERM_KEY,
  IAM_CLOUD_ACCOUNT_TYPE_MANAGED_IDENTITY,
  IAM_CLOUD_ACCOUNT_TYPE_SERVICE_LINKED_ROLE,
  IAM_CLOUD_ACCOUNT_TYPE_TEMPORARY_CREDENTIAL,
  IAM_CLOUD_ACCOUNT_TYPES,
  iamCloudAccountCredentialFields,
  iamCloudAccountCredentialKindFields,
  iamCloudAccountTypeCredentialKind,
  iamCloudAccountVendorAcceptsRegion,
  isIamCloudAccountPlatformTenant,
  listIamCloudAccountVendorRegions,
  resolveIamCloudAccountManageableScopeLevels,
} from "../src/index.ts";

const SHARED = IAM_CLOUD_ACCOUNT_PERMISSION_MANAGE_SHARED;
const PLATFORM_TENANT = IAM_CLOUD_ACCOUNT_PLATFORM_TENANT_ID;

/**
 * The level projection is the one cloud-account rule that exists only on the
 * client — the server re-decides every write — so it is the only place a
 * divergence between the two host surfaces could hide.
 *
 * Two rules are pinned here, and they are different rules rather than one rule
 * with two flags:
 *
 * 1. **The console is personal-only.** Every grant and every tenant projects the
 *    same single level, because the page is the signed-in user's own area.
 * 2. **The admin surface mirrors the server's two *separate* gates.** The
 *    organization and tenant levels ride on `manage_shared`; `platform` takes
 *    that *and* platform-tenant membership, exactly as
 *    `model::resolve_account_scope` does before it will keep such a row.
 */
describe("cloud account scope vocabulary", () => {
  describe("the console surface", () => {
    it("is personal-only for every caller", () => {
      const codes = [
        [],
        [SHARED],
        ["unrelated.permission"],
        ["iam.provider_accounts.*"],
      ];
      const tenants = [undefined, "", PLATFORM_TENANT, "200002"];
      for (const granted of codes) {
        for (const tenantId of tenants) {
          expect(resolveIamCloudAccountManageableScopeLevels(granted, { tenantId })).toEqual([
            IAM_CLOUD_ACCOUNT_SCOPE_USER,
          ]);
        }
      }
    });

    it("stays personal-only even when the surface is named explicitly", () => {
      expect(
        resolveIamCloudAccountManageableScopeLevels([SHARED], {
          surface: "console",
          tenantId: PLATFORM_TENANT,
        }),
      ).toEqual([IAM_CLOUD_ACCOUNT_SCOPE_USER]);
    });

    it("never offers the platform level, which is the whole point of the surface", () => {
      // A platform operator browsing the console must not be handed the global
      // defaults: the console is where an ordinary user lands, and the level is
      // the operator's business.
      expect(
        resolveIamCloudAccountManageableScopeLevels([SHARED, "iam.provider_accounts.*"], {
          surface: "console",
          tenantId: PLATFORM_TENANT,
        }),
      ).not.toContain(IAM_CLOUD_ACCOUNT_SCOPE_PLATFORM);
    });
  });

  describe("the admin surface", () => {
    it("offers personal accounts to every caller", () => {
      expect(
        resolveIamCloudAccountManageableScopeLevels([], { surface: "admin" }),
      ).toEqual([IAM_CLOUD_ACCOUNT_SCOPE_USER]);
    });

    it("widens to organization and tenant on manage_shared but still without platform", () => {
      expect(
        resolveIamCloudAccountManageableScopeLevels([SHARED], { surface: "admin" }),
      ).toEqual([
        IAM_CLOUD_ACCOUNT_SCOPE_USER,
        IAM_CLOUD_ACCOUNT_SCOPE_ORGANIZATION,
        IAM_CLOUD_ACCOUNT_SCOPE_TENANT,
      ]);
    });

    it("withholds platform from the platform tenant when it holds no shared permission", () => {
      // Platform-tenant membership alone is not enough: the server requires the
      // shared permission too, so offering the level here would be a dead end.
      expect(
        resolveIamCloudAccountManageableScopeLevels([], {
          surface: "admin",
          tenantId: PLATFORM_TENANT,
        }),
      ).toEqual([IAM_CLOUD_ACCOUNT_SCOPE_USER]);
    });

    it("offers all four levels to the platform tenant holding manage_shared", () => {
      expect(
        resolveIamCloudAccountManageableScopeLevels([SHARED], {
          surface: "admin",
          tenantId: PLATFORM_TENANT,
        }),
      ).toEqual([
        IAM_CLOUD_ACCOUNT_SCOPE_USER,
        IAM_CLOUD_ACCOUNT_SCOPE_ORGANIZATION,
        IAM_CLOUD_ACCOUNT_SCOPE_TENANT,
        IAM_CLOUD_ACCOUNT_SCOPE_PLATFORM,
      ]);
    });

    it("withholds platform from an ordinary tenant that does hold manage_shared", () => {
      const levels = resolveIamCloudAccountManageableScopeLevels([SHARED], {
        surface: "admin",
        tenantId: "200002",
      });
      expect(levels).not.toContain(IAM_CLOUD_ACCOUNT_SCOPE_PLATFORM);
      // The narrower gate must not narrow the other two shared levels with it.
      expect(levels).toContain(IAM_CLOUD_ACCOUNT_SCOPE_ORGANIZATION);
      expect(levels).toContain(IAM_CLOUD_ACCOUNT_SCOPE_TENANT);
    });

    it("accepts a wildcard grant, because the server side does", () => {
      expect(
        resolveIamCloudAccountManageableScopeLevels(["iam.provider_accounts.*"], {
          surface: "admin",
        }),
      ).toContain(IAM_CLOUD_ACCOUNT_SCOPE_TENANT);
    });
  });

  it("never returns an empty list, which would leave the page with no level to render", () => {
    for (const surface of ["admin", "console"] as const) {
      for (const codes of [[], ["unrelated.permission"]]) {
        for (const tenantId of [undefined, "", PLATFORM_TENANT, "200002"]) {
          expect(
            resolveIamCloudAccountManageableScopeLevels(codes, { surface, tenantId }).length,
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  it("matches the platform tenant on trimmed equality rather than on a substring", () => {
    expect(isIamCloudAccountPlatformTenant(` ${PLATFORM_TENANT} `)).toBe(true);
    // The case a `startsWith`/`includes` implementation would wrongly accept.
    expect(isIamCloudAccountPlatformTenant(`${PLATFORM_TENANT}0`)).toBe(false);
    expect(isIamCloudAccountPlatformTenant(undefined)).toBe(false);
  });
});

/**
 * The region table is provided *here* rather than derived from the providers'
 * APIs, so it is hand-typed vocabulary with no type-level protection: a
 * misspelled code is still a `string`, and catalogs would happily grow a key for
 * it. What follows pins the three properties that *are* checkable — every
 * provider has a list, every code has the shape the providers use, and no
 * provider lists a region twice.
 *
 * A pure misspelling (`cn-hanzhou`) passes all three; only comparing against the
 * provider's own documentation catches that, and it is why the codes were taken
 * from there rather than typed from memory.
 */
describe("cloud account region table", () => {
  const table: Readonly<Record<string, readonly string[]>> = IAM_CLOUD_ACCOUNT_REGIONS_BY_VENDOR;

  it("carries a list for every provider the console offers, empty or not", () => {
    // A missing key is the failure mode worth pinning: an absent provider would
    // silently behave like `Cloudflare` (no candidates) instead of being noticed,
    // and `listIamCloudAccountVendorRegions` cannot distinguish the two.
    expect(Object.keys(table).sort()).toEqual([...IAM_CLOUD_ACCOUNT_KNOWN_VENDOR_CODES].sort());
  });

  it("lists only codes shaped the way the providers write them", () => {
    for (const [vendor, codes] of Object.entries(table)) {
      for (const code of codes) {
        // Lower-case, hyphen-separated, no padding: this is the shape every
        // provider uses, and a stray space or capital would not match a value
        // the operator typed from the provider's own documentation.
        expect(`${vendor}:${code}`).toMatch(/^[a-z]+:[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
      }
    }
  });

  it("never lists the same region twice for one provider", () => {
    for (const [vendor, codes] of Object.entries(table)) {
      expect(`${vendor}:${codes.length}`).toBe(`${vendor}:${new Set(codes).size}`);
    }
  });

  it("keeps the providers with no region concept empty rather than guessed at", () => {
    // Cloudflare is one anycast network and MinIO runs wherever it was installed,
    // so inventing candidates for them would offer regions that cannot be named.
    expect(listIamCloudAccountVendorRegions("cloudflare")).toEqual([]);
    expect(listIamCloudAccountVendorRegions("minio")).toEqual([]);
    expect(listIamCloudAccountVendorRegions("custom")).toEqual([]);
  });

  it("resolves a provider case- and padding-insensitively, and an unknown one to nothing", () => {
    expect(listIamCloudAccountVendorRegions("  Aliyun ")).toEqual(
      listIamCloudAccountVendorRegions("aliyun"),
    );
    expect(listIamCloudAccountVendorRegions("a-provider-this-build-never-heard-of")).toEqual([]);
    expect(listIamCloudAccountVendorRegions(undefined)).toEqual([]);
  });

  describe("the survival rule", () => {
    it("keeps an empty region, which is simply 'not chosen yet'", () => {
      expect(iamCloudAccountVendorAcceptsRegion("aliyun", "")).toBe(true);
      expect(iamCloudAccountVendorAcceptsRegion("aliyun", undefined)).toBe(true);
      expect(iamCloudAccountVendorAcceptsRegion("aliyun", "   ")).toBe(true);
    });

    it("drops a region the provider does not publish", () => {
      // `us-east-2` is AWS's; carrying it onto Alibaba Cloud would register the
      // account in a region that does not exist for that provider.
      expect(iamCloudAccountVendorAcceptsRegion("aliyun", "us-east-2")).toBe(false);
    });

    it("keeps a region both providers publish, because the operator still means it", () => {
      expect(iamCloudAccountVendorAcceptsRegion("aws", "ap-southeast-1")).toBe(true);
      expect(iamCloudAccountVendorAcceptsRegion("aliyun", "ap-southeast-1")).toBe(true);
    });

    it("matches on case and padding, so a typed-but-recognisable value survives", () => {
      // The field's own candidate matching is case-insensitive; a stricter rule
      // here would drop a region the provider does publish, which is the worse
      // error of the two.
      expect(iamCloudAccountVendorAcceptsRegion("aliyun", " CN-Hangzhou ")).toBe(true);
    });

    it("accepts nothing but an empty value for a provider with no regions", () => {
      expect(iamCloudAccountVendorAcceptsRegion("cloudflare", "")).toBe(true);
      expect(iamCloudAccountVendorAcceptsRegion("cloudflare", "cn-hangzhou")).toBe(false);
    });
  });
});

/**
 * Which credential fields a registration asks for.
 *
 * This is the rule that decides whether a newly registered account can be used at
 * all: an account is only resolvable once a credential exists for it, and nothing
 * on the server derives a credential kind from an account type — so a console
 * that asks nothing here can only produce accounts that resolve to nothing.
 *
 * The tests are written against the *bridge* (`iamCloudAccountTypeCredentialKind`)
 * rather than against a hand-copied expectation, because the point of deriving
 * the fields from it is that the two vocabularies cannot drift. What is pinned is
 * therefore the derivation itself plus the three answers that are policy:
 * a secret-less shape asks for nothing, exactly one shape carries a session
 * token, and an unknown shape is never guessed at.
 */
describe("cloud account credential fields", () => {
  it("asks a key pair for the two halves, and only those", () => {
    expect(iamCloudAccountCredentialFields(IAM_CLOUD_ACCOUNT_TYPE_LONG_TERM_KEY)).toEqual([
      IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID,
      IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_SECRET,
    ]);
  });

  it("agrees with the credential-kind bridge for every identity shape", () => {
    for (const accountType of IAM_CLOUD_ACCOUNT_TYPES) {
      const kind = iamCloudAccountTypeCredentialKind(accountType);
      const fields = iamCloudAccountCredentialFields(accountType);
      if (kind === undefined) {
        // The shapes the provider resolves out of band: no secret exists here, so
        // the only correct answer is to ask for nothing.
        expect(`${accountType}:${fields.length}`).toBe(`${accountType}:0`);
        continue;
      }
      if (kind === IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR) {
        expect(`${accountType}:${fields.slice(0, 2).join(",")}`).toBe(
          `${accountType}:${IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID},${IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_SECRET}`,
        );
        // A pair never falls back to the single-blob field, which would let a
        // secret be entered where only one of the two halves belongs.
        expect(fields).not.toContain(IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT);
        continue;
      }
      expect(`${accountType}:${fields.join(",")}`).toBe(
        `${accountType}:${IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT}`,
      );
    }
  });

  it("asks for the session token only where the shape says there is one", () => {
    // `temporary_credential` is the STS-style grant: a key pair *plus* the proof
    // that a token was issued. On every other shape the field would be a place to
    // paste something the provider never handed out.
    const asking = IAM_CLOUD_ACCOUNT_TYPES.filter((accountType) =>
      iamCloudAccountCredentialFields(accountType).includes(
        IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SESSION_TOKEN,
      ),
    );
    expect(asking).toEqual([IAM_CLOUD_ACCOUNT_TYPE_TEMPORARY_CREDENTIAL]);
  });

  it("names the three secret-less shapes explicitly rather than by omission", () => {
    for (const accountType of [
      IAM_CLOUD_ACCOUNT_TYPE_SERVICE_LINKED_ROLE,
      IAM_CLOUD_ACCOUNT_TYPE_FEDERATED_IDENTITY,
      IAM_CLOUD_ACCOUNT_TYPE_MANAGED_IDENTITY,
    ]) {
      expect(iamCloudAccountCredentialFields(accountType)).toEqual([]);
    }
  });

  it("asks nothing for a shape or an absence it has never heard of", () => {
    // A provider may publish a shape this build predates; inventing fields for it
    // would be inventing a secret the server has no column for.
    expect(iamCloudAccountCredentialFields(undefined)).toEqual([]);
    expect(iamCloudAccountCredentialFields("")).toEqual([]);
    expect(iamCloudAccountCredentialFields("workload_identity")).toEqual([]);
  });

  it("never answers with the single-blob field for a shape that needs no secret", () => {
    // The wrong-but-plausible implementation is "no bridge entry ⇒ ask for one
    // secret", which would put a key field on a managed identity.
    expect(iamCloudAccountCredentialFields(IAM_CLOUD_ACCOUNT_TYPE_MANAGED_IDENTITY)).not.toContain(
      IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT,
    );
  });
});

/**
 * The same rule, asked one level down — of a *credential kind* rather than of an
 * identity shape.
 *
 * The credential dialog picks a kind directly (it has no account type to consult),
 * so both the dialog and the register form have to agree on what each kind asks
 * for. `iamCloudAccountCredentialFields` is defined in terms of
 * `iamCloudAccountCredentialKindFields` for exactly that reason, and the first test
 * below is what holds them together: if the two ever disagree, the register form
 * and the dialog render different boxes for the same credential.
 */
describe("cloud account credential kind fields", () => {
  it("asks a key pair for the two halves, and every other kind for one secret", () => {
    expect(iamCloudAccountCredentialKindFields(IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR)).toEqual([
      IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID,
      IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_SECRET,
    ]);
    for (const kind of [
      IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_BEARER_TOKEN,
      IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SECRET_TEXT,
      IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SERVICE_ACCOUNT_JSON,
    ]) {
      expect(`${kind}:${iamCloudAccountCredentialKindFields(kind).join(",")}`).toBe(
        `${kind}:${IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT}`,
      );
    }
  });

  it("asks nothing for a kind it has never heard of", () => {
    // The dialog lets a kind reach it from a credential row written by a newer
    // console, so an unknown kind must render no box rather than a guessed one.
    expect(iamCloudAccountCredentialKindFields(undefined)).toEqual([]);
    expect(iamCloudAccountCredentialKindFields("")).toEqual([]);
    expect(iamCloudAccountCredentialKindFields("saml_assertion")).toEqual([]);
  });

  it("never drifts from the shape-level answer the register form renders", () => {
    // The delegation, asserted rather than assumed: for every shape whose kind is
    // known, the shape's fields are the kind's fields plus at most the session
    // token — and that token appears for exactly one shape.
    for (const accountType of IAM_CLOUD_ACCOUNT_TYPES) {
      const kind = iamCloudAccountTypeCredentialKind(accountType);
      if (kind === undefined) {
        continue;
      }
      const byKind = iamCloudAccountCredentialKindFields(kind);
      const byShape = iamCloudAccountCredentialFields(accountType);
      const withoutToken = byShape.filter(
        (field) => field !== IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SESSION_TOKEN,
      );
      expect(`${accountType}:${withoutToken.join(",")}`).toBe(`${accountType}:${byKind.join(",")}`);
    }
  });

  it("names exactly the kinds whose whole secret is one block of text", () => {
    // This list is the *reason* a provider's single-secret wording has to be keyed
    // by kind: these kinds share one field while holding different things, so a
    // catalogue that named the field rather than the kind would have to be wrong
    // about all but one of them.
    expect([...IAM_CLOUD_ACCOUNT_SINGLE_SECRET_CREDENTIAL_KINDS].sort()).toEqual(
      [
        IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_BEARER_TOKEN,
        IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SECRET_TEXT,
        IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SERVICE_ACCOUNT_JSON,
      ].sort(),
    );
    expect(IAM_CLOUD_ACCOUNT_SINGLE_SECRET_CREDENTIAL_KINDS).not.toContain(
      IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR,
    );
  });

  it("covers every credential kind the contract defines, with none named twice", () => {
    const single = IAM_CLOUD_ACCOUNT_SINGLE_SECRET_CREDENTIAL_KINDS;
    expect(new Set(single).size).toBe(single.length);
    // Everything but the pair, which is the one kind with two fields.
    expect(single.length).toBe(IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS.length - 1);
    for (const kind of IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS) {
      if (kind === IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR) {
        expect(single).not.toContain(kind);
      } else {
        expect(single).toContain(kind);
      }
    }
  });

  it("offers one kind no identity shape can reach, and keeps it in the list anyway", () => {
    // `bearer_token` is a real credential kind — the dialog can store one, and a
    // provider may issue one — but no identity shape maps to it: the bridge sends
    // `api_key` to `secret_text` and `service_account` to `service_account_json`.
    // Pinned here because it is the asymmetry a catalogue must not paper over: the
    // dialog has to name a kind the register form never asks for, so a wording table
    // keyed only by the shapes the register form can reach would leave it blank.
    const reachable = IAM_CLOUD_ACCOUNT_TYPES.map((accountType) =>
      iamCloudAccountTypeCredentialKind(accountType),
    );
    expect(reachable).not.toContain(IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_BEARER_TOKEN);
    expect(IAM_CLOUD_ACCOUNT_SINGLE_SECRET_CREDENTIAL_KINDS).toContain(
      IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_BEARER_TOKEN,
    );
  });

  it("names exactly the shapes the bridge says hold no credential", () => {
    // Checked against the bridge in both directions rather than against a second
    // hand-written list: a shape whose kind is removed from
    // `IAM_CLOUD_ACCOUNT_TYPE_CREDENTIAL_KINDS` has to be worded here, and every
    // shape listed here has to genuinely have no credential kind.
    const perBridge = IAM_CLOUD_ACCOUNT_TYPES.filter(
      (accountType) => iamCloudAccountTypeCredentialKind(accountType) === undefined,
    );
    expect([...IAM_CLOUD_ACCOUNT_SECRETLESS_TYPES].sort()).toEqual([...perBridge].sort());
    expect(IAM_CLOUD_ACCOUNT_SECRETLESS_TYPES.length).toBeGreaterThan(0);
    for (const accountType of IAM_CLOUD_ACCOUNT_SECRETLESS_TYPES) {
      expect(iamCloudAccountCredentialFields(accountType)).toEqual([]);
    }
  });

  it("keeps the three secret-less shapes apart instead of treating them as one case", () => {
    // They share an empty field list and nothing else: a cloud service assumes a
    // service-linked role on the owner's behalf, an external issuer signs the
    // assertion a federated identity trades, and a managed identity has no secret
    // material at all. A catalogue that worded one sentence for the family would
    // tell the operator holding a SAML assertion there is nothing to configure, and
    // never tell the operator registering a role that the role is granted
    // elsewhere — so the three are pinned as three, and the count is pinned too so
    // that adding a fourth shape is a decision rather than a silent widening.
    expect(new Set(IAM_CLOUD_ACCOUNT_SECRETLESS_TYPES).size).toBe(
      IAM_CLOUD_ACCOUNT_SECRETLESS_TYPES.length,
    );
    expect(IAM_CLOUD_ACCOUNT_SECRETLESS_TYPES.length).toBe(3);
  });
});
