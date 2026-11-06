import { createIamHostError } from '@sdkwork/iam-uniappx-core';
import type { IamClipboardAdapter } from '@sdkwork/iam-uniappx-core';

import { describeUniFailure, getUniApi } from './uni-runtime.ts';

export function createUniappxClipboard(): IamClipboardAdapter {
  return {
    readText(): Promise<string> {
      return new Promise((resolve, reject) => {
        const api = getUniApi();
        if (!api?.getClipboardData) {
          reject(createIamHostError('unsupported', 'uni.getClipboardData is unavailable.'));
          return;
        }
        api.getClipboardData({
          success: (result) => resolve(result.data ?? ''),
          fail: (error) => reject(createIamHostError('unavailable', describeUniFailure(error))),
        });
      });
    },

    writeText(text: string): Promise<void> {
      return new Promise((resolve, reject) => {
        const api = getUniApi();
        if (!api?.setClipboardData) {
          reject(createIamHostError('unsupported', 'uni.setClipboardData is unavailable.'));
          return;
        }
        api.setClipboardData({
          data: text,
          success: () => resolve(),
          fail: (error) => reject(createIamHostError('unavailable', describeUniFailure(error))),
        });
      });
    },
  };
}
