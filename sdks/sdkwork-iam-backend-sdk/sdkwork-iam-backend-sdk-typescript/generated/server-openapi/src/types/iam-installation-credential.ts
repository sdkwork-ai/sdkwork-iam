/** OAuth client metadata of one installation environment. The secret is write-only and is returned only by create/rotate. */
export interface IamInstallationCredential {
  credentialId: string;
  tenantId: string;
  installationEnvironmentId: string;
  environmentKey: string;
  /** OAuth client id; globally unique across every credential row. */
  clientId: string;
  redirectUris: string[];
  grantedScopes: string[];
  status: 'active' | 'rotated' | 'retired';
  /** When this credential was replaced by a rotation, or null. */
  rotatedAt?: string | null;
  /** When this credential was revoked, or null. */
  retiredAt?: string | null;
  /** Creation timestamp. */
  createdAt: string;
  /** Last write timestamp. */
  updatedAt: string;
}
