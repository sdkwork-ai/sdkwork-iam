// SDKWORK-IAM-H5-OAUTH-I18N: authored fragment (zh-CN).
/**
 * Chinese copy of the third-party sign-in surface, annotated with the default
 * locale's type so a missing or extra key fails compilation.
 */
import type { IamH5OauthMessages } from "../../../en-US/iam/h5/oauth.js";

export const iamH5OauthMessages: IamH5OauthMessages = {
  providers: {
    title: "第三方登录",
    listSection: "可用渠道",
    hint: "将跳转到对应渠道完成授权。",
    searchLabel: "搜索渠道",
    emptyTitle: "暂无可用渠道",
    emptyDetail: "该部署未提供第三方登录渠道。",
    continue: "继续",
    starting: "正在打开…",
    unavailable: "不可用",
    openFailed: "无法发起登录流程。",
  },
  states: {
    errorTitle: "出错了",
    retry: "重试",
    loading: "加载中",
    loadMore: "加载更多",
    emptySearch: "没有匹配的结果。",
  },
  errors: {
    providers: "无法加载登录渠道。",
    more: "无法加载更多。",
  },
};
