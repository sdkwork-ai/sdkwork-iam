/** Provision a tenant installation from the deploy application it serves plus explicit attributes. Application templates are retired, so no template reference is accepted. */
export interface AppbaseTenantApplicationProvisionCommand {
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
  instanceKey: string;
  displayName: string;
  environment: string;
  /** Product-semantic application type (api | h5 | pc | flutter | miniprogram | ios | android | harmonyos | desktop | other). Names the endpoint the installation serves, not the rendering technology. Required: application templates are retired, so nothing else can supply it. */
  applicationType: 'api' | 'h5' | 'pc' | 'flutter' | 'miniprogram' | 'ios' | 'android' | 'harmonyos' | 'desktop' | 'other';
  primaryDomain?: string;
  /** Access permissions granted to the installation. An empty array or null is a valid explicit choice: the installation grants no API scope. */
  accessPermissions?: string[] | null;
  runtimeConfig?: Record<string, unknown>;
  /** Deploy application this installation serves. It is the identity every access token carries, and the one-to-one relation is enforced by the database. */
  deployApplicationId?: string;
  /** Release scope of the installation (`APPLICATION_IDENTITY_SPEC.md` section 4.1). TENANT is the default: the application serves the whole tenant and its isolation key is (tenantId, appId). ORGANIZATION serves one organization and requires a non-zero organizationId. USER serves one person and requires ownerUserId. The scope is immutable once provisioned; publishing at another level needs a new installation. */
  ownershipScope?: 'TENANT' | 'ORGANIZATION' | 'USER';
  /** Owner of a USER-scoped installation. Required for ownershipScope USER and rejected for the other two levels. */
  ownerUserId?: string;
  /** Replay-safe key for the cross-module provisioning call. */
  provisioningIdempotencyKey?: string;
}
