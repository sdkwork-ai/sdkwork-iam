/**
 * Console account-binding workspace (`console.iam.account-binding.list`, subpackage
 * `console-account-binding`).
 *
 * The policy region comes first because it decides whether the removal action exists at all;
 * the linked identities follow. A not-allowed policy is stated as a word rather than hidden
 * behind a missing button, so an operator can see the user may not remove it.
 */

const {
  IAM_MP_PAGE_PATHS,
  getIamMpRuntime,
  resolveIamMpMessage,
} = require("../../../runtime/iam-app");

Page({
  data: {
    canUnlink: false,
    emptyLinksText: "",
    errorText: "",
    links: [],
    linksSection: "",
    loading: true,
    loadingText: "",
    policyRows: [],
    policySection: "",
    subtitle: "",
    title: "",
    toAppText: "",
    unlinkingId: "",
    unlinkText: "",
  },

  onLoad() {
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    wx.setNavigationBarTitle({ title: t("consoleAccountBinding.title") });
    this.setData({
      emptyLinksText: t("consoleAccountBinding.emptyLinks"),
      linksSection: t("consoleAccountBinding.linksSection"),
      loadingText: t("consoleAccountBinding.loading"),
      policySection: t("consoleAccountBinding.policySection"),
      subtitle: t("consoleAccountBinding.subtitle"),
      title: t("consoleAccountBinding.title"),
      toAppText: t("consoleAccountBinding.toApp"),
      unlinkText: t("consoleAccountBinding.unlink"),
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
      const runtime = getIamMpRuntime();
      const policy = await runtime.accountBinding.loadPolicy();
      const links = await runtime.accountBinding.fetchLinks();
      const value = (enabled) =>
        enabled ? t("consoleAccountBinding.allowed") : t("consoleAccountBinding.denied");
      this.setData({
        canUnlink: policy.selfServiceUnlinkEnabled && links.length > 0,
        links,
        loading: false,
        // Every policy row is reported, granted or not: an operator needs to know the user
        // cannot self-serve, not merely find no button.
        policyRows: [
          { key: "contact", label: t("consoleAccountBinding.policyContact"), value: value(policy.contactEnabled) },
          { key: "email", label: t("consoleAccountBinding.policyEmail"), value: value(policy.emailEnabled) },
          { key: "oauth", label: t("consoleAccountBinding.policyOauth"), value: value(policy.oauthEnabled) },
          {
            key: "selfService",
            label: t("consoleAccountBinding.policyUnlink"),
            value: value(policy.selfServiceUnlinkEnabled),
          },
        ],
      });
    } catch (error) {
      this.setData({
        errorText: t("consoleAccountBinding.loadFailed"),
        loading: false,
      });
    }
  },

  onUnlink(event) {
    const accountLinkId = event.currentTarget.dataset.id;
    if (!accountLinkId || this.data.unlinkingId) return;
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    wx.showModal({
      cancelText: t("consoleAccountBinding.cancel"),
      confirmText: t("consoleAccountBinding.unlink"),
      content: t("consoleAccountBinding.unlinkConfirm"),
      success: (result) => {
        if (result.confirm) this.remove(accountLinkId, t);
      },
      title: t("consoleAccountBinding.title"),
    });
  },

  async remove(accountLinkId, t) {
    this.setData({ errorText: "", unlinkingId: accountLinkId });
    try {
      await getIamMpRuntime().accountBinding.unlink(accountLinkId);
      // The row disappears only after the server accepts.
      const links = this.data.links.filter((link) => link.accountLinkId !== accountLinkId);
      this.setData({ canUnlink: this.data.canUnlink && links.length > 0, links, unlinkingId: "" });
    } catch (error) {
      this.setData({
        errorText: t("consoleAccountBinding.unlinkError"),
        unlinkingId: "",
      });
    }
  },

  onBackToApp() {
    getIamMpRuntime().navigation.reLaunch(IAM_MP_PAGE_PATHS.tenantOverview);
  },
});
