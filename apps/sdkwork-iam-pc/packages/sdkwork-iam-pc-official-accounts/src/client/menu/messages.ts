/**
 * Copy and message shape of the official-account custom-menu workspace.
 *
 * The workspace is shared by every surface that edits the WeChat menu (the IAM
 * admin full-screen editor, the self-service panel drawer and product hosts
 * such as birdcoder2), so its copy lives with the component instead of in a
 * host dictionary.
 */

/** Copy of the custom-menu workspace, keyed by the workspace's own controls. */
export interface OfficialAccountsMenuMessages {
    "actions": string;
    "openButton": string;
    "title": string;
    "description": string;
    "close": string;
    "phonePreviewTitle": string;
    "deviceSelectorLabel": string;
    "undo": string;
    "redo": string;
    "savedStatus": string;
    "unsavedStatus": string;
    "phoneEmptyHint": string;
    "addTopMenu": string;
    "addSubMenu": string;
    "topMenuLabel": string;
    "subMenuLabel": string;
    "parentContentHint": string;
    "cancel": string;
    "discardChanges": string;
    "deleteConfirmation": string;
    "deleteMenu": string;
    "deleteSubMenu": string;
    "moveUp": string;
    "moveDown": string;
    "menuName": string;
    "menuNamePlaceholder": string;
    "nameUnitHint": string;
    "actionTitle": string;
    "actionUnset": string;
    "actionUnsetHint": string;
    "unsupportedActionTemplate": string;
    "actionTypes": {
      "click": string;
      "clickDescription": string;
      "view": string;
      "viewDescription": string;
      "miniprogram": string;
      "miniprogramDescription": string;
    };
    "messageLabel": string;
    "messagePlaceholder": string;
    "messageHint": string;
    "urlLabel": string;
    "urlPlaceholder": string;
    "appIdLabel": string;
    "appIdPlaceholder": string;
    "pagePathLabel": string;
    "pagePathPlaceholder": string;
    "fallbackUrlLabel": string;
    "fallbackUrlPlaceholder": string;
    "fallbackUrlHint": string;
    /** Link label that opens the deployed-application mini program picker. */
    "pickFromDeployedApps": string;
    "pickerTitle": string;
    "pickerDescription": string;
    "pickerLoading": string;
    "pickerEmpty": string;
    "pickerLoadFailed": string;
    "pickerRetry": string;
    /** Shown on a deployed application that links no mini program account. */
    "pickerNoAccount": string;
    /** Environment badge template with an {environment} placeholder. */
    "pickerEnvironmentTemplate": string;
    "rules": string;
    "rulesText": string;
    "rulesText2": string;
    "loading": string;
    "loadFailed": string;
    "selectHint": string;
    "saveDraft": string;
    "saveAndPublish": string;
    "publishConfirmTitle": string;
    "publishConfirmDescription": string;
    "publishConfirmAction": string;
    "saved": string;
    "publishSuccess": string;
    "publishUnavailable": string;
    "publishFailedTemplate": string;
    "unsavedTitle": string;
    "unsavedDescription": string;
    "validation": {
      "atLeastOneTop": string;
      "tooManyTop": string;
      "tooManySub": string;
      "nestedSubMenuNotAllowed": string;
      "nameRequired": string;
      "nameTooLongTop": string;
      "nameTooLongSub": string;
      "actionRequired": string;
      "unsupportedAction": string;
      "messageRequired": string;
      "messageTooLong": string;
      "urlRequired": string;
      "urlInvalid": string;
      "urlTooLong": string;
      "appIdRequired": string;
      "pagePathRequired": string;
    };

  /** Refresh the draft from the live WeChat menu. */
  refresh: string;
  /** Refresh in progress. */
  refreshing: string;
  /** Refresh completed. */
  refreshed: string;
  /** Current draft version label. */
  version: string;
  /** Version history / rollback affordance. */
  rollback: string;
  /** Rollback dialog title. */
  rollbackTitle: string;
  /** Rollback dialog description. */
  rollbackDescription: string;
  /** Rollback action label with a {version} placeholder. */
  rollbackAction: string;
  /** Rollback in progress. */
  rollingBack: string;
  /** No earlier revisions. */
  historyEmpty: string;
  /** Conflict notice with a {version} placeholder. */
  conflict: string;
}

