/** Locale fragment: domain `iam`, capability `user-center` (Me page), package `@sdkwork/iam-h5-user`. */
export const iamH5UserCenterMessages = {
  'iam.userCenter.me.title': 'Me',
  'iam.userCenter.me.state.loading': 'Loading…',
  'iam.userCenter.me.state.loadError': 'Could not load your profile.',
  'iam.userCenter.me.state.retry': 'Retry',
  'iam.userCenter.me.section.account': 'Account',
  'iam.userCenter.me.section.bindings': 'Bindings',
  'iam.userCenter.me.menu.profile': 'Profile',
  'iam.userCenter.me.menu.password': 'Change password',
  'iam.userCenter.me.menu.emailBindings': 'Email',
  'iam.userCenter.me.menu.phoneBindings': 'Phone',
  'iam.userCenter.me.menu.thirdPartyAccounts': 'Connected accounts',
  'iam.userCenter.me.actions.signOut': 'Sign out',
  'iam.userCenter.me.context.tenant': 'Tenant',
  'iam.userCenter.me.context.organization': 'Organization',
  'iam.userCenter.me.context.authLevel': 'Auth level',
} as const;

export type iamH5UserCenterMessageKey = keyof typeof iamH5UserCenterMessages;
