/**
 * Console user-center profile (`console.iam.user-center.profile`, subpackage
 * `console-user-center`).
 *
 * Read-only: the console shows the operator's own record as the console renders it. Editing
 * stays on the app profile page, which already applies the "only send what changed" rule.
 */

const {
  IAM_MP_PAGE_PATHS,
  getIamMpRuntime,
  resolveIamMpMessage,
} = require("../../../runtime/iam-app");

Page({
  data: {
    errorText: "",
    loading: true,
    loadingText: "",
    rows: [],
    subtitle: "",
    title: "",
    toAppText: "",
  },

  onLoad() {
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    wx.setNavigationBarTitle({ title: t("consoleUserCenter.title") });
    this.setData({
      loadingText: t("consoleUserCenter.loading"),
      subtitle: t("consoleUserCenter.subtitle"),
      title: t("consoleUserCenter.title"),
      toAppText: t("consoleUserCenter.toApp"),
    });
    this.reload();
  },

  locale() {
    return getApp().globalData.runtimeReady ? getIamMpRuntime().locale : "zh-CN";
  },

  async reload() {
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    this.setData({ errorText: "", loading: true });
    try {
      const profile = await getIamMpRuntime().profile.loadProfile();
      const value = (field) => (field && field.length > 0 ? field : t("consoleUserCenter.notReported"));
      this.setData({
        loading: false,
        rows: [
          { key: "userId", label: t("consoleUserCenter.userId"), value: value(profile.userId) },
          {
            key: "displayName",
            label: t("consoleUserCenter.displayName"),
            value: value(profile.displayName),
          },
          { key: "email", label: t("consoleUserCenter.email"), value: value(profile.email) },
          { key: "phone", label: t("consoleUserCenter.phone"), value: value(profile.phone) },
        ],
      });
    } catch (error) {
      this.setData({ errorText: t("consoleUserCenter.loadFailed"), loading: false });
    }
  },

  onBackToApp() {
    getIamMpRuntime().navigation.reLaunch(IAM_MP_PAGE_PATHS.tenantOverview);
  },
});
