<!-- SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`. -->
# SDKWork IAM H5

`apps/sdkwork-iam-h5` is the SDKWork IAM **H5** client application root.

## Authority

- `../../../sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md` — cross-client root,
  package taxonomy, route identity, dependency direction, config alignment.
- `../../../sdkwork-specs/APP_H5_ARCHITECTURE_SPEC.md` — this architecture's root standard.
- `../../../sdkwork-specs/APP_MOBILE_REACT_UI_SPEC.md` — package UI rules.

## Cross-client references

- Cross-architecture IAM contracts/runtime: `../../apps/sdkwork-iam-common/packages/`.
- OAuth runtime discovery: `../../../sdkwork-specs/IAM_OAUTH_SPEC.md`, re-exported by `@sdkwork/iam-h5-core` from `@sdkwork/iam-contracts`.
- Owner: `sdkwork-iam` maintainers.

## Layout

- `packages/sdkwork-iam-h5-core/` — runtime config, SDK factories, session store,
  route registry (`src/modules/index.ts`), host adapter contracts.
- `packages/sdkwork-iam-h5-commons/` — domain-neutral UI primitives.
- `packages/sdkwork-iam-h5-shell/` — app shell and route assembly.
- `packages/sdkwork-iam-h5-<capability>/` — one domain capability per package.
- `packages/sdkwork-iam-h5-console-*/` — user-facing console family (app-api).
- `packages/sdkwork-iam-h5-admin-*/` — internal operator family (backend-api, approved).
- `src/bootstrap/` — bootstrap only (environment, runtime, SDK clients, IAM runtime, host adapters, routes).
- `src/` (root) — thin entry and composition only.
- `config/browser/` — per-profile non-secret runtime config.

## Non-negotiable rules

- Business screens, services, state, i18n and route contributions live in packages, not in the root entry.
- Capability packages never construct SDK clients and never import generated SDK packages; SDK clients are built in `sdkwork-iam-h5-core` and injected.
- Admin packages are `backend-admin` and use the generated backend SDK. They require the governance approval recorded in `specs/component.spec.json`.
- Route ids follow `<surface>.<domain>.<capability>.<screen>` and are identical across every IAM client root.
- Platform APIs stay behind typed host adapter contracts.
- Config is secret-free. Public runtime config loads before SDK client construction.

## Related standards for this root

- `PNPM_SCRIPT_SPEC.md` — package script names and the `_sdkwork:*` lifecycle.
- `GITHUB_WORKFLOW_SPEC.md` — CI and release workflow contract.
- `PAGINATION_SPEC.md` — list endpoints use `SdkWorkListQuery`/`SdkWorkPageInfo`/`q`.
  Validated by `node ../../../sdkwork-specs/tools/check-pagination.mjs --root .`
- Lists use dynamic progressive loading (load more / infinite scroll), never
  full-page reloads.
- Language specs load on-demand per locale and per package i18n fragment.

## Verification

```bash
node ../../../sdkwork-specs/tools/check-frontend-composition.mjs --root .
node ../../../sdkwork-specs/tools/check-component-port-bindings.mjs --root .
node ../../../sdkwork-specs/tools/check-i18n-standard.mjs --root .
node ../../../sdkwork-specs/tools/check-source-config-standard.mjs --root .
node ../../scripts/verify-client-app-surfaces.mjs --surface h5
```
