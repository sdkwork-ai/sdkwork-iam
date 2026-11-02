/**
 * Tenant overview page (`app.iam.tenant.overview`, subpackage `app-tenant`).
 *
 * The post-sign-in landing screen: the session the caller is acting in, the
 * tenant's organizations, and the caller's memberships. The projection into plain
 * page data happens in the runtime bundle, so this page holds no mapping logic and
 * no SDK reference.
 */

const {
  IAM_MP_PAGE_PATHS,
  getIamMpRuntime,
  resolveIamMpMessage,
} = require("../../../runtime/iam-app");

Page({
  data: {
    environment: "",
    errorText: "",
    loading: true,
    memberships: [],
    organizations: [],
    sectionMemberships: "",
    sectionOrganizations: "",
    sectionSession: "",
    signOutText: "",
    tenantId: "",
    title: "",
    userId: "",
  },

  onLoad() {
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    wx.setNavigationBarTitle({ title: t("tenant.title") });
    this.setData({
      sectionMemberships: t("tenant.memberships"),
      sectionOrganizations: t("tenant.organizations"),
      sectionSession: t("tenant.session"),
      signOutText: t("tenant.signOut"),
      title: t("tenant.title"),
    });
    this.load();
  },

  onShow() {
    // Returning from a sign-out elsewhere must not leave the previous tenant's
    // rows on screen.
    if (!getApp().globalData.runtimeReady) return;
    if (!getIamMpRuntime().auth.isAuthenticated()) {
      getIamMpRuntime().navigation.reLaunch(IAM_MP_PAGE_PATHS.login);
    }
  },

  async load() {
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    this.setData({ errorText: "", loading: true });
    try {
      const overview = await getIamMpRuntime().tenant.loadOverview();
      this.setData({
        environment: overview.runtime.environment,
        loading: false,
        memberships: overview.memberships,
        organizations: overview.organizations,
        tenantId: overview.runtime.tenantId,
        userId: overview.runtime.userId,
      });
    } catch (error) {
      this.setData({
        errorText: error && error.message ? error.message : t("tenant.loadFailed"),
        loading: false,
      });
    }
  },

  onOpenOrganizations() {
    getIamMpRuntime().navigation.navigateTo(IAM_MP_PAGE_PATHS.organizationDirectory);
  },

  onSignOut() {
    const runtime = getIamMpRuntime();
    runtime.auth.signOut();
    runtime.navigation.reLaunch(IAM_MP_PAGE_PATHS.login);
  },

  locale() {
    return getApp().globalData.runtimeReady ? getIamMpRuntime().locale : "zh-CN";
  },
});
