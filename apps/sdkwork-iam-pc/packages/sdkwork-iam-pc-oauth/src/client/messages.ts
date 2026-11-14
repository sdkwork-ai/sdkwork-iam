import { createSdkworkMessageCatalog, useSdkworkModuleMessages } from "@sdkwork/i18n-pc-react";

/** Copy of the user-facing official-account surface. */
export interface SdkworkIamOfficialAccountsMessages {
  panel: {
    title: string;
    description: string;
    searchPlaceholder: string;
    search: string;
    refresh: string;
    add: string;
    empty: string;
    loading: string;
    count: string;
    total: string;
    previous: string;
    next: string;
  };
  columns: {
    name: string;
    appId: string;
    type: string;
    status: string;
    menu: string;
    actions: string;
  };
  accountType: {
    service: string;
    subscription: string;
    unset: string;
  };
  status: {
    enabled: string;
    disabled: string;
  };
  actions: {
    edit: string;
    delete: string;
    save: string;
    saving: string;
    cancel: string;
    confirmDelete: string;
    confirmDeleteDetail: string;
  };
  form: {
    titleCreate: string;
    titleEdit: string;
    appId: string;
    appIdPlaceholder: string;
    displayName: string;
    displayNamePlaceholder: string;
    appSecret: string;
    appSecretPlaceholder: string;
    appSecretKeep: string;
    accountType: string;
    originalId: string;
    originalIdPlaceholder: string;
    logo: string;
    logoHint: string;
    logoChoose: string;
    logoReplace: string;
    logoRemove: string;
    logoRetry: string;
    logoUploading: string;
    logoUploadFailed: string;
    logoInvalidType: string;
    logoTooLarge: string;
    logoTooLargeDetail: string;
    logoEmptyFile: string;
    logoUnavailable: string;
    notifySection: string;
    notifyUrl: string;
    notifyUrlPlaceholder: string;
    notifyToken: string;
    notifyTokenPlaceholder: string;
    notifyEncodingAesKey: string;
    notifyEncodingAesKeyPlaceholder: string;
    enabled: string;
    save: string;
    cancel: string;
  };
  menu: {
    title: string;
    description: string;
    empty: string;
    addButton: string;
    remove: string;
    buttonName: string;
    buttonNamePlaceholder: string;
    buttonType: string;
    typeView: string;
    typeClick: string;
    url: string;
    urlPlaceholder: string;
    key: string;
    keyPlaceholder: string;
    addSubButton: string;
    topLimit: string;
    subLimit: string;
    save: string;
    preview: string;
  };
  validation: {
    appIdRequired: string;
    appIdInvalid: string;
    displayNameRequired: string;
    menuNameRequired: string;
    menuUrlRequired: string;
  };
}

/** Namespace of the official-account message catalog. */
export const SDKWORK_IAM_OFFICIAL_ACCOUNTS_NAMESPACE = "iam.oauth.officialAccounts";

