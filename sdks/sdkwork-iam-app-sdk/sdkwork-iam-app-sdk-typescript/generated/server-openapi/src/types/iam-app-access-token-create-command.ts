/** Selectors for the application whose access credential is requested. Supply at least one; the tenant and the organization are derived from the authenticated session and the installation, never from this body. */
export interface IamAppAccessTokenCreateCommand {
  /** Installation deploy application anchor (iam_application_installation.deploy_application_id). Preferred selector: it is the identity the deployment plane publishes. */
  appId?: string;
  /** IAM installation row id (tapp_...) of the caller's tenant. */
  tenantApplicationId?: string;
  /** Installation instance key of the caller's tenant. */
  instanceKey?: string;
}
