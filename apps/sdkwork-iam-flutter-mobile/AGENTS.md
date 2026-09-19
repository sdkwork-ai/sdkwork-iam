<!-- SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`. -->
# SDKWork IAM Flutter Mobile

`apps/sdkwork-iam-flutter-mobile` is the SDKWork IAM **Flutter Mobile** client application root.

## Authority

- `../../../sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md` — cross-client root,
  package taxonomy, route identity, dependency direction.
- `../../../sdkwork-specs/FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md` — this architecture's root standard.
- `../../../sdkwork-specs/APP_FLUTTER_UI_SPEC.md` — package UI rules.

## Cross-client references

- Cross-architecture IAM contracts/runtime: `../../apps/sdkwork-iam-common/packages/`.
- OAuth runtime discovery: `../../../sdkwork-specs/IAM_OAUTH_SPEC.md`, consumed by
  `packages/sdkwork_iam_flutter_mobile_core` through the IAM contracts boundary.

## Layout

- `packages/sdkwork_iam_flutter_mobile_core/` — runtime config, SDK factory contract, token manager,
  session store, host contracts, route registry.
- `packages/sdkwork_iam_flutter_mobile_commons/` — domain-neutral widgets, design tokens, route
  contribution contract, locale bundle loader.
- `packages/sdkwork_iam_flutter_mobile_shell/` — app shell and route assembly.
- `packages/sdkwork_iam_flutter_mobile_<capability>/` — one domain capability per package.
- `packages/sdkwork_iam_flutter_mobile_console_*/` — user-facing console family (app-api).
- `packages/sdkwork_iam_flutter_mobile_admin_*/` — internal operator family (backend-api, approved).
- `lib/bootstrap/` — bootstrap only (environment, runtime, SDK clients, IAM runtime, host adapters, routes).
- `lib/` (root) — thin entry and shell only.
- `env/` — per-profile dart-define runtime documents.

## Non-negotiable rules

- Screens, widgets, controllers, services, state, i18n and route contributions live in
  packages, not in the root entry.
- Capability packages never construct SDK clients and never import generated SDK packages;
  the bootstrap constructs them and the tier core injects them.
- Widgets and services never call platform plugins or method channels directly; they depend
  on the host adapter contracts in `packages/sdkwork_iam_flutter_mobile_core/lib/src/host/`.

Owner: `sdkwork-iam` maintainers.
