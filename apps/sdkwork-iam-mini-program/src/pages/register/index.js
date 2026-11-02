/**
 * Registration page.
 *
 * Collects account, verification code, password and confirmation, validates the
 * two client-side rules that must never cost a round trip (the passwords match and
 * the length floor), then calls the runtime's auth port. The server owns the real
 * policy; its refusal is what the page shows when the two disagree.
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
    confirm: "",
    done: false,
    doneText: "",
    errorText: "",
    password: "",
    pending: false,
    pendingText: "",
    registerAgainText: "",
    sendCodeText: "",
    sending: false,
    title: "",
    toLoginText: "",
  },

  onLoad() {
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    wx.setNavigationBarTitle({ title: t("register.title") });
    this.setData({
      doneText: t("register.done"),
      pendingText: t("register.pending"),
      registerAgainText: t("register.registerAgain"),
      sendCodeText: t("register.sendCode"),
      title: t("register.title"),
      toLoginText: t("register.toLogin"),
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
  onPasswordInput(event) {
    this.setData({ password: event.detail.value });
  },
  onConfirmInput(event) {
    this.setData({ confirm: event.detail.value });
  },

  async onSendCode() {
    if (this.data.sending || !this.data.account.trim()) return;
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    this.setData({ errorText: "", sending: true });
    try {
      await getIamMpRuntime().auth.requestVerificationCode({
        account: this.data.account,
        scene: "REGISTER",
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
    if (this.data.password.length < MIN_PASSWORD_LENGTH) {
      this.setData({ errorText: t("error.passwordTooShort") });
      return;
    }
    if (this.data.password !== this.data.confirm) {
      this.setData({ errorText: t("error.passwordMismatch") });
      return;
    }
    this.setData({ errorText: "", pending: true });
    try {
      await getIamMpRuntime().auth.register({
        password: this.data.password,
        username: this.data.account,
        verificationCode: this.data.code,
      });
      this.setData({ done: true });
    } catch (error) {
      this.setData({
        errorText: error && error.message ? error.message : t("error.registerFailed"),
      });
    } finally {
      this.setData({ pending: false });
    }
  },

  onRegisterAgain() {
    this.setData({ code: "", confirm: "", done: false, password: "" });
  },

  onBackToLogin() {
    getIamMpRuntime().navigation.reLaunch(IAM_MP_PAGE_PATHS.login);
  },
});
