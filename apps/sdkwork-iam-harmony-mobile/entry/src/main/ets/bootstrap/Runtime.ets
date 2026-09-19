// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Root composition entry.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` sections 1 and 6. This
 * module assembles the environment, the SDK client, the IAM runtime, the host
 * adapters and the route registry. It owns no product business logic.
 *
 * It is also the one layer allowed to depend on both the shell and the capability
 * packages (section 5), which is why the route registry is assembled here rather
 * than inside the core: a core that imported a capability to count its routes would
 * create the very cycle section 5 forbids.
 */
import {
  IAM_HARMONY_DEFAULT_LOCALE,
  IAM_HARMONY_UNKNOWN_ERROR,
  resolveErrorMessage,
} from '@sdkwork/sdkwork-iam-harmony-mobile-commons';
import { type IamHarmonyRouteRegistration } from '@sdkwork/sdkwork-iam-harmony-mobile-shell';

import { IAM_HARMONY_DEFAULT_PROFILE_ID } from '../generated/RuntimeConfig';
import { resolveIamHarmonyEnvironment, type IamHarmonyEnvironment } from './Environment';
import { registerIamHarmonyHostAdapters } from './HostAdapters';
import { getIamHarmonyIamRuntime, type IamHarmonyIamRuntime } from './IamRuntime';
import { createIamHarmonyRoutes } from './Routes';
import {
  createIamHarmonySdkClients,
  type IamHarmonySdkClients,
  type IamHarmonySdkWiringReport,
} from './SdkClients';

export interface IamHarmonyBootstrapOptions {
  /**
   * Runtime profile to bind.
   *
   * Defaults to the root's development profile. A production build supplies its own
   * id; an unknown id fails instead of silently falling back to development
   * endpoints, which is the failure mode a fallback would produce in the field.
   */
  readonly profileId?: string;
}

export interface IamHarmonyAppRuntime {
  readonly environment: IamHarmonyEnvironment;
  readonly routes: IamHarmonyRouteRegistration[];
  readonly routeCount: number;
  readonly iam: IamHarmonyIamRuntime;
  readonly sdk: IamHarmonySdkClients;
  readonly sdkWiring: IamHarmonySdkWiringReport;
}

let runtime: IamHarmonyAppRuntime | null = null;
let bootstrapError: string | null = null;

/**
 * Builds the application runtime.
 *
 * Throws on a configuration defect. The caller is `EntryAbility`, which records the
 * message so the root page can render it; swallowing it here would produce an app
 * that launches into a blank screen with no explanation.
 */
export function bootstrapIamHarmonyApp(
  options: IamHarmonyBootstrapOptions = {},
): IamHarmonyAppRuntime {
  const profileId: string = options.profileId ?? IAM_HARMONY_DEFAULT_PROFILE_ID;
  const environment: IamHarmonyEnvironment = resolveIamHarmonyEnvironment(profileId);

  const sdk: IamHarmonySdkClients = createIamHarmonySdkClients();
  sdk.initialize(environment);

  const routes: IamHarmonyRouteRegistration[] = createIamHarmonyRoutes();
  registerIamHarmonyHostAdapters();

  const assembled: IamHarmonyAppRuntime = {
    environment,
    routes,
    routeCount: routes.length,
    iam: getIamHarmonyIamRuntime(),
    sdk,
    sdkWiring: sdk.describe(),
  };
  runtime = assembled;
  bootstrapError = null;
  return assembled;
}

export function getIamHarmonyAppRuntime(): IamHarmonyAppRuntime | null {
  return runtime;
}

/** Records a bootstrap failure so the root page can render it. */
export function recordIamHarmonyBootstrapFailure(error: unknown): string {
  const message: string = resolveErrorMessage(error);
  bootstrapError = message.length > 0 ? message : IAM_HARMONY_UNKNOWN_ERROR;
  return bootstrapError;
}

export function getIamHarmonyBootstrapError(): string | null {
  return bootstrapError;
}

export function resetIamHarmonyAppRuntime(): void {
  runtime = null;
  bootstrapError = null;
}

/**
 * Resolves the display locale.
 *
 * PENDING PLATFORM WIRING: the device locale comes from the HarmonyOS localization
 * kit (`@kit.LocalizationKit`, `i18n.System.getSystemLanguage()`). That call needs
 * the DevEco toolchain to compile, so it is not shipped as unverified code here;
 * until it is wired, every screen renders the default locale's fragment, which is a
 * real two-locale catalog rather than a stub.
 */
export function resolveIamHarmonyAppLocale(): string {
  return IAM_HARMONY_DEFAULT_LOCALE;
}
