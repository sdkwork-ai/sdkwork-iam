/**
 * Headless view models for the user-center "Me" page.
 *
 * These models are framework-agnostic on purpose: every client surface
 * (H5 React, mini-program, future shells) maps them onto its own rendering
 * primitives. Copy never lives here — items carry i18n message keys that the
 * owning surface resolves through its locale fragments.
 */

/** Screen identifiers owned by the user-center capability. */
export const SDKWORK_IAM_USER_CENTER_ME_SCREENS = [
  'profile',
  'password',
  'email-bindings',
  'phone-bindings',
  'third-party-accounts',
  'api-keys',
] as const;

export type SdkworkIamUserCenterMeScreenId = (typeof SDKWORK_IAM_USER_CENTER_ME_SCREENS)[number];

/** Snapshot of the signed-in profile rendered by the hero region. */
export interface SdkworkIamUserCenterMeProfile {
  avatarUrl?: string;
  displayName: string;
  email?: string;
  phone?: string;
  userId: string;
  username?: string;
}

/** Session context summary rendered by the context card region. */
export interface SdkworkIamUserCenterMeContextSummary {
  authLevel?: string;
  organizationId?: string;
  tenantId?: string;
  userId: string;
}

/** What pressing a menu item asks the host application to do. */
export type SdkworkIamUserCenterMeMenuIntent =
  | { commandId: string; kind: 'command' }
  | { kind: 'screen'; screenId: string };

/**
 * One menu row. `label` (already-resolved copy) wins over `messageKey` so a
 * host can inject fully resolved custom entries; surfaces resolve
 * `messageKey` through their own locale fragments otherwise.
 */
export interface SdkworkIamUserCenterMeMenuItem {
  description?: string;
  disabled?: boolean;
  id: string;
  intent: SdkworkIamUserCenterMeMenuIntent;
  label?: string;
  messageKey: string;
  tone?: 'danger' | 'default';
  value?: string;
}

export interface SdkworkIamUserCenterMeMenuSection {
  id: string;
  items: readonly SdkworkIamUserCenterMeMenuItem[];
  /** Optional resolved section title; wins over `titleMessageKey`. */
  title?: string;
  titleMessageKey?: string;
}

/** Inputs the default menu factory derives the menu from. */
export interface SdkworkIamUserCenterMeMenuInput {
  context?: SdkworkIamUserCenterMeContextSummary;
  profile?: SdkworkIamUserCenterMeProfile;
}

export type SdkworkIamUserCenterMeMenuFactory = (
  input: SdkworkIamUserCenterMeMenuInput,
) => readonly SdkworkIamUserCenterMeMenuSection[];

export type SdkworkIamUserCenterMeStatus = 'error' | 'idle' | 'loading' | 'ready';

/** Full page state exposed to every surface binding. */
export interface SdkworkIamUserCenterMeState {
  context?: SdkworkIamUserCenterMeContextSummary;
  /** True after a completed sign-out; sensitive fields are cleared by then. */
  signedOut: boolean;
  signingOut: boolean;
  status: SdkworkIamUserCenterMeStatus;
  lastError?: string;
  menu: readonly SdkworkIamUserCenterMeMenuSection[];
  profile?: SdkworkIamUserCenterMeProfile;
}

/** Canonical i18n message keys owned by the user-center Me page. */
export const SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS = {
  authLevel: 'iam.userCenter.me.context.authLevel',
  emailBindings: 'iam.userCenter.me.menu.emailBindings',
  loadError: 'iam.userCenter.me.state.loadError',
  loading: 'iam.userCenter.me.state.loading',
  organization: 'iam.userCenter.me.context.organization',
  password: 'iam.userCenter.me.menu.password',
  phoneBindings: 'iam.userCenter.me.menu.phoneBindings',
  profile: 'iam.userCenter.me.menu.profile',
  retry: 'iam.userCenter.me.state.retry',
  sectionAccount: 'iam.userCenter.me.section.account',
  sectionBindings: 'iam.userCenter.me.section.bindings',
  signOut: 'iam.userCenter.me.actions.signOut',
  tenant: 'iam.userCenter.me.context.tenant',
  thirdPartyAccounts: 'iam.userCenter.me.menu.thirdPartyAccounts',
  title: 'iam.userCenter.me.title',
} as const;

export type SdkworkIamUserCenterMeMessageKey =
  (typeof SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS)[keyof typeof SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS];
