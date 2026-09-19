// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * App API SDK port and factory contract of `sdkwork-iam-harmony-mobile-console-core`.
 *
 * Authority: `APP_SDK_INTEGRATION_SPEC.md` and
 * `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 6. This tier consumes
 * `/app/v3/api` through a generated ArkTS client adapted for the Harmony
 * runtime; this file owns the port contract, the base-URL normalization and the
 * credential boundary, while concrete transport construction stays in the root
 * bootstrap.
 *
 * PREREQUISITE: the SDK generation chain emits TypeScript, Dart, Kotlin, Swift,
 * C#, Go, Java, Python and Rust targets of `sdkwork-iam-app-sdk`; no ArkTS target
 * exists yet (see `sdks/README.md`). This module therefore declares the port and
 * the adapter seam instead of vendoring a transport copy. Feature packages must
 * never fill the gap with raw request APIs or manual auth headers.
 *
 * The base URL stays an origin exactly as every other IAM client root materializes
 * it: `ENVIRONMENT_SPEC.md` section 5.1.4.1 assigns canonical API path prefixing
 * to the generated transport, so this module must not pre-strip or pre-append
 * `/app/v3/api`.
 */
import { readIamHarmonyMobileConsoleCoreSession, resolveIamHarmonyMobileConsoleCoreAccessToken } from '../session/SessionStore';

/** Configuration handed to the generated app SDK client. */
export interface IamHarmonySdkClientConfig {
  readonly baseUrl: string;
  readonly accessToken?: string;
  readonly authToken?: string;
  readonly platform: string;
}

/**
 * Injected app-api surface.
 *
 * Structurally satisfied by the generated `sdkwork-iam-app-sdk` client once an ArkTS
 * target lands; feature services depend on this port, never on the generated module.
 */
export interface IamHarmonySdkClient {
  readonly baseUrl: string;
  readonly platform: string;
}

/** HarmonyOS platform tag reported to the backend. */
export const IAM_HARMONY_PLATFORM: string = 'harmony-native';

/**
 * Validates one origin, or a semicolon-joined origin family, for SDK construction.
 *
 * Rejects rather than rewrites: a document that already carries the prefix would
 * produce `/app/v3/api/app/v3/api` at request time, and
 * silently trimming it would hide a configuration error that should be fixed at
 * its source.
 *
 * A family is accepted and returned unchanged. A cloud document declares the
 * complete registered origin family (`ENVIRONMENT_SPEC.md` section 5.1.0.1), and
 * that section assigns member selection to the SDK factory; collapsing it here
 * would remove the information the factory needs.
 */
export function assertIamHarmonyOrigin(origin: string): string {
  const segments: string[] = origin.trim().split(';');
  const normalized: string[] = [];
  for (const raw of segments) {
    const member: string = raw.trim().replace(/\/+$/u, '');
    if (member.length === 0) {
      throw new Error('IAM Harmony SDK base URL is required before SDK bootstrap');
    }
    if (member.endsWith('/app/v3/api')) {
      throw new Error(
        'IAM Harmony SDK base URL must be an origin without /app/v3/api (ENVIRONMENT_SPEC.md section 5.1.4.1)',
      );
    }
    normalized.push(member);
  }
  return normalized.join(';');
}

/** Builds the client config, resolving credentials from this tier's credential store. */
export function createIamHarmonySdkClientConfig(baseUrl: string): IamHarmonySdkClientConfig {
  const session = readIamHarmonyMobileConsoleCoreSession();
  return {
    baseUrl: assertIamHarmonyOrigin(baseUrl),
    accessToken: resolveIamHarmonyMobileConsoleCoreAccessToken(session),
    authToken: session === undefined ? undefined : session.authToken,
    platform: IAM_HARMONY_PLATFORM,
  };
}

let client: IamHarmonySdkClient | undefined = undefined;

/**
 * Constructs the client, or reuses the registered one.
 *
 * Idempotent on purpose: the root page and the bootstrap both ask for the client,
 * and a second construction would silently drop the credentials the first one
 * installed.
 */
export function getIamHarmonySdkClient(baseUrl: string): IamHarmonySdkClient {
  const existing: IamHarmonySdkClient | undefined = client;
  if (existing !== undefined) return existing;
  const config: IamHarmonySdkClientConfig = createIamHarmonySdkClientConfig(baseUrl);
  const created: IamHarmonySdkClient = { baseUrl: config.baseUrl, platform: config.platform };
  client = created;
  return created;
}

export function resetIamHarmonySdkClient(): void {
  client = undefined;
}
