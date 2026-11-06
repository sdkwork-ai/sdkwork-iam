import { createIamHostError } from '@sdkwork/iam-uniappx-core';
import type { IamNetworkStatus, IamNetworkStatusAdapter } from '@sdkwork/iam-uniappx-core';

import { describeUniFailure, getUniApi } from './uni-runtime.ts';

function normalizeNetworkType(networkType: string | undefined): IamNetworkStatus {
  if (!networkType) return 'unknown';
  if (networkType === 'none') return 'offline';
  return 'online';
}

export function createUniappxNetworkStatus(): IamNetworkStatusAdapter {
  const listeners = new Set<(status: IamNetworkStatus) => void>();
  let subscribed = false;

  const ensureSubscription = (): void => {
    const api = getUniApi();
    if (subscribed || !api?.onNetworkStatusChange) return;
    subscribed = true;
    api.onNetworkStatusChange((result) => {
      const status = result.isConnected === false ? 'offline' : normalizeNetworkType(result.networkType);
      for (const listener of [...listeners]) {
        listener(status);
      }
    });
  };

  return {
    getStatus(): Promise<IamNetworkStatus> {
      return new Promise((resolve, reject) => {
        const api = getUniApi();
        if (!api?.getNetworkType) {
          reject(createIamHostError('unsupported', 'uni.getNetworkType is unavailable.'));
          return;
        }
        api.getNetworkType({
          success: (result) => resolve(normalizeNetworkType(result.networkType)),
          fail: (error) => reject(createIamHostError('unavailable', describeUniFailure(error))),
        });
      });
    },

    subscribe(listener: (status: IamNetworkStatus) => void): () => void {
      listeners.add(listener);
      ensureSubscription();
      return (): void => {
        listeners.delete(listener);
      };
    },
  };
}
