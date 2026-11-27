/**
 * Runtime bundle entry for the SDKWork IAM mini program.
 *
 * `scripts/build-runtime.mjs` compiles this module (and everything it imports)
 * into `src/runtime/iam-app.js`, a self-contained CommonJS bundle. The WeChat
 * runtime loads that bundle directly; pages never `require` a workspace package.
 *
 * Why a bundle instead of requiring TypeScript packages:
 *
 * - the platform loads plain CommonJS, while the capability packages are
 *   TypeScript with workspace imports;
 * - the app.json page manifest is derived from the **bundle**, so the manifest and
 *   the shipped code cannot disagree about which routes exist.
 */

import {
  buildOrganizationLoginContextSelectionBody,
  buildPersonalLoginContextSelectionBody,
  normalizeIamLoginContextSelectionChallenge,
  type IamAppContext,
  type IamLoginContextSelectionChallenge,
} from "@sdkwork/iam-contracts";
import {
  createIamMpPersistentSessionStore,
  type IamMpPersistentSession,
  type IamMpPersistentSessionStore,
} from "@sdkwork/iam-mp-core/session-persistent";
import { createIamMpWechatHost } from "@sdkwork/iam-mp-host/wechat";
import {
  IAMMP_ROUTE_CONTRIBUTIONS,
  createIamMpRuntimeService,
  type IamMpRuntimeEnv,
  type IamMpRuntimeService,
} from "@sdkwork/iam-mp-core";
import { IAMMPCONSOLE_ROUTE_CONTRIBUTIONS } from "@sdkwork/iam-mp-console-core";

/** Route registry, re-exported so the build-contract test can assert against the
 * same ids the manifest projection uses. */
export { IAMMP_ROUTE_CONTRIBUTIONS, IAMMPCONSOLE_ROUTE_CONTRIBUTIONS };

/**
 * Every route contribution the manifest may project: app tier first, then console.
 *
 * The console tier is registered in its own tier registry; without folding it in here a
 * console page could never be shipped however complete it was, because `app.json` is
 * projected from this list.
 */
const ALL_ROUTE_CONTRIBUTIONS = [
  ...IAMMP_ROUTE_CONTRIBUTIONS,
  ...IAMMPCONSOLE_ROUTE_CONTRIBUTIONS,
];

/** Physical page paths this build ships. */
export const IAM_MP_PAGE_PATHS = {
  consoleAccountBinding: "console-account-binding/pages/list/index",
  consoleOrganizationDirectory: "console-organization/pages/directory/index",
  consoleUserCenter: "console-user-center/pages/profile/index",
  consoleTenant: "console-tenant/pages/overview/index",
  contextSelection: "pages/context-selection/index",
  forgotPassword: "pages/forgot-password/index",
  login: "pages/login/index",
  oauthCallback: "pages/oauth-callback/index",
  organizationDirectory: "app-organization/pages/directory/index",
  accountBinding: "app-account-binding/pages/list/index",
  password: "app-user-center/pages/password/index",
  profile: "app-user-center/pages/profile/index",
  register: "pages/register/index",
  tenantOverview: "app-tenant/pages/overview/index",
} as const;

/**
 * Route ids this build actually ships a page for.
 *
 * `app.json` is projected from the route contributions **intersected with this
 * set**, so the manifest can never name a page the package does not contain — the
 * defect that made the previous `app.json` unloadable in DevTools. Route ids are
 * the key rather than physical paths because a subpackage page and a main-package
 * page can share the same `pages/...` suffix; the id is unique by construction.
 * Growing this list is how a screen becomes reachable.
 */
export const IAM_MP_IMPLEMENTED_ROUTE_IDS: readonly string[] = [
  "app.iam.auth.login",
  "app.iam.auth.register",
  "app.iam.auth.forgot-password",
  "app.iam.auth.context-selection",
  "app.iam.tenant.overview",
  "app.iam.organization.directory",
  "app.iam.user-center.profile",
  "app.iam.user-center.password",
  "app.iam.account-binding.list",
  "console.iam.organization.directory",
  "console.iam.account-binding.list",
  "console.iam.user-center.profile",
  "console.iam.tenant.overview",
];

