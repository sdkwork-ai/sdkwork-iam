/** Shared IAM auth/session vocabulary for the uni-app x client root. */

export type IamUniappxMode = 'vapor' | 'vdom';

export type IamAuthStatus =
  | 'signed-out'
  | 'authenticating'
  | 'authenticated'
  | 'refreshing'
  | 'failed';

export type IamSensitiveClearReason =
  | 'logout'
  | 'refresh-failed'
  | 'account-switch'
  | 'tenant-switch'
  | 'session-expired';

/** The minimal authenticated session snapshot the client needs. */
export interface IamSessionSnapshot {
  userId: string;
  displayName: string;
  tenantId: string;
  organizationId?: string;
  email?: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

/** Tenant/organization/user context propagated to SDK calls. */
export interface IamAuthContext {
  userId?: string;
  tenantId?: string;
  organizationId?: string;
  displayName?: string;
}

export interface IamLoginInput {
  identifier: string;
  password: string;
  tenantId?: string;
  organizationId?: string;
}

export interface IamSwitchTenantInput {
  tenantId: string;
  organizationId?: string;
}

export interface IamSwitchAccountInput {
  identifier: string;
  password: string;
}
