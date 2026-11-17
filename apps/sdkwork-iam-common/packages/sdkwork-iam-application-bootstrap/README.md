## Bootstrap auth profiles

IAM application bootstrap authenticates with any principal that holds provision/enable/access-credential permissions. Development often uses the platform super-admin account, but profiles are named by **environment**, not by role.

Store credentials under `~/.sdkwork/iam-bootstrap/`:

| File | When used |
| --- | --- |
| `development.json` | `SDKWORK_ENVIRONMENT=development` |
| `test.json` | test environment |
| `default.json` | fallback when no lifecycle file exists |
| `standalone.development.json` | exact `SDKWORK_PROFILE_ID` match |

Resolution order: `SDKWORK_IAM_BOOTSTRAP_OPERATOR_PROFILE` → lifecycle → profile id → `default` → legacy `super-admin` stem.

Legacy fallback: `~/.sdkwork/users/*.json` (including `super-admin.json`).

Canonical development identity: username `admin`, email `admin@sdkwork.com`. Store the password in the home profile, never in git.

Environment overrides: `SDKWORK_IAM_BOOTSTRAP_OPERATOR_USERNAME`, `SDKWORK_IAM_BOOTSTRAP_OPERATOR_PASSWORD` (legacy `SDKWORK_IAM_SUPER_ADMIN_*` aliases still work).

Directory override: `SDKWORK_IAM_BOOTSTRAP_PROFILE_DIR` (default `~/.sdkwork/iam-bootstrap`). Home resolution uses `%USERPROFILE%` on Windows (`HOMEDRIVE`+`HOMEPATH` fallback) and `$HOME` on Linux/macOS.

## Deploy-application onboarding

Application templates are retired. Bootstrap provisions a tenant installation from the deploy application it serves through `POST /backend/v3/api/iam/tenant_applications` (`tenantApplications.create`), then enables it and issues an access credential. No call registers a template, and no body carries `templateId` or `appKey`.

Provisioning input (from the caller, with manifest fallbacks):

| Field | Source |
| --- | --- |
| `deployApplicationId` | caller → `backend.deployApplicationId` → `backend.appId` (never synthesized) |
| `applicationType` | caller → derived from `app.appType` (`api` \| `h5` \| `pc` \| `flutter` \| `other`) |
| `instanceKey` | caller → environment → derived from the deploy application and lifecycle |
| `displayName` | caller → `app.displayName` → `app.name` |
| `environment` | caller → resolved bootstrap environment |
| `accessPermissions` | caller → `backend.accessTokenPermissionScope`; `[]` is a valid explicit choice |
| `runtimeConfig` | caller → `oauth.relyingParty` from the manifest |
| `provisioningIdempotencyKey` | caller → derived deterministically from the installation identity |

The flow fails closed naming `deployApplicationId` or `applicationType` when neither the caller nor the manifest supplies it. A repeated call with the same provisioning idempotency key replays the first outcome through the module's replay cache instead of provisioning a second installation, and the API reconciles one row per deploy application.

CLI: `pnpm admin:bootstrap:app -- --config agent.app.config.json --deploy-application-id <id> --application-type <type>`.

## Lifecycle access token reuse

`ensureRepoBootstrapAccessToken(...)` reuses a configured token before it registers or provisions anything. A token is reusable when it is unexpired and its `environment`, `app_id`, `tenant_id`, and `organization_id` claims match the selected lifecycle and manifest; fixtures are accepted only where the lifecycle permits them. A manifest root keeps one credential per deployment profile and lifecycle in the user-private store at `~/.sdkwork/<application-code>/credentials/<profile-id>.json`; no repository env file is written. The unscoped `.sdkwork.local.env` stays readable as the last fallback and is never written. Registration runs only when no reusable token exists or `refresh: true` is passed. See sdkwork-specs `IAM_APPLICATION_BOOTSTRAP_SPEC.md` section 5.4.
