/**
 * Cloud API edge origins for one repository, resolved through the canonical
 * SDKWork materializer instead of a locally re-derived domain rule.
 *
 * `ENVIRONMENT_SPEC.md` section 5.1.0.1 names
 * `sdkwork-specs/tools/browser-cloud-api-base.mjs` as *the* implementation of
 * this rule: it derives the registered `api-<suffix>.<base-domain>` origin
 * family from the repository deployment config and the workspace topology, and
 * it defines the value every public SDK API base URL field in a cloud runtime
 * source must carry (`origin1;origin2;…`, primary base domain first).
 *
 * The rule is deliberately *not* re-implemented here. A second implementation
 * of a platform rule is exactly the drift the spec calls out: "A legacy
 * single-primary-origin value is a drift defect." A root that hard-codes
 * `https://api-<suffix>.sdkwork.com` while the environment registers sixteen
 * base domains loses the page-host-to-base-domain affinity the family exists
 * for (`APP_RUNTIME_TOPOLOGY_NAMING.md` section 9), so a client served from
 * `iam-test.<other-base-domain>` would be pinned to the `sdkwork.com` edge
 * instead of its own.
 *
 * Two value shapes are exposed, because they are genuinely different things:
 *
 * - {@link cloudApiOriginsFor} / {@link cloudSdkBaseUrlFamily} — the whole
 *   registered family, for fields that address the API edge and therefore may
 *   live on any registered base domain.
 * - {@link cloudPrimaryOrigin} — the primary (first, canonical) member, for
 *   fields whose value is an *identity* rather than a route: the OIDC issuer
 *   has exactly one `iss` value, and a websocket host paired with an
 *   application ingress is likewise single-valued.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  cloudSdkBaseUrlMaterializationValue,
  resolveCloudApiOriginListForRepository,
  SDK_BASE_URL_KEYS,
} from '../../../../sdkwork-specs/tools/browser-cloud-api-base.mjs';

/**
 * The public SDK API base URL field names a browser runtime source must carry
 * (`ENVIRONMENT_SPEC.md` section 5.1.0.1). Re-exported so a surface emitter never
 * re-types the list: a hand-copied list silently drops a field the moment the
 * canonical set grows, and the dropped field then ships with no origin at all.
 */
export const CLOUD_SDK_BASE_URL_KEYS = SDK_BASE_URL_KEYS;

/**
 * Resolved once per `(repoRoot, environment)` pair: the canonical resolver reads
 * and validates two JSON documents and walks the topology, and every surface
 * emitter asks for the same five environments.
 */
const originCache = new Map();

/** Cached `etc/sdkwork.deployment.config.json` reads, keyed by repository root. */
const deploymentCache = new Map();

/** Cached `etc/topology/<profile>.env` parses, keyed by `(repoRoot, profileId)`. */
const profileEnvCache = new Map();

function readDeploymentConfig(repoRoot) {
  const cached = deploymentCache.get(repoRoot);
  if (cached !== undefined) return cached;
  const deploymentPath = path.join(repoRoot, 'etc', 'sdkwork.deployment.config.json');
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  deploymentCache.set(repoRoot, deployment);
  return deployment;
}

/**
 * Parses one `etc/topology/<profile-id>.env` document into a key/value map.
 *
 * The format is the flat `KEY=value` one the topology env files use: blank lines
 * and `#` comments are skipped, and a line without a separator is ignored rather
 * than treated as an empty key.
 *
 * @param {string} repoRoot absolute path of the repository root
 * @param {string} profileId canonical profile id (`<deploymentProfile>.<environment>`)
 * @returns {Record<string, string>} declared values, `{}` when the file is absent
 */
export function readProfileEnvValues(repoRoot, profileId) {
  const cacheKey = `${repoRoot}\u0000${profileId}`;
  const cached = profileEnvCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const declared = readDeploymentConfig(repoRoot).profiles?.[profileId]?.config;
  const values = {};
  if (typeof declared === 'string' && declared.length > 0) {
    const file = path.join(repoRoot, 'etc', declared);
    if (fs.existsSync(file)) {
      for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/u)) {
        const trimmed = line.trim();
        if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
        const separator = trimmed.indexOf('=');
        if (separator <= 0) continue;
        values[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
      }
    }
  }
  profileEnvCache.set(cacheKey, values);
  return values;
}