/** Message dictionary, kept intentionally small: only shipped pages read it. */
const MESSAGES: Record<string, { "en-US": string; "zh-CN": string }> = {
  "common.loading": { "en-US": "Loading", "zh-CN": "加载中" },
  "common.runtimeUnavailable": {
    "en-US": "The app could not start. Please reopen it.",
    "zh-CN": "应用启动失败，请重新打开。",
  },
  "common.back": { "en-US": "Back", "zh-CN": "返回" },
  "login.title": { "en-US": "Sign in", "zh-CN": "登录" },
  "login.account": { "en-US": "Phone or email", "zh-CN": "手机号或邮箱" },
  "login.password": { "en-US": "Password", "zh-CN": "密码" },
  "login.action": { "en-US": "Sign in", "zh-CN": "登录" },
  "login.pending": { "en-US": "Signing in…", "zh-CN": "登录中…" },
  "login.toRegister": { "en-US": "Create an account", "zh-CN": "注册账号" },
  "login.toForgot": { "en-US": "Forgot password", "zh-CN": "找回密码" },
  "login.wechat": { "en-US": "Continue with WeChat", "zh-CN": "微信一键登录" },
  "login.or": { "en-US": "or sign in with password", "zh-CN": "或使用账号密码登录" },
  "login.passwordVisible": { "en-US": "Show password", "zh-CN": "显示密码" },
  "login.passwordHidden": { "en-US": "Hide password", "zh-CN": "隐藏密码" },
  "context.title": { "en-US": "Choose a workspace", "zh-CN": "选择工作空间" },
  "context.subtitle": {
    "en-US": "Choose how you want to continue. Your account may belong to several organizations.",
    "zh-CN": "请选择本次登录的工作空间，你的账号可能属于多个组织。",
  },
  "context.personal": { "en-US": "Personal workspace", "zh-CN": "个人空间" },
  "context.organizations": { "en-US": "Organizations", "zh-CN": "组织" },
  "context.retry": { "en-US": "Sign in again", "zh-CN": "重新登录" },
  "context.unavailable": { "en-US": "This sign-in request is no longer available. Please sign in again.", "zh-CN": "登录请求已失效，请重新登录。" },
  "context.failed": { "en-US": "Could not complete sign-in.", "zh-CN": "登录失败，请重试。" },
  "register.title": { "en-US": "Create account", "zh-CN": "注册账号" },
  "register.account": { "en-US": "Phone or email", "zh-CN": "手机号或邮箱" },
  "register.accountPlaceholder": { "en-US": "Enter phone or email", "zh-CN": "请输入手机号或邮箱" },
  "register.code": { "en-US": "Verification code", "zh-CN": "验证码" },
  "register.codePlaceholder": { "en-US": "Enter verification code", "zh-CN": "请输入验证码" },
  "register.password": { "en-US": "Password", "zh-CN": "密码" },
  "register.passwordPlaceholder": { "en-US": "At least 8 characters", "zh-CN": "至少 8 位" },
  "register.confirm": { "en-US": "Confirm password", "zh-CN": "确认密码" },
  "register.confirmPlaceholder": { "en-US": "Enter password again", "zh-CN": "再次输入密码" },
  "register.sendCode": { "en-US": "Send code", "zh-CN": "获取验证码" },
  "register.action": { "en-US": "Register", "zh-CN": "注册" },
  "register.pending": { "en-US": "Registering…", "zh-CN": "注册中…" },
  "register.registerAgain": { "en-US": "Register again", "zh-CN": "再次注册" },
  "register.done": { "en-US": "Account created. You can sign in now.", "zh-CN": "账号已创建，请登录。" },
  "register.toLogin": { "en-US": "Back to sign in", "zh-CN": "返回登录" },
  "forgot.title": { "en-US": "Reset password", "zh-CN": "找回密码" },
  "forgot.account": { "en-US": "Phone or email", "zh-CN": "手机号或邮箱" },
  "forgot.accountPlaceholder": { "en-US": "Enter phone or email", "zh-CN": "请输入手机号或邮箱" },
  "forgot.code": { "en-US": "Verification code", "zh-CN": "验证码" },
  "forgot.codePlaceholder": { "en-US": "Enter verification code", "zh-CN": "请输入验证码" },
  "forgot.newPassword": { "en-US": "New password", "zh-CN": "新密码" },
  "forgot.newPasswordPlaceholder": { "en-US": "At least 8 characters", "zh-CN": "至少 8 位" },
  "forgot.confirmPassword": { "en-US": "Confirm new password", "zh-CN": "确认新密码" },
  "forgot.confirmPasswordPlaceholder": { "en-US": "Enter new password again", "zh-CN": "再次输入新密码" },
  "forgot.sendCode": { "en-US": "Send code", "zh-CN": "获取验证码" },
  "forgot.action": { "en-US": "Update password", "zh-CN": "更新密码" },
  "forgot.pending": { "en-US": "Updating…", "zh-CN": "更新中…" },
  "forgot.done": { "en-US": "Password updated. Please sign in.", "zh-CN": "密码已更新，请登录。" },
  "forgot.toLogin": { "en-US": "Back to sign in", "zh-CN": "返回登录" },
  "error.passwordMismatch": { "en-US": "The two passwords do not match.", "zh-CN": "两次输入的密码不一致。" },
  "error.passwordTooShort": { "en-US": "Use at least 8 characters.", "zh-CN": "密码至少 8 位。" },
  "error.accountRequired": { "en-US": "Enter your account.", "zh-CN": "请输入账号。" },
  "error.codeRequired": { "en-US": "Enter the verification code.", "zh-CN": "请输入验证码。" },
  "error.signInFailed": { "en-US": "Sign-in failed.", "zh-CN": "登录失败。" },
  "error.passwordRequired": { "en-US": "Enter your password.", "zh-CN": "请输入密码。" },
  "error.registerFailed": { "en-US": "Registration failed.", "zh-CN": "注册失败。" },
  "error.resetFailed": { "en-US": "Password reset failed.", "zh-CN": "找回密码失败。" },
  "error.sendCodeFailed": { "en-US": "Could not send the code.", "zh-CN": "验证码发送失败。" },
  "tenant.title": { "en-US": "Tenant", "zh-CN": "租户" },
  "tenant.session": { "en-US": "Session", "zh-CN": "当前会话" },
  "tenant.tenant": { "en-US": "Tenant", "zh-CN": "租户" },
  "tenant.user": { "en-US": "User", "zh-CN": "用户" },
  "tenant.environment": { "en-US": "Environment", "zh-CN": "环境" },
  "tenant.organizations": { "en-US": "Organizations", "zh-CN": "组织" },
  "tenant.memberships": { "en-US": "My memberships", "zh-CN": "我的成员关系" },
  "tenant.empty": { "en-US": "Nothing to show", "zh-CN": "暂无数据" },
  "tenant.notReported": { "en-US": "Not reported", "zh-CN": "未提供" },
  "tenant.loadFailed": { "en-US": "Could not load the tenant overview.", "zh-CN": "租户概览加载失败。" },
  "tenant.signOut": { "en-US": "Sign out", "zh-CN": "退出登录" },
  "organization.title": { "en-US": "Organizations", "zh-CN": "组织" },
  "organization.searchPlaceholder": { "en-US": "Search organizations", "zh-CN": "搜索组织" },
  "organization.empty": { "en-US": "No organizations", "zh-CN": "暂无组织" },
  "organization.loadMore": { "en-US": "Load more", "zh-CN": "加载更多" },
  "organization.loadFailed": { "en-US": "Could not load organizations.", "zh-CN": "组织加载失败。" },
  "organization.search": { "en-US": "Search", "zh-CN": "搜索" },
  "organization.loading": { "en-US": "Loading…", "zh-CN": "加载中…" },
  "organization.failed": { "en-US": "Could not load organizations.", "zh-CN": "组织加载失败。" },
  "consoleOrganization.title": { "en-US": "Organization management", "zh-CN": "组织管理" },
  "consoleOrganization.subtitle": {
    "en-US": "Every organization of the tenant you are acting in.",
    "zh-CN": "当前操作的租户下的全部组织。",
  },
  "consoleOrganization.searchPlaceholder": { "en-US": "Search organizations", "zh-CN": "搜索组织" },
  "consoleOrganization.search": { "en-US": "Search", "zh-CN": "搜索" },
  "consoleOrganization.empty": { "en-US": "This tenant has no organizations yet.", "zh-CN": "该租户还没有组织。" },
  "consoleOrganization.emptySearch": { "en-US": "Nothing matched that search.", "zh-CN": "没有匹配的结果。" },
  "consoleOrganization.loadMore": { "en-US": "Load more", "zh-CN": "加载更多" },
  "consoleOrganization.loading": { "en-US": "Loading…", "zh-CN": "加载中…" },
  "consoleOrganization.loadFailed": { "en-US": "Could not load organizations.", "zh-CN": "组织加载失败。" },
  "consoleOrganization.toApp": { "en-US": "Back to my workspace", "zh-CN": "返回我的工作台" },
  "consoleAccountBinding.title": { "en-US": "Account binding management", "zh-CN": "账号绑定管理" },
  "consoleAccountBinding.subtitle": {
    "en-US": "Linked identities and the tenant policy that gates removal.",
    "zh-CN": "已绑定身份，以及决定能否解除的租户策略。",
  },
  "consoleAccountBinding.policySection": { "en-US": "Self-service policy", "zh-CN": "自助服务策略" },
  "consoleAccountBinding.linksSection": { "en-US": "Linked identities", "zh-CN": "已绑定身份" },
  "consoleAccountBinding.policyContact": { "en-US": "Contact binding", "zh-CN": "联系方式绑定" },
  "consoleAccountBinding.policyEmail": { "en-US": "Email binding", "zh-CN": "邮箱绑定" },
  "consoleAccountBinding.policyOauth": { "en-US": "Third-party sign-in", "zh-CN": "第三方登录" },
  "consoleAccountBinding.policyUnlink": { "en-US": "Self-service unlink", "zh-CN": "自助解除绑定" },
  "consoleAccountBinding.allowed": { "en-US": "Allowed", "zh-CN": "允许" },
  "consoleAccountBinding.denied": { "en-US": "Not allowed", "zh-CN": "不允许" },
  "consoleAccountBinding.unlink": { "en-US": "Remove", "zh-CN": "解除" },
  "consoleAccountBinding.unlinkConfirm": {
    "en-US": "Remove this sign-in method for the user?",
    "zh-CN": "确定为该用户解除此登录方式？",
  },
  "consoleAccountBinding.unlinkError": {
    "en-US": "Could not remove this sign-in method.",
    "zh-CN": "解除该登录方式失败。",
  },
  "consoleAccountBinding.cancel": { "en-US": "Cancel", "zh-CN": "取消" },
  "consoleAccountBinding.emptyLinks": {
    "en-US": "No identity is linked yet.",
    "zh-CN": "还没有绑定任何身份。",
  },
  "consoleAccountBinding.loading": { "en-US": "Loading…", "zh-CN": "加载中…" },
  "consoleAccountBinding.loadFailed": {
    "en-US": "Could not load this workspace.",
    "zh-CN": "工作台加载失败。",
  },
  "consoleAccountBinding.toApp": { "en-US": "Back to my workspace", "zh-CN": "返回我的工作台" },
  "consoleUserCenter.title": { "en-US": "User center", "zh-CN": "用户中心" },
  "consoleUserCenter.subtitle": {
    "en-US": "The signed-in user's own record, as the console sees it.",
    "zh-CN": "当前登录用户自身的账号信息（控制台视角）。",
  },
  "consoleUserCenter.userId": { "en-US": "User", "zh-CN": "用户" },
  "consoleUserCenter.displayName": { "en-US": "Display name", "zh-CN": "显示名称" },
  "consoleUserCenter.email": { "en-US": "Email", "zh-CN": "邮箱" },
  "consoleUserCenter.phone": { "en-US": "Phone", "zh-CN": "手机号" },
  "consoleUserCenter.notReported": { "en-US": "Not reported", "zh-CN": "未提供" },
  "consoleUserCenter.loading": { "en-US": "Loading…", "zh-CN": "加载中…" },
  "consoleUserCenter.loadFailed": { "en-US": "Could not load this view.", "zh-CN": "视图加载失败。" },
  "consoleUserCenter.toApp": { "en-US": "Back to my workspace", "zh-CN": "返回我的工作台" },
  "consoleTenant.title": { "en-US": "Tenant management", "zh-CN": "租户管理" },
  "consoleTenant.subtitle": {
    "en-US": "The tenant you are acting in, its policy and its organizations.",
    "zh-CN": "当前操作的租户、其策略与组织。",
  },
  "consoleTenant.sessionSection": { "en-US": "Session", "zh-CN": "当前会话" },
  "consoleTenant.environment": { "en-US": "Environment", "zh-CN": "环境" },
  "consoleTenant.tenant": { "en-US": "Tenant", "zh-CN": "租户" },
  "consoleTenant.user": { "en-US": "Operator", "zh-CN": "操作人" },
  "consoleTenant.policySection": { "en-US": "Self-service policy", "zh-CN": "自助服务策略" },
  "consoleTenant.policyContact": { "en-US": "Contact binding", "zh-CN": "联系方式绑定" },
  "consoleTenant.policyEmail": { "en-US": "Email binding", "zh-CN": "邮箱绑定" },
  "consoleTenant.policyOauth": { "en-US": "Third-party sign-in", "zh-CN": "第三方登录" },
  "consoleTenant.policyUnlink": { "en-US": "Self-service unlink", "zh-CN": "自助解除绑定" },
  "consoleTenant.allowed": { "en-US": "Allowed", "zh-CN": "允许" },
  "consoleTenant.denied": { "en-US": "Not allowed", "zh-CN": "不允许" },
  "consoleTenant.organizationsSection": { "en-US": "Organizations", "zh-CN": "组织" },
  "consoleTenant.emptyOrganizations": {
    "en-US": "This tenant has no organizations yet.",
    "zh-CN": "该租户还没有组织。",
  },
  "consoleTenant.loading": { "en-US": "Loading…", "zh-CN": "加载中…" },
  "consoleTenant.loadFailed": { "en-US": "Could not load this workspace.", "zh-CN": "工作台加载失败。" },
  "consoleTenant.toApp": { "en-US": "Back to my workspace", "zh-CN": "返回我的工作台" },
  "binding.cancel": { "en-US": "Cancel", "zh-CN": "取消" },
  "profile.title": { "en-US": "My profile", "zh-CN": "我的资料" },
  "profile.displayName": { "en-US": "Display name", "zh-CN": "显示名称" },
  "profile.email": { "en-US": "Email", "zh-CN": "邮箱" },
  "profile.phone": { "en-US": "Phone", "zh-CN": "手机号" },
  "profile.save": { "en-US": "Save", "zh-CN": "保存" },
  "profile.saved": { "en-US": "Profile saved.", "zh-CN": "资料已保存。" },
  "profile.empty": { "en-US": "Nothing to save yet.", "zh-CN": "还没有可保存的内容。" },
  "profile.loadError": { "en-US": "Could not load your profile.", "zh-CN": "资料加载失败。" },
  "profile.saveError": { "en-US": "Could not save your profile.", "zh-CN": "资料保存失败。" },
  "password.title": { "en-US": "Change password", "zh-CN": "修改密码" },
  "password.old": { "en-US": "Current password", "zh-CN": "当前密码" },
  "password.new": { "en-US": "New password", "zh-CN": "新密码" },
  "password.confirm": { "en-US": "Repeat new password", "zh-CN": "再次输入新密码" },
  "password.action": { "en-US": "Update password", "zh-CN": "更新密码" },
  "password.done": { "en-US": "Password updated.", "zh-CN": "密码已更新。" },
  "password.oldRequired": { "en-US": "Enter your current password.", "zh-CN": "请输入当前密码。" },
  "password.tooShort": { "en-US": "Use at least 8 characters.", "zh-CN": "至少 8 个字符。" },
  "password.mismatch": { "en-US": "The two passwords do not match.", "zh-CN": "两次输入的密码不一致。" },
  "password.failed": { "en-US": "Could not change the password.", "zh-CN": "修改密码失败。" },
  "binding.title": { "en-US": "Account binding", "zh-CN": "账号绑定" },
  "binding.policy": { "en-US": "What you can manage", "zh-CN": "可管理的项" },
  "binding.links": { "en-US": "Linked identities", "zh-CN": "已绑定身份" },
  "binding.empty": { "en-US": "No linked identities.", "zh-CN": "暂无已绑定身份。" },
  "binding.unlink": { "en-US": "Remove", "zh-CN": "解除" },
  "binding.unlinkConfirm": { "en-US": "Remove this sign-in method?", "zh-CN": "确定解除该登录方式？" },
  "binding.allowed": { "en-US": "Allowed", "zh-CN": "允许" },
  "binding.denied": { "en-US": "Not allowed", "zh-CN": "不允许" },
  "binding.contact": { "en-US": "Contact binding", "zh-CN": "联系方式绑定" },
  "binding.email": { "en-US": "Email binding", "zh-CN": "邮箱绑定" },
  "binding.oauth": { "en-US": "Third-party sign-in", "zh-CN": "第三方登录" },
  "binding.selfService": { "en-US": "Remove a binding yourself", "zh-CN": "自行解除绑定" },
  "binding.loadError": { "en-US": "Could not load your bindings.", "zh-CN": "绑定信息加载失败。" },
  "binding.unlinkError": { "en-US": "Could not remove that binding.", "zh-CN": "解除绑定失败。" },
};

