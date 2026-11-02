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
  IAMMP_ROUTE_CONTRIBUTIONS,
  createIamMpRuntimeService,
  createIamMpSessionStore,
  type IamMpRuntimeEnv,
  type IamMpRuntimeService,
  type IamMpSessionSnapshot,
  type IamMpSessionStore,
} from "@sdkwork/iam-mp-core";

/** Route registry, re-exported so the build-contract test can assert against the
 * same ids the manifest projection uses. */
export { IAMMP_ROUTE_CONTRIBUTIONS };

/** Physical page paths this build ships. */
export const IAM_MP_PAGE_PATHS = {
  contextSelection: "pages/context-selection/index",
  forgotPassword: "pages/forgot-password/index",
  login: "pages/login/index",
  oauthCallback: "pages/oauth-callback/index",
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
  "app.iam.tenant.overview",
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
  "register.title": { "en-US": "Create account", "zh-CN": "注册账号" },
  "register.account": { "en-US": "Phone or email", "zh-CN": "手机号或邮箱" },
  "register.code": { "en-US": "Verification code", "zh-CN": "验证码" },
  "register.password": { "en-US": "Password", "zh-CN": "密码" },
  "register.confirm": { "en-US": "Confirm password", "zh-CN": "确认密码" },
  "register.sendCode": { "en-US": "Send code", "zh-CN": "获取验证码" },
  "register.action": { "en-US": "Register", "zh-CN": "注册" },
  "register.pending": { "en-US": "Registering…", "zh-CN": "注册中…" },
  "register.registerAgain": { "en-US": "Register again", "zh-CN": "再次注册" },
  "register.done": { "en-US": "Account created. You can sign in now.", "zh-CN": "账号已创建，请登录。" },
  "register.toLogin": { "en-US": "Back to sign in", "zh-CN": "返回登录" },
  "forgot.title": { "en-US": "Reset password", "zh-CN": "找回密码" },
  "forgot.account": { "en-US": "Phone or email", "zh-CN": "手机号或邮箱" },
  "forgot.code": { "en-US": "Verification code", "zh-CN": "验证码" },
  "forgot.newPassword": { "en-US": "New password", "zh-CN": "新密码" },
  "forgot.confirmPassword": { "en-US": "Confirm new password", "zh-CN": "确认新密码" },
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
export interface IamMpAuthPort {
  isAuthenticated(): boolean;
  loginCode(input: { code: string; phone: string }): Promise<void>;
  loginPassword(input: { password: string; username: string }): Promise<void>;
  register(input: { password: string; username: string; verificationCode: string }): Promise<void>;
  requestVerificationCode(input: { account: string; scene: string }): Promise<void>;
  resetPassword(input: {
    account: string;
    code: string;
    confirmPassword: string;
    newPassword: string;
  }): Promise<void>;
  signOut(): void;
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

/** The singleton the pages read. */
export interface IamMpRuntime {
  readonly auth: IamMpAuthPort;
  readonly environment: IamMpRuntimeEnv;
  readonly locale: string;
  readonly navigation: IamMpNavigationPort;
  readonly service: IamMpRuntimeService;
  readonly session: IamMpSessionStore;
  readonly tenant: IamMpTenantPort;
  message(key: string): string;
}

let runtime: IamMpRuntime | undefined;

/**
 * Compose the runtime for this launch.
 * @param input - the materialized runtime document.
 * @returns the bootstrapped runtime.
 */
export async function bootstrapIamMpApp(input: { runtimeEnv: IamMpRuntimeEnv }): Promise<IamMpRuntime> {
  const { runtimeEnv } = input;
  if (runtime) return runtime;

  const session = createIamMpSessionStore();
  const service = createIamMpRuntimeService({
    baseUrl: runtimeEnv.SDKWORK_APP_API_BASE_URL,
    ...(session.get()?.accessToken ? { accessToken: session.get()?.accessToken } : {}),
    clearSession: () => session.clear(),
    commitSession: (next) => {
      session.set(toSnapshot(next));
    },
  });
  const applySession = (snapshot: IamMpSessionSnapshot | undefined) => {
    service.setAccessToken(snapshot?.accessToken);
  };
  applySession(session.get());
  session.subscribe(applySession);

  const locale = resolveLocale();
  runtime = {
    auth: createAuthPort(service, session),
    environment: runtimeEnv,
    locale,
    message: (key) => resolveIamMpMessage(locale, key),
    navigation: createNavigationPort(),
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
  for (const route of IAMMP_ROUTE_CONTRIBUTIONS) {
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

function createAuthPort(service: IamMpRuntimeService, session: IamMpSessionStore): IamMpAuthPort {
  return {
    isAuthenticated: () => session.get() !== undefined,
    async loginCode(input) {
      await service.service.auth.sessions.create({
        code: input.code.trim(),
        grantType: "phone_code",
        phone: input.phone.trim(),
      });
    },
    async loginPassword(input) {
      await service.service.auth.sessions.create({
        grantType: "password",
        password: input.password,
        username: input.username.trim(),
      });
    },
    async register(input) {
      await service.service.auth.registrations.create({
        password: input.password,
        username: input.username.trim(),
        verificationCode: input.verificationCode.trim(),
      });
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
    signOut() {
      session.clear();
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
  context?: { organizationId?: string; tenantId?: string };
  refreshToken?: string;
  sessionId?: string;
  user?: { id?: string };
}): IamMpSessionSnapshot {
  return {
    accessToken: session.accessToken,
    ...(session.refreshToken ? { refreshToken: session.refreshToken } : {}),
    ...(session.sessionId ? { sessionId: session.sessionId } : {}),
    ...(session.context?.tenantId ? { tenantId: session.context.tenantId } : {}),
    ...(session.context?.organizationId ? { organizationId: session.context.organizationId } : {}),
    ...(session.user?.id ? { userId: session.user.id } : {}),
  };
}

/** WeChat globals the runtime touches; declared here to keep pages free of `any`. */
declare const wx: {
  getAppBaseInfo?: () => { language?: string };
  getSystemInfoSync: () => { language?: string };
  navigateBack: (options: { delta: number }) => void;
  navigateTo: (options: { url: string }) => void;
  reLaunch: (options: { url: string }) => void;
};
