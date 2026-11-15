import type { OfficialAccountsMenuMessages } from "./menu/messages";
import { OFFICIAL_ACCOUNTS_MENU_MESSAGES_EN_US, OFFICIAL_ACCOUNTS_MENU_MESSAGES_ZH_CN } from "./menu/messages";
import { createSdkworkMessageCatalog, useSdkworkModuleMessages } from "@sdkwork/i18n-pc-react";

/**
 * Copy of the shared official-account surface.
 *
 * Every key is present in both locales; hosts embed the panel through an
 * `SdkworkI18nProvider` carrying {@link SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG}.
 */
export interface OfficialAccountsMessages {
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
    identifier: string;
    appId: string;
    originalId: string;
    type: string;
    organization: string;
    maintainer: string;
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
  account: {
    selfManaged: string;
    selfManagedHint: string;
    platformOrganization: string;
    noOrganization: string;
    noMaintainer: string;
    unset: string;
  };
  actions: {
    edit: string;
    delete: string;
    save: string;
    saving: string;
    cancel: string;
    confirmDelete: string;
    confirmDeleteDetail: string;
    followQrCode: string;
  };
  followQrCode: {
    title: string;
    description: string;
    loading: string;
    failure: string;
    sceneLabel: string;
    permanentHint: string;
    close: string;
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
    logoNote: string;
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
    credentialsLocked: string;
    tabBasic: string;
    tabDomains: string;
    tabServer: string;
    serverIpsHint: string;
    serverIpsNote: string;
    serverIpsEmpty: string;
    serverIpsCount: string;
    serverIpCopy: string;
    serverIpCopied: string;
    serverIpCopyAll: string;
    serverIpsMaintain: string;
    serverIpsMaintainTitle: string;
    serverIpsMaintainDescription: string;
    serverIpsPlaceholder: string;
    serverIpsInvalid: string;
    serverIpsSave: string;
    serverIpsEmptyMaintain: string;
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
    domainLimitReached: string;
    domainPlaceholder: string;
    domainVerificationHint: string;
    domainVerificationMissing: string;
    domainVerificationUpload: string;
    domainVerificationReplace: string;
    domainVerificationUploaded: string;
    domainVerificationUnmanaged: string;
    domainVerificationLoading: string;
    domainVerificationInvalid: string;
    domainVerificationFailed: string;
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
    notifyUrlStandard: string;
    notifyUrlStandardHint: string;
    notifyUrlPending: string;
    notifyUrlCopy: string;
    notifyUrlCopied: string;
    notifyGenerate: string;
    notifyCopy: string;
    notifyCopied: string;
    notifyToken: string;
    notifyTokenPlaceholder: string;
    notifyEncodingAesKey: string;
    notifyEncodingAesKeyPlaceholder: string;
    qrLogin: string;
    qrLoginHint: string;
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
    publish: string;
    publishing: string;
    published: string;
    publishFailed: string;
    publishHint: string;
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
  /** Full custom-menu workspace copy. */
  menuEditor: OfficialAccountsMenuMessages;
}

/** Namespace of the official-account message catalog. */
export const SDKWORK_OFFICIAL_ACCOUNTS_NAMESPACE = "iam.oauth.officialAccounts";

const zhCN: OfficialAccountsMessages = {
  panel: {
    title: "公众号账号",
    description: "维护当前账号自己的公众号配置，供后续菜单管理与文章发布使用。",
    searchPlaceholder: "搜索名称、AppID 或原始 ID",
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
    name: "公众号",
    identifier: "公众号标识",
    appId: "AppID",
    originalId: "原始 ID",
    type: "类型",
    organization: "所属组织",
    maintainer: "维护人",
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
  account: {
    selfManaged: "自助维护",
    selfManagedHint: "该账号由用户自助维护，运营侧不可改其凭据。",
    platformOrganization: "平台",
    noOrganization: "未归属组织",
    noMaintainer: "未指定",
    unset: "—",
  },
  actions: {
    edit: "编辑",
    delete: "删除",
    save: "保存",
    saving: "保存中…",
    cancel: "取消",
    confirmDelete: "删除公众号账号",
    confirmDeleteDetail: "删除后该账号的配置与自定义菜单草稿将不再保留。",
    followQrCode: "关注二维码",
  },
  followQrCode: {
    title: "关注二维码",
    description: "生成该公众号的带参数关注二维码，供公众号文章或线下物料投放。",
    loading: "二维码生成中…",
    failure: "关注二维码生成失败",
    sceneLabel: "场景值",
    permanentHint: "该二维码为永久有效，可长期投放使用。",
    close: "关闭",
  },
  form: {
    titleCreate: "添加公众号账号",
    titleEdit: "编辑公众号账号",
    appId: "AppID",
    appIdPlaceholder: "wx1234567890abcdef",
    displayName: "账号名称",
    displayNamePlaceholder: "例如：示例公众号",
    displayNameHint: "仅用于本列表与配置展示，不会修改微信后台的公众号资料。",
    appSecret: "AppSecret",
    appSecretPlaceholder: "输入公众号 AppSecret",
    appSecretKeep: "已保存 AppSecret；留空表示保持不变。",
    accountType: "账号类型",
    originalId: "原始 ID",
    originalIdPlaceholder: "gh_xxxxxxxxxxxx",
    logo: "公众号 Logo",
    logoHint: "支持 JPG、PNG、WebP，不超过 5 MB。",
    logoNote: "建议使用不小于 300×300 的方形图片。",
    logoChoose: "上传",
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
    credentialsLocked: "当前界面不允许修改 AppID 与 AppSecret，请联系具备权限的管理员。",
    tabBasic: "基础信息",
    tabDomains: "域名配置",
    tabServer: "服务器信息",
    serverIpsHint: "以下服务器 IP 用于调用微信接口；请全部加入公众平台「开发 → 基本配置 → IP 白名单」，否则获取 access_token 会失败。",
    serverIpsNote: "提示：微信只允许白名单内的 IP 调用接口，IP 变更后需同步更新白名单。",
    serverIpsEmpty: "当前部署未公布服务器 IP。请在部署环境变量 SDKWORK_OFFICIAL_ACCOUNT_SERVER_IPS 中配置后重启。",
    serverIpsCount: "共 {count} 个 IP",
    serverIpCopy: "复制",
    serverIpCopied: "已复制",
    serverIpCopyAll: "复制全部",
    serverIpsMaintain: "维护",
    serverIpsMaintainTitle: "维护服务器公网 IP",
    serverIpsMaintainDescription: "每行一个 IP，支持多个；保存后服务器信息页签会展示并可复制。",
    serverIpsPlaceholder: "例如 203.0.113.10",
    serverIpsInvalid: "IP 中不能包含空格。",
    serverIpsSave: "保存 IP 列表",
    serverIpsEmptyMaintain: "当前还没有维护服务器 IP，点击「维护」添加。",
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
    domainLimitReached: "该组最多添加 {max} 个域名，请先移除一个。",
    domainPlaceholder: "api.example.com",
    domainVerificationHint: "上传微信公众平台下载的 MP_verify_*.txt；本平台会在该域名根路径原样提供该文件，供微信校验。",
    domainVerificationMissing: "未上传验证文件",
    domainVerificationUpload: "上传验证文件",
    domainVerificationReplace: "替换验证文件",
    domainVerificationUploaded: "已上传 {file}",
    domainVerificationUnmanaged: "该域名未托管在本平台，无法代托管验证文件",
    domainVerificationLoading: "读取验证文件…",
    domainVerificationInvalid: "请选择微信生成的 .txt 验证文件（文件名以 .txt 结尾，内容不超过 2048 字节）",
    domainVerificationFailed: "验证文件上传失败",
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
    notifyUrlStandard: "回调地址（平台标准）",
    notifyUrlStandardHint: "该地址由平台按账号自动生成，请粘贴到公众平台 → 设置与开发 → 基本配置 → 服务器配置（URL）；Token 与 EncodingAESKey 使用上方填写的值。",
    notifyUrlPending: "保存账号后自动生成标准回调地址。",
    notifyUrlCopy: "复制",
    notifyUrlCopied: "已复制",
    notifyGenerate: "生成",
    notifyCopy: "复制",
    notifyCopied: "已复制",
    notifyToken: "Token",
    notifyTokenPlaceholder: "消息推送校验 Token",
    notifyEncodingAesKey: "EncodingAESKey",
    notifyEncodingAesKeyPlaceholder: "43 位消息加解密密钥",
    qrLogin: "设为扫码登录默认号",
    qrLoginHint: "开启后，扫码登录优先使用该公众号；自助维护的账号默认不参与扫码登录。",
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
    publish: "发布到公众号",
    publishing: "发布中…",
    published: "已发布",
    publishFailed: "菜单发布失败",
    publishHint: "发布会先保存当前草稿，再推送到微信公众平台。",
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
  menuEditor: OFFICIAL_ACCOUNTS_MENU_MESSAGES_ZH_CN,
};

const enUS: OfficialAccountsMessages = {
  panel: {
    title: "Official Accounts",
    description: "Maintain this account's own official-account configuration for menu management and article publishing.",
    searchPlaceholder: "Search name, AppID, or original ID",
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
    name: "Official account",
    identifier: "Account identifiers",
    appId: "AppID",
    originalId: "Original ID",
    type: "Type",
    organization: "Organization",
    maintainer: "Maintainer",
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
  account: {
    selfManaged: "Self-managed",
    selfManagedHint: "This account is maintained by its user; operators cannot change its credentials.",
    platformOrganization: "Platform",
    noOrganization: "No organization",
    noMaintainer: "Unassigned",
    unset: "—",
  },
  actions: {
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    confirmDelete: "Delete official account",
    confirmDeleteDetail: "The account configuration and custom-menu draft will no longer be kept.",
    followQrCode: "Follow QR",
  },
  followQrCode: {
    title: "Follow QR code",
    description: "Generate the account's parameterized follow QR code for articles or offline placements.",
    loading: "Generating the QR code…",
    failure: "Failed to generate the follow QR code",
    sceneLabel: "Scene",
    permanentHint: "This QR code does not expire and can stay in service.",
    close: "Close",
  },
  form: {
    titleCreate: "Add official account",
    titleEdit: "Edit official account",
    appId: "AppID",
    appIdPlaceholder: "wx1234567890abcdef",
    displayName: "Account name",
    displayNamePlaceholder: "e.g. Example official account",
    displayNameHint: "Shown only in this list and configuration; it does not change the WeChat profile.",
    appSecret: "AppSecret",
    appSecretPlaceholder: "Enter the AppSecret",
    appSecretKeep: "An AppSecret is stored; leave blank to keep it.",
    accountType: "Account type",
    originalId: "Original ID",
    originalIdPlaceholder: "gh_xxxxxxxxxxxx",
    logo: "Official-account logo",
    logoHint: "JPG, PNG, or WebP up to 5 MB.",
    logoNote: "Use a square image of at least 300×300.",
    logoChoose: "Upload",
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
    credentialsLocked: "This surface does not allow changing the AppID or AppSecret; ask an authorized administrator.",
    tabBasic: "Basic info",
    tabDomains: "Domains",
    tabServer: "Server info",
    serverIpsHint: "These server IPs call the WeChat API. Add all of them to Developer configuration → IP allowlist in the WeChat console, or access_token requests will fail.",
    serverIpsNote: "WeChat only accepts API calls from allowlisted IPs; update the allowlist whenever these addresses change.",
    serverIpsEmpty: "This deployment publishes no server IPs. Set SDKWORK_OFFICIAL_ACCOUNT_SERVER_IPS in the deployment environment and restart.",
    serverIpsCount: "{count} IPs",
    serverIpCopy: "Copy",
    serverIpCopied: "Copied",
    serverIpCopyAll: "Copy all",
    serverIpsMaintain: "Maintain",
    serverIpsMaintainTitle: "Maintain server public IPs",
    serverIpsMaintainDescription: "One IP per line; multiple entries are supported. The server-info tab lists and copies them after saving.",
    serverIpsPlaceholder: "e.g. 203.0.113.10",
    serverIpsInvalid: "An IP entry cannot contain whitespace.",
    serverIpsSave: "Save IP list",
    serverIpsEmptyMaintain: "No server IPs are maintained yet. Choose Maintain to add them.",
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
    domainLimitReached: "This set allows at most {max} domains; remove one first.",
    domainPlaceholder: "api.example.com",
    domainVerificationHint: "Upload the MP_verify_*.txt file from the WeChat console; this platform serves it verbatim at the domain root for WeChat verification.",
    domainVerificationMissing: "No verification file uploaded",
    domainVerificationUpload: "Upload verification file",
    domainVerificationReplace: "Replace verification file",
    domainVerificationUploaded: "Uploaded {file}",
    domainVerificationUnmanaged: "This domain is not managed by this platform, so its verification file cannot be hosted here",
    domainVerificationLoading: "Reading verification file…",
    domainVerificationInvalid: "Choose the .txt file WeChat generated (name ends with .txt, content up to 2048 bytes)",
    domainVerificationFailed: "Verification file upload failed",
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
    notifyUrlStandard: "Callback URL (platform standard)",
    notifyUrlStandardHint: "The platform generates this URL from the account. Paste it into WeChat → Development → Basic configuration → Server configuration (URL); use the Token and EncodingAESKey entered above.",
    notifyUrlPending: "The standard callback URL appears once the account is saved.",
    notifyUrlCopy: "Copy",
    notifyUrlCopied: "Copied",
    notifyGenerate: "Generate",
    notifyCopy: "Copy",
    notifyCopied: "Copied",
    notifyToken: "Token",
    notifyTokenPlaceholder: "Message verification token",
    notifyEncodingAesKey: "EncodingAESKey",
    notifyEncodingAesKeyPlaceholder: "43-character message key",
    qrLogin: "Default account for scan login",
    qrLoginHint: "When enabled, scan login prefers this official account; self-managed accounts stay out of scan login by default.",
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
    publish: "Publish to official account",
    publishing: "Publishing…",
    published: "Published",
    publishFailed: "Menu publishing failed",
    publishHint: "Publishing saves the current draft first, then pushes it to the WeChat console.",
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
  menuEditor: OFFICIAL_ACCOUNTS_MENU_MESSAGES_EN_US,
};

/** Message catalog the panel and its host provider register. */
export const SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG =
  createSdkworkMessageCatalog<OfficialAccountsMessages>({
    defaultLocale: "en-US",
    locales: {
      "en-US": enUS,
      "zh-CN": zhCN,
    },
    namespace: SDKWORK_OFFICIAL_ACCOUNTS_NAMESPACE,
  });

/**
 * Resolve the surface copy for the active locale.
 *
 * Without an `SdkworkI18nProvider` ancestor the catalog's default locale
 * resolves, so the panel still renders in isolated hosts and tests.
 * @returns the resolved message tree.
 */
export function useOfficialAccountsMessages(): OfficialAccountsMessages {
  return useSdkworkModuleMessages(SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG);
}
