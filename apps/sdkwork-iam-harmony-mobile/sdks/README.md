<!-- SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`. -->
# sdks

This directory follows `SDK_WORKSPACE_GENERATION_SPEC.md`.

This root consumes the `sdkwork-iam-app-sdk` and `sdkwork-iam-backend-sdk`
families owned by the repository-level `sdks/` workspace. It must not contain
hand-edited generated output and must not vendor a private transport copy.

| Target | State |
| --- | --- |
| typescript | materialized |
| dart | materialized |
| kotlin | materialized |
| swift | materialized |
| csharp | materialized |
| go | materialized |
| java | materialized |
| python | materialized |
| rust | materialized |
| arkts | _none_ — not produced by the SDK generation chain yet |

`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 6 requires Harmony packages to consume
`/app/v3/api` through generated ArkTS/TypeScript app SDK clients **adapted for the
Harmony runtime**. Because no ArkTS target is emitted yet,
`packages/sdkwork-iam-harmony-mobile-core` declares the SDK **port** contract and the
base-URL/credential boundary in `src/main/ets/sdk/AppSdkClient.ets`, and the root
bootstrap injects the port. That is a declared seam, not a fabricated client: no raw
request API, manual auth header, copied React/Flutter/Kotlin/Swift wrapper, or local
DTO fork exists in this root.

Missing Harmony SDK methods are fixed in the OpenAPI/generator inputs and
regenerated, per section 6. Closing this gap is the one prerequisite that blocks a
real `hvigorw assembleHap`.

Owner: `sdkwork-iam` maintainers.
