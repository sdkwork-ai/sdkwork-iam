import type { IamHostAdapters } from '@sdkwork/iam-uniappx-core';

import { createUniappxClipboard } from './clipboard.ts';
import { createUniappxNetworkStatus } from './network-status.ts';
import { createUniappxPlatformLogin } from './platform-login.ts';
import { createUniappxSecureStorage } from './secure-storage.ts';
import { createUniappxShare } from './share.ts';
import { getUniApi } from './uni-runtime.ts';

export interface IamUniappxHostOptions {
  /** Key prefix for the secure-storage adapter; tokens never use business keys. */
  storagePrefix?: string;
}

export function createIamUniappxHostAdapters(
  options: IamUniappxHostOptions = {},
): IamHostAdapters {
  return {
    secureStorage: createUniappxSecureStorage(options.storagePrefix),
    platformLogin: createUniappxPlatformLogin(),
    share: createUniappxShare(),
    networkStatus: createUniappxNetworkStatus(),
    clipboard: createUniappxClipboard(),
  };
}

export interface IamHostCapabilities {
  secureStorage: boolean;
  platformLogin: boolean;
  share: boolean;
  networkStatus: boolean;
  clipboard: boolean;
}

/**
 * Reports which host capabilities this target actually implements. Callers
 * hide or degrade features through this set instead of branching on globals.
 */
export function describeUniappxHostCapabilities(): IamHostCapabilities {
  const api = getUniApi();
  return {
    secureStorage: Boolean(api?.getStorageSync && api?.setStorageSync),
    platformLogin: Boolean(api?.login),
    share: Boolean(api?.share),
    networkStatus: Boolean(api?.getNetworkType),
    clipboard: Boolean(api?.getClipboardData && api?.setClipboardData),
  };
}
