import type {
  IamLoginInput,
  IamSessionSnapshot,
  IamSwitchAccountInput,
  IamSwitchTenantInput,
} from '../types.ts';

/**
 * Typed port over the generated IAM app SDK auth resources.
 *
 * The generated client exposes `auth.sessions.create/refresh/current.*`; the
 * adapter that satisfies this port is part of the application bootstrap, so the
 * runtime never guesses generated response shapes. Every method maps to an
 * app-api resource and must not be re-implemented with raw HTTP.
 */
export interface IamAppSdkAuthPort {
  login(input: IamLoginInput): Promise<IamSessionSnapshot>;
  refresh(refreshToken: string): Promise<IamSessionSnapshot>;
  logout(session: IamSessionSnapshot): Promise<void>;
  loadSession(): Promise<IamSessionSnapshot | null>;
  switchTenant(input: IamSwitchTenantInput): Promise<IamSessionSnapshot>;
  switchAccount(input: IamSwitchAccountInput): Promise<IamSessionSnapshot>;
}

/** Public runtime environment read from the profile runtime document. */
export interface IamUniappxRuntimeEnv {
  SDKWORK_ENVIRONMENT: string;
  SDKWORK_DEPLOYMENT_PROFILE: string;
  SDKWORK_PROFILE_ID: string;
  SDKWORK_RUNTIME_TARGET: string;
  SDKWORK_APP_ID: string;
  SDKWORK_AUTH_MODE?: string;
  SDKWORK_APP_API_BASE_URL: string;
  SDKWORK_IAM_ISSUER?: string;
  SDKWORK_ACCESS_TOKEN?: string;
}

interface RuntimeEnvGlobal {
  __SDKWORK_RUNTIME_ENV__?: IamUniappxRuntimeEnv;
}

export function readIamUniappxRuntimeEnv(): IamUniappxRuntimeEnv {
  const env = (globalThis as RuntimeEnvGlobal).__SDKWORK_RUNTIME_ENV__;
  if (!env) {
    throw new Error(
      'sdkwork-iam-uniappx: public runtime config was not loaded before SDK client construction.',
    );
  }
  return env;
}

export interface IamUniappxAppSdkClient {
  readonly surface: 'app-api';
  readonly baseUrl: string;
  readonly auth: IamAppSdkAuthPort;
}

export function createIamUniappxAppSdkClient(
  env: IamUniappxRuntimeEnv,
  auth: IamAppSdkAuthPort,
): IamUniappxAppSdkClient {
  return {
    surface: 'app-api',
    baseUrl: env.SDKWORK_APP_API_BASE_URL,
    auth,
  };
}
