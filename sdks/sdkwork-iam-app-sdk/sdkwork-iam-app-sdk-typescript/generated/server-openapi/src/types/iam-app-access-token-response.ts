import type { IamAppAccessToken } from './iam-app-access-token';

export interface IamAppAccessTokenResponse {
  code: 0;
  data: unknown & { item: IamAppAccessToken; };
  /** Server-owned request correlation id. */
  traceId: string;
}
