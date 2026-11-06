/**
 * Generated app SDK transport boundary.
 *
 * Authority: `UNIAPP_X_APP_ARCHITECTURE_SPEC.md` §9. The generated TypeScript
 * app SDK is adapted to the uni-app x runtime through exactly one request
 * adapter. The adapter is implemented over `uni.request` in
 * `@sdkwork/iam-uniappx-host`; this package only defines the contract, so it
 * stays free of platform globals and can be unit-tested in Node.
 */

export type IamHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface IamTransportRequest {
  url: string;
  method: IamHttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface IamTransportResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface IamRequestTransport {
  request(request: IamTransportRequest): Promise<IamTransportResponse>;
}

/**
 * Builds a transport that reads the current access token from the one global
 * token manager. The returned function is evaluated per request so refreshed
 * tokens are picked up without rebuilding SDK clients.
 */
export type IamTransportFactory = (
  readAccessToken: () => string | null,
) => IamRequestTransport;
