import { createIamHostError } from '@sdkwork/iam-uniappx-core';
import type {
  IamRequestTransport,
  IamTransportRequest,
  IamTransportResponse,
} from '@sdkwork/iam-uniappx-core';

import { describeUniFailure, getUniApi } from './uni-runtime.ts';

/**
 * The one `uni.request` implementation in the root.
 *
 * Authority: `UNIAPP_X_APP_ARCHITECTURE_SPEC.md` §9. The generated TypeScript
 * app SDK is adapted to this transport; no feature package calls `uni.request`
 * for business APIs. The access token is read per request from the one global
 * TokenManager so token refresh needs no client rebuild.
 */
export function createUniappxRequestTransport(
  readAccessToken: () => string | null,
): IamRequestTransport {
  return {
    request(request: IamTransportRequest): Promise<IamTransportResponse> {
      return new Promise((resolve, reject) => {
        const api = getUniApi();
        if (!api?.request) {
          reject(createIamHostError('unsupported', 'uni.request is unavailable.'));
          return;
        }
        const token = readAccessToken();
        const header: Record<string, string> = {
          ...request.headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        api.request({
          url: request.url,
          method: request.method,
          data: request.body,
          header,
          timeout: request.timeoutMs,
          success: (result) => {
            resolve({
              status: result.statusCode,
              headers: result.header ?? {},
              body: result.data,
            });
          },
          fail: (error) => reject(createIamHostError('unavailable', describeUniFailure(error))),
        });
      });
    },
  };
}
