export * from './bootstrap-access-token-core.mjs';
export * from './credential-bundle.mjs';

import type {
  BootstrapAccessTokenMetadata,
  CreateDevBootstrapAccessTokenOptions,
  InspectBootstrapAccessTokenOptions,
  SdkworkEnvironment,
} from './bootstrap-access-token-core.mjs';

export interface BootstrappedEnvReadOptions extends InspectBootstrapAccessTokenOptions {
  deploymentProfile?: 'standalone' | 'cloud';
  /** Home directory holding the user-private credential store. */
  homeDir?: string;
}

export interface WriteRepoBootstrapAccessTokenOptions {
  repoRoot: string;
  environment: SdkworkEnvironment | 'dev' | 'prod';
  deploymentProfile?: 'standalone' | 'cloud';
  token: string;
  backendBaseUrl?: string;
  manifest?: { app?: { key?: string }; backend?: { appId?: string } };
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
/**
 * The credential bundle and the legacy unscoped file of one repository scope.
 *
 * The bundle is the only writable location; the legacy file is read-only and
 * carries no lifecycle guarantee.
 */
export function resolveRepoBootstrapAccessTokenPaths(
  repoRoot: string,
  environment: SdkworkEnvironment | 'dev' | 'prod',
  deploymentProfile?: 'standalone' | 'cloud',
  options?: { manifest?: { app?: { key?: string } }; homeDir?: string },
): { bundlePath: string; legacyPath: string };
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