/**
 * Resolve one message.
 * @param locale - active locale tag.
 * @param key - message key.
 * @returns the localized string, or the key itself when it is unknown.
 */
export function resolveIamMpMessage(locale: string | null | undefined, key: string): string {
  const entry = MESSAGES[key];
  if (!entry) return key;
  return /^zh/iu.test(locale ?? "") ? entry["zh-CN"] : entry["en-US"];
}

/** Auth operations the pages may call. */
export type IamMpLoginResult =
  | { kind: "session" }
  | { challenge: IamLoginContextSelectionChallenge; kind: "loginContextSelectionRequired" };

export interface IamMpAuthPort {
  getLoginChallenge(): IamLoginContextSelectionChallenge | undefined;
  isAuthenticated(): boolean;
  loginCode(input: { code: string; phone: string }): Promise<IamMpLoginResult>;
  loginPassword(input: { password: string; username: string }): Promise<IamMpLoginResult>;
  loginWechat(): Promise<IamMpLoginResult>;
  register(input: { password: string; username: string; verificationCode: string }): Promise<IamMpLoginResult>;
  requestVerificationCode(input: { account: string; scene: string }): Promise<void>;
  resetPassword(input: {
    account: string;
    code: string;
    confirmPassword: string;
    newPassword: string;
  }): Promise<void>;
  selectOrganization(organizationId: string): Promise<void>;
  selectPersonalLogin(): Promise<void>;
  signOut(): Promise<void>;
}

