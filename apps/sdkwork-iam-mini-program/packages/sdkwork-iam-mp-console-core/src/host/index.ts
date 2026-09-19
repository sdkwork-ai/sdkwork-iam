// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Host adapter contracts. Feature packages depend on these interfaces, never on
 * platform globals (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §9).
 */

export type IamMpConsoleHostErrorCode =
  | 'unsupported'
  | 'permission-denied'
  | 'unavailable'
  | 'cancelled'
  | 'invalid-state';

export interface IamMpConsoleHostError {
  code: IamMpConsoleHostErrorCode;
  message: string;
}

export type IamMpConsoleHostOutcome<T> = { ok: true; value: T } | { ok: false; error: IamMpConsoleHostError };

export const IAMMPCONSOLE_HOST_CAPABILITIES = [
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

export type IamMpConsoleHostCapability = (typeof IAMMPCONSOLE_HOST_CAPABILITIES)[number];

export interface IamMpConsoleHostAdapter {
  readonly capabilities: ReadonlySet<IamMpConsoleHostCapability>;
  hasCapability(capability: IamMpConsoleHostCapability): boolean;
}

/** Browser/environment fallback: declares no capability and reports `unsupported`. */
export function createIamMpConsoleFallbackHostAdapter(): IamMpConsoleHostAdapter {
  const capabilities = new Set<IamMpConsoleHostCapability>();
  return {
    capabilities,
    hasCapability: () => false,
  };
}
