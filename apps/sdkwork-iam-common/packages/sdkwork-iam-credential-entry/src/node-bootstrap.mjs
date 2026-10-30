import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

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
 * Candidate artifact names for one repository scope, most canonical first.
 *
 * The environment-scoped file is the reusable cache. The two compatible
 * spellings and the legacy unscoped registration output are read-only
 * fallbacks, so a development token can never be silently reused by another
 * lifecycle that happens to read `.sdkwork.local.env` first.
 * @param lifecycle - canonical lifecycle environment.
 * @param deploymentProfile - `standalone` or `cloud`.
 * @returns artifact file names, in read order.
 */
function bootstrapAccessTokenEnvFileNames(lifecycle, deploymentProfile = 'standalone') {
  const names = [
    `.env.${deploymentProfile}.${lifecycle}.bootstrap.local`,
    `.env.standalone.${lifecycle}.bootstrap.local`,
    `.env.${lifecycle}.bootstrap.local`,
    LEGACY_UNSCOPED_ENV_FILE,
  ];
  return [...new Set(names)];
}

export function resolveRepoBootstrapAccessTokenEnvPaths(
  repoRoot,
  environment,
  deploymentProfile = 'standalone',
) {
  const normalizedRepoRoot = normalizeText(repoRoot);
  if (!normalizedRepoRoot) {
    throw new Error('resolveRepoBootstrapAccessTokenEnvPaths requires repoRoot');
  }
  const lifecycle = normalizeBootstrapEnvironment(environment);
  return bootstrapAccessTokenEnvFileNames(lifecycle, deploymentProfile)
    .map((fileName) => path.join(normalizedRepoRoot, fileName));
}

/**
 * Sibling of {@link resolveRepoBootstrapAccessTokenEnvPaths} for a directory that
 * is an *application* root rather than a repository root.
 */
export function resolveAppBootstrapAccessTokenEnvPaths(
  appRoot,
  environment,
  deploymentProfile = 'standalone',
) {
  const normalizedAppRoot = normalizeText(appRoot);
  if (!normalizedAppRoot) {
    throw new Error('resolveAppBootstrapAccessTokenEnvPaths requires appRoot');
  }
  const lifecycle = normalizeBootstrapEnvironment(environment);
  return bootstrapAccessTokenEnvFileNames(lifecycle, deploymentProfile)
    .map((fileName) => path.join(normalizedAppRoot, fileName));
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
  for (const envPath of resolveRepoBootstrapAccessTokenEnvPaths(repoRoot, lifecycle, deploymentProfile)) {
    const record = readBootstrapAccessTokenEnvFileRecord(envPath);
    if (!record?.token) continue;
    if (
      envPath.endsWith(LEGACY_UNSCOPED_ENV_FILE)
      && lifecycle !== 'development'
      && parseBootstrapAccessToken(record.token) === undefined
    ) {
      // An opaque legacy value cannot prove which lifecycle it belongs to.
      // Keep it out of non-development scopes so environment separation wins.
      continue;
    }
    if (isBootstrapAccessTokenReusable(record.token, { ...inspectOptions, tokenMetadata: record.metadata })) {
      return record.token;
    }
  }
  return undefined;
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
 * Persist one token into the repository's environment-scoped artifact.
 *
 * Writes a complete temporary file in the target directory and renames it over
 * the artifact, so concurrent starts never observe a partial token. POSIX
 * writers use owner-only permissions.
 * @param options - repository scope, token, and optional metadata.
 * @returns the canonical artifact path.
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
  const targetPath = resolveRepoBootstrapAccessTokenEnvPaths(
    normalizedRepoRoot,
    lifecycle,
    deploymentProfile,
  )[0];
  const window = tokenWindowMetadata(token);
  const manifestAppId = normalizeText(options.appId)
    ?? normalizeText(options.manifest?.backend?.appId);
  const contents = buildBootstrapAccessTokenEnvFileContents(token, {
    environment: lifecycle,
    deploymentProfile,
    backend: normalizeText(options.backendBaseUrl),
    appId: manifestAppId,
    issuedAt: options.issuedAt ?? window.issuedAt ?? new Date().toISOString(),
    expiresAt: options.expiresAt ?? window.expiresAt,
    source: options.source ?? (looksLikeLocalFixtureJwt(token) ? 'local-fixture' : 'provisioned'),
  });
  const directory = path.dirname(targetPath);
  mkdirSync(directory, { recursive: true });
  const temporaryPath = path.join(
    directory,
    `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
  );
  try {
    writeFileSync(temporaryPath, contents, { encoding: 'utf8', mode: 0o600 });
    renameSync(temporaryPath, targetPath);
  } catch (error) {
    rmSync(temporaryPath, { force: true });
    throw error;
  }
  return targetPath;
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
