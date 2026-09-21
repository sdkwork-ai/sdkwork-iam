import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  SDKWORK_ACCESS_TOKEN_ENV_KEY,
  mergeBootstrapAccessTokenEnv,
  normalizeBootstrapEnvironment,
} from './bootstrap-access-token-core.mjs';

export * from './bootstrap-access-token-core.mjs';

function normalizeText(value) {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

export function readApplicationManifest(manifestPath) {
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

export function readBootstrapAccessTokenEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return undefined;
  }
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/u)) {
    const normalized = line.trim();
    if (!normalized || normalized.startsWith('#')) {
      continue;
    }
    const separatorIndex = normalized.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    if (normalized.slice(0, separatorIndex).trim() !== SDKWORK_ACCESS_TOKEN_ENV_KEY) {
      continue;
    }
    const rawValue = normalized.slice(separatorIndex + 1).trim();
    const unquoted = (
      (rawValue.startsWith('"') && rawValue.endsWith('"'))
      || (rawValue.startsWith("'") && rawValue.endsWith("'"))
    ) ? rawValue.slice(1, -1) : rawValue;
    return normalizeText(unquoted);
  }
  return undefined;
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

  const defaultManifestPath = path.join(normalizedRepoRoot, 'sdkwork.app.config.json');
  if (existsSync(defaultManifestPath)) {
    return defaultManifestPath;
  }

  throw new Error(
    `sdkwork.app.config.json not found under ${normalizedRepoRoot}; pass manifestPath explicitly`,
  );
}

/**
 * Resolve the candidate bootstrap env-file paths for a search root.
 *
 * Two real-world layouts must both work, because the artifact *writers* and the
 * *readers* live in different repositories and independently chose a root:
 *
 *  - **Repo root** — `<repoRoot>/.env.standalone.<lifecycle>.bootstrap.local`
 *    (the canonical layout this reader was originally written against).
 *  - **App root** — `<appRoot>/.env.<profile>.bootstrap.local`, written by the
 *    per-application dev runners such as
 *    `sdkwork-cloudrouter/scripts/dev/cloud-router-application-env.mjs`.
 *
 * Historically only the repo-root spelling was searched, so an artifact written
 * at the app root was never found: the plugin resolved `token === undefined`,
 * returned `undefined` without any diagnostic, and the failure surfaced much
 * later as `access-token-only request requires Access-Token before request
 * dispatch` on the first authenticated request. Accepting both spellings here
 * (and, in app roots, the shorter `<appRoot>/.env.<environment>.bootstrap.local`
 * form the dev runners actually emit) removes that silent-miss class.
 */
function bootstrapAccessTokenEnvFileNames(lifecycle) {
  return [
    '.sdkwork.local.env',
    `.env.standalone.${lifecycle}.bootstrap.local`,
    `.env.${lifecycle}.bootstrap.local`,
  ];
}

export function resolveRepoBootstrapAccessTokenEnvPaths(repoRoot, environment) {
  const normalizedRepoRoot = normalizeText(repoRoot);
  if (!normalizedRepoRoot) {
    throw new Error('resolveRepoBootstrapAccessTokenEnvPaths requires repoRoot');
  }
  const lifecycle = normalizeBootstrapEnvironment(environment);
  return bootstrapAccessTokenEnvFileNames(lifecycle)
    .map((fileName) => path.join(normalizedRepoRoot, fileName));
}

/**
 * Sibling of {@link resolveRepoBootstrapAccessTokenEnvPaths} for a directory that
 * is an *application* root rather than a repository root. See the note on
 * {@link bootstrapAccessTokenEnvFileNames} for why both layouts are supported.
 */
export function resolveAppBootstrapAccessTokenEnvPaths(appRoot, environment) {
  const normalizedAppRoot = normalizeText(appRoot);
  if (!normalizedAppRoot) {
    throw new Error('resolveAppBootstrapAccessTokenEnvPaths requires appRoot');
  }
  const lifecycle = normalizeBootstrapEnvironment(environment);
  return bootstrapAccessTokenEnvFileNames(lifecycle)
    .map((fileName) => path.join(normalizedAppRoot, fileName));
}

export function readRepoBootstrapAccessToken(repoRoot, environment) {
  for (const envPath of resolveRepoBootstrapAccessTokenEnvPaths(repoRoot, environment)) {
    const token = readBootstrapAccessTokenEnvFile(envPath);
    if (token) {
      return token;
    }
  }
  return undefined;
}

/**
 * Read the bootstrap token from an application root, falling back to walking
 * ancestor directories so an app nested at `apps/<name>-pc/packages/<pkg>` still
 * resolves the artifact its repo-level dev runner wrote.
 *
 * The ancestor walk is bounded (see `MAX_BOOTSTRAP_ANCESTOR_DEPTH`) and stops at
 * the filesystem root; it deliberately does **not** read anything outside the
 * ancestor chain, so it cannot pick up an unrelated sibling application's token.
 */
export function readAppBootstrapAccessToken(appRoot, environment) {
  return readBootstrapAccessTokenAcrossAncestors(appRoot, { read: readRepoBootstrapAccessToken, environment });
}

function readBootstrapAccessTokenAcrossAncestors(startRoot, { read, environment }) {
  const normalizedStart = normalizeText(startRoot);
  if (!normalizedStart) {
    return undefined;
  }
  let current = path.resolve(normalizedStart);
  for (let depth = 0; depth <= MAX_BOOTSTRAP_ANCESTOR_DEPTH; depth += 1) {
    const token = read(current, environment);
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
 * How many ancestor directories `readBootstrapAccessTokenAcrossAncestors` walks
 * before giving up. Six covers the deepest observed app nesting
 * (`apps/<app>-pc/packages/<pkg>/` is three levels below the repo root).
 */
const MAX_BOOTSTRAP_ANCESTOR_DEPTH = 6;

export function mergeRepoBootstrapAccessTokenEnv({
  repoRoot,
  env = {},
  environment,
  manifestPath,
  ...options
} = {}) {
  const resolvedManifestPath = resolveRepoApplicationManifestPath(repoRoot, manifestPath);
  const lifecycle = normalizeBootstrapEnvironment(environment);
  const merged = { ...env };
  if (!normalizeText(merged[SDKWORK_ACCESS_TOKEN_ENV_KEY])) {
    const fromFiles = readRepoBootstrapAccessToken(repoRoot, lifecycle);
    if (fromFiles) {
      merged[SDKWORK_ACCESS_TOKEN_ENV_KEY] = fromFiles;
    }
  }
  return mergeBootstrapAccessTokenEnvFromManifest({
    env: merged,
    environment: lifecycle,
    manifestPath: resolvedManifestPath,
    ...options,
  });
}

export function mergeRepoDevBootstrapAccessTokenEnv(options = {}) {
  return mergeRepoBootstrapAccessTokenEnv({ ...options, environment: 'development' });
}
