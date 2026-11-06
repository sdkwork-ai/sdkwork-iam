import { createIamHostError } from '@sdkwork/iam-uniappx-core';
import type {
  IamClipboardAdapter,
  IamHostAdapters,
  IamNetworkStatus,
  IamNetworkStatusAdapter,
  IamPlatformLoginAdapter,
  IamSecureStorageAdapter,
  IamShareAdapter,
  IamSharePayload,
} from '@sdkwork/iam-uniappx-core';

export interface IamFakeHostOptions {
  loginCode?: string;
  loginFailure?: 'cancelled' | 'unavailable' | null;
  shareResult?: boolean;
  networkStatus?: IamNetworkStatus;
  clipboardText?: string;
}

export interface IamFakeHostAdapters extends IamHostAdapters {
  readonly storage: Map<string, string>;
  readonly sharedPayloads: IamSharePayload[];
}

/**
 * Deterministic host fakes for tests and previews.
 *
 * The fake storage is in memory; it never touches a platform API and is not a
 * production fallback.
 */
export function createIamFakeHostAdapters(options: IamFakeHostOptions = {}): IamFakeHostAdapters {
  const storage = new Map<string, string>();
  const sharedPayloads: IamSharePayload[] = [];
  const listeners = new Set<(status: IamNetworkStatus) => void>();
  let networkStatus: IamNetworkStatus = options.networkStatus ?? 'online';
  let clipboardText = options.clipboardText ?? '';

  const secureStorage: IamSecureStorageAdapter = {
    async getItem(key: string): Promise<string | null> {
      return storage.get(key) ?? null;
    },
    async setItem(key: string, value: string): Promise<void> {
      storage.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      storage.delete(key);
    },
  };

  const platformLogin: IamPlatformLoginAdapter = {
    async requestLoginCode(provider: string): Promise<{ provider: string; code: string }> {
      if (options.loginFailure === 'cancelled') {
        throw createIamHostError('cancelled', 'Login was cancelled.');
      }
      if (options.loginFailure === 'unavailable') {
        throw createIamHostError('unavailable', 'Login is unavailable.');
      }
      return { provider, code: options.loginCode ?? 'fake-login-code' };
    },
  };

  const share: IamShareAdapter = {
    async share(payload: IamSharePayload): Promise<{ shared: boolean }> {
      sharedPayloads.push(payload);
      return { shared: options.shareResult ?? true };
    },
  };

  const networkStatusAdapter: IamNetworkStatusAdapter = {
    async getStatus(): Promise<IamNetworkStatus> {
      return networkStatus;
    },
    subscribe(listener: (status: IamNetworkStatus) => void): () => void {
      listeners.add(listener);
      return (): void => {
        listeners.delete(listener);
      };
    },
  };

  const clipboard: IamClipboardAdapter = {
    async readText(): Promise<string> {
      return clipboardText;
    },
    async writeText(text: string): Promise<void> {
      clipboardText = text;
    },
  };

  return {
    secureStorage,
    platformLogin,
    share,
    networkStatus: networkStatusAdapter,
    clipboard,
    storage,
    sharedPayloads,
  };
}
