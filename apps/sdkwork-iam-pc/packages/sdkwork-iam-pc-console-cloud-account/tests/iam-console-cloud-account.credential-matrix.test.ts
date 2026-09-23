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
  IAM_CLOUD_ACCOUNT_SCOPE_LEVELS,
  IAM_CLOUD_ACCOUNT_SECRETLESS_TYPES,
  IAM_CLOUD_ACCOUNT_TYPES,
  IAM_CLOUD_ACCOUNT_TYPE_TEMPORARY_CREDENTIAL,
  iamCloudAccountCredentialFields,
  iamCloudAccountTypeCredentialKind,
  listIamCloudAccountVendorRegions,
} from "@sdkwork/iam-contracts";

import { sdkworkIamCloudAccountConsoleMessages as enMessages } from "../src/i18n/en-US/iam/cloud-account/workspace";
import {
  credentialFieldLabel,
  credentialKindName,
  credentialNotNeededFor,
  credentialShapeHintFor,
  kindHintForKind,
  regionHintFor,
  secretLabelForKind,
  vendorConfigFor,
  type SdkworkIamCloudAccountConsoleMessages,
} from "../src/index";
import { sdkworkIamCloudAccountConsoleMessages as zhMessages } from "../src/i18n/zh-CN/iam/cloud-account/workspace";

/**
 * The identity-shape × provider matrix, asserted rather than eyeballed.
 *
 * Every cell of that matrix is a claim about what the register form will show, and
 * the reproduction shape is one shape: a form that renders the *same* boxes, or the
 * *same words on different boxes*, for shapes the contract treats as different.
 * Both happened — the register form asked for no credential at all, and then, once
 * it did, eight providers out of ten put one word on the single-secret field
 * regardless of what the identity shape said that field held.
 *
 * So this file asserts the two properties that make the form honest, over all
 * 7 shapes × 11 providers × 2 catalogs, and it tests the *real* resolvers
 * (`credentialFieldLabel`, `secretLabelForKind`, `kindHintForKind`) rather than a
 * copy of them, so the page and the gate cannot drift apart.
 */
const CATALOGS: readonly (readonly [string, SdkworkIamCloudAccountConsoleMessages])[] = [
  ["zh-CN", zhMessages],
  ["en-US", enMessages],
];

/**
 * Every provider the form can be pointed at: the picker's own list, plus a code it
 * has never heard of. The extra one is not padding — `vendor_code` is only
 * shape-checked server-side, so an account naming a provider this build does not
 * know is a real row the form has to render.
 */
const PROVIDERS: readonly string[] = [...IAM_CLOUD_ACCOUNT_KNOWN_VENDOR_CODES, "some-future-cloud"];

/** The three kinds whose whole secret is one block of text — and hence share one field. */
const SINGLE_SECRET_KINDS = [
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_BEARER_TOKEN,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SECRET_TEXT,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SERVICE_ACCOUNT_JSON,
] as const;

/**
 * The form items one identity shape renders for one provider, exactly as the page
 * resolves them: the word above the box, and the box's own field.
 *
 * Both halves are kept because either alone is satisfiable while the form is
 * wrong: identical *labels* on a pair is the bug that was fixed, and identical
 * *fields* across shapes is the contract's own design (`service_account` and
 * `api_key` are one blob each). The pair is what the operator actually sees.
 */
function formItems(
  messages: SdkworkIamCloudAccountConsoleMessages,
  vendorCode: string,
  accountType: string,
): readonly string[] {
  const config = vendorConfigFor(vendorCode, messages);
  const kind = iamCloudAccountTypeCredentialKind(accountType);
  return iamCloudAccountCredentialFields(accountType).map(
    (field) => `${credentialFieldLabel(field, kind, config, messages)} (${field})`,
  );
}

/**
 * Everything one identity shape puts on screen for one provider — the fields, or
 * the one sentence that stands where the fields would be.
 *
 * The empty half is *part of the comparison*, not an exemption from it: a shape
 * that asks for nothing still renders something the operator reads, and the three
 * shapes that do that are empty for three different reasons (a role the cloud
 * service assumes, an assertion an external issuer signs, an identity with no
 * secret material at all). Comparing only the shapes with fields is exactly how a
 * single shared sentence for all three stayed invisible.
 */
function formRendering(
  messages: SdkworkIamCloudAccountConsoleMessages,
  vendorCode: string,
  accountType: string,
): string {
  const items = formItems(messages, vendorCode, accountType);
  return items.length > 0 ? items.join(" | ") : credentialNotNeededFor(accountType, messages);
}

