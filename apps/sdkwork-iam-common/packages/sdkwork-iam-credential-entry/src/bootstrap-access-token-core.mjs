export const SDKWORK_ACCESS_TOKEN_ENV_KEY = 'SDKWORK_ACCESS_TOKEN';

/**
 * Prefix for non-secret metadata comments in a repository bootstrap artifact.
 * The accompanying token is the secret; metadata identifies which repository
 * scope the token belongs to so a different lifecycle or backend cannot reuse
 * it by accident.
 */
export const SDKWORK_BOOTSTRAP_METADATA_PREFIX = 'sdkwork-bootstrap-';

const DEFAULT_IAM_TENANT_ID = '100001';
const DEFAULT_IAM_ORGANIZATION_ID = '0';
const SDKWORK_TOKEN_VERSION_CURRENT = 1;
const DEFAULT_CLOCK_SKEW_SECONDS = 300;
const SUPPORTED_ENVIRONMENTS = new Set([
  'development',
  'test',
  'staging',
  'production',
]);

function normalizeText(value) {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

function encodeJwtPart(value) {
  const serialized = JSON.stringify(value);
  return globalThis.btoa(serialized).replace(/=+$/u, '');
}

function decodeJwtPart(part) {
  if (!part) return undefined;
  try {
    const normalized = part.replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const json = typeof globalThis.atob === 'function'
      ? globalThis.atob(padded)
      : Buffer.from(part, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function createLocalFixtureJwt(claims) {
  return [
    encodeJwtPart({ alg: 'none', typ: 'JWT' }),
    encodeJwtPart({ token_version: SDKWORK_TOKEN_VERSION_CURRENT, ...claims }),
    'signature',
  ].join('.');
}

function resolveAppIdFromManifest(manifest) {
  const backendAppId = normalizeText(manifest?.backend?.appId);
  if (backendAppId) {
    return backendAppId;
  }
  throw new Error('agent.app.config.json backend.appId is required for IAM bootstrap access token generation');
}

function resolveTenantIdFromManifest(manifest) {
  return normalizeText(manifest?.backend?.tenantId) ?? DEFAULT_IAM_TENANT_ID;
}

function resolveOrganizationIdFromManifest(manifest) {
  return normalizeText(manifest?.backend?.organizationId) ?? DEFAULT_IAM_ORGANIZATION_ID;
}

function resolvePermissionScopeFromManifest(manifest) {
  const scopes = manifest?.backend?.accessTokenPermissionScope;
  if (!Array.isArray(scopes)) {
    return [];
  }
  return scopes.map((scope) => normalizeText(scope)).filter(Boolean);
}

export function normalizeBootstrapEnvironment(value) {
  const normalized = normalizeText(value)?.toLowerCase();
  const environment = normalized === 'dev'
    ? 'development'
    : normalized === 'prod'
      ? 'production'
      : normalized;
  if (!environment || !SUPPORTED_ENVIRONMENTS.has(environment)) {
    throw new Error(
      `unsupported SDKWork environment "${value ?? ''}"; expected development, test, staging, or production`,
    );
  }
  return environment;
}

function tryNormalizeBootstrapEnvironment(value) {
  try {
    return normalizeBootstrapEnvironment(value);
  } catch {
    return undefined;
  }
}

function normalizeOrigin(value) {
  const trimmed = normalizeText(value);
  if (!trimmed) return undefined;
  try {
    return new URL(trimmed).origin;
  } catch {
    return undefined;
  }
}

function isLoopbackOrigin(value) {
  const trimmed = normalizeText(value);
  if (!trimmed) return false;
  try {
    const hostname = new URL(trimmed).hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

/**
 * Parse a bootstrap access token into its JWT header and payload.
 *
 * Opaque values (anything that is not exactly three dot-separated JWT
 * segments) return `undefined` header/payload and are handled by
 * {@link inspectBootstrapAccessToken} as operator-supplied opaque material.
 * @param token - raw token value.
 * @returns decoded header and payload when the value is a JWT.
 */
export function parseBootstrapAccessToken(token) {
  const raw = normalizeText(token);
  if (!raw) return undefined;
  const parts = raw.split('.');
  if (parts.length !== 3) return undefined;
  const header = decodeJwtPart(parts[0]);
  const payload = decodeJwtPart(parts[1]);
  if (!header || !payload) return undefined;
  return { header, payload };
}

/**
 * Whether a token is a disposable local fixture JWT (`alg: none` plus the
 * literal `signature` segment).
 * @param token - raw token value.
 * @returns true for a local fixture.
 */
export function looksLikeLocalFixtureJwt(token) {
  const parsed = parseBootstrapAccessToken(token);
  if (!parsed) return false;
  return parsed.header.alg === 'none' && normalizeText(token)?.split('.')[2] === 'signature';
}

function fixtureIsAllowedForEnvironment(environment, options) {
  if (environment === 'staging' || environment === 'production') return false;
  if (environment === 'development') return true;
  if (environment === 'test') {
    return options.allowTestTokenGeneration === true
      || (options.allowLoopbackFixture !== false && isLoopbackOrigin(options.backendBaseUrl));
  }
  return isLoopbackOrigin(options.backendBaseUrl);
}

/**
 * Inspect one candidate bootstrap token against the repository scope it is
 * about to be used for. Reuse is the default; a token is rejected only when a
 * claim proves it belongs to a different environment, tenant, organization,
 * backend, or time window. The `app_id` claim stays opaque because issued
 * credentials carry the registration-assigned runtime id rather than the
 * manifest key.
 * @param token - candidate token.
 * @param options - lifecycle, manifest, backend, and clock inputs.
 * @returns reuse decision with a machine-readable reason.
 */
export function inspectBootstrapAccessToken(token, options = {}) {
  const raw = normalizeText(token);
  if (!raw) {
    return { reusable: false, reason: 'missing' };
  }
  const parsed = parseBootstrapAccessToken(raw);
  if (!parsed) {
    // An opaque value (for example a legacy fixture string) cannot be proven
    // stale. It is preserved so a resolver never overwrites an operator's
    // explicit token; the runtime parser still rejects it if a JWT is required.
    return { reusable: true, reason: 'opaque-token' };
  }

  const { header, payload } = parsed;
  const fixture = header.alg === 'none' && raw.split('.')[2] === 'signature';
  const environment = tryNormalizeBootstrapEnvironment(options.environment)
    ?? tryNormalizeBootstrapEnvironment(payload.environment);
  const nowSeconds = typeof options.nowSeconds === 'number'
    ? options.nowSeconds
    : Math.floor(Date.now() / 1000);
  const skewSeconds = typeof options.skewSeconds === 'number'
    ? options.skewSeconds
    : DEFAULT_CLOCK_SKEW_SECONDS;

  if (typeof payload.exp === 'number' && nowSeconds >= payload.exp - skewSeconds) {
    return { reusable: false, reason: 'expired', fixture, header, payload };
  }
  if (typeof payload.nbf === 'number' && nowSeconds < payload.nbf - skewSeconds) {
    return { reusable: false, reason: 'not-yet-valid', fixture, header, payload };
  }

  if (fixture && !fixtureIsAllowedForEnvironment(environment, options)) {
    return { reusable: false, reason: 'fixture-not-allowed', fixture, header, payload };
  }

  const requestedEnvironment = tryNormalizeBootstrapEnvironment(options.environment);
  const claimEnvironment = tryNormalizeBootstrapEnvironment(payload.environment);
  if (requestedEnvironment && claimEnvironment && claimEnvironment !== requestedEnvironment) {
    return { reusable: false, reason: 'environment-mismatch', fixture, header, payload };
  }

  const manifest = options.manifest;
  // The `app_id` claim is opaque for reuse: the IAM backend issues credentials
  // carrying the runtime application id assigned at registration (an
  // `app_<uuid>` value), which is never the manifest `backend.appId` key, so a
  // mismatch cannot prove the token belongs to another application. Tenant and
  // organization claims carry the cross-application isolation, and a token
  // minted for a different backend fails at request time (audience binding)
  // and is regenerated then.

  const manifestTenantId = normalizeText(manifest?.backend?.tenantId);
  const claimTenantId = normalizeText(payload.tenant_id);
  if (manifestTenantId && claimTenantId && manifestTenantId !== claimTenantId) {
    return { reusable: false, reason: 'tenant-mismatch', fixture, header, payload };
  }
  const manifestOrganizationId = normalizeText(manifest?.backend?.organizationId);
  const claimOrganizationId = normalizeText(payload.organization_id);
  if (
    manifestOrganizationId
    && claimOrganizationId
    && manifestOrganizationId !== claimOrganizationId
  ) {
    return { reusable: false, reason: 'organization-mismatch', fixture, header, payload };
  }

  const recordedBackend = normalizeOrigin(options.tokenMetadata?.backend);
  const activeBackend = normalizeOrigin(options.backendBaseUrl);
  if (recordedBackend && activeBackend && recordedBackend !== activeBackend) {
    return { reusable: false, reason: 'backend-mismatch', fixture, header, payload };
  }

  return { reusable: true, reason: 'ok', fixture, header, payload };
}

/**
 * Boolean form of {@link inspectBootstrapAccessToken}.
 * @param token - candidate token.
 * @param options - same options as {@link inspectBootstrapAccessToken}.
 * @returns whether the token can be reused without regeneration.
 */
export function isBootstrapAccessTokenReusable(token, options = {}) {
  return inspectBootstrapAccessToken(token, options).reusable;
}

/**
 * Build the environment record for one bootstrap token.
 *
 * A reusable configured value is returned unchanged. Generation happens only
 * when no reusable value exists, the selected environment forbids the cached
 * fixture, or the caller explicitly refreshes.
 * @param existingAccessToken - configured token, if any.
 * @param options - lifecycle, manifest, and refresh inputs.
 * @returns record containing the token key.
 */
export function buildBootstrapAccessTokenEnvRecord(existingAccessToken, options = {}) {
  const configuredAccessToken = normalizeText(existingAccessToken);
  if (
    configuredAccessToken
    && options.forceRefresh !== true
    && isBootstrapAccessTokenReusable(configuredAccessToken, options)
  ) {
    return { [SDKWORK_ACCESS_TOKEN_ENV_KEY]: configuredAccessToken };
  }

  const environment = normalizeBootstrapEnvironment(options.environment ?? 'development');
  const canGenerate = environment === 'development'
    || (environment === 'test' && options.allowTestTokenGeneration === true);
  if (!canGenerate) {
    const testHint = environment === 'test'
      ? ' or explicitly set allowTestTokenGeneration for an isolated test runtime'
      : '';
    throw new Error(
      `${SDKWORK_ACCESS_TOKEN_ENV_KEY} is required for ${environment}; provision it from a private secret source${testHint}`,
    );
  }

  return {
    [SDKWORK_ACCESS_TOKEN_ENV_KEY]: createDevBootstrapAccessTokenJwt({
      ...options,
      environment,
    }),
  };
}

export function mergeBootstrapAccessTokenEnv(env = {}, options = {}) {
  return {
    ...env,
    ...buildBootstrapAccessTokenEnvRecord(env[SDKWORK_ACCESS_TOKEN_ENV_KEY], options),
  };
}

/**
 * Create a disposable local bootstrap access token JWT for development or an
 * explicitly opted-in test runtime.
 * @param options - manifest identity, lifecycle, and claim overrides.
 * @returns compact JWT serialization.
 */
export function createDevBootstrapAccessTokenJwt(options = {}) {
  const manifest = options.manifest ?? {};
  const tenantId = normalizeText(options.tenantId) ?? resolveTenantIdFromManifest(manifest);
  const organizationId = normalizeText(options.organizationId)
    ?? resolveOrganizationIdFromManifest(manifest);
  const declaredAppId = normalizeText(manifest?.backend?.appId);
  const requestedAppId = normalizeText(options.appId);
  if (declaredAppId && requestedAppId && declaredAppId !== requestedAppId) {
    throw new Error(
      `bootstrap appId override ${requestedAppId} does not match manifest backend.appId ${declaredAppId}`,
    );
  }
  const appId = declaredAppId ?? requestedAppId ?? resolveAppIdFromManifest(manifest);
  const environment = normalizeBootstrapEnvironment(options.environment ?? 'development');
  if (environment === 'staging' || environment === 'production') {
    throw new Error(`${environment} bootstrap access tokens must be provisioned by a private secret source`);
  }
  const nowUnixSeconds = Math.floor(Date.now() / 1000);

  return createLocalFixtureJwt({
    app_id: appId,
    deployment_mode: options.deploymentMode ?? 'saas',
    environment,
    exp: nowUnixSeconds + 86_400,
    iat: nowUnixSeconds,
    login_scope: organizationId === '0' ? 'TENANT' : 'ORGANIZATION',
    organization_id: organizationId,
    permission_scope: options.permissionScope ?? resolvePermissionScopeFromManifest(manifest),
    runtime_target: options.runtimeTarget ?? 'browser',
    session_id: options.sessionId ?? `bootstrap-local-${environment}`,
    tenant_id: tenantId,
    token_type: 'access',
    user_id: options.userId ?? '0',
  });
}

/**
 * Format the repository bootstrap artifact: non-secret scope metadata followed
 * by the token assignment.
 * @param token - access token value.
 * @param metadata - lifecycle and repository scope metadata.
 * @returns env-file contents ending in a newline.
 */
export function buildBootstrapAccessTokenEnvFileContents(token, metadata = {}) {
  const lines = ['# SDKWork private bootstrap access token (gitignored). Do not commit.'];
  for (const [key, value] of Object.entries(metadata)) {
    const normalizedKey = normalizeText(key)?.replace(/[A-Z]/gu, (character) => `-${character.toLowerCase()}`);
    const normalizedValue = normalizeText(value);
    if (!normalizedKey || !normalizedValue) continue;
    lines.push(`# ${SDKWORK_BOOTSTRAP_METADATA_PREFIX}${normalizedKey}=${normalizedValue}`);
  }
  lines.push(`${SDKWORK_ACCESS_TOKEN_ENV_KEY}=${normalizeText(token) ?? ''}`);
  return `${lines.join('\n')}\n`;
}

/**
 * Read the token and non-secret metadata from one bootstrap artifact.
 * @param contents - env-file text.
 * @returns token and metadata; token is `undefined` when absent.
 */
export function readBootstrapAccessTokenEnvFileContents(contents) {
  let token;
  const metadata = {};
  for (const line of String(contents ?? '').split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) {
      const metadataBody = trimmed.slice(1).trim();
      const separator = metadataBody.indexOf('=');
      if (separator <= 0) continue;
      const key = metadataBody.slice(0, separator).trim();
      if (!key.startsWith(SDKWORK_BOOTSTRAP_METADATA_PREFIX)) continue;
      const value = normalizeText(metadataBody.slice(separator + 1));
      if (value) metadata[key.slice(SDKWORK_BOOTSTRAP_METADATA_PREFIX.length)] = value;
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    if (trimmed.slice(0, separator).trim() !== SDKWORK_ACCESS_TOKEN_ENV_KEY) continue;
    const raw = trimmed.slice(separator + 1).trim();
    const unquoted = (
      (raw.startsWith('"') && raw.endsWith('"'))
      || (raw.startsWith("'") && raw.endsWith("'"))
    ) ? raw.slice(1, -1) : raw;
    token = normalizeText(unquoted);
  }
  return { token, metadata };
}
