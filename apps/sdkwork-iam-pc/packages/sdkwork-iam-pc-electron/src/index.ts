export {
  createElectronDesktopAuthHost,
  type CreateElectronDesktopAuthHostOptions,
} from "./host/electron-desktop-auth-host.ts";
export {
  createSdkworkElectronDeepLinkBridge,
  exposeSdkworkDesktopPreloadBridge,
  SDKWORK_DESKTOP_PRELOAD_KEY,
  type CreateSdkworkElectronDeepLinkBridgeOptions,
  type SdkworkElectronDeepLinkBridge,
  type SdkworkElectronLikeApp,
  type SdkworkElectronLikeContextBridge,
  type SdkworkElectronLikeIpcMain,
  type SdkworkElectronLikeIpcRenderer,
  type SdkworkElectronLikeShell,
  type SdkworkElectronLikeWebContents,
} from "./electron/deep-links.ts";