/** Navigation port, so pages never call `wx.*` directly. */
export interface IamMpNavigationPort {
  back(): void;
  navigateTo(path: string): void;
  reLaunch(path: string): void;
}

/** One tenant overview projection, already flattened for the page's `data`. */
export interface IamMpTenantOverview {
  memberships: { detail: string; id: string; title: string }[];
  organizations: { detail: string; id: string; title: string }[];
  runtime: { environment: string; tenantId: string; userId: string };
}

/** Tenant overview port. */
export interface IamMpTenantPort {
  loadOverview(): Promise<IamMpTenantOverview>;
}

/** One organization row, flattened for the page. */
export interface IamMpOrganizationRow {
  detail: string;
  id: string;
  title: string;
}

/** One page of organizations. */
export interface IamMpOrganizationPage {
  /** Whether the server reported another page. */
  hasMore: boolean;
  items: IamMpOrganizationRow[];
}

/** Organization directory port. */
export interface IamMpOrganizationPort {
  fetchPage(input: { page: number; pageSize: number; q?: string }): Promise<IamMpOrganizationPage>;
}

/** The signed-in user's own record, flattened for the page. */
export interface IamMpProfile {
  displayName: string;
  email: string;
  phone: string;
  userId: string;
}

/** What the profile page may change. */
export interface IamMpProfileDraft {
  displayName?: string;
  email?: string;
  phone?: string;
}

