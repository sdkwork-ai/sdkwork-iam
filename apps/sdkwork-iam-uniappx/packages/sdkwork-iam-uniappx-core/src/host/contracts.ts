/**
 * Host adapter contracts.
 *
 * Authority: `UNIAPP_X_APP_ARCHITECTURE_SPEC.md` §10. Feature packages depend on
 * these interfaces; `@sdkwork/iam-uniappx-host` provides the `uni.*`/UTS
 * implementations, and tests provide fakes. This file must not import `uni.*`
 * or any platform global.
 */

export type IamHostErrorCode =
  | 'unsupported'
  | 'permission-denied'
  | 'unavailable'
  | 'cancelled'
  | 'invalid-state';

/** Stable host failure. Platform-specific errors are normalized to one code. */
export class IamHostError extends Error {
  declare readonly code: IamHostErrorCode;

  constructor(code: IamHostErrorCode, message: string) {
    super(message);
    this.name = 'IamHostError';
    this.code = code;
  }
}

export function createIamHostError(code: IamHostErrorCode, message: string): IamHostError {
  return new IamHostError(code, message);
}

export interface IamSecureStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface IamPlatformLoginResult {
  provider: string;
  code: string;
}

export interface IamPlatformLoginAdapter {
  requestLoginCode(provider: string): Promise<IamPlatformLoginResult>;
}

export interface IamSharePayload {
  title: string;
  href?: string;
  summary?: string;
}

export interface IamShareAdapter {
  share(payload: IamSharePayload): Promise<{ shared: boolean }>;
}

export type IamNetworkStatus = 'online' | 'offline' | 'unknown';

export interface IamNetworkStatusAdapter {
  getStatus(): Promise<IamNetworkStatus>;
  subscribe(listener: (status: IamNetworkStatus) => void): () => void;
}

export interface IamClipboardAdapter {
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
}

export interface IamHostAdapters {
  readonly secureStorage: IamSecureStorageAdapter;
  readonly platformLogin: IamPlatformLoginAdapter;
  readonly share: IamShareAdapter;
  readonly networkStatus: IamNetworkStatusAdapter;
  readonly clipboard: IamClipboardAdapter;
}
