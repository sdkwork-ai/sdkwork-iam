/**
 * Shared mini-program account CRUD component.
 *
 * The mini-program member of the IAM resource-account component family: the
 * unified `iam_oauth_resource_account` aggregate
 * (`resource_account_kind = 'mini_program'`), one controller state machine, one
 * panel, transport adapters, and a frozen capability set. It is independent from
 * `@sdkwork/iam-pc-official-accounts` on purpose — the two features share the
 * architecture and never a page, a component, or a message catalog.
 *
 * The package is transport-agnostic: a host adapts its own SDK slice with
 * {@link createMiniProgramOperatorTransport} (its own resource-account actions)
 * or {@link createMiniProgramBackendOperations} (the generated backend
 * `iam.oauth.resourceAccounts.*` slice), builds a controller with
 * {@link createMiniProgramController}, and mounts
 * {@link SdkworkMiniProgramPanel} inside an `SdkworkI18nProvider` carrying
 * {@link SDKWORK_MINI_PROGRAM_I18N_CATALOG}. It performs no raw HTTP, imports no
 * generated SDK, and assembles no authentication headers.
 */
export type {
  MiniProgramAccessMode,
  MiniProgramAccount,
  MiniProgramDraft,
  MiniProgramEnvironment,
  MiniProgramLoginCheckResult,
  MiniProgramLoginCheckStatus,
  MiniProgramOwnerScope,
  MiniProgramPage,
  MiniProgramPatch,
  MiniProgramProviderConfig,
  MiniProgramQuery,
  MiniProgramReleaseChannel,
} from "./types";
export { DEFAULT_MINI_PROGRAM_PAGE_SIZE } from "./types";
export {
  DEFAULT_OPERATOR_CAPABILITIES,
  DEFAULT_SELF_SERVICE_CAPABILITIES,
  MiniProgramCapabilityError,
  MiniProgramController,
  MiniProgramUnsupportedError,
  createMiniProgramController,
  type MiniProgramCapabilities,
  type MiniProgramState,
  type MiniProgramTransport,
} from "./controller";
export {
  MINI_PROGRAM_MESSAGES_EN_US,
  MINI_PROGRAM_MESSAGES_ZH_CN,
  SDKWORK_MINI_PROGRAM_I18N_CATALOG,
  SDKWORK_MINI_PROGRAM_NAMESPACE,
  resolveMiniProgramMessages,
  useMiniProgramMessages,
  type MiniProgramMessages,
} from "./messages";
export { SdkworkMiniProgramPanel } from "./client/panel";
export {
  MINI_PROGRAM_ACCOUNT_KIND,
  MINI_PROGRAM_BACKEND_SCAN_PAGE_SIZE,
  MINI_PROGRAM_PROVIDER_CODE,
  isMiniProgramAccountRecord,
  readLoginCheckStatus,
  readProviderConfig,
  readRecordBoolean,
  readRecordNumber,
  readRecordString,
  toMiniProgramAccount,
  toMiniProgramLoginCheckResult,
  toMiniProgramPage,
} from "./transport/normalize";
export {
  createMiniProgramBackendOperations,
  createMiniProgramBackendTransport,
  createMiniProgramOperatorTransport,
  type MiniProgramOperatorBackendPort,
  type MiniProgramOperatorOperations,
} from "./transport/operator";
