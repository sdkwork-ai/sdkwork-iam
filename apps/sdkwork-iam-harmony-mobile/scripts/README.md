<!-- SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`. -->
# scripts

Local build and release helpers for this HarmonyOS root belong here once the DevEco
toolchain is available. Nothing is required for that: every check that can run
without the HarmonyOS SDK runs from the repository root or from this root's
`package.json`.

There is deliberately no app-local runtime-config generator. The ten runtime
documents and the ArkTS projection of them are produced by the repository generator
(`sdkwork-iam/scripts/materialize-client-app-surfaces.mjs`) together with the rest
of this root, so an app-local script would be a second writer for one file.

There is also deliberately no `check:harmony-native` / `build:harmony-native:*`
alias: no HarmonyOS build command can run until DevEco Studio, a compatible
HarmonyOS SDK and a signing profile are installed, and a script that cannot execute
would be a false signal. `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 10 lists those
aliases as opt-in for roots whose tooling orchestrates Harmony; this root declares
the equivalents as private `_sdkwork:*` hooks instead.

Owner: `sdkwork-iam` maintainers.
