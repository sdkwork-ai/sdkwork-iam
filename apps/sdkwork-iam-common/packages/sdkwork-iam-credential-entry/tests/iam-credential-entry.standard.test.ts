import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import {
  initializeCredentialEntryTokenManager,
  prepareCredentialEntryTokens,
  readBootstrapAccessTokenFromProcessEnv,
  resolveAppIdFromManifest,
  resolveOrganizationIdFromManifest,
  resolveTenantIdFromManifest,
  buildBootstrapAccessTokenEnvRecord,
  createDevBootstrapAccessTokenJwt,
  inspectBootstrapAccessToken,
  mergeBootstrapAccessTokenEnv,
  wrapCredentialEntryClient,
  SDKWORK_ACCESS_TOKEN_ENV_KEY,
  SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN_GLOBAL_KEY,
} from '../src/index.ts';
import {
  mergeRepoBootstrapAccessTokenEnv,
  readRepoBootstrapAccessToken,
} from '../src/node-bootstrap.mjs';
import { createSdkworkCredentialEntryBootstrapVitePlugin } from '../src/vite.ts';

function createFixtureRepo() {
  const repoRoot = mkdtempSync(join(tmpdir(), 'sdkwork-credential-entry-'));
  writeFileSync(join(repoRoot, 'agent.app.config.json'), JSON.stringify({
    app: { key: 'sdkwork-example-pc' },
    backend: {
      accessTokenPermissionScope: ['example.read'],
      appId: 'sdkwork-example-pc',
      organizationId: '0',
      tenantId: '100001',
    },
  }));
  return repoRoot;
}

