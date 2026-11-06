import type {
  IamAuthStatus,
  IamSessionSnapshot,
} from '@sdkwork/iam-uniappx-core';

export type IamAuthErrorCode =
  | 'invalid-credentials'
  | 'session-expired'
  | 'network'
  | 'unsupported'
  | 'unknown';

export interface IamAuthFailure {
  code: IamAuthErrorCode;
  message: string;
}

export interface IamAuthState {
  status: IamAuthStatus;
  session: IamSessionSnapshot | null;
  error: IamAuthFailure | null;
  /**
   * Bumped every time sensitive state is cleared. Views that cache rendered
   * user data can drop it when the generation changes.
   */
  generation: number;
}
