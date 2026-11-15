/**
 * Mini-program copy, owned by this package alone.
 *
 * The official-account package keeps its own catalog; the two features never
 * share message keys, even though they render sibling surfaces of the same
 * aggregate. The catalog carries both Chinese and English trees, so a host can
 * wrap the panel in `SdkworkI18nProvider` with
 * {@link SDKWORK_MINI_PROGRAM_I18N_CATALOG} and get the active locale; without a
 * provider the Chinese default resolves, which is what the Chinese-first admin
 * and desktop hosts expect.
 */
import { createSdkworkMessageCatalog, useSdkworkModuleMessages } from "@sdkwork/i18n-pc-react";

/** Every user-facing string the mini-program surfaces render. */
export interface MiniProgramMessages {
  readonly title: string;
  readonly description: string;
  panel: {
    readonly loading: string;
    readonly empty: string;
    readonly searchPlaceholder: string;
    readonly search: string;
    readonly refresh: string;
    readonly add: string;
    readonly total: string;
    readonly previous: string;
    readonly next: string;
  };
  columns: {
    readonly name: string;
    readonly appId: string;
    readonly status: string;
    readonly loginCheck: string;
    readonly actions: string;
  };
  status: {
    readonly enabled: string;
    readonly disabled: string;
  };
  environment: {
    readonly development: string;
    readonly trial: string;
    readonly release: string;
  };
  releaseChannel: {
    readonly stable: string;
    readonly gray: string;
    readonly rollback: string;
  };
  accountType: {
    readonly personal: string;
    readonly enterprise: string;
    readonly unset: string;
  };
  form: {
    readonly titleCreate: string;
    readonly titleEdit: string;
    readonly identity: string;
    readonly credentials: string;
    readonly loginCheck: string;
    readonly displayName: string;
    readonly displayNamePlaceholder: string;
    readonly appId: string;
    readonly appIdPlaceholder: string;
    readonly appIdHint: string;
    readonly originalId: string;
    readonly originalIdPlaceholder: string;
    readonly accountType: string;
    readonly environment: string;
    readonly releaseChannel: string;
    readonly appSecret: string;
    readonly appSecretPlaceholder: string;
    readonly appSecretKeep: string;
    readonly appSecretStored: string;
    readonly appSecretMissing: string;
    readonly category: string;
    readonly categoryPlaceholder: string;
    readonly note: string;
    readonly notePlaceholder: string;
    readonly providerConfigHint: string;
    readonly enabled: string;
    readonly cancel: string;
    readonly save: string;
    readonly saving: string;
    readonly create: string;
  };
  actions: {
    readonly edit: string;
    readonly enable: string;
    readonly disable: string;
    readonly remove: string;
    readonly removeConfirm: string;
    readonly runLoginCheck: string;
  };
  loginCheck: {
    readonly unknown: string;
    readonly passed: string;
    readonly failed: string;
    readonly skipped: string;
    readonly lastChecked: string;
    readonly neverChecked: string;
    readonly queued: string;
  };
  validation: {
    readonly appIdRequired: string;
    readonly appIdInvalid: string;
    readonly displayNameRequired: string;
    readonly appSecretRequired: string;
  };
  errors: {
    readonly loadFailed: string;
    readonly saveFailed: string;
    readonly removeFailed: string;
    readonly loginCheckFailed: string;
    readonly capabilityDisabled: string;
  };
}

/** Namespace of the mini-program message catalog. */
export const SDKWORK_MINI_PROGRAM_NAMESPACE = "iam.oauth.miniPrograms";

