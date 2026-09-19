// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Host adapter contracts. Feature packages depend on these interfaces, never on
 * platform globals (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §9).
 */

export type IamMpAdminHostErrorCode =
  | 'unsupported'
  | 'permission-denied'
  | 'unavailable'
  | 'cancelled'
  | 'invalid-state';

export interface IamMpAdminHostError {
  code: IamMpAdminHostErrorCode;
  message: string;
}

export type IamMpAdminHostOutcome<T> = { ok: true; value: T } | { ok: false; error: IamMpAdminHostError };

export const IAMMPADMIN_HOST_CAPABILITIES = [
  'platformLogin',
  'secureStorage',
  'camera',
  'qrScanner',
  'mediaPicker',
  'filePicker',
  'share',
  'subscriptionsOrPush',
  'deepLinksOrScene',
  'networkStatus',
  'appLifecycle',
  'clipboard',
  'geolocation',
  'deviceInfo',
  'haptics',
  'paymentBridge',
] as const;

export type IamMpAdminHostCapability = (typeof IAMMPADMIN_HOST_CAPABILITIES)[number];

export interface IamMpAdminHostAdapter {
  readonly capabilities: ReadonlySet<IamMpAdminHostCapability>;
  hasCapability(capability: IamMpAdminHostCapability): boolean;
}

/** Browser/environment fallback: declares no capability and reports `unsupported`. */
export function createIamMpAdminFallbackHostAdapter(): IamMpAdminHostAdapter {
  const capabilities = new Set<IamMpAdminHostCapability>();
  return {
    capabilities,
    hasCapability: () => false,
  };
}
