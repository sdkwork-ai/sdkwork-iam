const {
  IAM_MP_PAGE_PATHS,
  getIamMpRuntime,
  resolveIamMpMessage,
} = require("../../runtime/iam-app");

Page({
  data: {
    account: "",
    accountLabel: "",
    accountPlaceholder: "",
    actionText: "",
    errorText: "",
    orText: "",
    password: "",
    passwordLabel: "",
    passwordPlaceholder: "",
    passwordVisible: false,
    passwordVisibilityText: "",
    showPasswordText: "",
    hidePasswordText: "",
    pending: false,
    pendingMode: "",
    pendingText: "",
    title: "",
    toForgot: "",
    toRegister: "",
    wechatText: "",
  },

  onLoad() {
    const app = getApp();
    const locale = app.globalData.runtimeReady ? getIamMpRuntime().locale : "zh-CN";
    const t = (key) => resolveIamMpMessage(locale, key);
    wx.setNavigationBarTitle({ title: t("login.title") });
    this.setData({
      accountLabel: t("login.account"),
      accountPlaceholder: t("login.account"),
      actionText: t("login.action"),
      orText: t("login.or"),
      passwordLabel: t("login.password"),
      passwordPlaceholder: t("login.password"),
      passwordVisibilityText: t("login.passwordVisible"),
      showPasswordText: t("login.passwordVisible"),
      hidePasswordText: t("login.passwordHidden"),
      pendingText: t("login.pending"),
      title: t("login.title"),
      toForgot: t("login.toForgot"),
      toRegister: t("login.toRegister"),
      wechatText: t("login.wechat"),
    });

    if (!app.globalData.runtimeReady) {
      this.setData({ errorText: app.globalData.runtimeError || t("common.runtimeUnavailable") });
    }
  },

  onAccountInput(event) {
    this.setData({ account: event.detail.value, errorText: "" });
  },

  onPasswordInput(event) {
    this.setData({ password: event.detail.value, errorText: "" });
  },

  onTogglePassword() {
    const visible = !this.data.passwordVisible;
    this.setData({
      passwordVisible: visible,
      passwordVisibilityText: this.data.passwordVisible ? this.data.hidePasswordText : this.data.showPasswordText,
    });
  },

  completeLogin(result) {
    if (result.kind === "loginContextSelectionRequired") {
      getIamMpRuntime().navigation.navigateTo(IAM_MP_PAGE_PATHS.contextSelection);
      return;
    }
    getIamMpRuntime().navigation.reLaunch(IAM_MP_PAGE_PATHS.tenantOverview);
  },

  async onSubmit() {
    if (this.data.pending) return;
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    const account = this.data.account.trim();
    if (!account) {
      this.setData({ errorText: t("error.accountRequired") });
      return;
    }
    if (!this.data.password) {
      this.setData({ errorText: t("error.passwordRequired") });
      return;
    }
    this.setData({ errorText: "", pending: true, pendingMode: "password" });
    try {
      this.completeLogin(await getIamMpRuntime().auth.loginPassword({
        password: this.data.password,
        username: account,
      }));
    } catch (error) {
      this.setData({ errorText: error?.message || t("error.signInFailed") });
    } finally {
      this.setData({ pending: false, pendingMode: "" });
    }
  },

  async onWechatLogin() {
    if (this.data.pending) return;
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    this.setData({ errorText: "", pending: true, pendingMode: "wechat" });
    try {
      this.completeLogin(await getIamMpRuntime().auth.loginWechat());
    } catch (error) {
      this.setData({ errorText: error?.message || t("error.signInFailed") });
    } finally {
      this.setData({ pending: false, pendingMode: "" });
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
