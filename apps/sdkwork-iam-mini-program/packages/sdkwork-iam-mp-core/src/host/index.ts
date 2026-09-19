// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Host adapter contracts. Feature packages depend on these interfaces, never on
 * platform globals (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §9).
 */

export type IamMpHostErrorCode =
  | 'unsupported'
  | 'permission-denied'
  | 'unavailable'
  | 'cancelled'
  | 'invalid-state';

export interface IamMpHostError {
  code: IamMpHostErrorCode;
  message: string;
}

export type IamMpHostOutcome<T> = { ok: true; value: T } | { ok: false; error: IamMpHostError };

export const IAMMP_HOST_CAPABILITIES = [
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

export type IamMpHostCapability = (typeof IAMMP_HOST_CAPABILITIES)[number];

export interface IamMpHostAdapter {
  readonly capabilities: ReadonlySet<IamMpHostCapability>;
  hasCapability(capability: IamMpHostCapability): boolean;
}

/** Browser/environment fallback: declares no capability and reports `unsupported`. */
export function createIamMpFallbackHostAdapter(): IamMpHostAdapter {
  const capabilities = new Set<IamMpHostCapability>();
  return {
    capabilities,
    hasCapability: () => false,
  };
}
