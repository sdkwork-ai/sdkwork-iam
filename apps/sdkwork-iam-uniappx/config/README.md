# config

Configuration for the `sdkwork-iam-uniappx` root.

- `config/app/` owns the HBuilderX App runtime profile documents. Profiles are
  materialized by the repository client-surface workflow; do not hand-edit
  secrets into them.
- `config/host/` owns platform app ids, permission references, signing
  reference names, and store lane references. Signing private keys, tokens, API
  keys, and database credentials are forbidden here.

Authority: `sdkwork-specs/ENVIRONMENT_SPEC.md` §5.1 and
`sdkwork-specs/UNIAPP_X_APP_ARCHITECTURE_SPEC.md` §12.
