/** Signed application access credential. It is a session-class credential: it expires after one hour and can be revoked like any other IAM session. */
export interface IamAppAccessToken {
  /** Signed access token; send it as the Access-Token header. */
  accessToken: string;
  /** Signed auth token; send it as the Authorization: Bearer header. */
  authToken: string;
  /** Credential expiry instant. */
  expiresAt: string;
  /** Deploy application anchor carried as the token app_id/aud. */
  appId: string;
  /** Installation the credential was issued for. */
  tenantApplicationId: string;
  /** Organization claim of the installation; 0 for tenant- and user-released installations. */
  organizationId?: string;
  /** Release scope of the installation. */
  ownershipScope: 'TENANT' | 'ORGANIZATION' | 'USER';
  /** Persisted session that can be revoked. */
  sessionId?: string;
}
