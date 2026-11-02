/**
 * Profile page (`app.iam.user-center.profile`, subpackage `app-user-center`).
 *
 * Reads the signed-in user's own record and saves only the fields that were
 * edited: sending an untouched empty field would clear a value the backend holds.
 */

const {
  getIamMpRuntime,
  resolveIamMpMessage,
} = require("../../../runtime/iam-app");

Page({
  data: {
    displayName: "",
    displayNameLabel: "",
    email: "",
    emailLabel: "",
    errorText: "",
    loading: true,
    noticeText: "",
    pending: false,
    phone: "",
    phoneLabel: "",
    saveText: "",
    title: "",
    toTenantText: "",
    userId: "",
  },

  onLoad() {
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    wx.setNavigationBarTitle({ title: t("profile.title") });
    this.setData({
      displayNameLabel: t("profile.displayName"),
      emailLabel: t("profile.email"),
      phoneLabel: t("profile.phone"),
      saveText: t("profile.save"),
      title: t("profile.title"),
      toTenantText: t("tenant.title"),
    });
    this.load();
  },

  locale() {
    return getApp().globalData.runtimeReady ? getIamMpRuntime().locale : "zh-CN";
  },

  async load() {
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    this.setData({ errorText: "", loading: true });
    try {
      const profile = await getIamMpRuntime().profile.loadProfile();
      this.setData({
        displayName: profile.displayName || "",
        email: profile.email || "",
        loading: false,
        phone: profile.phone || "",
        userId: profile.userId || "",
      });
    } catch (error) {
      this.setData({
        errorText: t("profile.loadError"),
        loading: false,
      });
    }
  },

  onDisplayNameInput(event) {
    this.setData({ displayName: event.detail.value });
  },

  onEmailInput(event) {
    this.setData({ email: event.detail.value });
  },

  onPhoneInput(event) {
    this.setData({ phone: event.detail.value });
  },

  async onSave() {
    if (this.data.pending) return;
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    const draft = {
      displayName: (this.data.displayName || "").trim(),
      email: (this.data.email || "").trim(),
      phone: (this.data.phone || "").trim(),
    };
    if (!draft.displayName && !draft.email && !draft.phone) {
      // Nothing typed: the server can only reject it, and an empty save would look
      // like it succeeded.
      this.setData({ errorText: t("profile.empty") });
      return;
    }
    this.setData({ errorText: "", noticeText: "", pending: true });
    try {
      const profile = await getIamMpRuntime().profile.saveProfile(draft);
      this.setData({
        displayName: profile.displayName || "",
        email: profile.email || "",
        noticeText: t("profile.saved"),
        pending: false,
        userId: profile.userId || this.data.userId,
      });
    } catch (error) {
      this.setData({ errorText: t("profile.saveError"), pending: false });
    }
  },

  onBackToTenant() {
    wx.navigateBack({ delta: 1 });
  },
});
