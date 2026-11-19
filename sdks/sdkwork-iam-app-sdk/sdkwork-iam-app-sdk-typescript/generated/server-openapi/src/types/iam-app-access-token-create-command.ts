/** Selectors for the application whose access credential is requested. Supply at least one; the tenant and the organization are derived from the authenticated session and the installation, never from this body. */
export interface IamAppAccessTokenCreateCommand {
  /** Installation deploy application anchor (iam_application_installation.deploy_application_id). Preferred selector: it is the identity the deployment plane publishes. */
  appId?: string;
  /** IAM installation row id (tapp_...) of the caller's tenant. */
  tenantApplicationId?: string;
  /** Installation instance key of the caller's tenant. */
  instanceKey?: string;
  /** Exact installation lifecycle to initialize. Omitted means the caller session environment when the installation registered it, otherwise the installation's only active environment. An operator can initialize a lifecycle that differs from its own session environment. */
  environment?: 'development' | 'test' | 'staging' | 'demo' | 'production';
  /** Release scope the caller declares. It is a declaration to be checked, never a selector: the installation decides the level. Omit it to inherit the installation scope (a tenant-level application therefore yields a tenant-level credential); an explicit value that disagrees with the installation is refused. */
  ownershipScope?: 'TENANT' | 'ORGANIZATION' | 'USER';
}
