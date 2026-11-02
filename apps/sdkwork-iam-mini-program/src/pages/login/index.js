/**
 * Login page.
 *
 * Authority: `MINI_PROGRAM_APP_ARCHITECTURE_SPEC.md` section 7. The page owns
 * rendering only: it calls the runtime's auth port and navigates. It does not
 * touch `wx.login`, the IAM SDK or storage — those are host, core and bootstrap
 * responsibilities.
 *
 * This is the first entry in `app.json#pages`, so it must render with no session,
 * no gateway, and a failed bootstrap.
 */

const {
  IAM_MP_PAGE_PATHS,
  getIamMpRuntime,
  resolveIamMpMessage,
} = require("../../runtime/iam-app");

Page({
  data: {
    account: "",
    actionText: "",
    errorText: "",
    pending: false,
    pendingText: "",
    password: "",
    title: "",
    toForgot: "",
    toRegister: "",
  },

  onLoad() {
    const app = getApp();
    const locale = app.globalData.runtimeReady ? getIamMpRuntime().locale : "zh-CN";
    const t = (key) => resolveIamMpMessage(locale, key);
    wx.setNavigationBarTitle({ title: t("login.title") });
    this.setData({
      actionText: t("login.action"),
      pendingText: t("login.pending"),
      title: t("login.title"),
      toForgot: t("login.toForgot"),
      toRegister: t("login.toRegister"),
    });

    if (!app.globalData.runtimeReady) {
      // Bootstrap failed in `app.js`; that reason is the only actionable text.
      this.setData({ errorText: app.globalData.runtimeError || t("common.runtimeUnavailable") });
    }
  },

  onAccountInput(event) {
    this.setData({ account: event.detail.value });
  },

  onPasswordInput(event) {
    this.setData({ password: event.detail.value });
  },

  async onSubmit() {
    if (this.data.pending) return;
    const account = this.data.account.trim();
    if (!account) {
      this.setData({ errorText: resolveIamMpMessage(this.locale(), "error.accountRequired") });
      return;
    }
    this.setData({ errorText: "", pending: true });
    try {
      const runtime = getIamMpRuntime();
      await runtime.auth.loginPassword({ password: this.data.password, username: account });
      runtime.navigation.reLaunch(IAM_MP_PAGE_PATHS.tenantOverview);
    } catch (error) {
      this.setData({
        errorText: error && error.message ? error.message : resolveIamMpMessage(this.locale(), "error.signInFailed"),
      });
    } finally {
      this.setData({ pending: false });
    }
  },

  onRegister() {
    getIamMpRuntime().navigation.navigateTo(IAM_MP_PAGE_PATHS.register);
  },

  onForgot() {
    getIamMpRuntime().navigation.navigateTo(IAM_MP_PAGE_PATHS.forgotPassword);
  },

  locale() {
    return getApp().globalData.runtimeReady ? getIamMpRuntime().locale : "zh-CN";
  },
});
