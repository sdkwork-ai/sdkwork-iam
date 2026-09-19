// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Host adapter contracts owned by the console core and implemented by the host package.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 7. Every tier core
 * carries this subpath because app-composition.mjs fixes CORE_EXPORT_SUBPATHS to
 * include './host'; the interfaces are tier-independent because section 7 defines
 * one adapter vocabulary for the platform and the host package implements it once.
 * Adapters expose typed methods and stable user-safe errors only; feature packages
 * depend on these interfaces and never call HarmonyOS system APIs directly, hold
 * an ability context, or handle a raw want.
 */

/** Stable, user-safe adapter failure. */
export type HostAdapterError =
  | 'unsupported'
  | 'permission-denied'
  | 'unavailable'
  | 'cancelled'
  | 'invalid-state';

/** Result of one adapter call. */
export interface HostAdapterResult<T> {
  readonly ok: boolean;
  readonly value?: T;
  readonly error?: HostAdapterError;
}

export interface SecureStorageAdapter {
  get(key: string): Promise<HostAdapterResult<string>>;
  set(key: string, value: string): Promise<HostAdapterResult<void>>;
  remove(key: string): Promise<HostAdapterResult<void>>;
  clear(): Promise<HostAdapterResult<void>>;
}

export interface NetworkStatusAdapter {
  isOnline(): Promise<HostAdapterResult<boolean>>;
}

export interface AppLifecycleAdapter {
  currentState(): Promise<HostAdapterResult<string>>;
}

/**
 * Files and media picking.
 *
 * The adapter returns a local handle only; Drive storage lifecycle stays with the
 * Drive app SDK per section 7, so this contract deliberately has no upload method.
 */
export interface FilePickerAdapter {
  pickImage(): Promise<HostAdapterResult<string>>;
  pickFile(): Promise<HostAdapterResult<string>>;
}

/**
 * Deep-link or want intake.
 *
 * Section 7 requires scheme, host, path, state, nonce and expiry validation before
 * a sensitive flow completes, so the adapter reports an already-validated route id
 * rather than a raw want.
 */
export interface DeepLinkAdapter {
  currentRouteId(): Promise<HostAdapterResult<string>>;
  registerHandler(handler: (routeId: string) => void): Promise<HostAdapterResult<void>>;
}

/**
 * Push notification token facts.
 *
 * Section 7: token registration is an app-api workflow. The adapter only obtains
 * the platform token fact and the permission state.
 */
export interface PushNotificationsAdapter {
  requestPermission(): Promise<HostAdapterResult<boolean>>;
  currentToken(): Promise<HostAdapterResult<string>>;
}

export interface ClipboardAdapter {
  readText(): Promise<HostAdapterResult<string>>;
  writeText(value: string): Promise<HostAdapterResult<void>>;
}

export interface DeviceInfoAdapter {
  model(): Promise<HostAdapterResult<string>>;
  osVersion(): Promise<HostAdapterResult<string>>;
}