const zhCN: SdkworkIamOfficialAccountsMessages = {
  panel: {
    title: "公众号账号",
    description: "维护当前账号自己的公众号配置，供后续菜单管理与文章发布使用。",
    searchPlaceholder: "搜索名称或 AppID",
    search: "搜索",
    refresh: "刷新",
    add: "添加公众号账号",
    empty: "尚未添加公众号账号。",
    loading: "正在加载公众号账号…",
    count: "{count} 个账号",
    total: "共 {total} 个",
    previous: "上一页",
    next: "下一页",
  },
  columns: {
    name: "名称",
    appId: "AppID",
    type: "类型",
    status: "状态",
    menu: "自定义菜单",
    actions: "操作",
  },
  accountType: {
    service: "服务号",
    subscription: "订阅号",
    unset: "未设置",
  },
  status: {
    enabled: "已启用",
    disabled: "已停用",
  },
  actions: {
    edit: "编辑",
    delete: "删除",
    save: "保存",
    saving: "保存中…",
    cancel: "取消",
    confirmDelete: "删除公众号账号",
    confirmDeleteDetail: "删除后该账号的配置与自定义菜单草稿将不再保留。",
  },
  form: {
    titleCreate: "添加公众号账号",
    titleEdit: "编辑公众号账号",
    appId: "AppID",
    appIdPlaceholder: "wx1234567890abcdef",
    displayName: "账号名称",
    displayNamePlaceholder: "例如：BirdCoder 官方公众号",
    appSecret: "AppSecret",
    appSecretPlaceholder: "输入公众号 AppSecret",
    appSecretKeep: "已保存 AppSecret；留空表示保持不变。",
    accountType: "账号类型",
    originalId: "原始 ID",
    originalIdPlaceholder: "gh_xxxxxxxxxxxx",
    logo: "公众号 Logo",
    logoHint: "支持 JPG、PNG、WebP，不超过 5 MB。",
    logoChoose: "上传 Logo",
    logoReplace: "更换",
    logoRemove: "移除",
    logoRetry: "重试",
    logoUploading: "上传中…",
    logoUploadFailed: "Logo 上传失败，请检查登录状态与 Drive 服务。",
    logoInvalidType: "Logo 必须是图片文件。",
    logoTooLarge: "Logo 不能超过 5 MB。",
    logoTooLargeDetail: "Logo 不能超过 {max}。",
    logoEmptyFile: "该文件为空。",
    logoUnavailable: "当前环境未启用 Logo 上传。",
    notifySection: "消息推送",
    notifyUrl: "回调地址",
    notifyUrlPlaceholder: "https://…/wechat/notify",
    notifyToken: "Token",
    notifyTokenPlaceholder: "消息推送校验 Token",
    notifyEncodingAesKey: "EncodingAESKey",
    notifyEncodingAesKeyPlaceholder: "43 位消息加解密密钥",
    enabled: "启用该账号",
    save: "保存",
    cancel: "取消",
  },
  menu: {
    title: "自定义菜单",
    description: "维护公众号菜单草稿；发布能力接入后可直接推送。",
    empty: "尚未配置菜单。",
    addButton: "添加一级菜单",
    remove: "移除",
    buttonName: "菜单名称",
    buttonNamePlaceholder: "例如：产品",
    buttonType: "类型",
    typeView: "跳转网页",
    typeClick: "发送消息",
    url: "网页地址",
    urlPlaceholder: "https://…",
    key: "事件 Key",
    keyPlaceholder: "EVENT_KEY",
    addSubButton: "添加子菜单",
    topLimit: "最多 3 个一级菜单。",
    subLimit: "每个一级菜单最多 5 个子菜单。",
    save: "保存菜单草稿",
    preview: "菜单预览",
  },
  validation: {
    appIdRequired: "请填写 AppID。",
    appIdInvalid: "AppID 只能包含字母、数字、下划线和连字符。",
    displayNameRequired: "请填写账号名称。",
    menuNameRequired: "请填写菜单名称。",
    menuUrlRequired: "跳转网页的菜单需要填写网页地址。",
  },
};

