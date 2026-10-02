/** Locale fragment: domain `iam`, capability `user-center`, package `@sdkwork/iam-mp-user-center`. */
export const iamMpUserCenterMessages = {
  'iam.userCenter.profile.title': '个人资料',
  'iam.userCenter.password.title': '修改密码',
  'iam.userCenter.me.title': '我的',
  'iam.userCenter.me.state.loading': '加载中…',
  'iam.userCenter.me.state.loadError': '个人资料加载失败。',
  'iam.userCenter.me.state.retry': '重试',
  'iam.userCenter.me.section.account': '账号',
  'iam.userCenter.me.section.bindings': '绑定管理',
  'iam.userCenter.me.menu.profile': '个人资料',
  'iam.userCenter.me.menu.password': '修改密码',
  'iam.userCenter.me.menu.emailBindings': '邮箱',
  'iam.userCenter.me.menu.phoneBindings': '手机号',
  'iam.userCenter.me.menu.thirdPartyAccounts': '第三方账号',
  'iam.userCenter.me.actions.signOut': '退出登录',
  'iam.userCenter.me.context.tenant': '租户',
  'iam.userCenter.me.context.organization': '组织',
  'iam.userCenter.me.context.authLevel': '认证等级',
} as const;

export type iamMpUserCenterMessageKey = keyof typeof iamMpUserCenterMessages;
