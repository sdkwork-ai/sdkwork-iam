// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Host adapter contracts. Feature packages depend on these interfaces, never on
 * platform globals (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §9).
 */

export type IamH5AdminHostErrorCode =
  | 'unsupported'
  | 'permission-denied'
  | 'unavailable'
  | 'cancelled'
  | 'invalid-state';

export interface IamH5AdminHostError {
  code: IamH5AdminHostErrorCode;
  message: string;
}

export type IamH5AdminHostOutcome<T> = { ok: true; value: T } | { ok: false; error: IamH5AdminHostError };

export const IAMH5ADMIN_HOST_CAPABILITIES = [
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

export type IamH5AdminHostCapability = (typeof IAMH5ADMIN_HOST_CAPABILITIES)[number];

export interface IamH5AdminHostAdapter {
  readonly capabilities: ReadonlySet<IamH5AdminHostCapability>;
  hasCapability(capability: IamH5AdminHostCapability): boolean;
}

/** Browser/environment fallback: declares no capability and reports `unsupported`. */
export function createIamH5AdminFallbackHostAdapter(): IamH5AdminHostAdapter {
  const capabilities = new Set<IamH5AdminHostCapability>();
  return {
    capabilities,
    hasCapability: () => false,
  };
}
