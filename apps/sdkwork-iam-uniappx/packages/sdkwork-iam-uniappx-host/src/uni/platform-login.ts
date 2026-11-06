import { createIamHostError } from '@sdkwork/iam-uniappx-core';
import type { IamPlatformLoginAdapter } from '@sdkwork/iam-uniappx-core';

import { describeUniFailure, getUniApi } from './uni-runtime.ts';

/**
 * Platform login code adapter.
 *
 * The returned code is an input to an approved app-api/appbase flow; it is never
 * exchanged with raw HTTP from a feature package.
 */
export function createUniappxPlatformLogin(): IamPlatformLoginAdapter {
  return {
    requestLoginCode(provider: string): Promise<{ provider: string; code: string }> {
      return new Promise((resolve, reject) => {
        const api = getUniApi();
        if (!api?.login) {
          reject(createIamHostError('unsupported', 'uni.login is unavailable on this target.'));
          return;
        }
        api.login({
          provider,
          success: (result) => {
            const code = result.code?.trim();
            if (!code) {
              reject(createIamHostError('invalid-state', 'uni.login returned no code.'));
              return;
            }
            resolve({ provider, code });
          },
          fail: (error) => {
            const message = describeUniFailure(error);
            if (/cancel/iu.test(message)) {
              reject(createIamHostError('cancelled', message));
              return;
            }
            reject(createIamHostError('unavailable', message));
          },
        });
      });
    },
  };
}
