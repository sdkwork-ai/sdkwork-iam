/** Creates the OAuth client of one environment. Omitted clientId is generated. */
export interface IamInstallationCredentialCreateCommand {
  /** Registered environment of the installation, by key or canonical alias. */
  environmentKey: string;
  /** Explicit client id. Omitted generates one; an id already in use conflicts. */
  clientId?: string;
  redirectUris?: string[];
  grantedScopes?: string[];
}
