<!-- SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`. -->
# docs

Local architecture notes and runbooks for `apps/sdkwork-iam-flutter-mobile`.

## Verification

`pnpm check` resolves to `flutter analyze`, which is the authority on whether this root
compiles: it type-checks every package, so a wrong `package:` name or a moved file fails
there.

Where no Dart or Flutter toolchain is installed — the machine that generates this root has
neither — `node tools/check-dart-imports.mjs --root apps/sdkwork-iam-flutter-mobile` in the
repository root is the toolchain-free substitute. It resolves every `package:` and relative
import against the files on disk and exits non-zero on the first one that does not exist. It
is strictly weaker than the analyzer: it proves the import *graph* is connected, not that the
types line up.

## Known follow-ups

- `pubspec.lock` is not generated. Producing one requires a Dart or Flutter toolchain
  (`flutter pub get`), which is what publishes it; nothing in this repository can author a
  correct lock file. Root and package locks appear the first time a developer runs the
  command.
- Platform adapters beyond `secureStorage` are registered in
  `lib/bootstrap/host_adapters.dart` as their implementations land; section 7 of the
  architecture standard lists the full set.

Owner: `sdkwork-iam` maintainers.
