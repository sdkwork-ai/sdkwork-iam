<!-- SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`. -->
# docs

Local architecture notes and runbooks for `apps/sdkwork-iam-harmony-mobile`.

## Route identity

Every route this root ships carries the cross-client id
`<surface>.<domain>.<capability>.<screen>` that the PC, H5, Flutter and mini program
IAM roots declare. Only the physical Harmony page path differs, which
`APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md` section 7 permits.

The mount table is generated into
`entry/src/main/ets/pages/__generated__/RoutePageMap.ets` from the same model that
emits each package's route contributions, so a route added to a package appears in
the navigator without anyone editing the root page.

## Verification

Where no HarmonyOS SDK, hvigor or ohpm is installed — the machine that generates
this root has none — the toolchain-free substitutes are:

```bash
node ../../../sdkwork-iam/tools/check-arkts-imports.mjs --root .
node --test tests/harmony-runtime-config.test.mjs
node --test tests/harmony-surface-contract.test.mjs
```

`check-arkts-imports.mjs` resolves every relative import and every
`@sdkwork/<package>` specifier against the files on disk and exits non-zero on the
first one that does not exist. It is strictly weaker than the ArkTS compiler: it
proves the import *graph* is connected, not that the types line up.

## Known follow-ups

- No ArkTS target of `sdkwork-iam-app-sdk` exists, so every capability's SDK port is
  unregistered and each capability renders its error state rather than data. See
  `sdks/README.md`.
- Every host adapter reports `unsupported`. Implementing one is a change to
  `packages/sdkwork-iam-harmony-mobile-host/src/main/ets/HostAdapters.ets` alone, because feature
  code already handles the error value.
- The device locale is not read yet; the root page renders the default locale's
  fragment. The HarmonyOS localization-kit call needs the DevEco toolchain to
  compile.
- `oh-package-lock.json5` is not generated. Producing one requires `ohpm install`.

Owner: `sdkwork-iam` maintainers.
