// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Host adapter contracts. Feature packages depend on these interfaces, never on
 * platform globals (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §9).
 */

export type IamH5ConsoleHostErrorCode =
  | 'unsupported'
  | 'permission-denied'
  | 'unavailable'
  | 'cancelled'
  | 'invalid-state';

export interface IamH5ConsoleHostError {
  code: IamH5ConsoleHostErrorCode;
  message: string;
}

export type IamH5ConsoleHostOutcome<T> = { ok: true; value: T } | { ok: false; error: IamH5ConsoleHostError };

export const IAMH5CONSOLE_HOST_CAPABILITIES = [
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

export type IamH5ConsoleHostCapability = (typeof IAMH5CONSOLE_HOST_CAPABILITIES)[number];

export interface IamH5ConsoleHostAdapter {
  readonly capabilities: ReadonlySet<IamH5ConsoleHostCapability>;
  hasCapability(capability: IamH5ConsoleHostCapability): boolean;
}

/** Browser/environment fallback: declares no capability and reports `unsupported`. */
export function createIamH5ConsoleFallbackHostAdapter(): IamH5ConsoleHostAdapter {
  const capabilities = new Set<IamH5ConsoleHostCapability>();
  return {
    capabilities,
    hasCapability: () => false,
  };
}