/** Simplified Chinese copy. */
export const MINI_PROGRAM_MESSAGES_ZH_CN: MiniProgramMessages = {
  title: "小程序账号",
  description: "维护小程序账号、凭据与登录检测",
  panel: {
    loading: "正在加载小程序账号…",
    empty: "还没有小程序账号。",
    searchPlaceholder: "搜索名称或 AppID",
    search: "搜索",
    refresh: "刷新",
    add: "添加小程序账号",
    total: "共 {total} 个",
    previous: "上一页",
    next: "下一页",
  },
  columns: {
    name: "名称",
    appId: "AppID",
    status: "状态",
    loginCheck: "登录检测",
    actions: "操作",
  },
  status: {
    enabled: "已启用",
    disabled: "已停用",
  },
  environment: {
    development: "开发版",
    trial: "体验版",
    release: "正式版",
  },
  releaseChannel: {
    stable: "稳定",
    gray: "灰度",
    rollback: "回滚",
  },
  accountType: {
    personal: "个人主体",
    enterprise: "企业主体",
    unset: "未设置",
  },
  form: {
    titleCreate: "添加小程序账号",
    titleEdit: "编辑小程序账号",
    identity: "身份信息",
    credentials: "凭据",
    loginCheck: "登录检测",
    displayName: "显示名称",
    displayNamePlaceholder: "例如：示例小程序",
    appId: "AppID",
    appIdPlaceholder: "wx1234567890abcdef",
    appIdHint: "在微信公众平台「开发 → 开发管理 → 开发者 ID」中查看；创建后不可修改。",
    originalId: "原始 ID",
    originalIdPlaceholder: "gh_xxxxxxxxxxxx",
    accountType: "主体类型",
    environment: "环境",
    releaseChannel: "发布渠道",
    appSecret: "AppSecret",
    appSecretPlaceholder: "输入小程序 AppSecret",
    appSecretKeep: "已保存 AppSecret；留空表示保持不变。",
    appSecretStored: "已保存 AppSecret",
    appSecretMissing: "尚未保存 AppSecret",
    category: "业务分类",
    categoryPlaceholder: "例如：商城",
    note: "备注",
    notePlaceholder: "运营侧备注，仅用于本平台展示",
    providerConfigHint: "业务分类与备注只保存在本平台，不会写入微信后台。",
    enabled: "启用该账号",
    cancel: "取消",
    save: "保存",
    saving: "保存中…",
    create: "创建",
  },
  actions: {
    edit: "编辑",
    enable: "启用",
    disable: "停用",
    remove: "删除",
    removeConfirm: "删除后该小程序账号将无法用于登录，确认删除？",
    runLoginCheck: "登录检测",
  },
  loginCheck: {
    unknown: "未检测",
    passed: "通过",
    failed: "失败",
    skipped: "已跳过",
    lastChecked: "最近检测：{time}",
    neverChecked: "尚未运行登录检测",
    queued: "已提交登录检测",
  },
  validation: {
    appIdRequired: "请填写 AppID。",
    appIdInvalid: "AppID 只能包含字母、数字、下划线和连字符。",
    displayNameRequired: "请填写显示名称。",
    appSecretRequired: "请填写 AppSecret。",
  },
  errors: {
    loadFailed: "加载小程序账号失败",
    saveFailed: "保存小程序账号失败",
    removeFailed: "删除小程序账号失败",
    loginCheckFailed: "登录检测失败",
    capabilityDisabled: "当前界面不允许该操作",
  },
};

