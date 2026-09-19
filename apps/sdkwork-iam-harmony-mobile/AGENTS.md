<!-- SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`. -->
# SDKWork IAM HarmonyOS Mobile

`apps/sdkwork-iam-harmony-mobile` is the SDKWork IAM **HarmonyOS native mobile** client
application root.

## Authority

- `../../../sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md` — cross-client root,
  package taxonomy, route identity, dependency direction.
- `../../../sdkwork-specs/HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` — this architecture's root standard.
- `../../../sdkwork-specs/APP_HARMONY_NATIVE_UI_SPEC.md` — ArkUI package rules.
- `../../../sdkwork-specs/ENVIRONMENT_SPEC.md` — required runtime-environment keys and
  the native HarmonyOS materialization.

## Cross-client references

- Cross-architecture IAM contracts/runtime: `../../apps/sdkwork-iam-common/packages/`.
- Cross-client route identity: the same route ids as the PC, H5, Flutter and mini
  program IAM roots; only the physical page path differs.

## Layout

- `entry/` — the installable Harmony application entry and composition module:
  ability, bootstrap, providers, route/page projection. No product workflows.
- `packages/sdkwork-iam-harmony-mobile-core/` — runtime config, SDK factory contract, token manager,
  session store, host contracts, route registry.
- `packages/sdkwork-iam-harmony-mobile-commons/` — domain-neutral ArkUI primitives, design tokens,
  route contribution contract, locale helpers and the fragment loader.
- `packages/sdkwork-iam-harmony-mobile-shell/` — app shell, navigation and auth gate.
- `packages/sdkwork-iam-harmony-mobile-<capability>/` — one domain capability per package.
- `packages/sdkwork-iam-harmony-mobile-console-*/` — user-facing console family (app-api).
- `packages/sdkwork-iam-harmony-mobile-admin-*/` — internal operator family (backend-api, approved).
- `packages/sdkwork-iam-harmony-mobile-host/` — HarmonyOS platform adapters.
- `config/app/` — per-profile non-secret runtime documents.
- `config/host/` — bundle id, module ids, device types, permissions, signing and
  distribution references. No secrets and no business route constants.

## Non-negotiable rules

- `entry/` stays thin: composition and registry only. Business pages, components,
  view models, controllers, services, state, i18n and route contributions live in
  packages.
- Capability packages never construct SDK clients and never import generated SDK
  packages; the bootstrap constructs the client and injects it through the port the
  capability declares.
- Feature packages never call HarmonyOS system APIs, hold an ability context, or
  handle a raw want. Platform behaviour goes through the typed adapters in
  `packages/sdkwork-iam-harmony-mobile-host/`.
- Route ids align with every other client root; physical page paths may differ.

Owner: `sdkwork-iam` maintainers.