const enUS: SdkworkIamOfficialAccountsMessages = {
  panel: {
    title: "Official Accounts",
    description: "Maintain this account's own official-account configuration for menu management and article publishing.",
    searchPlaceholder: "Search name or AppID",
    search: "Search",
    refresh: "Refresh",
    add: "Add official account",
    empty: "No official account yet.",
    loading: "Loading official accounts…",
    count: "{count} account(s)",
    total: "{total} total",
    previous: "Previous",
    next: "Next",
  },
  columns: {
    name: "Name",
    appId: "AppID",
    type: "Type",
    status: "Status",
    menu: "Custom menu",
    actions: "Actions",
  },
  accountType: {
    service: "Service account",
    subscription: "Subscription account",
    unset: "Not set",
  },
  status: {
    enabled: "Enabled",
    disabled: "Disabled",
  },
  actions: {
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    confirmDelete: "Delete official account",
    confirmDeleteDetail: "The account configuration and custom-menu draft will no longer be kept.",
  },
  form: {
    titleCreate: "Add official account",
    titleEdit: "Edit official account",
    appId: "AppID",
    appIdPlaceholder: "wx1234567890abcdef",
    displayName: "Account name",
    displayNamePlaceholder: "e.g. BirdCoder official account",
    appSecret: "AppSecret",
    appSecretPlaceholder: "Enter the AppSecret",
    appSecretKeep: "An AppSecret is stored; leave blank to keep it.",
    accountType: "Account type",
    originalId: "Original ID",
    originalIdPlaceholder: "gh_xxxxxxxxxxxx",
    logo: "Official-account logo",
    logoHint: "JPG, PNG, or WebP up to 5 MB.",
    logoChoose: "Upload logo",
    logoReplace: "Replace",
    logoRemove: "Remove",
    logoRetry: "Retry",
    logoUploading: "Uploading…",
    logoUploadFailed: "Logo upload failed; check the session and the Drive service.",
    logoInvalidType: "The logo must be an image file.",
    logoTooLarge: "The logo must be 5 MB or smaller.",
    logoTooLargeDetail: "The logo must be {max} or smaller.",
    logoEmptyFile: "This file is empty.",
    logoUnavailable: "Logo uploads are not available in this environment.",
    notifySection: "Message push",
    notifyUrl: "Callback URL",
    notifyUrlPlaceholder: "https://…/wechat/notify",
    notifyToken: "Token",
    notifyTokenPlaceholder: "Message verification token",
    notifyEncodingAesKey: "EncodingAESKey",
    notifyEncodingAesKeyPlaceholder: "43-character message key",
    enabled: "Enable this account",
    save: "Save",
    cancel: "Cancel",
  },
  menu: {
    title: "Custom menu",
    description: "Maintain the official-account menu draft; publishing can push it once the capability lands.",
    empty: "No menu configured.",
    addButton: "Add top-level menu",
    remove: "Remove",
    buttonName: "Menu name",
    buttonNamePlaceholder: "e.g. Product",
    buttonType: "Type",
    typeView: "Open URL",
    typeClick: "Send message",
    url: "URL",
    urlPlaceholder: "https://…",
    key: "Event key",
    keyPlaceholder: "EVENT_KEY",
    addSubButton: "Add sub-menu",
    topLimit: "At most 3 top-level menus.",
    subLimit: "At most 5 sub-menus per top-level menu.",
    save: "Save menu draft",
    preview: "Menu preview",
  },
  validation: {
    appIdRequired: "Enter the AppID.",
    appIdInvalid: "The AppID may contain letters, digits, underscores, and hyphens only.",
    displayNameRequired: "Enter the account name.",
    menuNameRequired: "Enter the menu name.",
    menuUrlRequired: "A URL-opening menu needs a URL.",
  },
};

/** Message catalog the panel and its host provider register. */
export const SDKWORK_IAM_OFFICIAL_ACCOUNTS_I18N_CATALOG =
  createSdkworkMessageCatalog<SdkworkIamOfficialAccountsMessages>({
    defaultLocale: "en-US",
    locales: {
      "en-US": enUS,
      "zh-CN": zhCN,
    },
    namespace: SDKWORK_IAM_OFFICIAL_ACCOUNTS_NAMESPACE,
  });

/**
 * Resolve the surface copy for the active locale.
 *
 * Without an `SdkworkI18nProvider` ancestor the catalog's default locale
 * resolves, so the panel still renders in isolated hosts and tests.
 * @returns the resolved message tree.
 */
export function useSdkworkIamOfficialAccountsMessages(): SdkworkIamOfficialAccountsMessages {
  return useSdkworkModuleMessages(SDKWORK_IAM_OFFICIAL_ACCOUNTS_I18N_CATALOG);
}
