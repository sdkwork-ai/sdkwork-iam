# scripts

Node entrypoints for the `sdkwork-iam-uniappx` root.

- `verify-uniappx-root.mjs` — read-only mode/root contract verification.
- `build-runtime.mjs` — validates the selected public runtime profile and writes
  `dist/<profile>/<env>/build-evidence.json`.

App packaging itself is performed by the HBuilderX CLI in the release pipeline;
these scripts do not emulate or replace it.
