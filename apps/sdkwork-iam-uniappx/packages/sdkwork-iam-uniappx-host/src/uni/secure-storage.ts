import { createIamHostError } from '@sdkwork/iam-uniappx-core';
import type { IamSecureStorageAdapter } from '@sdkwork/iam-uniappx-core';

import { getUniApi } from './uni-runtime.ts';

const DEFAULT_PREFIX = 'sdkwork.iam.';

interface StorageEnvelope {
  value: string;
}

/**
 * Secure storage adapter.
 *
 * The token manager owns whether a token is persisted; this adapter only maps
 * the platform key/value API and normalizes failures. Platform keystore/keychain
 * backing is provided by the uni-app x runtime on App targets, and by the
 * platform storage API on Web/mini program.
 */
export function createUniappxSecureStorage(
  storagePrefix: string = DEFAULT_PREFIX,
): IamSecureStorageAdapter {
  const keyOf = (key: string): string => `${storagePrefix}${key}`;

  return {
    async getItem(key: string): Promise<string | null> {
      const api = getUniApi();
      if (!api?.getStorageSync) {
        throw createIamHostError('unsupported', 'uni.getStorageSync is unavailable.');
      }
      let raw: unknown;
      try {
        raw = api.getStorageSync(keyOf(key));
      } catch {
        throw createIamHostError('unavailable', 'Secure storage read failed.');
      }
      if (typeof raw !== 'string' || !raw) return null;
      try {
        const parsed = JSON.parse(raw) as StorageEnvelope;
        return typeof parsed?.value === 'string' ? parsed.value : null;
      } catch {
        api.removeStorageSync?.(keyOf(key));
        return null;
      }
    },

    async setItem(key: string, value: string): Promise<void> {
      const api = getUniApi();
      if (!api?.setStorageSync) {
        throw createIamHostError('unsupported', 'uni.setStorageSync is unavailable.');
      }
      try {
        const envelope: StorageEnvelope = { value };
        api.setStorageSync(keyOf(key), JSON.stringify(envelope));
      } catch {
        throw createIamHostError('unavailable', 'Secure storage write failed.');
      }
    },

    async removeItem(key: string): Promise<void> {
      const api = getUniApi();
      if (!api?.removeStorageSync) {
        throw createIamHostError('unsupported', 'uni.removeStorageSync is unavailable.');
      }
      try {
        api.removeStorageSync(keyOf(key));
      } catch {
        throw createIamHostError('unavailable', 'Secure storage delete failed.');
      }
    },
  };
}
