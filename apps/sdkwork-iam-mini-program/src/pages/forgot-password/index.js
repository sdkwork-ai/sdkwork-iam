/**
 * Password recovery page.
 *
 * Same shape as registration: two client-side checks (length, confirmation) before
 * the request, then the server's answer decides. Success returns the user to the
 * sign-in page rather than leaving them on a form whose state is now stale.
 */

const {
  IAM_MP_PAGE_PATHS,
  getIamMpRuntime,
  resolveIamMpMessage,
} = require("../../runtime/iam-app");

const MIN_PASSWORD_LENGTH = 8;

Page({
  data: {
    account: "",
    code: "",
    confirmPassword: "",
    done: false,
    doneText: "",
    errorText: "",
    newPassword: "",
    pending: false,
    pendingText: "",
    sendCodeText: "",
    sending: false,
    submitText: "",
    title: "",
    toLoginText: "",
  },

  onLoad() {
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    wx.setNavigationBarTitle({ title: t("forgot.title") });
    this.setData({
      doneText: t("forgot.done"),
      pendingText: t("forgot.pending"),
      sendCodeText: t("forgot.sendCode"),
      submitText: t("forgot.action"),
      title: t("forgot.title"),
      toLoginText: t("forgot.toLogin"),
    });
  },

  locale() {
    return getApp().globalData.runtimeReady ? getIamMpRuntime().locale : "zh-CN";
  },

  onAccountInput(event) {
    this.setData({ account: event.detail.value });
  },
  onCodeInput(event) {
    this.setData({ code: event.detail.value });
  },
  onNewPasswordInput(event) {
    this.setData({ newPassword: event.detail.value });
  },
  onConfirmPasswordInput(event) {
    this.setData({ confirmPassword: event.detail.value });
  },

  async onSendCode() {
    if (this.data.sending || !this.data.account.trim()) return;
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    this.setData({ errorText: "", sending: true });
    try {
      await getIamMpRuntime().auth.requestVerificationCode({
        account: this.data.account,
        scene: "RESET_PASSWORD",
      });
    } catch (error) {
      this.setData({
        errorText: error && error.message ? error.message : t("error.sendCodeFailed"),
      });
    } finally {
      this.setData({ sending: false });
    }
  },

  async onSubmit() {
    if (this.data.pending) return;
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    if (!this.data.account.trim()) {
      this.setData({ errorText: t("error.accountRequired") });
      return;
    }
    if (!this.data.code.trim()) {
      this.setData({ errorText: t("error.codeRequired") });
      return;
    }
    if (this.data.newPassword.length < MIN_PASSWORD_LENGTH) {
      this.setData({ errorText: t("error.passwordTooShort") });
      return;
    }
    if (this.data.newPassword !== this.data.confirmPassword) {
      this.setData({ errorText: t("error.passwordMismatch") });
      return;
    }
    this.setData({ errorText: "", pending: true });
    try {
      await getIamMpRuntime().auth.resetPassword({
        account: this.data.account,
        code: this.data.code,
        confirmPassword: this.data.confirmPassword,
        newPassword: this.data.newPassword,
      });
      this.setData({ done: true });
    } catch (error) {
      this.setData({
        errorText: error && error.message ? error.message : t("error.resetFailed"),
      });
    } finally {
      this.setData({ pending: false });
    }
  },

  onBackToLogin() {
    getIamMpRuntime().navigation.reLaunch(IAM_MP_PAGE_PATHS.login);
  },
});
