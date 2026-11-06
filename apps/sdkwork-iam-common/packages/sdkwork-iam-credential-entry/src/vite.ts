import { createHash } from 'node:crypto';

import { SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN_GLOBAL_KEY } from './constants.ts';
import type { SdkworkEnvironment } from './bootstrap-access-token-core.mjs';
import {
  readAppBootstrapAccessToken,
  readRepoBootstrapAccessToken,
} from './node-bootstrap.mjs';

export interface CredentialEntryBootstrapVitePluginOptions {
  accessToken?: string;
  allowTestInjection?: boolean;
  environment: string;
  /**
   * Repository or application root that owns the overlay bootstrap env files
   * (`.sdkwork.local.env`, `.env.standalone.<lifecycle>.bootstrap.local`,
   * `.env.<lifecycle>.bootstrap.local`).
   *
   * Optional since 2026-09-20: when omitted, the plugin falls back to the process
   * working directory and walks the ancestor chain. Callers should therefore *not*
   * hand-write a path here unless the artifact genuinely lives outside the app's
   * ancestor chain — passing a wrong root used to fail silently, so the derived
   * default is strictly safer.
   */
  repoRoot?: string;
}

export interface CredentialEntryBootstrapVitePlugin {
  name: string;
  apply: 'serve';
  transformIndexHtml: {
    order: 'pre';
    handler: (html: string) => {
      html: string;
      tags: Array<{
        tag: 'script';
        children: string;
        injectTo: 'head-prepend';
      }>;
    };
  };
}

function normalizeToken(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

/** Normalize lifecycle aliases (`dev`, `prod`) to canonical environment names. */
function normalizeLifecycleEnvironment(value: string): 'development' | 'test' | 'staging' | 'production' {
  if (value === 'dev') return 'development';
  if (value === 'prod') return 'production';
  return value as 'development' | 'test' | 'staging' | 'production';
}

function serializeInlineScriptValue(value: string): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
}

/**
 * Lifecycle names the public application access token may be embedded for.
 *
 * This is a different credential class from the private development bootstrap
 * token (`APP_ACCESS_TOKEN_SPEC.md` section 1): it is `alg:none` with
 * `kid:public-app-token`, carries `token_class:application` and only
 * `permission_scope:["iam:self"]`, is committed in every per-scope env file,
 * and is public material that every renderer is expected to carry before an
 * interactive session exists.
 */
const PUBLIC_APPLICATION_ACCESS_TOKEN_LIFECYCLES = new Set([
  'development',
  'test',
  'staging',
  'demo',
  'production',
]);

const PUBLIC_APPLICATION_ACCESS_TOKEN_HEADER_ALG = 'none';
const PUBLIC_APPLICATION_ACCESS_TOKEN_HEADER_KID = 'public-app-token';
const PUBLIC_APPLICATION_ACCESS_TOKEN_SIGNATURE = 'public';
const PUBLIC_APPLICATION_ACCESS_TOKEN_CLASS = 'application';
const PUBLIC_APPLICATION_ACCESS_TOKEN_TYPE = 'access';
const PUBLIC_APPLICATION_ACCESS_TOKEN_ASSET_BASENAME = 'credential-entry-bootstrap';

function createShortHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

export interface PublicApplicationAccessTokenVitePluginOptions {
  /**
   * The committed public application token, read from the selected
   * `.env.<profile-id>` file. When omitted the plugin reads
   * `process.env.SDKWORK_ACCESS_TOKEN`; a private operator/session token there
   * is rejected instead of being embedded.
   */
  accessToken?: string;
  /** Manifest `backend.appId`; when supplied the token `app_id` must match. */
  applicationId?: string;
  /** Lifecycle environment (`development` … `production`). */
  environment: string;
  /**
   * Selected profile id (`standalone.development`, `cloud.production`, …).
   * Diagnostics only; it never changes the injected value.
   */
  profileId?: string;
}

export interface PublicApplicationAccessTokenVitePlugin {
  name: string;
  /**
   * Serve the bootstrap script from the dev server as a same-origin external
   * asset, mirroring the emitted build asset.
   */
  configureServer: (server: {
    middlewares: {
      use: (handler: (
        request: { url?: string },
        response: {
          setHeader: (name: string, value: string) => void;
          end: (body: string) => void;
        },
        next: () => void,
      ) => void) => void;
    };
  }) => void;
  /**
   * Emit the bootstrap script as a content-hashed same-origin asset.
   *
   * An inline `<script>` is refused by the production CSP
   * (`script-src 'self'`, `edge_server.rs`), which is exactly how a built
   * renderer could reach the login screen with no Access-Token at all; a
   * same-origin file is allowed by that policy and cacheable by hash.
   */
  generateBundle: (
    this: {
      emitFile: (file: { type: 'asset'; fileName: string; source: string }) => string;
    },
  ) => void;
  transformIndexHtml: {
    order: 'pre';
    handler: (html: string) => {
      html: string;
      tags: Array<{
        tag: 'script';
        attrs: { src: string };
        injectTo: 'head-prepend';
      }>;
    };
  };
}