/** Profile port. */
export interface IamMpProfilePort {
  changePassword(draft: IamMpPasswordDraft): Promise<void>;
  loadProfile(): Promise<IamMpProfile>;
  saveProfile(draft: IamMpProfileDraft): Promise<IamMpProfile>;
}

/** The three fields of a password change. */
export interface IamMpPasswordDraft {
  confirmPassword: string;
  newPassword: string;
  oldPassword: string;
}

/** Tenant policy that decides what a user may change about their own bindings. */
export interface IamMpAccountBindingPolicy {
  contactEnabled: boolean;
  emailEnabled: boolean;
  oauthEnabled: boolean;
  selfServiceUnlinkEnabled: boolean;
}

/** One linked third-party identity. */
export interface IamMpAccountLink {
  accountLinkId: string;
  provider: string;
  providerUserId: string;
}

/** Account binding port. */
export interface IamMpAccountBindingPort {
  fetchLinks(): Promise<IamMpAccountLink[]>;
  loadPolicy(): Promise<IamMpAccountBindingPolicy>;
  unlink(accountLinkId: string): Promise<void>;
}

/** The singleton the pages read. */
export interface IamMpRuntime {
  readonly accountBinding: IamMpAccountBindingPort;
  readonly auth: IamMpAuthPort;
  readonly environment: IamMpRuntimeEnv;
  readonly locale: string;
  readonly navigation: IamMpNavigationPort;
  readonly organization: IamMpOrganizationPort;
  readonly profile: IamMpProfilePort;
  readonly service: IamMpRuntimeService;
  readonly session: IamMpPersistentSessionStore;
  readonly tenant: IamMpTenantPort;
  message(key: string): string;
}

let runtime: IamMpRuntime | undefined;

/** Issuer of the public application access token (`APP_ACCESS_TOKEN_SPEC.md` §3). */
const PUBLIC_APPLICATION_TOKEN_ISSUER = "sdkwork-iam-public";

/** Token class of the public application access token; session credentials differ. */
const PUBLIC_APPLICATION_TOKEN_CLASS = "application";

/** Base64 alphabet, indexed to decode a JWT payload segment by hand. */
const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Decode one base64 or base64url segment of a JWT into text.
 *
 * The decoder is local because `atob` is not part of the WeChat mini program base
 * library: reading the token claims on the device must not depend on a browser
 * global, or the credential check would silently fail open there.
 * @param segment - base64url payload segment.
 * @returns the decoded text, or `undefined` when the segment is not base64 or is
 *   not valid UTF-8.
 */
function decodeBase64Url(segment: string): string | undefined {
  const normalized = segment.replace(/-/gu, "+").replace(/_/gu, "/");
  const bytes: number[] = [];
  let accumulator = 0;
  let bits = 0;
  for (const character of normalized) {
    if (character === "=") continue;
    const index = BASE64_ALPHABET.indexOf(character);
    if (index < 0) return undefined;
    accumulator = (accumulator << 6) | index;
    bits += 6;
    if (bits < 8) continue;
    bits -= 8;
    bytes.push((accumulator >> bits) & 0xff);
  }
  // Percent-encoding each byte delegates UTF-8 decoding to the engine instead of
  // carrying a second decoder here.
  let encoded = "";
  for (const byte of bytes) {
    encoded += `%${byte.toString(16).padStart(2, "0")}`;
  }
  try {
    return decodeURIComponent(encoded);
  } catch {
    return undefined;
  }
}

/**
 * Read the claims of a public application access token.
 *
 * `APP_ACCESS_TOKEN_SPEC.md` §3 defines the credential the client may hold before
 * login: a three-part JWT compact string with `token_class: application` and
 * `iss: sdkwork-iam-public`. Anything else — notably a session credential — is
 * not a bootstrap token and must not be used as one.
 * @param token - candidate token value.
 * @returns the claims when the token is a public application token, otherwise
 *   `undefined`.
 */
