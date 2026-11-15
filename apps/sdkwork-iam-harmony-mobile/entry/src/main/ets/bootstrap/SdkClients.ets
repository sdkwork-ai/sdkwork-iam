// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * SDK client construction for the SDKWork IAM HarmonyOS root.
 *
 * Authority: `APP_SDK_INTEGRATION_SPEC.md` and
 * `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 6. Concrete clients are
 * constructed here and nowhere else; capability packages receive theirs through the
 * injected port each declares and must not construct one themselves.
 *
 * Bootstrap order is part of the contract: the public application access token
 * (`SDKWORK_ACCESS_TOKEN`) is seeded into the shared token manager before this module
 * constructs a client. Every tier reads that one manager while its config is built, so
 * a client built before the seed would carry no credential and a transport would send
 * no `Access-Token` (`ENVIRONMENT_SPEC.md` section 6.1).
 *
 * All three tiers are constructed together because section 6 requires one shared
 * manager across the appbase app SDK, every authenticated app-api client and the
 * explicit backend-admin client. Constructing only the app client is how the console
 * and admin tiers ended up reading a session module nothing writes.
 *
 * PREREQUISITE, stated rather than hidden: the SDK generation chain emits
 * TypeScript, Dart, Kotlin, Swift, C#, Go, Java, Python and Rust targets of
 * `sdkwork-iam-app-sdk` and `sdkwork-iam-backend-sdk`; no ArkTS target exists yet
 * (see `sdks/README.md`). What this module can construct today is each core's typed
 * port over the configured origin, which is what the capability services resolve.
 * Registering a real transport is a change to this file and to each
 * `services/<Capability>SdkPort.ets`, and nothing else.
 */
import {
  IAM_HARMONY_PLATFORM,
  getIamHarmonySdkClient,
  resetIamHarmonySdkClient,
  type IamHarmonySdkClient,
} from '@sdkwork/sdkwork-iam-harmony-mobile-core';
import {
  getIamHarmonySdkClient as getIamHarmonyConsoleSdkClient,
  resetIamHarmonySdkClient as resetIamHarmonyConsoleSdkClient,
  type IamHarmonySdkClient as IamHarmonyConsoleSdkClient,
} from '@sdkwork/sdkwork-iam-harmony-mobile-console-core';
import {
  getIamHarmonySdkClient as getIamHarmonyAdminSdkClient,
  resetIamHarmonySdkClient as resetIamHarmonyAdminSdkClient,
  type IamHarmonySdkClient as IamHarmonyAdminSdkClient,
} from '@sdkwork/sdkwork-iam-harmony-mobile-admin-core';

import { type IamHarmonyEnvironment } from './EnvironmentContract';

/**
 * SDK wiring state.
 *
 * Returned rather than logged so the root page can render it and a test can assert
 * it. "The SDK target has not landed" and "the bootstrap forgot to configure it" are
 * different defects and need different fixes; a report that conflated them would
 * make the second look like the first. `accessTokenConfigured` is the third fact:
 * a client can exist while carrying no credential at all.
 */
export interface IamHarmonySdkWiringReport {
  readonly appClientInitialized: boolean;
  readonly consoleClientInitialized: boolean;
  readonly adminClientInitialized: boolean;
  readonly accessTokenConfigured: boolean;
  readonly baseUrl: string;
  readonly platform: string;
}

export class IamHarmonySdkClients {
  private environment: IamHarmonyEnvironment | null = null;
  private appClient: IamHarmonySdkClient | null = null;
  private consoleClient: IamHarmonyConsoleSdkClient | null = null;
  private adminClient: IamHarmonyAdminSdkClient | null = null;

  /**
   * Constructs one client per tier for one environment.
   *
   * The access token is not passed in: bootstrap has already seeded it into the
   * shared token manager, which is the one place a credential is read from
   * (`core/sdk/TokenManager.ets`). Threading it through here would create a second
   * path for a credential to reach a request.
   */
  initialize(environment: IamHarmonyEnvironment): void {
    this.appClient = getIamHarmonySdkClient(environment.appbaseAppApiBaseUrl);
    this.consoleClient = getIamHarmonyConsoleSdkClient(environment.appbaseAppApiBaseUrl);
    this.adminClient = getIamHarmonyAdminSdkClient(environment.platformApiGatewayHttpUrl);
    this.environment = environment;
  }

  /**
   * Rebuilds every client after a credential or context change.
   *
   * The environment is remembered rather than re-supplied: login happens in the
   * session route, which has no business knowing the runtime environment, and
   * re-deriving it there is how a client ends up pointed at a profile other than the
   * one bootstrap validated.
   *
   * All tiers are rebuilt, not just the app client: a console or admin client left
   * over from the previous session would keep sending its previous `Access-Token`.
   */
  reinitialize(): void {
    const environment: IamHarmonyEnvironment | null = this.environment;
    if (environment === null) {
      throw new Error('IAM Harmony SDK clients must be initialized before a session can be applied');
    }
    this.reset();
    this.initialize(environment);
  }

  /** The app-api client, or a failure naming the missing bootstrap call. */
  appApiClient(): IamHarmonySdkClient {
    const client: IamHarmonySdkClient | null = this.appClient;
    if (client === null) {
      throw new Error('IAM app SDK client must be initialized by bootstrap before use');
    }
    return client;
  }

  /** The console-tier app-api client. */
  consoleApiClient(): IamHarmonyConsoleSdkClient {
    const client: IamHarmonyConsoleSdkClient | null = this.consoleClient;
    if (client === null) {
      throw new Error('IAM console app SDK client must be initialized by bootstrap before use');
    }
    return client;
  }

  /** The backend-admin client. */
  adminApiClient(): IamHarmonyAdminSdkClient {
    const client: IamHarmonyAdminSdkClient | null = this.adminClient;
    if (client === null) {
      throw new Error('IAM admin backend SDK client must be initialized by bootstrap before use');
    }
    return client;
  }

  describe(): IamHarmonySdkWiringReport {
    const client: IamHarmonySdkClient | null = this.appClient;
    return {
      appClientInitialized: client !== null,
      consoleClientInitialized: this.consoleClient !== null,
      adminClientInitialized: this.adminClient !== null,
      accessTokenConfigured: client !== null && client.accessToken !== undefined,
      baseUrl: client === null ? '' : client.baseUrl,
      platform: IAM_HARMONY_PLATFORM,
    };
  }

  /**
   * Tears every client down.
   *
   * Logout and refresh failure must clear this together with the session store and
   * the token manager (section 6); leaving a configured base URL alive across an
   * account switch points the next session at the previous environment.
   */
  reset(): void {
    resetIamHarmonySdkClient();
    resetIamHarmonyConsoleSdkClient();
    resetIamHarmonyAdminSdkClient();
    this.appClient = null;
    this.consoleClient = null;
    this.adminClient = null;
  }
}

let sdkClients: IamHarmonySdkClients | null = null;

export function createIamHarmonySdkClients(): IamHarmonySdkClients {
  sdkClients = new IamHarmonySdkClients();
  return sdkClients;
}

export function getIamHarmonySdkClients(): IamHarmonySdkClients {
  const existing: IamHarmonySdkClients | null = sdkClients;
  return existing === null ? createIamHarmonySdkClients() : existing;
}
