<!-- SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`. -->
# config/host

HarmonyOS bundle id, module metadata, device types, permissions, app links, push
profile references, signing reference names, and AppGallery/private distribution
references belong here.

Rules:

- Safe checked-in templates only. Files use the `.example.json` suffix.
- Must not contain signing private keys, auth tokens, refresh tokens, API keys,
  database credentials, private service endpoints, SDK ownership, or business
  route constants (`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 276).
- The bundle name in `harmony.*.example.json` must equal
  `AppScope/app.json5#app.bundleName` and
  `sdkwork.app.config.json#app.identifiers.packageName`; the root contract test
  asserts all three stay equal.
- The deep-link entry names only this application's own scheme and an empty path
  prefix. The template root's `/app/communication` is that application's business
  route and is exactly what section 276 excludes.

Owner: `sdkwork-iam` maintainers.