function readPublicApplicationTokenClaims(
  token: string,
): Record<string, unknown> | undefined {
  const segments = token.split(".");
  if (segments.length !== 3) return undefined;
  if (segments.some((segment) => segment === "")) return undefined;
  const payload = decodeBase64Url(segments[1]);
  if (!payload) return undefined;
  let claims: unknown;
  try {
    claims = JSON.parse(payload);
  } catch {
    return undefined;
  }
  if (claims === null || typeof claims !== "object" || Array.isArray(claims)) {
    return undefined;
  }
  const record = claims as Record<string, unknown>;
  if (record.token_class !== PUBLIC_APPLICATION_TOKEN_CLASS) return undefined;
  if (record.iss !== PUBLIC_APPLICATION_TOKEN_ISSUER) return undefined;
  return record;
}

/**
 * Resolve the public application access token the selected profile document
 * carries, failing closed when it is absent or is not a public application token.
 * @param runtimeEnv - the materialized runtime document.
 * @returns the validated token, ready to seed the client's token manager.
 * @throws when `SDKWORK_ACCESS_TOKEN` is missing, malformed, or a session
 *   credential. The message names the key and the selected profile document so
 *   the failure is actionable from the login screen.
 */
function requireBootstrapAccessToken(runtimeEnv: IamMpRuntimeEnv): string {
  const document = `config/mini-program/runtime-env.${runtimeEnv.SDKWORK_PROFILE_ID}.json`;
  const token = readString(runtimeEnv.SDKWORK_ACCESS_TOKEN);
  if (!token) {
    throw new Error(
      `SDKWORK_ACCESS_TOKEN is missing from the selected profile document ${document}: ` +
        "the mini program cannot call app-api without its public application access token.",
    );
  }
  if (!readPublicApplicationTokenClaims(token)) {
    throw new Error(
      `SDKWORK_ACCESS_TOKEN in the selected profile document ${document} is not a valid ` +
        `public application token: expected a three-part JWT with ` +
        `token_class=${PUBLIC_APPLICATION_TOKEN_CLASS} and iss=${PUBLIC_APPLICATION_TOKEN_ISSUER}; ` +
        "a session credential is not accepted.",
    );
  }
  return token;
}

/**
 * Pick the primary absolute origin of the profile's app-api base value.
 *
 * The canonical materializer may carry the registered API edge family as
 * `origin1;origin2;...` (`ENVIRONMENT_SPEC.md` section 5.1.0.1). A mini program
 * has no page host to match the family against, so the first (primary) member is
 * used; handing the list to the HTTP client would produce an origin no request
 * can use.
 * @param runtimeEnv - the materialized runtime document.
 * @returns one absolute origin, with any trailing slash removed.
 * @throws when the profile declares no app-api base URL.
 */
function requireAppApiBaseUrl(runtimeEnv: IamMpRuntimeEnv): string {
  const raw = readString(runtimeEnv.SDKWORK_APP_API_BASE_URL);
  const primary = raw?.split(";")[0]?.trim() ?? "";
  if (!primary) {
    throw new Error(
      `SDKWORK_APP_API_BASE_URL is missing from the selected profile document ` +
        `config/mini-program/runtime-env.${runtimeEnv.SDKWORK_PROFILE_ID}.json: ` +
        "the mini program cannot resolve the app-api origin.",
    );
  }
  return primary.replace(/\/+$/u, "");
}

/**
 * Compose the runtime for this launch.
 * @param input - the materialized runtime document.
 * @returns the bootstrapped runtime.
 */
export async function bootstrapIamMpApp(input: { runtimeEnv: IamMpRuntimeEnv }): Promise<IamMpRuntime> {
  const { runtimeEnv } = input;
  if (runtime) return runtime;

  // The credential is resolved before anything is constructed, so a missing or
  // non-public token fails here with the profile document named instead of
  // surfacing as "access-token-only request requires Access-Token" inside the
  // first credential-entry call.
  const bootstrapAccessToken = requireBootstrapAccessToken(runtimeEnv);

  const host = createIamMpWechatHost();
  const session = createIamMpPersistentSessionStore(host.storage);
  const restored = session.get();
  const service = createIamMpRuntimeService({
    baseUrl: requireAppApiBaseUrl(runtimeEnv),
    bootstrapAccessToken,
    ...(restored?.accessToken ? { accessToken: restored.accessToken } : {}),
    clearSession: () => session.clear(),
    commitSession: (next) => {
      session.set(toSnapshot(next));
    },
  });
  const applySession = (snapshot: IamMpPersistentSession | undefined) => {
    service.setAccessToken(snapshot?.accessToken);
    service.client.setAuthToken(snapshot?.authToken ?? "");
  };
  applySession(restored);
  session.subscribe(applySession);

  if (restored) {
    try {
      await service.service.auth.sessions.current.retrieve();
    } catch {
      session.clear();
    }
  }

  const locale = resolveLocale();
  runtime = {
    accountBinding: createAccountBindingPort(service),
    auth: createAuthPort(service, session, host),
    environment: runtimeEnv,
    locale,
    message: (key) => resolveIamMpMessage(locale, key),
    navigation: createNavigationPort(),
    organization: createOrganizationPort(service),
    profile: createProfilePort(service),
    service,
    session,
    tenant: createTenantPort(service),
  };
  return runtime;
}

/**
 * Read the bootstrapped runtime.
 * @returns the runtime.
 * @throws when a page is opened before bootstrap finished, which would otherwise
 *   surface as `undefined.auth` deep in a handler.
 */
export function getIamMpRuntime(): IamMpRuntime {
  if (!runtime) {
    throw new Error("IAM mini program runtime is not bootstrapped yet");
  }
  return runtime;
}

/**
 * Project `app.json#pages` and `subPackages` from the route contributions.
 * @returns the derived manifest lists, limited to pages this build ships.
 */
