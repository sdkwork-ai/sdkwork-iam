export * from './bootstrap-access-token-core.mjs';

import type {
  CreateDevBootstrapAccessTokenOptions,
  SdkworkEnvironment,
} from './bootstrap-access-token-core.mjs';

export function readApplicationManifest(manifestPath: string): unknown;
export function readBootstrapAccessTokenEnvFile(filePath: string): string | undefined;
export function mergeBootstrapAccessTokenEnvFromManifest(options: {
  env?: Record<string, string | undefined>;
  manifestPath: string;
} & CreateDevBootstrapAccessTokenOptions): Record<string, string | undefined>;
export function resolveRepoApplicationManifestPath(repoRoot: string, manifestPath?: string): string;
export function resolveRepoBootstrapAccessTokenEnvPaths(repoRoot: string, environment: SdkworkEnvironment | 'dev' | 'prod'): string[];
/**
 * Sibling of {@link resolveRepoBootstrapAccessTokenEnvPaths} for an *application*
 * root rather than a repository root.
 */
export function resolveAppBootstrapAccessTokenEnvPaths(appRoot: string, environment: SdkworkEnvironment | 'dev' | 'prod'): string[];
export function readRepoBootstrapAccessToken(repoRoot: string, environment: SdkworkEnvironment | 'dev' | 'prod'): string | undefined;
/**
 * Read the bootstrap token from an application root, walking ancestor
 * directories so a deeply nested application still resolves the artifact its
 * repo-level dev runner wrote.
 */
export function readAppBootstrapAccessToken(appRoot: string, environment: SdkworkEnvironment | 'dev' | 'prod'): string | undefined;
export function mergeRepoBootstrapAccessTokenEnv(options: {
  repoRoot: string;
  env?: Record<string, string | undefined>;
  environment: SdkworkEnvironment | 'dev' | 'prod';
  manifestPath?: string;
} & CreateDevBootstrapAccessTokenOptions): Record<string, string | undefined>;
export function mergeRepoDevBootstrapAccessTokenEnv(options: {
  repoRoot: string;
  env?: Record<string, string | undefined>;
  manifestPath?: string;
} & CreateDevBootstrapAccessTokenOptions): Record<string, string | undefined>;