describe('@sdkwork/iam-credential-entry', () => {
  it('reads bootstrap access token from process env', () => {
    expect(
      readBootstrapAccessTokenFromProcessEnv({
        [SDKWORK_ACCESS_TOKEN_ENV_KEY]: ' bootstrap-token ',
      }),
    ).toBe('bootstrap-token');
  });

  it('prefers the development credential-entry handoff over a process env fallback', () => {
    const host = globalThis as Record<string, unknown>;
    const previousValue = host[SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN_GLOBAL_KEY];

    host[SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN_GLOBAL_KEY] = ' injected-bootstrap-token ';
    try {
      expect(
        readBootstrapAccessTokenFromProcessEnv({
          [SDKWORK_ACCESS_TOKEN_ENV_KEY]: 'process-bootstrap-token',
        }),
      ).toBe('injected-bootstrap-token');
    } finally {
      if (previousValue === undefined) {
        delete host[SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN_GLOBAL_KEY];
      } else {
        host[SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN_GLOBAL_KEY] = previousValue;
      }
    }
  });

  it('initializes an empty token manager from the bootstrap access token', () => {
    const tokenManager = {
      hasAccessToken: vi.fn(() => false),
      setAccessToken: vi.fn(),
    } as unknown as AuthTokenManager;

    initializeCredentialEntryTokenManager(tokenManager, () => 'bootstrap-token');

    expect(tokenManager.setAccessToken).toHaveBeenCalledWith('bootstrap-token');
  });

  it('preserves an existing application access token', () => {
    const readBootstrapToken = vi.fn(() => 'bootstrap-token');
    const tokenManager = {
      hasAccessToken: vi.fn(() => true),
      setAccessToken: vi.fn(),
    } as unknown as AuthTokenManager;

    prepareCredentialEntryTokens(tokenManager, readBootstrapToken);

    expect(readBootstrapToken).not.toHaveBeenCalled();
    expect(tokenManager.setAccessToken).not.toHaveBeenCalled();
  });

  it('wraps credential-entry methods and prepares bootstrap tokens before invocation', async () => {
    const prepareTokens = vi.fn();
    const create = vi.fn(async (_input: unknown) => ({ code: '2000' }));
    const client = {
      auth: {
        sessions: { create },
      },
    };

    wrapCredentialEntryClient(client as never, { prepareTokens });
    await client.auth.sessions.create({ grantType: 'password' });

    expect(prepareTokens).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('resolves manifest identity for IAM runtime bootstrap', () => {
    const manifest = {
      app: { key: 'sdkwork-iam-demo', name: 'SDKWork IAM Demo', appType: 'APP_HTML' },
      backend: {
        appId: 'sdkwork-iam-demo',
        tenantId: '100001',
        organizationId: '0',
        accessTokenPermissionScope: ['iam.users.read'],
      },
    };

    expect(resolveAppIdFromManifest(manifest)).toBe('sdkwork-iam-demo');
    expect(resolveTenantIdFromManifest(manifest)).toBe('100001');
    expect(resolveOrganizationIdFromManifest(manifest)).toBe('0');
  });

  it('resolves runtime app id exclusively from backend.appId', () => {
    const manifest = {
      app: { key: 'sdkwork-example' },
      backend: { appId: 'sdkwork-example-pc', tenantId: '100001', organizationId: '0' },
    };

    expect(resolveAppIdFromManifest(manifest)).toBe('sdkwork-example-pc');
    const token = createDevBootstrapAccessTokenJwt({ manifest });
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    expect(payload.app_id).toBe('sdkwork-example-pc');
  });

  it('rejects credential-entry manifests without backend.appId', () => {
    expect(() => resolveAppIdFromManifest({
      app: { key: 'sdkwork-example-pc' },
      backend: { tenantId: '100001', organizationId: '0' },
    })).toThrow(/backend\.appId is required/u);
    expect(() => createDevBootstrapAccessTokenJwt({
      manifest: {
        app: { key: 'sdkwork-example-pc' },
        backend: { tenantId: '100001', organizationId: '0' },
      },
    })).toThrow(/backend\.appId is required/u);
  });

  it('rejects appId overrides that contradict the selected surface manifest', () => {
    expect(() => createDevBootstrapAccessTokenJwt({
      appId: 'sdkwork-example-h5',
      manifest: {
        app: { key: 'sdkwork-example-pc' },
        backend: {
          appId: 'sdkwork-example-pc',
          tenantId: '100001',
          organizationId: '0',
        },
      },
    })).toThrow(/does not match manifest backend\.appId/u);
  });

  it('creates dev bootstrap access token JWT from manifest identity', () => {
    const token = createDevBootstrapAccessTokenJwt({
      manifest: {
        app: { key: 'sdkwork-im-pc' },
        backend: { appId: 'sdkwork-im-pc', tenantId: '100001', organizationId: '0' },
      },
    });

    expect(token.split('.')).toHaveLength(3);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    expect(payload.token_type).toBe('access');
    expect(payload.token_kind).toBeUndefined();
    expect(mergeBootstrapAccessTokenEnv({}, {
      manifest: {
        app: { key: 'sdkwork-im-pc' },
        backend: { appId: 'sdkwork-im-pc', tenantId: '100001', organizationId: '0' },
      },
    }).SDKWORK_ACCESS_TOKEN).toBe(token);
  });

  it('reuses a valid configured token and regenerates only an expired or foreign one', () => {
    const manifest = {
      app: { key: 'sdkwork-example-pc' },
      backend: { appId: 'sdkwork-example-pc', tenantId: '100001', organizationId: '0' },
    };
    const token = createDevBootstrapAccessTokenJwt({ manifest });
    expect(buildBootstrapAccessTokenEnvRecord(token, {
      environment: 'development',
      manifest,
    })[SDKWORK_ACCESS_TOKEN_ENV_KEY]).toBe(token);

    const expired = [
      Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
      Buffer.from(JSON.stringify({
        app_id: 'sdkwork-example-pc',
        environment: 'development',
        exp: Math.floor(Date.now() / 1000) - 10,
        token_version: 1,
      })).toString('base64url'),
      'signature',
    ].join('.');
    expect(inspectBootstrapAccessToken(expired, {
      environment: 'development',
      manifest,
    }).reason).toBe('expired');
    expect(buildBootstrapAccessTokenEnvRecord(expired, {
      environment: 'development',
      manifest,
    })[SDKWORK_ACCESS_TOKEN_ENV_KEY]).not.toBe(expired);

    expect(inspectBootstrapAccessToken(token, {
      environment: 'test',
      manifest,
    }).reusable).toBe(false);
  });

  it('treats the app_id claim as opaque and keeps tenant identity as the isolation', () => {
    const manifest = {
      app: { key: 'sdkwork-example-pc' },
      backend: { appId: 'sdkwork-example-pc', tenantId: '100001', organizationId: '0' },
    };
    // The IAM backend issues credentials carrying the registration-assigned
    // runtime application id, which is never the manifest key; a mismatch
    // cannot prove the token belongs to another application, so reuse must not
    // reject on it. Tenant and organization claims keep that isolation.
    const runtimeIssued = [
      Buffer.from(JSON.stringify({ alg: 'HS256', kid: '100001:local-hs256:primary', typ: 'JWT' })).toString('base64url'),
      Buffer.from(JSON.stringify({
        app_id: 'app_01a18b4f-6f61-7ff1-b86c-75b54995883f',
        aud: 'app_01a18b4f-6f61-7ff1-b86c-75b54995883f',
        environment: 'production',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'sdkwork-iam-local',
        organization_id: '0',
        tenant_id: '100001',
        token_type: 'access',
        token_version: 1,
      })).toString('base64url'),
      Buffer.from('signature-bytes').toString('base64url'),
    ].join('.');
    expect(inspectBootstrapAccessToken(runtimeIssued, {
      environment: 'production',
      manifest,
    })).toMatchObject({ reusable: true, reason: 'ok' });

    const foreignTenant = [
      Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
      Buffer.from(JSON.stringify({
        app_id: 'app_01a18b4f-6f61-7ff1-b86c-75b54995883f',
        environment: 'production',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'sdkwork-iam-local',
        organization_id: '0',
        tenant_id: '100002',
        token_type: 'access',
        token_version: 1,
      })).toString('base64url'),
      Buffer.from('signature-bytes').toString('base64url'),
    ].join('.');
    expect(inspectBootstrapAccessToken(foreignTenant, {
      environment: 'production',
      manifest,
    })).toMatchObject({ reusable: false, reason: 'tenant-mismatch' });
  });

  it('persists one environment-scoped artifact and reuses it on the next start', () => {
    const repoRoot = createFixtureRepo();
    try {
      const manifestPath = join(repoRoot, 'agent.app.config.json');
      const first = mergeRepoBootstrapAccessTokenEnv({
        repoRoot,
        env: {},
        environment: 'development',
        manifestPath,
      });
      const artifactPath = join(repoRoot, '.env.standalone.development.bootstrap.local');
      const firstContents = readFileSync(artifactPath, 'utf8');
      expect(firstContents).toContain('sdkwork-bootstrap-environment=development');
      expect(firstContents).toContain('sdkwork-bootstrap-deployment-profile=standalone');
      expect(readRepoBootstrapAccessToken(repoRoot, 'test', {
        environment: 'test',
        allowTestTokenGeneration: true,
      })).toBeUndefined();

      const second = mergeRepoBootstrapAccessTokenEnv({
        repoRoot,
        env: {},
        environment: 'development',
        manifestPath,
      });
      expect(second[SDKWORK_ACCESS_TOKEN_ENV_KEY]).toBe(first[SDKWORK_ACCESS_TOKEN_ENV_KEY]);
      expect(readFileSync(artifactPath, 'utf8')).toBe(firstContents);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('injects a safely serialized development token through the canonical Vite handoff', () => {
    const plugin = createSdkworkCredentialEntryBootstrapVitePlugin({
      accessToken: 'token</script>&value',
      environment: 'development',
    });
    const transformed = plugin?.transformIndexHtml.handler('<html></html>');
    const script = transformed?.tags[0]?.children ?? '';

    expect(plugin?.apply).toBe('serve');
    expect(script).toContain(SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN_GLOBAL_KEY);
    expect(script).toContain('token\\u003c/script\\u003e\\u0026value');
    expect(script).not.toContain('</script>');
  });

  it('does not inject test tokens without explicit test opt-in', () => {
    expect(createSdkworkCredentialEntryBootstrapVitePlugin({
      accessToken: 'test-token',
      environment: 'test',
    })).toBeUndefined();
    expect(createSdkworkCredentialEntryBootstrapVitePlugin({
      accessToken: 'test-token',
      environment: 'test',
      allowTestInjection: true,
    })).toBeDefined();
  });

  for (const environment of ['staging', 'production'] as const) {
    it(`never injects bootstrap credentials into ${environment} HTML`, () => {
      expect(createSdkworkCredentialEntryBootstrapVitePlugin({
        accessToken: `${environment}-secret-token`,
        environment,
      })).toBeUndefined();
    });
  }
});