/** Drops every trailing slash, which is the only rewrite an origin needs. */
function stripTrailingSlashes(value) {
  let normalized = value;
  while (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
  return normalized;
}

/**
 * The API base value one *cloud* deployment profile must carry.
 *
 * `ENVIRONMENT_SPEC.md` section 5.1.0.1 governs build and deploy runtime
 * documents with the complete registered origin family, and excludes the
 * `dev:cloud` development surface, which binds a single origin to the locally
 * started gateway. That exemption is expressed in the topology itself: a profile
 * that declares `SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL` is the local
 * development profile (`APP_RUNTIME_TOPOLOGY_SPEC` section 4.2,
 * `PNPM_SCRIPT_SPEC` section 3), so its API bases point at that anchor while the
 * domain-valued identity fields stay on the deployed edge.
 *
 * @param {string} repoRoot absolute path of the repository root
 * @param {string} profileId canonical profile id
 * @returns {string|null} the API base value, or `null` for `standalone` profiles
 *   whose ingress belongs to the surface (root-relative path in a browser,
 *   the published bind address in a native app)
 */
export function cloudApiBaseForProfile(repoRoot, profileId) {
  const [deploymentProfile, environment] = profileId.split('.');
  if (deploymentProfile !== 'cloud') return null;
  const localGateway = stripTrailingSlashes(
    readProfileEnvValues(repoRoot, profileId).SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL ?? '',
  );
  if (localGateway.length > 0) return localGateway;
  return cloudSdkBaseUrlFamily(repoRoot, environment);
}

/**
 * The API edge origins a *browser runtime source* must declare, or `null` for a
 * `standalone` profile.
 *
 * `ENVIRONMENT_SPEC.md` section 5.1.0.1 governs "every public SDK API base URL
 * field in a cloud browser runtime source" and requires the complete registered
 * origin family there. The `dev:cloud` local-gateway anchor is deliberately
 * absent: the same section keeps the domain edges authoritative, declares the
 * anchor in `etc/topology/cloud.development.env`, and leaves binding it to the
 * dev runtime and the client-env materializer. `build-browser-client.mjs` also
 * enforces the family in the runtime source itself — it rejects a non-`api-*`
 * single origin such as `http://127.0.0.1:3900` — so a source carrying the
 * anchor would make the root unbuildable. The dotenv surface takes the family's
 * primary member instead (`rootEnvFile`).
 *
 * @param {string} repoRoot absolute path of the repository root
 * @param {string} profileId canonical profile id
 * @returns {readonly string[]|null} normalized origins, primary base domain first
 */
export function cloudBrowserApiOrigins(repoRoot, profileId) {
  const [deploymentProfile, environment] = profileId.split('.');
  if (deploymentProfile !== 'cloud') return null;
  return cloudApiOriginsFor(repoRoot, environment);
}

/**
 * The registered cloud API edge origins for one environment, primary base
 * domain first.
 *
 * @param {string} repoRoot absolute path of the repository root that owns
 *   `etc/sdkwork.deployment.config.json`
 * @param {string} environment canonical environment name (`development`, `test`,
 *   `staging`, `demo`, `production`)
 * @returns {readonly string[]} normalized absolute HTTP(S) origins, deduplicated
 *   by base domain, in the order the deployment authority declares them
 */
export function cloudApiOriginsFor(repoRoot, environment) {
  const cacheKey = `${repoRoot}\u0000${environment}`;
  const cached = originCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const origins = resolveCloudApiOriginListForRepository({ repositoryRoot: repoRoot, environment });
  originCache.set(cacheKey, origins);
  return origins;
}

/**
 * The materialized family value, i.e. the exact string `ENVIRONMENT_SPEC.md`
 * section 5.1.0.1 requires in a cloud runtime source's SDK API base URL fields.
 *
 * When the repository registers a single base domain the canonical
 * materializer collapses the family to that lone origin, which the spec
 * explicitly allows.
 *
 * @param {string} repoRoot absolute path of the repository root
 * @param {string} environment canonical environment name
 * @returns {string} `origin1;origin2;…`, or the single origin
 */
export function cloudSdkBaseUrlFamily(repoRoot, environment) {
  return cloudSdkBaseUrlMaterializationValue(cloudApiOriginsFor(repoRoot, environment));
}

/**
 * The primary registered origin: the first base domain of the family, which is
 * the canonical value for single-valued identity fields and the fallback the
 * browser SDK factories select when the page host is not a registered
 * deployment host.
 *
 * @param {string} repoRoot absolute path of the repository root
 * @param {string} environment canonical environment name
 * @returns {string} one absolute HTTP(S) origin
 */
export function cloudPrimaryOrigin(repoRoot, environment) {
  return cloudApiOriginsFor(repoRoot, environment)[0];
}
