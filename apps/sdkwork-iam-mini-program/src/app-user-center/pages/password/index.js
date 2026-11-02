/**
 * Password page (`app.iam.user-center.password`, subpackage `app-user-center`).
 *
 * The three fields are validated on the page before the request — the same rules as
 * the H5 and PC forms — so a short or mismatched password never becomes a round trip.
 */

const {
  getIamMpRuntime,
  resolveIamMpMessage,
} = require("../../../runtime/iam-app");

const MIN_PASSWORD_LENGTH = 8;

Page({
  data: {
    confirm: "",
    confirmLabel: "",
    errorText: "",
    newLabel: "",
    newPassword: "",
    noticeText: "",
    oldLabel: "",
    oldPassword: "",
    pending: false,
    submitText: "",
    title: "",
  },

  onLoad() {
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    wx.setNavigationBarTitle({ title: t("password.title") });
    this.setData({
      confirmLabel: t("password.confirm"),
      newLabel: t("password.new"),
      oldLabel: t("password.old"),
      submitText: t("password.action"),
      title: t("password.title"),
    });
  },

  locale() {
    return getApp().globalData.runtimeReady ? getIamMpRuntime().locale : "zh-CN";
  },

  onOldInput(event) {
    this.setData({ oldPassword: event.detail.value });
  },

  onNewInput(event) {
    this.setData({ newPassword: event.detail.value });
  },

  onConfirmInput(event) {
    this.setData({ confirm: event.detail.value });
  },

  async onSubmit() {
    if (this.data.pending) return;
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    const oldPassword = (this.data.oldPassword || "").trim();
    const newPassword = this.data.newPassword || "";
    const confirmPassword = this.data.confirm || "";

    if (!oldPassword) {
      this.setData({ errorText: t("password.oldRequired"), noticeText: "" });
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      this.setData({ errorText: t("password.tooShort"), noticeText: "" });
      return;
    }
    if (newPassword !== confirmPassword) {
      this.setData({ errorText: t("password.mismatch"), noticeText: "" });
      return;
    }

    this.setData({ errorText: "", noticeText: "", pending: true });
    try {
      await getIamMpRuntime().profile.changePassword({ confirmPassword, newPassword, oldPassword });
      // The fields hold single-use secrets; clearing them keeps them off a screen the
      // user may walk away from.
      this.setData({
        confirm: "",
        newPassword: "",
        noticeText: t("password.done"),
        oldPassword: "",
        pending: false,
      });
    } catch (error) {
      this.setData({ errorText: t("password.failed"), pending: false });
    }
  },
});
