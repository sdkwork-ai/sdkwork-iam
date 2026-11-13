/** Session creation command for credential login and external user-center session exchange. */
export interface AppbaseSessionCreateCommand {
  /** Credential grant to run. Omitted `grantType` means the password grant, which is the body the platform hosted login posts. */
  grantType?: 'password' | 'phone_code' | 'email_code';
  /** Shared account identifier understood by hosted-login clients; `email`/`username`/`phone` remain the authoritative identity fields. */
  account?: string;
  /** Email credential used by standard password login. */
  email?: string;
  /** Username credential used by standard password login. */
  username?: string;
  /** Phone credential used by standard password login. */
  phone?: string;
  /** Write-only password credential used by standard password login. */
  password?: string;
  /** Opaque upstream credential used only by an external user-center session exchange. */
  externalToken?: string;
  /** External authority provider key used to select the configured bridge. */
  providerKey?: string;
  /** Verified tenant id supplied by an external user-center session exchange after upstream identity validation. */
  tenantId?: string;
  /** Verified organization id supplied by an external user-center session exchange when the upstream identity resolved an organization scope. */
  organizationId?: string;
  /** Opaque client device identity. Sessions are replaced per application per device; omitting it keeps the legacy single-slot behaviour where only sessions without a device are revoked. */
  deviceId?: string;
}
