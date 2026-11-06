import { IAM_UNIAPPX_ROUTES } from '@sdkwork/iam-uniappx-core';
import type { IamRouteContribution } from '@sdkwork/iam-uniappx-core';

/**
 * Route composition for the IAM account shell.
 *
 * Authority: `UNIAPP_X_APP_ARCHITECTURE_SPEC.md` §11. The shell reuses the core
 * route contributions; it does not fork route ids or add API metadata.
 */
export function createIamShellRoutes(): readonly IamRouteContribution[] {
  return IAM_UNIAPPX_ROUTES;
}

export interface IamAccountMenuAction {
  key: 'account' | 'organization' | 'sign-out';
  labelKey: string;
}

export const IAM_ACCOUNT_MENU_ACTIONS: readonly IamAccountMenuAction[] = [
  { key: 'account', labelKey: 'iam.account.menu.profile' },
  { key: 'organization', labelKey: 'iam.account.menu.organization' },
  { key: 'sign-out', labelKey: 'iam.account.menu.signOut' },
];

/** English fallback copy; localized copy comes from the i18n message bundle. */
export const IAM_ACCOUNT_MENU_LABELS: Record<IamAccountMenuAction['key'], string> = {
  account: 'Account center',
  organization: 'Organization',
  'sign-out': 'Sign out',
};
