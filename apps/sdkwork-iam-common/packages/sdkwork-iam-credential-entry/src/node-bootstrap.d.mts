export * from './bootstrap-access-token-core.mjs';

import type {
  BootstrapAccessTokenMetadata,
  CreateDevBootstrapAccessTokenOptions,
  InspectBootstrapAccessTokenOptions,
  SdkworkEnvironment,
} from './bootstrap-access-token-core.mjs';

export interface BootstrappedEnvReadOptions extends InspectBootstrapAccessTokenOptions {
  deploymentProfile?: 'standalone' | 'cloud';
}

export interface WriteRepoBootstrapAccessTokenOptions {
  repoRoot: string;
  environment: SdkworkEnvironment | 'dev' | 'prod';
  deploymentProfile?: 'standalone' | 'cloud';
  token: string;
  backendBaseUrl?: string;
  manifest?: { backend?: { appId?: string } };
  appId?: string;
  issuedAt?: string;
  expiresAt?: string;
  source?: string;
}

export function readApplicationManifest(manifestPath: string): unknown;
export function readBootstrapAccessTokenEnvFile(filePath: string): string | undefined;
export function readBootstrapAccessTokenEnvFileRecord(
  filePath: string,
): { token: string; metadata: BootstrapAccessTokenMetadata } | undefined;
export function mergeBootstrapAccessTokenEnvFromManifest(options: {
  env?: Record<string, string | undefined>;
  manifestPath: string;
} & CreateDevBootstrapAccessTokenOptions): Record<string, string | undefined>;
export function resolveRepoApplicationManifestPath(repoRoot: string, manifestPath?: string): string;
export function resolveRepoBootstrapAccessTokenEnvPaths(
  repoRoot: string,
  environment: SdkworkEnvironment | 'dev' | 'prod',
  deploymentProfile?: 'standalone' | 'cloud',
): string[];
/**
 * Sibling of {@link resolveRepoBootstrapAccessTokenEnvPaths} for an *application*
 * root rather than a repository root.
 */
export function resolveAppBootstrapAccessTokenEnvPaths(
  appRoot: string,
  environment: SdkworkEnvironment | 'dev' | 'prod',
  deploymentProfile?: 'standalone' | 'cloud',
): string[];
export function readRepoBootstrapAccessToken(
  repoRoot: string,
  environment: SdkworkEnvironment | 'dev' | 'prod',
  options?: BootstrappedEnvReadOptions & {
    env?: Record<string, string | undefined>;
    manifest?: unknown;
  },
): string | undefined;
/**
 * Read the bootstrap token from an application root, walking ancestor
 * directories so a deeply nested application still resolves the artifact its
 * repo-level dev runner wrote.
 */
export function readAppBootstrapAccessToken(
  appRoot: string,
  environment: SdkworkEnvironment | 'dev' | 'prod',
  options?: BootstrappedEnvReadOptions & {
    env?: Record<string, string | undefined>;
    manifest?: unknown;
  },
): string | undefined;
export function writeRepoBootstrapAccessToken(options: WriteRepoBootstrapAccessTokenOptions): string;
export function mergeRepoBootstrapAccessTokenEnv(options: {
  repoRoot: string;
  env?: Record<string, string | undefined>;
  environment: SdkworkEnvironment | 'dev' | 'prod';
  deploymentProfile?: 'standalone' | 'cloud';
  manifestPath?: string;
  persist?: boolean;
  refresh?: boolean;
  backendBaseUrl?: string;
  warn?: (line: string) => void;
} & CreateDevBootstrapAccessTokenOptions): Record<string, string | undefined>;
export function mergeRepoDevBootstrapAccessTokenEnv(options: {
  repoRoot: string;
  env?: Record<string, string | undefined>;
  manifestPath?: string;
  persist?: boolean;
  refresh?: boolean;
  backendBaseUrl?: string;
  warn?: (line: string) => void;
} & CreateDevBootstrapAccessTokenOptions): Record<string, string | undefined>;
