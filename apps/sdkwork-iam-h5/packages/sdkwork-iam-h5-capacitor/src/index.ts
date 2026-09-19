// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { IamH5HostAdapter, IamH5HostCapability, IamH5HostOutcome } from '@sdkwork/iam-h5-core';

function unsupported<T>(capability: IamH5HostCapability): IamH5HostOutcome<T> {
  return { ok: false, error: { code: 'unsupported', message: capability + ' is unavailable on this platform' } };
}

/**
 * Single Capacitor host package for every shipped mobile platform
 * (APP_H5_ARCHITECTURE_SPEC §3). Per-platform differences belong in subtrees of
 * this package, never in a second package.
 */
export interface IamH5CapacitorHostAdapter extends IamH5HostAdapter {
  pickFile(): Promise<IamH5HostOutcome<readonly string[]>>;
  scanQrCode(): Promise<IamH5HostOutcome<string>>;
}

export function createIamH5CapacitorHostAdapter(): IamH5CapacitorHostAdapter {
  const capabilities = new Set<IamH5HostCapability>([
    'deepLinks',
    'secureStorage',
    'camera',
    'qrScanner',
    'pushNotifications',
    'shareSheet',
    'networkStatus',
    'clipboard',
    'filePicker',
  ]);
  return {
    capabilities,
    hasCapability: (capability) => capabilities.has(capability),
    pickFile: async () => unsupported('filePicker'),
    scanQrCode: async () => unsupported('qrScanner'),
  };
}