/** Simplified Chinese copy. */

export const OFFICIAL_ACCOUNTS_MENU_MESSAGES_ZH_CN: OfficialAccountsMenuMessages = {
  "actions": "操作",
  "openButton": "菜单管理",
  "title": "自定义菜单",
  "description": "配置公众号底部菜单：左侧实时预览微信效果，右侧编辑菜单名称与菜单内容。",
  "close": "关闭自定义菜单",
  "phonePreviewTitle": "菜单预览",
  "deviceSelectorLabel": "预览设备",
  "undo": "撤销",
  "redo": "重做",
  "savedStatus": "已保存",
  "unsavedStatus": "有未保存更改",
  "phoneEmptyHint": "点击下方「+」添加一级菜单",
  "addTopMenu": "添加一级菜单",
  "addSubMenu": "添加子菜单",
  "topMenuLabel": "一级菜单",
  "subMenuLabel": "子菜单",
  "parentContentHint": "已添加子菜单，仅可设置菜单名称。菜单内容由各子菜单分别配置。",
  "cancel": "取消",
  "discardChanges": "放弃更改",
  "deleteConfirmation": "删除后，该菜单及其配置内容将一并移除。确定删除吗？",
  "deleteMenu": "删除菜单",
  "deleteSubMenu": "删除子菜单",
  "moveUp": "上移",
  "moveDown": "下移",
  "menuName": "菜单名称",
  "menuNamePlaceholder": "请输入菜单名称",
  "nameUnitHint": "一级菜单不超过 4 个汉字（8 个字母），子菜单不超过 7 个汉字（14 个字母）",
  "actionTitle": "菜单内容",
  "actionUnset": "未设置动作",
  "actionUnsetHint": "请选择点击菜单后的响应动作",
  "unsupportedActionTemplate": "该菜单来自微信，动作类型“{type}”暂不支持无损编辑。请先转换为下方支持的动作再发布。",
  "actionTypes": {
    "click": "点击事件",
    "clickDescription": "用户点击后向服务器推送自定义 EventKey 事件",
    "view": "跳转网页",
    "viewDescription": "用户点击后跳转到指定网页",
    "miniprogram": "跳转小程序",
    "miniprogramDescription": "用户点击后打开指定小程序页面"
  },
  "messageLabel": "事件键值",
  "messagePlaceholder": "请输入 EventKey，例如 CUSTOMER_SERVICE",
  "messageHint": "微信会将该 EventKey 推送到已配置的服务器回调，由服务端处理后续响应",
  "urlLabel": "网页地址",
  "urlPlaceholder": "https://example.com/page",
  "appIdLabel": "小程序 AppID",
  "appIdPlaceholder": "wx1234567890abcdef",
  "pagePathLabel": "小程序页面路径",
  "pagePathPlaceholder": "pages/index/index",
  "fallbackUrlLabel": "备用网页",
  "fallbackUrlPlaceholder": "https://example.com/fallback",
  "fallbackUrlHint": "旧版微信客户端无法打开小程序时，将跳转到此网页",
  "pickFromDeployedApps": "从部署应用中选择",
  "pickerTitle": "选择已部署的小程序应用",
  "pickerDescription": "列表来自当前租户的部署应用；选择后自动填入该应用关联小程序账号的 AppID。",
  "pickerLoading": "正在加载已部署的小程序应用…",
  "pickerEmpty": "暂无已部署的小程序应用。",
  "pickerLoadFailed": "加载已部署的小程序应用失败。",
  "pickerRetry": "重试",
  "pickerNoAccount": "未关联小程序账号",
  "pickerEnvironmentTemplate": "环境：{environment}",
  "rules": "菜单规则",
  "rulesText": "一级菜单最多 3 个，每个一级菜单最多可添加 5 个子菜单；",
  "rulesText2": "含有子菜单的一级菜单本身不可设置动作，仅作为子菜单的入口展示。",
  "loading": "正在加载菜单…",
  "loadFailed": "加载自定义菜单失败。",
  "selectHint": "请选择左侧菜单进行编辑",
  "saveDraft": "保存草稿",
  "saveAndPublish": "保存并发布",
  "publishConfirmTitle": "确认发布菜单？",
  "publishConfirmDescription": "发布后将立即替换当前线上菜单，用户端可能因微信缓存存在短暂延迟。请确认菜单名称、顺序和跳转内容均已检查无误。",
  "publishConfirmAction": "确认发布",
  "saved": "草稿已保存。",
  "publishSuccess": "菜单已发布。",
  "publishUnavailable": "菜单已保存为草稿，发布能力即将上线。",
  "publishFailedTemplate": "发布失败：{message}",
  "unsavedTitle": "尚未保存更改",
  "unsavedDescription": "当前菜单存在未保存的更改，关闭后这些更改将丢失。",
  "validation": {
    "atLeastOneTop": "请至少添加一个一级菜单",
    "tooManyTop": "一级菜单最多 3 个",
    "tooManySub": "每个一级菜单最多 5 个子菜单",
    "nestedSubMenuNotAllowed": "自定义菜单最多支持两级，子菜单下不能继续添加菜单",
    "nameRequired": "请输入菜单名称",
    "nameTooLongTop": "一级菜单名称不超过 4 个汉字（8 个字母）",
    "nameTooLongSub": "子菜单名称不超过 7 个汉字（14 个字母）",
    "actionRequired": "请设置菜单动作",
    "unsupportedAction": "该微信菜单动作暂不支持发布，请先转换动作类型",
    "messageRequired": "请输入事件键值",
    "messageTooLong": "事件键值不能超过 128 字节",
    "urlRequired": "请输入网页地址",
    "urlInvalid": "请输入以 http:// 或 https:// 开头的合法网址",
    "urlTooLong": "网页地址不能超过 1024 字节",
    "appIdRequired": "请输入小程序 AppID",
    "pagePathRequired": "请输入小程序页面路径"

  },
  "refresh": "刷新",
  "refreshing": "正在刷新…",
  "refreshed": "已从公众号同步最新菜单。",
  "version": "版本 {version}",
  "rollback": "回滚",
  "rollbackTitle": "回滚菜单配置",
  "rollbackDescription": "选择要恢复的版本；恢复后会立即发布到公众号。",
  "rollbackAction": "回滚到版本 {version}",
  "rollingBack": "正在回滚…",
  "historyEmpty": "暂无历史版本。",
  "conflict": "菜单已被其他人更新（当前版本 {version}）。请先刷新后再保存。"
};

