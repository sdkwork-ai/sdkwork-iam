/**
 * Console organization directory page (`console.iam.organization.directory`, subpackage
 * `console-organization`).
 *
 * The tenant-wide view an operator opens, not the member's view: same resource as the app
 * directory, different question. Server-paginated and server-searched like the app page, so
 * the walk never blanks rows the operator is already reading.
 */

const {
  IAM_MP_PAGE_PATHS,
  getIamMpRuntime,
  resolveIamMpMessage,
} = require("../../../runtime/iam-app");

const PAGE_SIZE = 20;

Page({
  data: {
    emptyText: "",
    emptySearchText: "",
    errorText: "",
    hasMore: false,
    items: [],
    loading: true,
    loadingMore: false,
    loadMoreText: "",
    loadingText: "",
    q: "",
    searchPlaceholder: "",
    searchText: "",
    subtitle: "",
    title: "",
    toAppText: "",
  },

  page: 0,
  q: "",
  requestId: 0,

  onLoad() {
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    wx.setNavigationBarTitle({ title: t("consoleOrganization.title") });
    this.setData({
      emptySearchText: t("consoleOrganization.emptySearch"),
      emptyText: t("consoleOrganization.empty"),
      loadingText: t("consoleOrganization.loading"),
      loadMoreText: t("consoleOrganization.loadMore"),
      searchPlaceholder: t("consoleOrganization.searchPlaceholder"),
      searchText: t("consoleOrganization.search"),
      subtitle: t("consoleOrganization.subtitle"),
      title: t("consoleOrganization.title"),
      toAppText: t("consoleOrganization.toApp"),
    });
    this.reload();
  },

  locale() {
    return getApp().globalData.runtimeReady ? getIamMpRuntime().locale : "zh-CN";
  },

  onSearchInput(event) {
    this.q = event.detail.value;
  },

  onSearch() {
    this.reload();
  },

  async reload() {
    this.page = 0;
    this.setData({ errorText: "", items: [], loading: true });
    await this.fetchPage(true);
  },

  async fetchPage(first) {
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    const requestId = this.requestId + 1;
    this.requestId = requestId;
    if (!first) this.setData({ loadingMore: true });
    try {
      const page = await getIamMpRuntime().organization.fetchPage({
        page: this.page,
        pageSize: PAGE_SIZE,
        q: this.q,
      });
      // A newer request (a second keystroke) must win; the older answer is dropped.
      if (requestId !== this.requestId) return;
      this.setData({
        hasMore: page.hasMore,
        items: first ? page.items : this.data.items.concat(page.items),
        loading: false,
        loadingMore: false,
      });
      this.page += 1;
    } catch (error) {
      if (requestId !== this.requestId) return;
      this.setData({
        errorText: error && error.message ? error.message : t("consoleOrganization.loadFailed"),
        loading: false,
        loadingMore: false,
      });
    }
  },

  onLoadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return;
    this.fetchPage(false);
  },

  onBackToApp() {
    getIamMpRuntime().navigation.reLaunch(IAM_MP_PAGE_PATHS.tenantOverview);
  },
});
