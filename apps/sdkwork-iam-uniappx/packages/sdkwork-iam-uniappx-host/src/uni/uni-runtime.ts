/**
 * Minimal structural typing for the uni-app x global API used by this package.
 *
 * A hand-written surface keeps the package typecheckable without
 * `@dcloudio/types`, and makes the missing-capability fallback explicit.
 */

export interface UniRequestSuccess {
  statusCode: number;
  data?: unknown;
  header?: Record<string, string>;
}

export interface UniRequestFailure {
  errMsg?: string;
}

export interface UniRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: unknown;
  header?: Record<string, string>;
  timeout?: number;
  success?: (result: UniRequestSuccess) => void;
  fail?: (error: UniRequestFailure) => void;
}

export interface UniLoginSuccess {
  code?: string;
  errMsg?: string;
}

export interface UniLoginOptions {
  provider?: string;
  success?: (result: UniLoginSuccess) => void;
  fail?: (error: UniRequestFailure) => void;
}

export interface UniNetworkTypeSuccess {
  networkType?: string;
}

export interface UniNetworkStatusChangeResult {
  isConnected?: boolean;
  networkType?: string;
}

export interface UniClipboardGetSuccess {
  data?: string;
}

export interface UniShareOptions {
  provider?: string;
  title?: string;
  href?: string;
  summary?: string;
  success?: () => void;
  fail?: (error: UniRequestFailure) => void;
}

export interface UniApi {
  getStorageSync?(key: string): unknown;
  setStorageSync?(key: string, value: unknown): void;
  removeStorageSync?(key: string): void;
  request?(options: UniRequestOptions): void;
  login?(options: UniLoginOptions): void;
  share?(options: UniShareOptions): void;
  getNetworkType?(options: { success?: (result: UniNetworkTypeSuccess) => void; fail?: (error: UniRequestFailure) => void }): void;
  onNetworkStatusChange?(callback: (result: UniNetworkStatusChangeResult) => void): void;
  offNetworkStatusChange?(callback: (result: UniNetworkStatusChangeResult) => void): void;
  getClipboardData?(options: { success?: (result: UniClipboardGetSuccess) => void; fail?: (error: UniRequestFailure) => void }): void;
  setClipboardData?(options: { data: string; success?: () => void; fail?: (error: UniRequestFailure) => void }): void;
}

interface UniGlobalScope {
  uni?: UniApi;
}

/** Returns the uni-app x global API, or null outside a uni-app x runtime. */
export function getUniApi(): UniApi | null {
  const scope = globalThis as UniGlobalScope;
  return scope.uni ?? null;
}

export function describeUniFailure(error: UniRequestFailure | undefined): string {
  return error?.errMsg?.trim() ? error.errMsg : 'uni API call failed.';
}
