/** One lifecycle environment registered for an installation. */
export interface IamInstallationEnvironment {
  environmentId: string;
  tenantId: string;
  organizationId?: string;
  /** Installation (tenant application) id. */
  installationId: string;
  /** Environment key, unique per installation. */
  environmentKey: string;
  /** Public domain of this environment. Null when the environment has no domain; null is the only value allowed to repeat inside one tenant. */
  primaryDomain?: string | null;
  /** Environment-specific domain configuration document. */
  domainConfig?: Record<string, unknown>;
  status: 'pending' | 'active' | 'disabled';
  /** Creation timestamp. */
  createdAt: string;
  /** Last write timestamp. */
  updatedAt: string;
}
