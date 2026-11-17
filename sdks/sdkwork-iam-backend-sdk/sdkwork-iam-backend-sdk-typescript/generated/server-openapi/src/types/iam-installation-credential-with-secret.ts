/** The create/rotate result: credential metadata plus the one-time plaintext secret. No read operation returns this shape. */
export interface IamInstallationCredentialWithSecret {
  credentialId: string;
  tenantId: string;
  installationEnvironmentId: string;
  environmentKey: string;
  clientId: string;
  /** Plaintext OAuth client secret. Emitted exactly once by create/rotate and never on reads. */
  clientSecret: string;
  redirectUris: string[];
  grantedScopes: string[];
  status: 'active' | 'rotated' | 'retired';
  rotatedAt?: string | null;
  retiredAt?: string | null;
  /** Creation timestamp. */
  createdAt: string;
  /** Last write timestamp. */
  updatedAt: string;
}
