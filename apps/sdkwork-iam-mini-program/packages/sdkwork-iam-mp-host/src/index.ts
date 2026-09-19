// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { IamMpHostAdapter, IamMpHostCapability, IamMpHostOutcome } from '@sdkwork/iam-mp-core';

function unsupported<T>(capability: IamMpHostCapability): IamMpHostOutcome<T> {
  return { ok: false, error: { code: 'unsupported', message: capability + ' is unavailable on this platform' } };
}

/**
 * Typed wrappers over WeChat platform APIs. Feature packages depend on these
 * adapters, never on `wx.*` directly (MINI_PROGRAM_APP_ARCHITECTURE_SPEC §8).
 */
export interface IamMpHostAdapters extends IamMpHostAdapter {
  chooseMedia(): Promise<IamMpHostOutcome<readonly string[]>>;
  scanCode(): Promise<IamMpHostOutcome<string>>;
  getSystemInfo(): Promise<IamMpHostOutcome<Record<string, string>>>;
}

export function createIamMpHostAdapters(): IamMpHostAdapters {
  const capabilities = new Set<IamMpHostCapability>([
    'platformLogin',
    'camera',
    'qrScanner',
    'mediaPicker',
    'share',
    'networkStatus',
    'deviceInfo',
  ]);
  return {
    capabilities,
    hasCapability: (capability) => capabilities.has(capability),
    chooseMedia: async () => unsupported('mediaPicker'),
    scanCode: async () => unsupported('qrScanner'),
    getSystemInfo: async () => unsupported('deviceInfo'),
  };
}
