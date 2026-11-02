/**
 * Account binding page (`app.iam.account-binding.list`, subpackage
 * `app-account-binding`).
 *
 * The tenant policy decides whether the removal action exists at all: an action that
 * can only fail is not rendered. A row disappears only after the server accepts the
 * removal, because an optimistic removal that failed would leave the user believing
 * a sign-in method is gone while it still works.
 */

const {
  getIamMpRuntime,
  resolveIamMpMessage,
} = require("../../../runtime/iam-app");

Page({
  data: {
    canUnlink: false,
    emptyText: "",
    errorText: "",
    links: [],
    linksTitle: "",
    loading: true,
    policy: [],
    policyTitle: "",
    title: "",
    unlinkingId: "",
    unlinkText: "",
  },

  onLoad() {
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    wx.setNavigationBarTitle({ title: t("binding.title") });
    this.setData({
      emptyText: t("binding.empty"),
      linksTitle: t("binding.links"),
      policyTitle: t("binding.policy"),
      title: t("binding.title"),
      unlinkText: t("binding.unlink"),
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
      const runtime = getIamMpRuntime();
      // Policy and links are read together: rendering links without the policy would
      // flash an action the tenant forbids.
      const [policy, links] = await Promise.all([
        runtime.accountBinding.loadPolicy(),
        runtime.accountBinding.fetchLinks(),
      ]);
      this.setData({
        canUnlink: policy.selfServiceUnlinkEnabled && links.length > 0,
        links,
        loading: false,
        policy: this.toPolicyRows(policy, t),
      });
    } catch (error) {
      this.setData({ errorText: t("binding.loadError"), loading: false });
    }
  },

  toPolicyRows(policy, t) {
    const value = (allowed) => (allowed ? t("binding.allowed") : t("binding.denied"));
    return [
      { key: "contact", label: t("binding.contact"), value: value(policy.contactEnabled) },
      { key: "email", label: t("binding.email"), value: value(policy.emailEnabled) },
      { key: "oauth", label: t("binding.oauth"), value: value(policy.oauthEnabled) },
      { key: "selfService", label: t("binding.selfService"), value: value(policy.selfServiceUnlinkEnabled) },
    ];
  },

  onUnlink(event) {
    const accountLinkId = event.currentTarget.dataset.id;
    if (!accountLinkId || this.data.unlinkingId) return;
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    wx.showModal({
      cancelText: t("binding.cancel"),
      confirmText: t("binding.unlink"),
      content: t("binding.unlinkConfirm"),
      success: (result) => {
        if (result.confirm) this.remove(accountLinkId, t);
      },
      title: t("binding.title"),
    });
  },

  async remove(accountLinkId, t) {
    this.setData({ errorText: "", unlinkingId: accountLinkId });
    try {
      await getIamMpRuntime().accountBinding.unlink(accountLinkId);
      const links = this.data.links.filter((link) => link.accountLinkId !== accountLinkId);
      this.setData({ canUnlink: links.length > 0, links, unlinkingId: "" });
    } catch (error) {
      this.setData({ errorText: t("binding.unlinkError"), unlinkingId: "" });
    }
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },
});
