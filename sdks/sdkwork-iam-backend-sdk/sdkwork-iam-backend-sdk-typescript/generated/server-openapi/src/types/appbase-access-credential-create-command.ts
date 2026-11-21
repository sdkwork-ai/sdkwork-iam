/** Issue a delegated access credential for an enabled tenant application. */
export interface AppbaseAccessCredentialCreateCommand {
  /** Super-admin auth token used for bootstrap body authentication. */
  authToken?: string;
  /** Super-admin username credential for bootstrap body authentication. */
  username?: string;
  /** Super-admin email credential for bootstrap body authentication. */
  email?: string;
  /** Super-admin phone credential for bootstrap body authentication. */
  phone?: string;
  /** Super-admin password credential for bootstrap body authentication. */
  password?: string;
  tenantId: string;
  organizationId: string;
  installationId?: string;
  appId?: string;
  instanceKey?: string;
  /** Release scope the caller declares. It is checked against the installation, never used to select one: a value the installation was not released at fails closed (`APPLICATION_IDENTITY_SPEC.md` section 4.1 rule 3). Omit it to inherit the installation scope. */
  ownershipScope?: 'TENANT' | 'ORGANIZATION' | 'USER';
}
