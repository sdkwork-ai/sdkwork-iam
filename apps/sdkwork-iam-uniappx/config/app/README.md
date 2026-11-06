# config/app

HBuilderX App runtime profile documents for the `sdkwork-iam-uniappx` root.

Each profile is `runtime-env.<deployment-profile>.<environment>.json` and carries
the public, non-secret runtime identity:

```json
{
  "SDKWORK_ACCESS_TOKEN": "<public application access token>",
  "SDKWORK_DEPLOYMENT_PROFILE": "standalone",
  "SDKWORK_ENVIRONMENT": "development",
  "SDKWORK_PROFILE_ID": "standalone.development",
  "SDKWORK_RUNTIME_TARGET": "android-native"
}
```

Rules:

- Exactly one profile is selected per build and recorded in build evidence.
- The runtime target is the delivery target (`android-native`, `ios-native`,
  `harmony-native`), never the uni-app x authoring framework.
- Only the public application access token may be committed. Session tokens,
  refresh tokens, platform secrets, signing keys, database URLs, and private
  endpoints are forbidden.
- Profile documents are materialized by the repository client-surface workflow
  (`node scripts/materialize-client-app-surfaces.mjs`); `scripts/build-runtime.mjs`
  fails when the selected profile is missing or identity-mismatched.
