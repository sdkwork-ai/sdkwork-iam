/** Idempotent registration of one environment. The path environmentKey is authoritative; an explicit body value must match it. Omitted status keeps the stored status on update and defaults to pending on insert. */
export interface IamInstallationEnvironmentUpsertCommand {
  environmentKey?: string;
  /** Blank or null clears the domain; a domain is unique per tenant. */
  primaryDomain?: string | null;
  domainConfig?: Record<string, unknown>;
  status?: 'pending' | 'active' | 'disabled';
}