function decodeJwtSegment(segment: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function describeCredentialEntryProfile(environment: string, profileId: string | undefined): string {
  return profileId ? `profile "${profileId}" (lifecycle "${environment}")` : `lifecycle "${environment}"`;
}

/**
 * Validate that a value is the public application access token of one profile.
 *
 * `IAM_CREDENTIAL_ENTRY_SPEC.md` section 4 allows test/demo/staging/production
 * renderers to carry only the committed public application token, and
 * `IAM_APPLICATION_BOOTSTRAP_SPEC.md` section 5.4.5 requires packaging to embed
 * it byte-identically. Rejecting everything else is what keeps a private
 * operator credential or a real session token from ever reaching a browser
 * artifact.
 * @param token - candidate token.
 * @param options - expected lifecycle and optional application identity.
 * @returns the validated token.
 */
function assertPublicApplicationAccessToken(
  token: string | undefined,
  options: { applicationId?: string; environment: string; profileId?: string },
): string {
  const profile = describeCredentialEntryProfile(options.environment, options.profileId);
  if (!token) {
    throw new Error(
      `credential-entry public application access token is missing for ${profile}: `
      + 'set SDKWORK_ACCESS_TOKEN in the selected per-scope env file with the committed public '
      + 'application token and regenerate it through the canonical materializer '
      + '(node <sdkwork-specs>/tools/materialize-client-env.mjs --root <repository>).',
    );
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error(
      `credential-entry token for ${profile} is not a JWT compact serialization; `
      + 'the renderer must receive the committed public application access token.',
    );
  }
  const header = decodeJwtSegment(parts[0] ?? '');
  const payload = decodeJwtSegment(parts[1] ?? '');
  if (!header || !payload) {
    throw new Error(
      `credential-entry token for ${profile} has an undecodable JWT header or payload.`,
    );
  }
  if (
    header.alg !== PUBLIC_APPLICATION_ACCESS_TOKEN_HEADER_ALG
    || header.kid !== PUBLIC_APPLICATION_ACCESS_TOKEN_HEADER_KID
    || parts[2] !== PUBLIC_APPLICATION_ACCESS_TOKEN_SIGNATURE
  ) {
    throw new Error(
      `credential-entry token for ${profile} is not the public application token `
      + `(expected alg:${PUBLIC_APPLICATION_ACCESS_TOKEN_HEADER_ALG}, `
      + `kid:${PUBLIC_APPLICATION_ACCESS_TOKEN_HEADER_KID}, signature `
      + `"${PUBLIC_APPLICATION_ACCESS_TOKEN_SIGNATURE}"); a private operator or session credential `
      + 'must never be embedded in a browser artifact.',
    );
  }
  if (
    payload.token_class !== PUBLIC_APPLICATION_ACCESS_TOKEN_CLASS
    || payload.token_type !== PUBLIC_APPLICATION_ACCESS_TOKEN_TYPE
  ) {
    throw new Error(
      `credential-entry token for ${profile} must declare `
      + `token_class:${PUBLIC_APPLICATION_ACCESS_TOKEN_CLASS} and `
      + `token_type:${PUBLIC_APPLICATION_ACCESS_TOKEN_TYPE}.`,
    );
  }
  if (String(payload.environment ?? '') !== options.environment) {
    throw new Error(
      `credential-entry token for ${profile} declares environment `
      + `"${String(payload.environment ?? '')}"; regenerate the selected profile with the canonical materializer.`,
    );
  }
  if (options.applicationId && String(payload.app_id ?? '') !== options.applicationId) {
    throw new Error(
      `credential-entry token for ${profile} declares app_id "${String(payload.app_id ?? '')}", `
      + `which does not match this application (${options.applicationId}).`,
    );
  }
  if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
    throw new Error(
      `credential-entry token for ${profile} expired at ${new Date(payload.exp * 1000).toISOString()}; `
      + 'regenerate the selected profile with the canonical materializer.',
    );
  }
  return token;
}

/**
 * Inject the committed public application access token into the renderer HTML.
 *
 * Supersedes the development-only private bootstrap handoff for every
 * non-development lifecycle and for builds: `IAM_CREDENTIAL_ENTRY_SPEC.md`
 * section 4 requires test and production renderers to carry the selected
 * profile's public application token, and `IAM_APPLICATION_BOOTSTRAP_SPEC.md`
 * section 5.4.5 requires packaging to bake it into the built artifact. The
 * plugin runs on both `serve` and `build`, and fails closed (throwing during
 * config resolution) when the selected profile has no valid public token, so a
 * renderer can never ship the runtime error
 * `access-token-only request requires Access-Token before request dispatch`.
 * @param options - token, lifecycle, and identity inputs.
 * @returns the always-applied Vite plugin.
 */
