/**
 * Console tenant workspace (`console.iam.tenant.overview`, subpackage `console-tenant`).
 *
 * Three regions in the order an operator reads them: the tenant they are acting in, the
 * self-service policies that decide what its users may do themselves, and the tenant's
 * organizations. The app tenant page answers "what is mine"; this one answers "what is this
 * tenant's".
 *
 * Organizations come from the tenant overview the runtime already loaded — a slice rather
 * than a paged walk; the console organization page is where an operator pages through them.
 */

const {
  IAM_MP_PAGE_PATHS,
  getIamMpRuntime,
  resolveIamMpMessage,
} = require("../../../runtime/iam-app");

Page({
  data: {
    emptyOrganizationsText: "",
    environmentText: "",
    errorText: "",
    loading: true,
    loadingText: "",
    organizations: [],
    organizationsSection: "",
    policyRows: [],
    policySection: "",
    runRows: [],
    sessionSection: "",
    subtitle: "",
    title: "",
    toAppText: "",
  },

  onLoad() {
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    wx.setNavigationBarTitle({ title: t("consoleTenant.title") });
    this.setData({
      emptyOrganizationsText: t("consoleTenant.emptyOrganizations"),
      environmentText: t("consoleTenant.environment"),
      loadingText: t("consoleTenant.loading"),
      organizationsSection: t("consoleTenant.organizationsSection"),
      policySection: t("consoleTenant.policySection"),
      sessionSection: t("consoleTenant.sessionSection"),
      subtitle: t("consoleTenant.subtitle"),
      title: t("consoleTenant.title"),
      toAppText: t("consoleTenant.toApp"),
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
      const overview = await runtime.tenant.loadOverview();
      const policy = await runtime.accountBinding.loadPolicy();
      const value = (enabled) =>
        enabled ? t("consoleTenant.allowed") : t("consoleTenant.denied");
      this.setData({
        loading: false,
        organizations: overview.organizations,
        policyRows: [
          { key: "contact", label: t("consoleTenant.policyContact"), value: value(policy.contactEnabled) },
          { key: "email", label: t("consoleTenant.policyEmail"), value: value(policy.emailEnabled) },
          { key: "oauth", label: t("consoleTenant.policyOauth"), value: value(policy.oauthEnabled) },
          {
            key: "selfService",
            label: t("consoleTenant.policyUnlink"),
            value: value(policy.selfServiceUnlinkEnabled),
          },
        ],
        runRows: [
          { key: "environment", label: t("consoleTenant.environment"), value: overview.runtime.environment },
          { key: "tenant", label: t("consoleTenant.tenant"), value: overview.runtime.tenantId },
          { key: "user", label: t("consoleTenant.user"), value: overview.runtime.userId },
        ],
      });
    } catch (error) {
      this.setData({ errorText: t("consoleTenant.loadFailed"), loading: false });
    }
  },

  onBackToApp() {
    getIamMpRuntime().navigation.reLaunch(IAM_MP_PAGE_PATHS.tenantOverview);
  },
});
