<!-- SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`. -->
# SDKWork IAM Mini Program

SDKWork IAM Mini Program client application root (`apps/sdkwork-iam-mini-program`).

| Field | Value |
| --- | --- |
| Architecture | `mini-program` |
| Package segment | `mp` |
| Runtime target | `mini-program` |
| App manifest | `package.json` |
| Component spec | `specs/component.spec.json` |
| Deployment descriptor | `etc/sdkwork.deployment.config.json` |
| Route registry | `packages/sdkwork-iam-mp-core/src/modules/index.ts` |
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
| app | `sdkwork-iam-mp-auth`, `sdkwork-iam-mp-user-center`, `sdkwork-iam-mp-account-binding`, `sdkwork-iam-mp-user`, `sdkwork-iam-mp-tenant`, `sdkwork-iam-mp-organization`, `sdkwork-iam-mp-oauth` | app-api / `@sdkwork/iam-app-sdk` |
| console | `sdkwork-iam-mp-console-tenant`, `sdkwork-iam-mp-console-organization`, `sdkwork-iam-mp-console-account-binding`, `sdkwork-iam-mp-console-user-center` | app-api / `@sdkwork/iam-app-sdk` |
| admin | `sdkwork-iam-mp-admin-oauth`, `sdkwork-iam-mp-admin-tenant`, `sdkwork-iam-mp-admin-organization`, `sdkwork-iam-mp-admin-permission`, `sdkwork-iam-mp-admin-account-binding`, `sdkwork-iam-mp-admin-user`, `sdkwork-iam-mp-admin-audit` | backend-api / `@sdkwork/iam-backend-sdk` (approved) |

Cross-architecture IAM contracts/runtime live in `../../apps/sdkwork-iam-common/packages/`.
OAuth runtime discovery follows `../../../sdkwork-specs/IAM_OAUTH_SPEC.md`, re-exported by `@sdkwork/iam-mp-core` from `@sdkwork/iam-contracts`.

Owner: `sdkwork-iam` maintainers.

See `AGENTS.md` for the rules and the verification commands.