export function composeIamMpAppJson(): {
  pages: string[];
  subPackages: { pages: string[]; root: string }[];
} {
  const implemented = new Set(IAM_MP_IMPLEMENTED_ROUTE_IDS);
  const pages: string[] = [];
  const subPackages = new Map<string, string[]>();
  for (const route of ALL_ROUTE_CONTRIBUTIONS) {
    const placement = route.miniProgram;
    if (!placement || !implemented.has(route.id)) continue;
    if (!placement.subpackage) {
      pages.push(placement.pagePath);
      continue;
    }
    const bucket = subPackages.get(placement.subpackage) ?? [];
    bucket.push(placement.pagePath);
    subPackages.set(placement.subpackage, bucket);
  }
  return {
    pages,
    subPackages: [...subPackages.entries()].map(([root, subPages]) => ({ pages: subPages, root })),
  };
}

function createAuthPort(
  service: IamMpRuntimeService,
  session: IamMpPersistentSessionStore,
  host: ReturnType<typeof createIamMpWechatHost>,
): IamMpAuthPort {
  let challenge: IamLoginContextSelectionChallenge | undefined;
  const resolveLoginResult = (response: unknown): IamMpLoginResult => {
    const normalized = normalizeIamLoginContextSelectionChallenge(response);
    if (normalized) {
      challenge = normalized;
      return { challenge: normalized, kind: "loginContextSelectionRequired" };
    }
    challenge = undefined;
    return { kind: "session" };
  };

  return {
    getLoginChallenge: () => challenge,
    isAuthenticated: () => session.get() !== undefined,
    async loginCode(input) {
      return resolveLoginResult(await service.service.auth.sessions.create({
        code: input.code.trim(),
        grantType: "phone_code",
        phone: input.phone.trim(),
      }));
    },
    async loginPassword(input) {
      return resolveLoginResult(await service.service.auth.sessions.create({
        grantType: "password",
        password: input.password,
        username: input.username.trim(),
      }));
    },
    async loginWechat() {
      const login = await host.login();
      if (!login.ok) {
        throw new Error(login.error.message);
      }
      return resolveLoginResult(await service.service.oauth.miniProgramSessions.create({
        jsCode: login.value,
        providerCode: "wechat_mini_program",
      }));
    },
    async register(input) {
      return resolveLoginResult(await service.service.auth.registrations.create({
        password: input.password,
        username: input.username.trim(),
        verificationCode: input.verificationCode.trim(),
      }));
    },
    async requestVerificationCode(input) {
      await service.service.auth.verificationCodeRequests.create({
        account: input.account.trim(),
        scene: input.scene,
      });
    },
    async resetPassword(input) {
      await service.service.auth.passwordResets.create({
        account: input.account.trim(),
        code: input.code.trim(),
        confirmPassword: input.confirmPassword,
        newPassword: input.newPassword,
      });
    },
    async selectOrganization(organizationId) {
      if (!challenge) {
        throw new Error("Login context selection is not pending");
      }
      await service.service.auth.sessions.loginContextSelection.create(
        buildOrganizationLoginContextSelectionBody(challenge.continuationToken, organizationId),
      );
      challenge = undefined;
    },
    async selectPersonalLogin() {
      if (!challenge) {
        throw new Error("Login context selection is not pending");
      }
      await service.service.auth.sessions.loginContextSelection.create(
        buildPersonalLoginContextSelectionBody(challenge.continuationToken),
      );
      challenge = undefined;
    },
    async signOut() {
      try {
        await service.service.auth.sessions.current.delete();
      } finally {
        challenge = undefined;
        session.clear();
      }
    },
  };
}

function createTenantPort(service: IamMpRuntimeService): IamMpTenantPort {
  return {
    async loadOverview(): Promise<IamMpTenantOverview> {
      // Three concurrent reads: the session context and the two paged lists the
      // overview shows. A page renders all three together, so a partial answer is
      // not useful and the first failure rejects the whole load.
      const [runtime, organizations, memberships] = await Promise.all([
        service.service.system.iam.runtime.retrieve(),
        service.service.iam.organizations.list({ page: 0, page_size: 20 }),
        service.service.iam.organizationMemberships.list({ page: 0, page_size: 20 }),
      ]);
      const runtimeRecord = toRecord(runtime);
      return {
        memberships: listItems(memberships).flatMap((item) => {
          const record = toRecord(item);
          const userId = readString(record.userId) ?? readString(record.user_id) ?? readString(record.id);
          if (!userId) return [];
          const display = readString(record.displayName) ?? readString(record.name) ?? userId;
          const organizationId = readString(record.organizationId) ?? readString(record.organization_id);
          return [
            {
              detail: [organizationId, userId].filter(Boolean).join(" · "),
              id: readString(record.id) ?? userId,
              title: display,
            },
          ];
        }),
        organizations: listItems(organizations).flatMap((item) => {
          const record = toRecord(item);
          const organizationId =
            readString(record.organizationId) ?? readString(record.organization_id) ?? readString(record.id);
          if (!organizationId) return [];
          return [
            {
              detail: organizationId,
              id: readString(record.id) ?? organizationId,
              title: readString(record.name) ?? organizationId,
            },
          ];
        }),
        runtime: {
          environment: readString(runtimeRecord.environment) ?? "",
          tenantId: readString(runtimeRecord.tenantId) ?? readString(runtimeRecord.tenant_id) ?? "",
          userId: readString(runtimeRecord.userId) ?? readString(runtimeRecord.user_id) ?? "",
        },
      };
    },
  };
}

