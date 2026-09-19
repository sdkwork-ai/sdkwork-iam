<!-- SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`. -->
# SDKWork IAM H5

SDKWork IAM H5 client application root (`apps/sdkwork-iam-h5`).

| Field | Value |
| --- | --- |
| Architecture | `h5` |
| Package segment | `h5` |
| Runtime target | `browser` |
| App manifest | `package.json` |
| Component spec | `specs/component.spec.json` |
| Deployment descriptor | `etc/sdkwork.deployment.config.json` |
| Route registry | `packages/sdkwork-iam-h5-core/src/modules/index.ts` |
| Packages | 26 |

## Commands

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm check
```

## Surfaces

The root ships three surfaces from one renderer and SDK runtime model:

| Surface | Packages | API / SDK |
| --- | --- | --- |
| app | `sdkwork-iam-h5-auth`, `sdkwork-iam-h5-user-center`, `sdkwork-iam-h5-account-binding`, `sdkwork-iam-h5-user`, `sdkwork-iam-h5-tenant`, `sdkwork-iam-h5-organization`, `sdkwork-iam-h5-oauth` | app-api / `@sdkwork/iam-app-sdk` |
| console | `sdkwork-iam-h5-console-tenant`, `sdkwork-iam-h5-console-organization`, `sdkwork-iam-h5-console-account-binding`, `sdkwork-iam-h5-console-user-center` | app-api / `@sdkwork/iam-app-sdk` |
| admin | `sdkwork-iam-h5-admin-oauth`, `sdkwork-iam-h5-admin-tenant`, `sdkwork-iam-h5-admin-organization`, `sdkwork-iam-h5-admin-permission`, `sdkwork-iam-h5-admin-account-binding`, `sdkwork-iam-h5-admin-user`, `sdkwork-iam-h5-admin-audit` | backend-api / `@sdkwork/iam-backend-sdk` (approved) |

Cross-architecture IAM contracts/runtime live in `../../apps/sdkwork-iam-common/packages/`.
OAuth runtime discovery follows `../../../sdkwork-specs/IAM_OAUTH_SPEC.md`, re-exported by `@sdkwork/iam-h5-core` from `@sdkwork/iam-contracts`.

Owner: `sdkwork-iam` maintainers.

See `AGENTS.md` for the rules and the verification commands.