/** English copy. */
export const MINI_PROGRAM_MESSAGES_EN_US: MiniProgramMessages = {
  title: "Mini programs",
  description: "Maintain mini-program accounts, credentials and login checks",
  panel: {
    loading: "Loading mini-program accounts…",
    empty: "No mini-program account yet.",
    searchPlaceholder: "Search name or AppID",
    search: "Search",
    refresh: "Refresh",
    add: "Add mini program",
    total: "{total} total",
    previous: "Previous",
    next: "Next",
  },
  columns: {
    name: "Name",
    appId: "AppID",
    status: "Status",
    loginCheck: "Login check",
    actions: "Actions",
  },
  status: {
    enabled: "Enabled",
    disabled: "Disabled",
  },
  environment: {
    development: "Development",
    trial: "Trial",
    release: "Release",
  },
  releaseChannel: {
    stable: "Stable",
    gray: "Gray",
    rollback: "Rollback",
  },
  accountType: {
    personal: "Personal",
    enterprise: "Enterprise",
    unset: "Not set",
  },
  form: {
    titleCreate: "Add a mini-program account",
    titleEdit: "Edit the mini-program account",
    identity: "Identity",
    credentials: "Credentials",
    loginCheck: "Login check",
    displayName: "Display name",
    displayNamePlaceholder: "e.g. Example mini program",
    appId: "AppID",
    appIdPlaceholder: "wx1234567890abcdef",
    appIdHint: "Find it under Developer ID in the WeChat console; it cannot change after creation.",
    originalId: "Original ID",
    originalIdPlaceholder: "gh_xxxxxxxxxxxx",
    accountType: "Account type",
    environment: "Environment",
    releaseChannel: "Release channel",
    appSecret: "AppSecret",
    appSecretPlaceholder: "Enter the mini-program AppSecret",
    appSecretKeep: "An AppSecret is stored; leave blank to keep it.",
    appSecretStored: "An AppSecret is stored",
    appSecretMissing: "No AppSecret stored yet",
    category: "Category",
    categoryPlaceholder: "e.g. Storefront",
    note: "Note",
    notePlaceholder: "Operator-facing note, shown only on this platform",
    providerConfigHint: "The category and note stay on this platform and are never written to the WeChat console.",
    enabled: "Enable this account",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving…",
    create: "Create",
  },
  actions: {
    edit: "Edit",
    enable: "Enable",
    disable: "Disable",
    remove: "Delete",
    removeConfirm: "Deleting the account stops it from logging users in. Delete it?",
    runLoginCheck: "Login check",
  },
  loginCheck: {
    unknown: "Not checked",
    passed: "Passed",
    failed: "Failed",
    skipped: "Skipped",
    lastChecked: "Last checked: {time}",
    neverChecked: "No login check has run yet",
    queued: "Login check queued",
  },
  validation: {
    appIdRequired: "Enter the AppID.",
    appIdInvalid: "The AppID may contain letters, digits, underscores, and hyphens only.",
    displayNameRequired: "Enter the display name.",
    appSecretRequired: "Enter the AppSecret.",
  },
  errors: {
    loadFailed: "Failed to load mini-program accounts",
    saveFailed: "Failed to save the mini-program account",
    removeFailed: "Failed to delete the mini-program account",
    loginCheckFailed: "The login check failed",
    capabilityDisabled: "This surface does not allow that action",
  },
};

/** Message catalog the panel and its host provider register. */
export const SDKWORK_MINI_PROGRAM_I18N_CATALOG =
  createSdkworkMessageCatalog<MiniProgramMessages>({
    defaultLocale: "zh-CN",
    locales: {
      "zh-CN": MINI_PROGRAM_MESSAGES_ZH_CN,
      "en-US": MINI_PROGRAM_MESSAGES_EN_US,
    },
    namespace: SDKWORK_MINI_PROGRAM_NAMESPACE,
  });

/**
 * Resolve copy for a host locale tag; unknown locales fall back to Chinese.
 * @param locale - a BCP 47-style tag (e.g. `zh`, `zh-CN`, `en-US`).
 * @returns the resolved message tree.
 */
export function resolveMiniProgramMessages(locale?: string): MiniProgramMessages {
  return typeof locale === "string" && locale.toLowerCase().startsWith("en")
    ? MINI_PROGRAM_MESSAGES_EN_US
    : MINI_PROGRAM_MESSAGES_ZH_CN;
}

/**
 * Resolve the surface copy for the active locale.
 *
 * Without an `SdkworkI18nProvider` ancestor the catalog's Chinese default
 * resolves, so the panel still renders in isolated hosts and tests.
 * @returns the resolved message tree.
 */
export function useMiniProgramMessages(): MiniProgramMessages {
  return useSdkworkModuleMessages(SDKWORK_MINI_PROGRAM_I18N_CATALOG);
}
