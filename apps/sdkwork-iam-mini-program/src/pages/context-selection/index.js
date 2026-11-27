const {
  IAM_MP_PAGE_PATHS,
  getIamMpRuntime,
  resolveIamMpMessage,
} = require("../../runtime/iam-app");

Page({
  data: {
    errorText: "",
    organizations: [],
    pending: false,
    personalText: "",
    organizationsTitle: "",
    retryText: "",
    subtitle: "",
    title: "",
  },

  onLoad() {
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    const challenge = getIamMpRuntime().auth.getLoginChallenge();
    wx.setNavigationBarTitle({ title: t("context.title") });
    this.setData({
      organizations: challenge?.organizations.map((organization) => ({
        id: organization.organizationId,
        title: organization.displayName || organization.name || organization.organizationId,
      })) ?? [],
      organizationsTitle: t("context.organizations"),
      personalText: t("context.personal"),
      retryText: t("context.retry"),
      subtitle: t("context.subtitle"),
      title: t("context.title"),
    });
    if (!challenge) {
      this.setData({ errorText: t("context.unavailable") });
    }
  },

  async complete(action) {
    if (this.data.pending) return;
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    this.setData({ errorText: "", pending: true });
    try {
      await action();
      getIamMpRuntime().navigation.reLaunch(IAM_MP_PAGE_PATHS.tenantOverview);
    } catch (error) {
      this.setData({ errorText: error?.message || t("context.failed") });
    } finally {
      this.setData({ pending: false });
    }
  },

  onPersonal() {
    this.complete(() => getIamMpRuntime().auth.selectPersonalLogin());
  },

  onOrganization(event) {
    const id = event.currentTarget.dataset.id;
    this.complete(() => getIamMpRuntime().auth.selectOrganization(id));
  },

  onRetry() {
    getIamMpRuntime().navigation.reLaunch(IAM_MP_PAGE_PATHS.login);
  },

  locale() {
    return getApp().globalData.runtimeReady ? getIamMpRuntime().locale : "zh-CN";
  },
});
