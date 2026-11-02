/**
 * Organization directory page (`app.iam.organization.directory`, subpackage
 * `app-organization`).
 *
 * Server-paginated and server-searched: typing a term resets the walk, and the
 * page appends a page at a time rather than replacing the list, so a slow network
 * never blanks rows the user is already reading.
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
    title: "",
    toTenantText: "",
  },

  page: 0,
  q: "",
  requestId: 0,

  onLoad() {
    const t = (key) => resolveIamMpMessage(this.locale(), key);
    wx.setNavigationBarTitle({ title: t("organization.title") });
    this.setData({
      emptyText: t("organization.empty"),
      loadingText: t("organization.loading"),
      loadMoreText: t("organization.loadMore"),
      searchPlaceholder: t("organization.searchPlaceholder"),
      searchText: t("organization.search"),
      title: t("organization.title"),
      toTenantText: t("tenant.title"),
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
        errorText: error && error.message ? error.message : t("organization.loadFailed"),
        loading: false,
        loadingMore: false,
      });
    }
  },

  onLoadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return;
    this.fetchPage(false);
  },

  onBackToTenant() {
    getIamMpRuntime().navigation.reLaunch(IAM_MP_PAGE_PATHS.tenantOverview);
  },
});
