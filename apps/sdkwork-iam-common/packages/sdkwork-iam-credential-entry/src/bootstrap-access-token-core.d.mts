export type SdkworkEnvironment = 'development' | 'test' | 'staging' | 'production';

export interface CredentialEntryBootstrapManifest {
  app?: { key?: string };
  backend?: {
    appId?: string;
    accessTokenPermissionScope?: string[];
    organizationId?: string;
    tenantId?: string;
  };
}

export interface CreateDevBootstrapAccessTokenOptions {
  allowTestTokenGeneration?: boolean;
  appId?: string;
  deploymentMode?: string;
  environment?: SdkworkEnvironment | 'dev' | 'prod';
  manifest?: CredentialEntryBootstrapManifest;
  organizationId?: string;
  permissionScope?: string[];
  runtimeTarget?: string;
  sessionId?: string;
  tenantId?: string;
  userId?: string;
}

export interface BootstrapAccessTokenMetadata {
  environment?: string;
  deploymentProfile?: string;
  backend?: string;
  appId?: string;
  issuedAt?: string;
  expiresAt?: string;
  source?: string;
}

export interface InspectBootstrapAccessTokenOptions extends CreateDevBootstrapAccessTokenOptions {
  allowLoopbackFixture?: boolean;
  backendBaseUrl?: string;
  forceRefresh?: boolean;
  nowSeconds?: number;
  skewSeconds?: number;
  tokenMetadata?: BootstrapAccessTokenMetadata;
}

export type BootstrapAccessTokenReuseReason =
  | 'ok'
  | 'opaque-token'
  | 'missing'
  | 'expired'
  | 'not-yet-valid'
  | 'fixture-not-allowed'
  | 'environment-missing'
  | 'environment-mismatch'
  | 'app-missing'
  | 'app-mismatch'
  | 'tenant-mismatch'
  | 'organization-mismatch'
  | 'backend-mismatch';

export interface InspectBootstrapAccessTokenResult {
  reusable: boolean;
  reason: BootstrapAccessTokenReuseReason;
  fixture?: boolean;
  header?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

export const SDKWORK_ACCESS_TOKEN_ENV_KEY: 'SDKWORK_ACCESS_TOKEN';
export const SDKWORK_BOOTSTRAP_METADATA_PREFIX: 'sdkwork-bootstrap-';
export function normalizeBootstrapEnvironment(value: unknown): SdkworkEnvironment;
export function parseBootstrapAccessToken(
  token: unknown,
): { header: Record<string, unknown>; payload: Record<string, unknown> } | undefined;
export function looksLikeLocalFixtureJwt(token: unknown): boolean;
export function inspectBootstrapAccessToken(
  token: unknown,
  options?: InspectBootstrapAccessTokenOptions,
): InspectBootstrapAccessTokenResult;
export function isBootstrapAccessTokenReusable(
  token: unknown,
  options?: InspectBootstrapAccessTokenOptions,
): boolean;
export function createDevBootstrapAccessTokenJwt(
  options?: CreateDevBootstrapAccessTokenOptions,
): string;
export function buildBootstrapAccessTokenEnvRecord(
  existingAccessToken?: string,
  options?: InspectBootstrapAccessTokenOptions,
): Record<string, string>;
export function mergeBootstrapAccessTokenEnv(
  env?: Record<string, string | undefined>,
  options?: InspectBootstrapAccessTokenOptions,
): Record<string, string | undefined>;
export function buildBootstrapAccessTokenEnvFileContents(
  token: string,
  metadata?: BootstrapAccessTokenMetadata,
): string;
export function readBootstrapAccessTokenEnvFileContents(contents: string): {
  token?: string;
  metadata: BootstrapAccessTokenMetadata;
};
