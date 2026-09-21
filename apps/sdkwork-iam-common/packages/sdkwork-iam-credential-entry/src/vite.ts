import { SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN_GLOBAL_KEY } from './constants.ts';
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
function resolveTokenFromSearchRoot(repoRoot: string | undefined, lifecycle: string): string | undefined {
  const normalized = repoRoot?.trim();
  if (!normalized) {
    return undefined;
  }
  return readRepoBootstrapAccessToken(normalized, lifecycle)
    ?? readAppBootstrapAccessToken(normalized, lifecycle);
}
