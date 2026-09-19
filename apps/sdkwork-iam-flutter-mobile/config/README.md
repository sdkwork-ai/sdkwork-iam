<!-- SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`. -->
# config

Non-secret public runtime templates live in `app/`. This root carries no platform host
package — `check-client-host-packages.mjs` reports one as an error under a
`-flutter-mobile` root, because Flutter publishes through its own iOS/Android project
directories — so platform packaging metadata (bundle id, package id, entitlements, signing
reference names) is owned by `ios/` and `android/` and by `env/`.

Owner: `sdkwork-iam` maintainers.
