// SDKWORK-IAM-H5-ADMIN-AUDIT-I18N: authored fragment (zh-CN).
/**
 * Locale fragment: domain `iam`, capability `audit`, package
 * `@sdkwork/iam-h5-admin-audit`.
 *
 * Typed against the `en-US` object so a key added there cannot be forgotten here.
 */
import type { iamH5AdminAuditLocaleMessages } from "../../../en-US/iam/h5/audit.js";

export const iamH5AdminAuditMessages: iamH5AdminAuditLocaleMessages = {
  events: {
    title: "审计事件",
    subtitle: "该租户发生过的操作，最新在前（经由 backend-api）。",
    searchEvents: "按操作人或动作搜索",
    eventsSection: "事件",
    actor: "操作人",
    action: "动作",
    resource: "资源",
    when: "时间",
  },
  states: {
    loading: "加载中…",
    loadMore: "加载更多",
    retry: "重试",
    emptyEvents: "还没有审计事件。",
    emptyEventsDetail: "通过 API 发生变更后，事件会出现在这里。",
    emptySearch: "没有匹配的结果。",
    errorTitle: "出错了",
  },
  errors: {
    events: "审计记录加载失败。",
    more: "加载更多失败。",
  },
};
