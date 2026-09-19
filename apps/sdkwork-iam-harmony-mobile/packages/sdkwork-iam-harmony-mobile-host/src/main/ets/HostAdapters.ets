// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * HarmonyOS platform adapters.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 7. Every adapter
 * returns a typed result and a stable user-safe error
 * (`unsupported`, `permission-denied`, `unavailable`, `cancelled`,
 * `invalid-state`) instead of throwing a platform error, and no feature package
 * may reach a HarmonyOS system API directly.
 *
 * Every adapter reports `unsupported` in this slice. That is a truthful statement
 * about what is implemented, not a stub: no HarmonyOS SDK/DevEco toolchain is
 * present in this repository, so a platform call could not be compiled or tested
 * here. Feature code already handles the error value, so implementing one adapter
 * is a change to this file alone.
 */
import {
  type AppLifecycleAdapter,
  type ClipboardAdapter,
  type DeepLinkAdapter,
  type DeviceInfoAdapter,
  type FilePickerAdapter,
  type HostAdapterResult,
  type NetworkStatusAdapter,
  type PushNotificationsAdapter,
  type SecureStorageAdapter,
} from '@sdkwork/sdkwork-iam-harmony-mobile-core';

function unsupported<T>(): HostAdapterResult<T> {
  return { ok: false, error: 'unsupported' };
}

const secureStorageAdapter: SecureStorageAdapter = {
  get: (key: string) => Promise.resolve(unsupported<string>()),
  set: (key: string, value: string) => Promise.resolve(unsupported<void>()),
  remove: (key: string) => Promise.resolve(unsupported<void>()),
  clear: () => Promise.resolve(unsupported<void>()),
};

const networkStatusAdapter: NetworkStatusAdapter = {
  isOnline: () => Promise.resolve(unsupported<boolean>()),
};

const appLifecycleAdapter: AppLifecycleAdapter = {
  currentState: () => Promise.resolve(unsupported<string>()),
};

const filePickerAdapter: FilePickerAdapter = {
  pickImage: () => Promise.resolve(unsupported<string>()),
  pickFile: () => Promise.resolve(unsupported<string>()),
};

const deepLinkAdapter: DeepLinkAdapter = {
  currentRouteId: () => Promise.resolve(unsupported<string>()),
  registerHandler: (handler: (routeId: string) => void) => Promise.resolve(unsupported<void>()),
};

const pushNotificationsAdapter: PushNotificationsAdapter = {
  requestPermission: () => Promise.resolve(unsupported<boolean>()),
  currentToken: () => Promise.resolve(unsupported<string>()),
};

const clipboardAdapter: ClipboardAdapter = {
  readText: () => Promise.resolve(unsupported<string>()),
  writeText: (value: string) => Promise.resolve(unsupported<void>()),
};

const deviceInfoAdapter: DeviceInfoAdapter = {
  model: () => Promise.resolve(unsupported<string>()),
  osVersion: () => Promise.resolve(unsupported<string>()),
};

/**
 * Typed facade over the adapters this root implements.
 *
 * Declared as named properties rather than as a `Record<string, Object>` because the
 * bootstrap has to call an adapter method: on an untyped record that call is a type
 * error, and the workaround — casting at the call site — is exactly how a platform
 * call migrates out of the host boundary.
 *
 * The set is narrower than the seventeen categories section 7 lists. Those are the
 * standard categories, not a checklist a slice must implement: an adapter is
 * declared here when this root can answer for it, and every one of them reports
 * `unsupported` until the HarmonyOS toolchain and a concrete implementation land.
 */
export interface IamHarmonyHostAdapters {
  readonly secureStorage: SecureStorageAdapter;
  readonly networkStatus: NetworkStatusAdapter;
  readonly appLifecycle: AppLifecycleAdapter;
  readonly deepLinks: DeepLinkAdapter;
  readonly filePicker: FilePickerAdapter;
  readonly pushNotifications: PushNotificationsAdapter;
  readonly clipboard: ClipboardAdapter;
  readonly deviceInfo: DeviceInfoAdapter;
}

/** Every adapter this package implements, by capability name. */
export const iamHarmonyHostAdapters: IamHarmonyHostAdapters = {
  'secureStorage': secureStorageAdapter,
  'networkStatus': networkStatusAdapter,
  'appLifecycle': appLifecycleAdapter,
  'deepLinks': deepLinkAdapter,
  'filePicker': filePickerAdapter,
  'pushNotifications': pushNotificationsAdapter,
  'clipboard': clipboardAdapter,
  'deviceInfo': deviceInfoAdapter,
};

/**
 * The capability set advertised to feature code.
 *
 * Every entry reports `unsupported` today, so the registry marks each one
 * unavailable and a feature asks before it calls. Registering them anyway is what
 * makes "not implemented yet" distinguishable from "not registered", which is the
 * difference between a screen rendering its unavailable state and a screen throwing.
 */
export const IAM_HARMONY_HOST_CAPABILITIES: string[] = [
  'secureStorage',
  'networkStatus',
  'appLifecycle',
  'deepLinks',
  'filePicker',
  'pushNotifications',
  'clipboard',
  'deviceInfo',
];