export function createSdkworkPublicApplicationAccessTokenVitePlugin({
  accessToken,
  applicationId,
  environment,
  profileId,
}: PublicApplicationAccessTokenVitePluginOptions): PublicApplicationAccessTokenVitePlugin {
  const lifecycle = normalizeLifecycleEnvironment(environment);
  if (!PUBLIC_APPLICATION_ACCESS_TOKEN_LIFECYCLES.has(lifecycle)) {
    throw new Error(
      `unsupported credential-entry lifecycle "${environment}"; expected one of `
      + `${[...PUBLIC_APPLICATION_ACCESS_TOKEN_LIFECYCLES].join(', ')}.`,
    );
  }
  const token = assertPublicApplicationAccessToken(
    normalizeToken(accessToken) ?? normalizeToken(process.env.SDKWORK_ACCESS_TOKEN),
    { applicationId, environment: lifecycle, profileId },
  );

  const script =
    `globalThis.${SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN_GLOBAL_KEY} = `
    + `${serializeInlineScriptValue(token)};`;
  // Content-hashed name: the token only changes when the canonical materializer
  // rotates the profile, and a hash keeps every deploy cache-safe.
  const assetFileName = `${PUBLIC_APPLICATION_ACCESS_TOKEN_ASSET_BASENAME}-${createShortHash(script)}.js`;
  const assetUrl = `/${assetFileName}`;
  let emitted = false;

  return {
    name: 'sdkwork-iam-public-application-access-token',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if ((request.url ?? '').split('?')[0] !== assetUrl) {
          next();
          return;
        }
        response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(script);
      });
    },
    generateBundle() {
      if (emitted) {
        return;
      }
      emitted = true;
      this.emitFile({ type: 'asset', fileName: assetFileName, source: script });
    },
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => ({
        html,
        tags: [{
          tag: 'script',
          attrs: { src: assetUrl },
          injectTo: 'head-prepend',
        }],
      }),
    },
  };
}

export function createSdkworkCredentialEntryBootstrapVitePlugin({
  accessToken,
  allowTestInjection = false,
  environment,
  repoRoot,
}: CredentialEntryBootstrapVitePluginOptions): CredentialEntryBootstrapVitePlugin | undefined {
  const canInject = environment === 'development'
    || (environment === 'test' && allowTestInjection);
  if (!canInject) {
    return undefined;
  }
  const lifecycle = normalizeLifecycleEnvironment(environment);
  // Search order: explicit token -> process env -> caller-supplied root ->
  // the process working directory. Vite executes the config file with cwd set to
  // the application root on every canonical dev path (`sdkwork-app dev` spawns
  // `pnpm --dir <app> run <script>`, and pnpm sets cwd to that dir), so `cwd`
  // covers the omitted-`repoRoot` case without needing Vite's resolved config.
  // `readAppBootstrapAccessToken` additionally walks ancestors, so a deeply nested
  // config still finds the artifact its repo-level dev runner wrote.
  const token = normalizeToken(accessToken)
    ?? normalizeToken(process.env.SDKWORK_ACCESS_TOKEN)
    ?? resolveTokenFromSearchRoot(repoRoot, lifecycle)
    ?? resolveTokenFromSearchRoot(process.cwd(), lifecycle);
  if (!token) {
    return undefined;
  }

  return {
    name: 'sdkwork-iam-credential-entry-bootstrap',
    apply: 'serve',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => ({
        html,
        tags: [{
          tag: 'script',
          children:
            `globalThis.${SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN_GLOBAL_KEY} = `
            + `${serializeInlineScriptValue(token)};`,
          injectTo: 'head-prepend',
        }],
      }),
    },
  };
}

/**
 * Resolve the token from a caller-supplied search root.
 *
 * `repoRoot` is both a repository root and an application root depending on the
 * caller's nesting, and the two spellings of the artifact differ, so both readers
 * are tried. The app reader also walks ancestors, which is what makes a deep
 * `apps/<app>-pc/packages/<pkg>/vite.config.ts` find the artifact its repo-level
 * dev runner wrote.
 */
function resolveTokenFromSearchRoot(
  repoRoot: string | undefined,
  lifecycle: SdkworkEnvironment,
): string | undefined {
  const normalized = repoRoot?.trim();
  if (!normalized) {
    return undefined;
  }
  return readRepoBootstrapAccessToken(normalized, lifecycle)
    ?? readAppBootstrapAccessToken(normalized, lifecycle);
}
