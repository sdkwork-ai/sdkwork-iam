// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Host adapter contracts. Feature packages depend on these interfaces, never on
 * platform globals (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §9).
 */

export type IamH5HostErrorCode =
  | 'unsupported'
  | 'permission-denied'
  | 'unavailable'
  | 'cancelled'
  | 'invalid-state';

export interface IamH5HostError {
  code: IamH5HostErrorCode;
  message: string;
}

export type IamH5HostOutcome<T> = { ok: true; value: T } | { ok: false; error: IamH5HostError };

export const IAMH5_HOST_CAPABILITIES = [
  'windowOrNavigationHost',
  'deepLinks',
  'secureStorage',
  'camera',
  'qrScanner',
  'pushNotifications',
  'biometric',
  'shareSheet',
  'networkStatus',
  'appLifecycle',
  'clipboard',
  'filePicker',
  'filesystemSandbox',
  'geolocation',
  'deviceInfo',
  'haptics',
] as const;

export type IamH5HostCapability = (typeof IAMH5_HOST_CAPABILITIES)[number];

export interface IamH5HostAdapter {
  readonly capabilities: ReadonlySet<IamH5HostCapability>;
  hasCapability(capability: IamH5HostCapability): boolean;
}

/** Browser/environment fallback: declares no capability and reports `unsupported`. */
export function createIamH5FallbackHostAdapter(): IamH5HostAdapter {
  const capabilities = new Set<IamH5HostCapability>();
  return {
    capabilities,
    hasCapability: () => false,
  };
}
