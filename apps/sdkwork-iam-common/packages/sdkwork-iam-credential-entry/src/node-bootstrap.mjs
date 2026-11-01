import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  credentialBundlePath,
  normalizeApplicationCode,
  readCredentialBundle,
  readTokenTimestamps,
  writeCredentialBundle,
} from './credential-bundle.mjs';
import {
  SDKWORK_ACCESS_TOKEN_ENV_KEY,
  buildBootstrapAccessTokenEnvFileContents,
  isBootstrapAccessTokenReusable,
  looksLikeLocalFixtureJwt,
  mergeBootstrapAccessTokenEnv,
  normalizeBootstrapEnvironment,
  parseBootstrapAccessToken,
  readBootstrapAccessTokenEnvFileContents,
} from './bootstrap-access-token-core.mjs';

export * from './bootstrap-access-token-core.mjs';
export * from './credential-bundle.mjs';

/**
 * Unscoped registration output of an older resolver. It is read last and never
 * written, so a bundle always wins over a stale repository file.
 */
const LEGACY_UNSCOPED_ENV_FILE = '.sdkwork.local.env';

function normalizeText(value) {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

export function readApplicationManifest(manifestPath) {
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

export function readBootstrapAccessTokenEnvFile(filePath) {
  return readBootstrapAccessTokenEnvFileRecord(filePath)?.token;
}

/**
 * Read one bootstrap artifact as token plus non-secret scope metadata.
 * @param filePath - absolute artifact path.
 * @returns parsed record, or `undefined` when the file is absent or has no token.
 */
export function readBootstrapAccessTokenEnvFileRecord(filePath) {
  if (!existsSync(filePath)) {
    return undefined;
  }
  const parsed = readBootstrapAccessTokenEnvFileContents(readFileSync(filePath, 'utf8'));
  return parsed.token === undefined ? undefined : parsed;
}

export function mergeBootstrapAccessTokenEnvFromManifest({
  env = {},
  manifestPath,
  ...options
} = {}) {
  const manifest = readApplicationManifest(manifestPath);
  return mergeBootstrapAccessTokenEnv(env, { ...options, manifest });
}

export function resolveRepoApplicationManifestPath(repoRoot, manifestPath) {
  const normalizedRepoRoot = normalizeText(repoRoot);
  if (!normalizedRepoRoot) {
    throw new Error('resolveRepoApplicationManifestPath requires repoRoot');
  }

  const explicitManifestPath = normalizeText(manifestPath);
  if (explicitManifestPath) {
    return path.isAbsolute(explicitManifestPath)
      ? explicitManifestPath
      : path.join(normalizedRepoRoot, explicitManifestPath);
  }

  const defaultManifestPath = path.join(normalizedRepoRoot, 'agent.app.config.json');
  if (existsSync(defaultManifestPath)) {
    return defaultManifestPath;
  }

  throw new Error(
    `agent.app.config.json not found under ${normalizedRepoRoot}; pass manifestPath explicitly`,
  );
}

/**
 * Application code of one repository, used as the credential-store directory.
 *
 * `IAM_APPLICATION_BOOTSTRAP_SPEC.md` section 5.4.1 keys the store by
 * application code, so the manifest `app.key` wins and the directory name is the
 * fallback for a manifest that has not been read yet.
 * @param repoRoot - repository root.
 * @param manifest - parsed `agent.app.config.json`, when already loaded.
 * @returns the application code, without the `sdkwork-` vendor prefix.
 */
function applicationCodeOf(repoRoot, manifest) {
  const declared = manifest?.app?.key ?? readManifestAppKey(repoRoot);
  return normalizeApplicationCode(declared ?? path.basename(path.resolve(repoRoot)));
}

/**
 * `app.key` of the repository manifest, when one is present.
 * @param repoRoot - repository root.
 * @returns the declared application key, or `undefined`.
 */
function readManifestAppKey(repoRoot) {
  try {
    const parsed = JSON.parse(readFileSync(path.join(path.resolve(repoRoot), 'agent.app.config.json'), 'utf8'));
    const key = parsed?.app?.key;
    return typeof key === 'string' && key.trim() !== '' ? key.trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The two token locations of one repository scope.
 *
 * The bundle is the only writable artifact. The legacy unscoped file stays
 * readable so an existing checkout keeps working until its next write.
 * @param repoRoot - repository root.
 * @param environment - lifecycle or profile alias.
 * @param deploymentProfile - `standalone` or `cloud`.
 * @param options - manifest and home-directory inputs.
 * @returns the bundle path and the legacy path.
 */
export function resolveRepoBootstrapAccessTokenPaths(
  repoRoot,
  environment,
  deploymentProfile = 'standalone',
  options = {},
) {
  const normalizedRepoRoot = normalizeText(repoRoot);
  if (!normalizedRepoRoot) {
    throw new Error('resolveRepoBootstrapAccessTokenPaths requires repoRoot');
  }
  const lifecycle = normalizeBootstrapEnvironment(environment);
  const profile = deploymentProfile === 'cloud' ? 'cloud' : 'standalone';
  return {
    bundlePath: credentialBundlePath({
      applicationCode: applicationCodeOf(normalizedRepoRoot, options.manifest),
      profileId: `${profile}.${lifecycle}`,
      ...(options.homeDir ? { homeDir: options.homeDir } : {}),
    }),
    legacyPath: path.join(path.resolve(normalizedRepoRoot), LEGACY_UNSCOPED_ENV_FILE),
  };
}

function inspectionOptions(options, environment) {
  const backendBaseUrl = normalizeText(options.backendBaseUrl)
    ?? normalizeText(options.env?.SDKWORK_BACKEND_BASE_URL);
  return {
    ...options,
    environment: normalizeBootstrapEnvironment(options.environment ?? environment),
    ...(backendBaseUrl ? { backendBaseUrl } : {}),
  };
}

/**
 * Read the first reusable token from one repository's artifacts.
 * @param repoRoot - repository root.
 * @param environment - canonical lifecycle environment.
 * @param options - manifest, backend, refresh, and inspection inputs.
 * @returns the token, or `undefined` when no reusable artifact exists.
 */
export function readRepoBootstrapAccessToken(repoRoot, environment, options = {}) {
  const lifecycle = normalizeBootstrapEnvironment(options.environment ?? environment);
  const deploymentProfile = options.deploymentProfile ?? 'standalone';
  const inspectOptions = inspectionOptions(options, lifecycle);
  const { bundlePath, legacyPath } = resolveRepoBootstrapAccessTokenPaths(
    repoRoot,
    lifecycle,
    deploymentProfile,
    options,
  );

  const bundle = readCredentialBundle(bundlePath);
  if (
    bundle?.accessToken
    && isBootstrapAccessTokenReusable(bundle.accessToken, {
      ...inspectOptions,
      tokenMetadata: { backend: bundle.backend },
    })
  ) {
    return bundle.accessToken;
  }

  const legacy = readBootstrapAccessTokenEnvFileRecord(legacyPath);
  if (!legacy?.token) return undefined;
  if (
    lifecycle !== 'development'
    && parseBootstrapAccessToken(legacy.token) === undefined
  ) {
    // An opaque legacy value cannot prove which lifecycle it belongs to.
    // Keep it out of non-development scopes so environment separation wins.
    return undefined;
  }
  return isBootstrapAccessTokenReusable(legacy.token, {
    ...inspectOptions,
    tokenMetadata: legacy.metadata,
  })
    ? legacy.token
    : undefined;
}

function readBootstrapAccessTokenAcrossAncestors(startRoot, options) {
  const normalizedStart = normalizeText(startRoot);
  if (!normalizedStart) {
    return undefined;
  }
  let current = path.resolve(normalizedStart);
  for (let depth = 0; depth <= MAX_BOOTSTRAP_ANCESTOR_DEPTH; depth += 1) {
    const token = readRepoBootstrapAccessToken(current, options.environment, options);
    if (token) {
      return token;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return undefined;
}

/**
 * Read the bootstrap token from an application root, falling back to walking
 * ancestor directories so an app nested at `apps/<name>-pc/packages/<pkg>` still
 * resolves the artifact its repo-level dev runner wrote.
 */
export function readAppBootstrapAccessToken(appRoot, environment, options = {}) {
  return readBootstrapAccessTokenAcrossAncestors(appRoot, {
    ...options,
    environment: normalizeBootstrapEnvironment(options.environment ?? environment),
    readRepoBootstrapAccessToken,
  });
}

/**
 * How many ancestor directories `readBootstrapAccessTokenAcrossAncestors` walks
 * before giving up. Six covers the deepest observed app nesting
 * (`apps/<app>-pc/packages/<pkg>/` is three levels below the repo root).
 */
const MAX_BOOTSTRAP_ANCESTOR_DEPTH = 6;

function tokenWindowMetadata(token) {
  const payload = parseBootstrapAccessToken(token)?.payload;
  const issuedAt = typeof payload?.iat === 'number'
    ? new Date(payload.iat * 1000).toISOString()
    : undefined;
  const expiresAt = typeof payload?.exp === 'number'
    ? new Date(payload.exp * 1000).toISOString()
    : undefined;
  return { issuedAt, expiresAt };
}

/**
 * Persist one token into the user-private credential bundle.
 *
 * `IAM_APPLICATION_BOOTSTRAP_SPEC.md` section 5.4.1 puts the artifact outside
 * every checkout, so no repository file is created or updated. The bundle is
 * written through a temporary file and an atomic rename, so concurrent starts
 * never observe a partial token.
 * @param options - repository scope, token, and optional metadata.
 * @returns the canonical bundle path.
 */
export function writeRepoBootstrapAccessToken(options) {
  const normalizedRepoRoot = normalizeText(options.repoRoot);
  if (!normalizedRepoRoot) {
    throw new Error('writeRepoBootstrapAccessToken requires repoRoot');
  }
  const lifecycle = normalizeBootstrapEnvironment(options.environment ?? 'development');
  const deploymentProfile = options.deploymentProfile ?? 'standalone';
  const token = normalizeText(options.token);
  if (!token) {
    throw new Error('writeRepoBootstrapAccessToken requires token');
  }
  const { bundlePath } = resolveRepoBootstrapAccessTokenPaths(
    normalizedRepoRoot,
    lifecycle,
    deploymentProfile,
    options,
  );
  const window = readTokenTimestamps(token);
  const manifestAppId = normalizeText(options.appId)
    ?? normalizeText(options.manifest?.backend?.appId);
  const backend = normalizeText(options.backendBaseUrl);
  return writeCredentialBundle(bundlePath, {
    accessToken: token,
    environment: lifecycle,
    deploymentProfile,
    ...(backend ? { backend } : {}),
    ...(manifestAppId ? { appId: manifestAppId } : {}),
    issuedAt: options.issuedAt ?? window.issuedAt ?? new Date().toISOString(),
    ...(options.expiresAt ?? window.expiresAt
      ? { expiresAt: options.expiresAt ?? window.expiresAt }
      : {}),
    source: options.source ?? (looksLikeLocalFixtureJwt(token) ? 'local-fixture' : 'provisioned'),
  });
}

/**
 * Resolve `SDKWORK_ACCESS_TOKEN` for one repository, reusing the cached
 * environment-scoped artifact before generating anything.
 *
 * A reusable configured value is returned untouched. When generation is
 * required, the new token is persisted so the next start reuses it.
 * @param options - repository root, lifecycle, env, and manifest inputs.
 * @returns merged environment record.
 */
export function mergeRepoBootstrapAccessTokenEnv({
  repoRoot,
  env = {},
  environment,
  deploymentProfile = 'standalone',
  manifestPath,
  persist = true,
  refresh = false,
  ...options
} = {}) {
  const resolvedManifestPath = resolveRepoApplicationManifestPath(repoRoot, manifestPath);
  const manifest = readApplicationManifest(resolvedManifestPath);
  const lifecycle = normalizeBootstrapEnvironment(environment);
  const merged = { ...env };
  const backendBaseUrl = normalizeText(options.backendBaseUrl)
    ?? normalizeText(merged.SDKWORK_BACKEND_BASE_URL);
  const inspectOptions = {
    ...options,
    deploymentProfile,
    environment: lifecycle,
    manifest,
    ...(backendBaseUrl ? { backendBaseUrl } : {}),
  };

  const configured = normalizeText(merged[SDKWORK_ACCESS_TOKEN_ENV_KEY]);
  if (configured && refresh !== true && isBootstrapAccessTokenReusable(configured, inspectOptions)) {
    return merged;
  }
  if (!configured || refresh !== true) {
    const cached = readRepoBootstrapAccessToken(repoRoot, lifecycle, inspectOptions);
    if (cached) {
      merged[SDKWORK_ACCESS_TOKEN_ENV_KEY] = cached;
      return merged;
    }
  }

  const next = mergeBootstrapAccessTokenEnv(merged, {
    ...options,
    ...inspectOptions,
    forceRefresh: refresh === true || options.forceRefresh === true,
  });
  const token = normalizeText(next[SDKWORK_ACCESS_TOKEN_ENV_KEY]);
  if (!token) {
    return next;
  }
  if (persist !== false && (token !== configured || refresh === true)) {
    try {
      writeRepoBootstrapAccessToken({
        repoRoot,
        environment: lifecycle,
        deploymentProfile,
        token,
        manifest,
        ...(backendBaseUrl ? { backendBaseUrl } : {}),
        ...(options.homeDir ? { homeDir: options.homeDir } : {}),
      });
    } catch (error) {
      options.warn?.(
        `failed to persist bootstrap access token under ${repoRoot}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return next;
}

export function mergeRepoDevBootstrapAccessTokenEnv(options = {}) {
  return mergeRepoBootstrapAccessTokenEnv({ ...options, environment: 'development' });
}