describe("cloud account credential form matrix", () => {
  it("names every item it draws, for every shape and provider", () => {
    for (const [locale, messages] of CATALOGS) {
      for (const vendor of PROVIDERS) {
        for (const accountType of IAM_CLOUD_ACCOUNT_TYPES) {
          const where = `${locale} / ${vendor} / ${accountType}`;
          const items = formItems(messages, vendor, accountType);
          for (const item of items) {
            // `formItems` renders `${label} (${field})`, so a label that came back
            // empty leaves the string starting with the separator.
            expect(item.startsWith(" ("), `${where} drew a field with no name: ${item}`).toBe(false);
          }
          if (items.length > 0) {
            const kind = iamCloudAccountTypeCredentialKind(accountType);
            const config = vendorConfigFor(vendor, messages);
            expect(kindHintForKind(kind, config), `${where} shows no hint`).not.toBe("");
          }
        }
      }
    }
  });

  it("renders a different form for every identity shape, secret-less ones included", () => {
    // All seven, not the four that ask for something. The three shapes that render
    // no field are compared by the reason they render instead, because that reason
    // is the only thing on screen and the only thing the operator can act on — and
    // it is per shape: a role is granted on the provider's side, an OIDC issuer is
    // configured there, a managed identity is bound to a resource there.
    for (const [locale, messages] of CATALOGS) {
      for (const vendor of PROVIDERS) {
        const seen = new Map<string, string>();
        for (const accountType of IAM_CLOUD_ACCOUNT_TYPES) {
          const key = formRendering(messages, vendor, accountType);
          expect(key, `${locale} / ${vendor}: ${accountType} renders nothing at all`).not.toBe("");
          const twin = seen.get(key);
          expect(
            twin,
            `${locale} / ${vendor}: ${accountType} renders the same form as ${twin}: ${key}`,
          ).toBeUndefined();
          seen.set(key, accountType);
        }
        // Every shape reached the comparison, so "all distinct" is a statement
        // about seven shapes rather than about however many had fields.
        expect(seen.size).toBe(IAM_CLOUD_ACCOUNT_TYPES.length);
      }
    }
  });

  it("gives each secret-less shape its own reason, never one sentence for the family", () => {
    // The failure this asserts against is cheap to reintroduce: point the page at
    // one shared sentence again (that is what it did), and three shapes that mean
    // three different things all tell the operator the same story. Only the reason
    // tells them apart, so the reason is what is checked — per catalog, and against
    // the unknown-shape fallback too, which must not be a fourth way of saying one
    // of the three.
    for (const [locale, messages] of CATALOGS) {
      const reasons = IAM_CLOUD_ACCOUNT_SECRETLESS_TYPES.map((accountType) => ({
        accountType,
        reason: credentialNotNeededFor(accountType, messages),
      }));
      expect(reasons.length).toBeGreaterThan(1);
      for (const { accountType, reason } of reasons) {
        expect(reason, `${locale} / ${accountType} shows no reason`).not.toBe("");
      }
      expect(
        new Set(reasons.map(({ reason }) => reason)).size,
        `${locale} gives the secret-less shapes the same reason: ${reasons
          .map(({ accountType, reason }) => `${accountType}="${reason}"`)
          .join(", ")}`,
      ).toBe(reasons.length);
      // And the reason names the shape by the word the picker itself shows, so the
      // operator reads back what they chose. This is the name/field consistency rule
      // in its checkable form: a sentence that says "联邦身份" over a picker that says
      // "联合身份" is a mismatch, and it is exactly the one this caught.
      for (const { accountType, reason } of reasons) {
        const pickerWord = (
          messages.accountType as Readonly<Record<string, string | undefined>>
        )[accountType];
        expect(pickerWord, `${locale} has no picker label for ${accountType}`).toBeTruthy();
        expect(
          reason.toLowerCase(),
          `${locale} / ${accountType}: the reason does not use the picker's own word "${pickerWord}"`,
        ).toContain(String(pickerWord).toLowerCase());
      }
      // A shape this build has never heard of gets its own wording rather than one
      // of the three — borrowing another shape's reason would assert a fact about a
      // shape nobody here has seen.
      for (const { reason } of reasons) {
        expect(credentialNotNeededFor("some-future-identity", messages)).not.toBe(reason);
      }
    }
  });

  it("never puts one shape's word on another shape's secret, for any provider", () => {
    for (const [locale, messages] of CATALOGS) {
      for (const vendor of PROVIDERS) {
        const config = vendorConfigFor(vendor, messages);
        const serviceAccountLabel = credentialFieldLabel(
          IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT,
          IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SERVICE_ACCOUNT_JSON,
          config,
          messages,
        );
        const apiKeyLabel = credentialFieldLabel(
          IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT,
          IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SECRET_TEXT,
          config,
          messages,
        );
        // The two shapes the register form can actually reach through the identity
        // picker, and the pair that used to share one word.
        expect(
          serviceAccountLabel,
          `${locale} / ${vendor}: "service_account" and "api_key" both say "${apiKeyLabel}"`,
        ).not.toBe(apiKeyLabel);
      }
    }
  });

  it("gives all three single-secret kinds their own word and their own directions, for every provider", () => {
    // The credential dialog picks a kind directly, so it can reach `bearer_token`
    // where no identity shape can. All three share one field, so the only thing
    // telling them apart is the word — and two of them sharing a word is the defect
    // this asserts against.
    //
    // The hint is held to the same rule because it is the half that sends the
    // operator somewhere: a page that issues API keys is not a page that mints a
    // service-account key document, so a hint collapsed to one sentence for all
    // three is as wrong as a label collapsed to one word.
    for (const [locale, messages] of CATALOGS) {
      for (const vendor of PROVIDERS) {
        const config = vendorConfigFor(vendor, messages);
        const labels = SINGLE_SECRET_KINDS.map((kind) => secretLabelForKind(kind, config));
        for (const label of labels) {
          expect(label, `${locale} / ${vendor}: a single-secret kind has no name`).not.toBe("");
        }
        expect(new Set(labels).size, `${locale} / ${vendor} names two kinds "${labels.join('", "')}"`).toBe(
          labels.length,
        );
        const hints = SINGLE_SECRET_KINDS.map((kind) => kindHintForKind(kind, config));
        for (const hint of hints) {
          expect(hint, `${locale} / ${vendor}: a single-secret kind has no directions`).not.toBe("");
        }
        expect(
          new Set(hints).size,
          `${locale} / ${vendor} sends two kinds to the same place: "${hints.join('", "')}"`,
        ).toBe(hints.length);
      }
    }
  });

  it("names a stored credential by the word the form that wrote it used, for every provider", () => {
    // The register form and the credential listing are two surfaces describing one
    // row, and they were resolving its name from two different tables: the form from
    // the provider's words, the listing from the platform's kind vocabulary. So a
    // Google API key was typed into a field called "API 密钥" and then listed as
    // "密钥文本" — a word the operator never chose, never saw on the way in, and
    // cannot act on. The rule the form already follows is the one the name shown
    // back has to follow too.
    //
    // The pair kind is deliberately not resolved through the provider: a pair is
    // *two* field names, not one word, so a provider has no single name to lend and
    // the platform's own name for that envelope is the only honest answer. What is
    // asserted for it is that it stays that envelope name rather than drifting into
    // one of the blob words.
    for (const [locale, messages] of CATALOGS) {
      for (const vendor of PROVIDERS) {
        const config = vendorConfigFor(vendor, messages);
        for (const kind of IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS) {
          const shown = credentialKindName(kind, config, messages);
          expect(shown, `${locale} / ${vendor} / ${kind}: the listing shows no name`).not.toBe("");
          if (kind === IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR) {
            expect(shown, `${locale} / ${vendor}: a key pair is listed as "${shown}"`).toBe(
              messages.credentialKind[kind],
            );
            continue;
          }
          const formWord = credentialFieldLabel(
            IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT,
            kind,
            config,
            messages,
          );
          expect(
            shown,
            `${locale} / ${vendor} / ${kind}: the form asked for "${formWord}", the listing calls it "${shown}"`,
          ).toBe(formWord);
        }
      }
    }
  });

  it("asks for the session token beside exactly one shape's key pair", () => {
    for (const [locale, messages] of CATALOGS) {
      for (const vendor of PROVIDERS) {
        const asking = IAM_CLOUD_ACCOUNT_TYPES.filter((accountType) =>
          iamCloudAccountCredentialFields(accountType).includes(
            IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SESSION_TOKEN,
          ),
        );
        // The token is the third part of an STS-style grant: it proves the pair was
        // issued by the provider, so it means nothing without a pair and belongs to
        // the one shape that expires.
        expect(asking, `${locale} / ${vendor}: the session token is asked for by ${asking.join(", ")}`).toEqual([
          IAM_CLOUD_ACCOUNT_TYPE_TEMPORARY_CREDENTIAL,
        ]);
        const fields = iamCloudAccountCredentialFields(IAM_CLOUD_ACCOUNT_TYPE_TEMPORARY_CREDENTIAL);
        expect(fields).toContain(IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID);
        expect(fields).toContain(IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_SECRET);
      }
    }
  });

  it("describes the selected identity shape, never the whole family at once", () => {
    // The shape is the only axis that decides how many boxes are drawn, so the
    // sentence over them is a claim about *that* shape. What this replaced was one
    // paragraph enumerating all four, which made the operator read four
    // configurations to find theirs and read as a description of the wrong one as
    // soon as the selected shape was not the first listed.
    //
    // Three properties, each of which a shared paragraph fails: every shape that
    // draws a box has a sentence, no two shapes share one, and each uses the word the
    // identity picker itself shows — so the sentence and the shape it describes
    // cannot come out as two different names for one thing.
    for (const [locale, messages] of CATALOGS) {
      const drawing = IAM_CLOUD_ACCOUNT_TYPES.filter(
        (accountType) => iamCloudAccountCredentialFields(accountType).length > 0,
      );
      expect(drawing.length, `${locale}: no shape draws a credential box`).toBeGreaterThan(0);
      const written = drawing.map((accountType) => ({
        accountType,
        hint: credentialShapeHintFor(accountType, messages),
      }));
      for (const { accountType, hint } of written) {
        expect(hint, `${locale} / ${accountType} says nothing about its own boxes`).not.toBe("");
      }
      expect(
        new Set(written.map(({ hint }) => hint)).size,
        `${locale} gives two shapes one sentence: ${written
          .map(({ accountType, hint }) => `${accountType}="${hint}"`)
          .join(", ")}`,
      ).toBe(written.length);
      for (const { accountType, hint } of written) {
        const pickerWord = (
          messages.accountType as Readonly<Record<string, string | undefined>>
        )[accountType];
        expect(pickerWord, `${locale} has no picker label for ${accountType}`).toBeTruthy();
        expect(
          hint.toLowerCase(),
          `${locale} / ${accountType}: the sentence does not use the picker's own word "${pickerWord}"`,
        ).toContain(String(pickerWord).toLowerCase());
      }
      // The other half of the split: a shape that draws nothing states *why* it draws
      // nothing, and must not also claim a sentence about boxes it never draws. Keyed
      // over the contract's own secret-less tuple, so the two sets partition the
      // vocabulary rather than overlapping.
      for (const accountType of IAM_CLOUD_ACCOUNT_SECRETLESS_TYPES) {
        expect(
          credentialShapeHintFor(accountType, messages),
          `${locale} / ${accountType} claims a sentence about boxes it does not draw`,
        ).toBe("");
      }
      // And a shape this build has never heard of reads as neither: the bridge gives
      // it no credential kind, so it draws nothing and gets the unknown reason.
      expect(credentialShapeHintFor("some-future-identity", messages)).toBe("");
    }
  });

  it("describes the region field the way the provider makes it behave", () => {
    // The field is a combobox for a provider that publishes regions and free text for
    // one that does not, and the two need different sentences: the candidate sentence
    // opens by promising a list, which is exactly the thing missing for `cloudflare`,
    // `minio` and `custom`. Resolved from the same call the field's own options come
    // from, so the hint cannot end up describing a control it is not attached to.
    for (const [locale, messages] of CATALOGS) {
      expect(
        messages.create.regionHint,
        `${locale}: the two region hints are the same sentence`,
      ).not.toBe(messages.create.regionHintNoCandidates);
      const publishes: string[] = [];
      const publishesNone: string[] = [];
      for (const vendor of PROVIDERS) {
        expect(regionHintFor(vendor, messages), `${locale} / ${vendor} shows no region hint`).not.toBe("");
        (listIamCloudAccountVendorRegions(vendor).length > 0 ? publishes : publishesNone).push(vendor);
      }
      // Both halves have to exist, or the comparison below is about one behaviour
      // wearing two names.
      expect(publishes.length, `${locale}: no provider publishes regions`).toBeGreaterThan(0);
      expect(publishesNone.length, `${locale}: every provider publishes regions`).toBeGreaterThan(0);
      for (const vendor of publishes) {
        expect(regionHintFor(vendor, messages), `${locale} / ${vendor}`).toBe(messages.create.regionHint);
      }
      for (const vendor of publishesNone) {
        expect(regionHintFor(vendor, messages), `${locale} / ${vendor}`).toBe(
          messages.create.regionHintNoCandidates,
        );
      }
    }
  });

  it("never names another provider's field in the account-id hint", () => {
    // The label above the box is the *chosen* provider's own word for that value
    // (`阿里云账号 ID`, `订阅 ID`, `项目 ID`), so a hint underneath listing a second
    // provider's terms is stating a fact about a provider the operator is not looking
    // at — the same defect as labelling a Tencent Cloud field `AccessKey ID`, just
    // pointed the other way. The provider's own wording is already carried by
    // `accountIdLabel` and `accountIdPlaceholder`, so the hint needs none of it.
    for (const [locale, messages] of CATALOGS) {
      const hint = messages.create.accountIdHint.toLowerCase();
      for (const vendor of PROVIDERS) {
        const ownLabel = vendorConfigFor(vendor, messages).accountIdLabel.toLowerCase();
        expect(
          hint,
          `${locale}: the account-id hint names ${vendor}'s own label "${ownLabel}"`,
        ).not.toContain(ownLabel);
      }
    }
  });

  it("names the ownership level the default-account sentence is scoped to", () => {
    // The ownership picker is withheld when the caller may act on a single level —
    // which is the console's whole shape — so a sentence referring to "this level"
    // points at a control that is not on screen. The placeholder is what makes it true
    // in both shapes of the form, and it has to resolve to a different line per level
    // or the sentence is not naming the level at all.
    for (const [locale, messages] of CATALOGS) {
      expect(
        messages.create.isDefault,
        `${locale}: the default-account label has no {scope} placeholder`,
      ).toContain("{scope}");
      const rendered = IAM_CLOUD_ACCOUNT_SCOPE_LEVELS.map((level) => ({
        level,
        line: messages.create.isDefault.replaceAll("{scope}", messages.scope[level]),
      }));
      for (const { level, line } of rendered) {
        expect(line, `${locale} / ${level}: the label still carries a placeholder`).not.toContain("{");
        expect(
          line.toLowerCase(),
          `${locale} / ${level}: the label does not use the level's own word`,
        ).toContain(messages.scope[level].toLowerCase());
      }
      expect(
        new Set(rendered.map(({ line }) => line)).size,
        `${locale}: two levels render one label`,
      ).toBe(rendered.length);
    }
  });

  it("prints the matrix the two properties above are asserted over", () => {
    // Kept as printed evidence: this is the artefact that made the naming defect
    // visible in the first place, and it is cheap to regenerate.
    const zh = zhMessages;
    const lines: string[] = [];
    for (const accountType of IAM_CLOUD_ACCOUNT_TYPES) {
      const kind = iamCloudAccountTypeCredentialKind(accountType);
      const fields = iamCloudAccountCredentialFields(accountType);
      const secretless = (IAM_CLOUD_ACCOUNT_SECRETLESS_TYPES as readonly string[]).includes(accountType);
      lines.push(
        `\n### ${accountType}  kind=${kind ?? "(none)"}${
          fields.length > 0 ? `  fields=[${fields.join(",")}]` : "  fields=[] — renders its reason instead:"
        }`,
      );
      for (const vendor of PROVIDERS) {
        const items = formItems(zh, vendor, accountType);
        const config = vendorConfigFor(vendor, zh);
        lines.push(
          `  ${vendor.padEnd(18)} ${(items.join(" / ") || "(nothing to type)").padEnd(58)} ${
            // A shape that renders no field renders no hint either — the form shows
            // the reason instead — so its cell says so rather than printing the
            // unknown-kind fallback, which nothing on screen ever shows.
            items.length === 0 ? "—" : kindHintForKind(kind, config)
          }`,
        );
      }
      if (secretless) {
        // Printed once per shape rather than once per provider: the reason belongs to
        // the shape, not to the provider, and repeating it eleven times would bury the
        // fact that it differs from the other two shapes' reasons.
        lines.push(`  ↳ reason: ${credentialNotNeededFor(accountType, zh)}`);
      }
    }
    console.log(lines.join("\n"));
    expect(lines.length).toBeGreaterThan(0);
  });
});
