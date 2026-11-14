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
    displayNameHint: string;
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
    tabBasic: string;
    tabDomains: string;
    appIdHint: string;
    appSecretHint: string;
    originalIdHint: string;
    enabledHint: string;
    ipWhitelistHint: string;
    domainsHint: string;
    domainsMonthlyHint: string;
    jsSecureDomains: string;
    jsSecureDomainsHint: string;
    webAuthDomains: string;
    webAuthDomainsHint: string;
    businessDomains: string;
    businessDomainsHint: string;
    domainAdd: string;
    domainRemove: string;
    domainInvalid: string;
    domainDuplicate: string;
    domainPlaceholder: string;
    serverConfigHint: string;
    notifyUrlHint: string;
    notifyTokenHint: string;
    notifyEncodingAesKeyHint: string;
    notifyEncryptMode: string;
    encryptPlaintext: string;
    encryptCompatible: string;
    encryptSafe: string;
    encryptPlaintextHint: string;
    encryptCompatibleHint: string;
    encryptSafeHint: string;
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
    domainInvalid: string;
    notifyUrlInvalid: string;
    notifyTokenInvalid: string;
    notifyEncodingAesKeyInvalid: string;
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
    displayNameHint: "仅用于本列表与配置展示，不会修改微信后台的公众号资料。",
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
    tabBasic: "基础信息",
    tabDomains: "域名配置",
    appIdHint: "在公众平台「开发 → 开发管理 → 开发者 ID」中查看；创建后不可修改。",
    appSecretHint: "用于获取 access_token 的开发者密码；请确保服务端出口 IP 已加入白名单。",
    originalIdHint: "公众号「账号详情」中的原始 ID，例如 gh_xxxxxxxxxxxx。",
    enabledHint: "停用后，该账号的菜单草稿与消息推送配置不会被使用。",
    ipWhitelistHint: "提示：请将服务端出口 IP 加入公众平台「开发 → 基本配置 → IP 白名单」，否则获取 access_token 会失败。",
    domainsHint: "与公众平台「设置与开发 → 公众号设置 → 功能设置」保持一致；域名须已 ICP 备案，不支持 IP、端口、协议前缀和短链接。",
    domainsMonthlyHint: "提示：JS 接口安全域名、网页授权域名和业务域名的修改均受微信公众平台每月次数限制。",
    jsSecureDomains: "JS 接口安全域名",
    jsSecureDomainsHint: "微信 JS-SDK 调用页面所在的域名；填写父级域名后，其合法子域名同样生效。",
    webAuthDomains: "网页授权域名",
    webAuthDomainsHint: "网页授权回调页所在域名，回调页必须位于该域名下。",
    businessDomains: "业务域名",
    businessDomainsHint: "配置后微信内打开该域名页面不会被重新排版；需按公众平台提示上传 MP_verify_*.txt 校验文件。",
    domainAdd: "添加",
    domainRemove: "移除域名",
    domainInvalid: "请填写合法域名，例如 api.example.com。",
    domainDuplicate: "该域名已添加。",
    domainPlaceholder: "api.example.com",
    serverConfigHint: "对应公众平台「开发 → 基本配置 → 服务器配置」，用于接收微信消息与事件推送。",
    notifyUrlHint: "仅支持 http（80 端口）或 https（443 端口），需正确响应微信的 Token 校验。",
    notifyTokenHint: "3–32 位字母或数字，用于校验消息来源。",
    notifyEncodingAesKeyHint: "43 位字母或数字；安全模式和兼容模式下使用。",
    notifyEncryptMode: "消息加解密方式",
    encryptPlaintext: "明文模式",
    encryptCompatible: "兼容模式",
    encryptSafe: "安全模式（推荐）",
    encryptPlaintextHint: "不使用消息体加解密，安全系数较低。",
    encryptCompatibleHint: "明文与密文共存，便于调试与灰度迁移。",
    encryptSafeHint: "消息包为纯密文，需要自行加解密，安全系数最高。",
    notifySection: "服务器配置（消息推送）",
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
    domainInvalid: "请填写合法域名，例如 api.example.com。",
    notifyUrlInvalid: "回调地址必须以 http://（80 端口）或 https://（443 端口）开头。",
    notifyTokenInvalid: "Token 必须为 3–32 位字母或数字。",
    notifyEncodingAesKeyInvalid: "EncodingAESKey 必须为 43 位字母或数字。",
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
    displayNameHint: "Shown only in this list and configuration; it does not change the WeChat profile.",
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
    tabBasic: "Basic info",
    tabDomains: "Domains",
    appIdHint: "Find it under Developer ID in the WeChat console; it cannot change after creation.",
    appSecretHint: "The developer secret used to obtain access_token; keep the server egress IP on the allowlist.",
    originalIdHint: "The account's original ID from its profile page, e.g. gh_xxxxxxxxxxxx.",
    enabledHint: "A disabled account stops using its menu draft and message-push configuration.",
    ipWhitelistHint: "Tip: add the server egress IP to the WeChat console's IP allowlist, or access_token requests will fail.",
    domainsHint: "Mirrors Settings → Account settings → Function settings in the WeChat console; domains must pass ICP filing and cannot be IPs, ports, schemes, or short links.",
    domainsMonthlyHint: "Tip: the WeChat console limits how often the JS secure, web-authorization, and business domain sets may change per month.",
    jsSecureDomains: "JS interface security domains",
    jsSecureDomainsHint: "Domains of pages that call the WeChat JS-SDK; a parent domain covers its valid subdomains.",
    webAuthDomains: "Web-authorization domains",
    webAuthDomainsHint: "Domains of the web-authorization callback pages; the callback must live on one of them.",
    businessDomains: "Business domains",
    businessDomainsHint: "Pages on these domains open without WeChat re-layout; upload the MP_verify_*.txt file the console provides.",
    domainAdd: "Add",
    domainRemove: "Remove domain",
    domainInvalid: "Enter a valid domain such as api.example.com.",
    domainDuplicate: "That domain is already in the list.",
    domainPlaceholder: "api.example.com",
    serverConfigHint: "Mirrors Developer configuration → Server configuration; it receives WeChat messages and events.",
    notifyUrlHint: "Only http (port 80) or https (port 443), and it must answer WeChat's Token verification.",
    notifyTokenHint: "3-32 letters or digits, used to verify message origin.",
    notifyEncodingAesKeyHint: "43 letters or digits, used by the safe and compatible modes.",
    notifyEncryptMode: "Message encryption mode",
    encryptPlaintext: "Plaintext",
    encryptCompatible: "Compatible",
    encryptSafe: "Safe (recommended)",
    encryptPlaintextHint: "No message encryption; the weakest security posture.",
    encryptCompatibleHint: "Plaintext and ciphertext coexist, which eases debugging and staged migration.",
    encryptSafeHint: "Messages are ciphertext only; you decrypt them yourself for the highest security.",
    notifySection: "Server configuration (message push)",
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
    domainInvalid: "Enter a valid domain such as api.example.com.",
    notifyUrlInvalid: "The callback URL must start with http:// (port 80) or https:// (port 443).",
    notifyTokenInvalid: "The Token must be 3-32 letters or digits.",
    notifyEncodingAesKeyInvalid: "The EncodingAESKey must be 43 letters or digits.",
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
