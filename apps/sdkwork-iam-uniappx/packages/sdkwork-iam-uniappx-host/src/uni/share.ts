import { createIamHostError } from '@sdkwork/iam-uniappx-core';
import type { IamShareAdapter, IamSharePayload } from '@sdkwork/iam-uniappx-core';

import { describeUniFailure, getUniApi } from './uni-runtime.ts';

/**
 * Share adapter. Collects platform share facts only; the share payload never
 * carries tokens or credentials.
 */
export function createUniappxShare(): IamShareAdapter {
  return {
    share(payload: IamSharePayload): Promise<{ shared: boolean }> {
      return new Promise((resolve, reject) => {
        const api = getUniApi();
        if (!api?.share) {
          reject(createIamHostError('unsupported', 'uni.share is unavailable on this target.'));
          return;
        }
        api.share({
          title: payload.title,
          href: payload.href,
          summary: payload.summary,
          success: () => resolve({ shared: true }),
          fail: (error) => {
            const message = describeUniFailure(error);
            if (/cancel/iu.test(message)) {
              resolve({ shared: false });
              return;
            }
            reject(createIamHostError('unavailable', message));
          },
        });
      });
    },
  };
}