/** English copy. */
export const OFFICIAL_ACCOUNTS_MENU_MESSAGES_EN_US: OfficialAccountsMenuMessages = {
  "actions": "Actions",
  "openButton": "Menu manager",
  "title": "Custom menu",
  "description": "Configure the official account menu with a live WeChat preview on the left and menu content editor on the right.",
  "close": "Close custom menu",
  "phonePreviewTitle": "Menu preview",
  "deviceSelectorLabel": "Preview device",
  "undo": "Undo",
  "redo": "Redo",
  "savedStatus": "Saved",
  "unsavedStatus": "Unsaved changes",
  "phoneEmptyHint": "Tap the + button below to add a top-level menu",
  "addTopMenu": "Add top-level menu",
  "addSubMenu": "Add sub-menu",
  "topMenuLabel": "Top-level menu",
  "subMenuLabel": "Sub-menu",
  "parentContentHint": "This menu has sub-menus. Only its name can be edited; configure content on each sub-menu.",
  "cancel": "Cancel",
  "discardChanges": "Discard changes",
  "deleteConfirmation": "Deleting this menu also removes all content configured for it. Continue?",
  "deleteMenu": "Delete menu",
  "deleteSubMenu": "Delete sub-menu",
  "moveUp": "Move up",
  "moveDown": "Move down",
  "menuName": "Menu name",
  "menuNamePlaceholder": "Enter the menu name",
  "nameUnitHint": "Top-level names: up to 4 CJK chars (8 letters); sub-menu names: up to 7 CJK chars (14 letters)",
  "actionTitle": "Menu content",
  "actionUnset": "No action set",
  "actionUnsetHint": "Choose what happens when the user taps this menu",
  "unsupportedActionTemplate": "This menu was imported from WeChat with the unsupported action “{type}”. Convert it to a supported action before publishing.",
  "actionTypes": {
    "click": "Click event",
    "clickDescription": "Pushes a custom EventKey event to the configured server callback",
    "view": "Open webpage",
    "viewDescription": "Opens the specified webpage on tap",
    "miniprogram": "Open mini program",
    "miniprogramDescription": "Opens the specified mini program page on tap"
  },
  "messageLabel": "Event key",
  "messagePlaceholder": "Enter an EventKey, such as CUSTOMER_SERVICE",
  "messageHint": "WeChat sends this EventKey to the configured server callback for application handling",
  "urlLabel": "Webpage URL",
  "urlPlaceholder": "https://example.com/page",
  "appIdLabel": "Mini program AppID",
  "appIdPlaceholder": "wx1234567890abcdef",
  "pagePathLabel": "Mini program page path",
  "pagePathPlaceholder": "pages/index/index",
  "fallbackUrlLabel": "Fallback webpage",
  "fallbackUrlPlaceholder": "https://example.com/fallback",
  "fallbackUrlHint": "Older WeChat clients open this webpage when the mini program cannot be opened",
  "pickFromDeployedApps": "Select from deployed apps",
  "pickerTitle": "Select a deployed mini program app",
  "pickerDescription": "Lists this tenant's deployed applications. Choosing one fills in the AppID of its linked mini program account.",
  "pickerLoading": "Loading deployed mini program apps…",
  "pickerEmpty": "No deployed mini program apps yet.",
  "pickerLoadFailed": "Failed to load deployed mini program apps.",
  "pickerRetry": "Retry",
  "pickerNoAccount": "No mini program account linked",
  "pickerEnvironmentTemplate": "Environment: {environment}",
  "rules": "Menu rules",
  "rulesText": "At most 3 top-level menus, each expanding into up to 5 sub-menus;",
  "rulesText2": "a top-level menu with sub-menus is display-only and cannot carry an action itself.",
  "loading": "Loading menu…",
  "loadFailed": "Failed to load the custom menu.",
  "selectHint": "Select a menu on the left to edit it",
  "saveDraft": "Save draft",
  "saveAndPublish": "Save & publish",
  "publishConfirmTitle": "Publish this menu?",
  "publishConfirmDescription": "Publishing replaces the current live menu immediately. WeChat client caching may delay the update briefly. Confirm that menu names, order, and destinations are correct.",
  "publishConfirmAction": "Publish menu",
  "saved": "Draft saved.",
  "publishSuccess": "Menu published.",
  "publishUnavailable": "Menu saved as draft; publishing is coming soon.",
  "publishFailedTemplate": "Publishing failed: {message}",
  "unsavedTitle": "Unsaved changes",
  "unsavedDescription": "This menu contains unsaved changes. Closing now will discard them.",
  "validation": {
    "atLeastOneTop": "Add at least one top-level menu",
    "tooManyTop": "At most 3 top-level menus",
    "tooManySub": "At most 5 sub-menus per top-level menu",
    "nestedSubMenuNotAllowed": "Custom menus support two levels only; sub-menus cannot contain another menu level",
    "nameRequired": "Enter the menu name",
    "nameTooLongTop": "Top-level names: up to 4 CJK chars (8 letters)",
    "nameTooLongSub": "Sub-menu names: up to 7 CJK chars (14 letters)",
    "actionRequired": "Set the menu action",
    "unsupportedAction": "Convert this unsupported WeChat action before publishing",
    "messageRequired": "Enter the event key",
    "messageTooLong": "The event key cannot exceed 128 bytes",
    "urlRequired": "Enter the webpage URL",
    "urlInvalid": "Enter a valid URL starting with http:// or https://",
    "urlTooLong": "The webpage URL cannot exceed 1024 bytes",
    "appIdRequired": "Enter the mini program AppID",
    "pagePathRequired": "Enter the mini program page path"

  },
  "refresh": "Refresh",
  "refreshing": "Refreshing…",
  "refreshed": "The latest menu was synced from the official account.",
  "version": "Version {version}",
  "rollback": "Roll back",
  "rollbackTitle": "Roll back menu",
  "rollbackDescription": "Choose a revision to restore; it is published to the official account immediately.",
  "rollbackAction": "Roll back to version {version}",
  "rollingBack": "Rolling back…",
  "historyEmpty": "No previous revisions.",
  "conflict": "The menu was updated elsewhere (current version {version}). Refresh before saving."
};
