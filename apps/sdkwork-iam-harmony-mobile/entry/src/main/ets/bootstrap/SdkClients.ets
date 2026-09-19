// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * SDK client construction for the SDKWork IAM HarmonyOS root.
 *
 * Authority: `APP_SDK_INTEGRATION_SPEC.md` and
 * `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 6. Concrete clients are
 * constructed here and nowhere else; capability packages receive theirs through the
 * injected port each declares and must not construct one themselves.
 *
 * PREREQUISITE, stated rather than hidden: the SDK generation chain emits
 * TypeScript, Dart, Kotlin, Swift, C#, Go, Java, Python and Rust targets of
 * `sdkwork-iam-app-sdk` and `sdkwork-iam-backend-sdk`; no ArkTS target exists yet
 * (see `sdks/README.md`). What this module can construct today is the core's typed
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

import { type IamHarmonyEnvironment } from './EnvironmentContract';

/**
 * SDK wiring state.
 *
 * Returned rather than logged so the root page can render it and a test can assert
 * it. "The SDK target has not landed" and "the bootstrap forgot to configure it" are
 * different defects and need different fixes; a report that conflated them would
 * make the second look like the first.
 */
export interface IamHarmonySdkWiringReport {
  readonly appClientInitialized: boolean;
  readonly baseUrl: string;
  readonly platform: string;
}

export class IamHarmonySdkClients {
  private environment: IamHarmonyEnvironment | null = null;
  private appClient: IamHarmonySdkClient | null = null;

  /**
   * Constructs the client for one environment.
   *
   * No access token is passed: bootstrap runs before login, and the core's token
   * manager is the one place a credential is read from at request time
   * (`core/sdk/TokenManager.ets`), so threading a token through here would create a
   * second path for a credential to reach a request.
   */
  initialize(environment: IamHarmonyEnvironment): void {
    this.appClient = getIamHarmonySdkClient(environment.appbaseAppApiBaseUrl);
    this.environment = environment;
  }

  /**
   * Rebuilds the client after a credential change.
   *
   * The environment is remembered rather than re-supplied: login happens in the
   * session route, which has no business knowing the runtime environment, and
   * re-deriving it there is how a client ends up pointed at a profile other than the
   * one bootstrap validated.
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

  describe(): IamHarmonySdkWiringReport {
    const client: IamHarmonySdkClient | null = this.appClient;
    return {
      appClientInitialized: client !== null,
      baseUrl: client === null ? '' : client.baseUrl,
      platform: IAM_HARMONY_PLATFORM,
    };
  }

  /**
   * Tears the client down.
   *
   * Logout and refresh failure must clear this together with the session store and
   * the token manager (section 6); leaving a configured base URL alive across an
   * account switch points the next session at the previous environment.
   */
  reset(): void {
    resetIamHarmonySdkClient();
    this.appClient = null;
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