function createOrganizationPort(service: IamMpRuntimeService): IamMpOrganizationPort {
  return {
    async fetchPage(input): Promise<IamMpOrganizationPage> {
      const q = input.q?.trim();
      const answer = toRecord(
        await service.service.iam.organizations.list({
          page: input.page,
          page_size: input.pageSize,
          ...(q ? { q } : {}),
        }),
      );
      const pageInfo = toRecord(answer.pageInfo);
      const items = listItems(answer).flatMap((item) => {
        const record = toRecord(item);
        const organizationId =
          readString(record.organizationId) ?? readString(record.organization_id) ?? readString(record.id);
        if (!organizationId) return [];
        const parentId = readString(record.parentId) ?? readString(record.parent_id);
        return [
          {
            detail: parentId ? `${organizationId} · ${parentId}` : organizationId,
            id: readString(record.id) ?? organizationId,
            title: readString(record.name) ?? organizationId,
          },
        ];
      });
      return { hasMore: pageInfo.hasMore === true, items };
    },
  };
}

function createProfilePort(service: IamMpRuntimeService): IamMpProfilePort {
  const current = service.service.iam.users.current;
  return {
    async changePassword(draft: IamMpPasswordDraft): Promise<void> {
      await current.password.update({
        confirmPassword: draft.confirmPassword,
        newPassword: draft.newPassword,
        oldPassword: draft.oldPassword,
      });
    },
    async loadProfile(): Promise<IamMpProfile> {
      return toProfile(await current.retrieve());
    },
    async saveProfile(draft: IamMpProfileDraft): Promise<IamMpProfile> {
      // Only the fields the page actually changed travel: an unnecessary empty
      // field would clear a value the backend already holds.
      const body: Record<string, unknown> = {};
      if (draft.displayName !== undefined) body.displayName = draft.displayName;
      if (draft.email !== undefined) body.email = draft.email;
      if (draft.phone !== undefined) body.phone = draft.phone;
      return toProfile(await current.update(body));
    },
  };
}

/** Flatten one user record into the page's shape. */
function toProfile(value: unknown): IamMpProfile {
  const record = toRecord(value);
  const item = toRecord(record.item);
  const source = Object.keys(item).length > 0 ? item : record;
  return {
    displayName: readString(source.displayName) ?? readString(source.display_name) ?? "",
    email: readString(source.email) ?? "",
    phone: readString(source.phone) ?? "",
    userId: readString(source.userId) ?? readString(source.user_id) ?? readString(source.id) ?? "",
  };
}

function createAccountBindingPort(service: IamMpRuntimeService): IamMpAccountBindingPort {
  return {
    async fetchLinks(): Promise<IamMpAccountLink[]> {
      const answer = await service.service.oauth.accountLinks.list({ page: 0, page_size: 50 });
      return listItems(answer).flatMap((item) => {
        const record = toRecord(item);
        const accountLinkId =
          readString(record.accountLinkId) ?? readString(record.account_link_id) ?? readString(record.id);
        if (!accountLinkId) return [];
        return [
          {
            accountLinkId,
            provider: readString(record.provider) ?? readString(record.providerKey) ?? accountLinkId,
            providerUserId:
              readString(record.providerUserId) ?? readString(record.provider_user_id) ?? "",
          },
        ];
      });
    },
    async loadPolicy(): Promise<IamMpAccountBindingPolicy> {
      const record = toRecord(await service.service.system.iam.accountBindingPolicy.retrieve());
      const contact = toRecord(record.contactBinding);
      const oauth = toRecord(record.oauthBinding);
      return {
        contactEnabled: contact.enabled === true,
        emailEnabled: contact.emailEnabled === true,
        oauthEnabled: oauth.enabled === true,
        // Absent means "not granted": a policy that forgot the flag must not be read
        // as permission to remove a sign-in method.
        selfServiceUnlinkEnabled:
          oauth.selfServiceLinkEnabled === true || oauth.selfServiceUnlinkEnabled === true,
      };
    },
    async unlink(accountLinkId: string): Promise<void> {
      await service.service.oauth.accountLinks.delete(accountLinkId);
    },
  };
}

function createNavigationPort(): IamMpNavigationPort {
  return {
    back() {
      wx.navigateBack({ delta: 1 });
    },
    navigateTo(path) {
      wx.navigateTo({ url: `/${path}` });
    },
    reLaunch(path) {
      wx.reLaunch({ url: `/${path}` });
    },
  };
}

function resolveLocale(): string {
  try {
    const info = wx.getAppBaseInfo?.() ?? wx.getSystemInfoSync();
    const language = (info as { language?: string }).language;
    return /^zh/iu.test(language ?? "") ? "zh-CN" : "en-US";
  } catch {
    return "en-US";
  }
}

/** Read the `items` array out of a page envelope, or an empty list. */
function listItems(value: unknown): readonly unknown[] {
  const record = toRecord(value);
  return Array.isArray(record.items) ? record.items : [];
}

function toRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function toSnapshot(session: {
  accessToken: string;
  authToken: string;
  context?: IamAppContext;
  expiresAt?: number | string;
  refreshToken?: string;
  sessionId?: string;
  user?: { id?: string };
}): IamMpPersistentSession {
  return {
    accessToken: session.accessToken,
    authToken: session.authToken,
    ...(session.context ? { context: session.context } : {}),
    ...(session.expiresAt !== undefined ? { expiresAt: session.expiresAt } : {}),
    ...(session.refreshToken ? { refreshToken: session.refreshToken } : {}),
    ...(session.sessionId ? { sessionId: session.sessionId } : {}),
  };
}

/** WeChat globals the runtime touches; declared here to keep pages free of `any`. */
declare const wx: {
  getAppBaseInfo?: () => { language?: string };
  getSystemInfoSync: () => { language?: string };
  getStorageSync: (key: string) => unknown;
  login: (options: { timeout: number }) => Promise<{ code?: string }>;
  navigateBack: (options: { delta: number }) => void;
  navigateTo: (options: { url: string }) => void;
  reLaunch: (options: { url: string }) => void;
  removeStorageSync: (key: string) => void;
  setNavigationBarTitle: (options: { title: string }) => void;
  setStorageSync: (key: string, value: string) => void;
};
