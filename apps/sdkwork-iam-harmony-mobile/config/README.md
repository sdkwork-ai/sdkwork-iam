<!-- SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`. -->
# config

| Directory | Owns |
| --- | --- |
| `app/` | Per-profile non-secret runtime documents (`runtime-env.<deployment-profile>.<environment>.json`). |
| `host/` | Bundle id, module ids, device types, permissions, app links, push and signing reference names, distribution references. |
| `server/` | Server profile templates, one per canonical profile. |
| `container/` | Container profile templates, one per canonical profile. |

The runtime documents under `app/` are **derived**, not authored: they come from
`../../../etc/sdkwork.deployment.config.json` and `../../../etc/topology/<profile-id>.env`
through the repository generator, and `tests/harmony-runtime-config.test.mjs`
re-derives them independently so drift fails the gate.

Owner: `sdkwork-iam` maintainers.
