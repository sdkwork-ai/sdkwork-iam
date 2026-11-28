export interface IamInstallationCredentialPolicyUpdateCommand {
  redirectUris?: string[];
  grantedScopes?: string[];
  /** Trusted browser origins (scheme://host[:port]). Empty removes the per-client restriction. */
  allowedOrigins?: string[];
  clientStatus?: 'pending_review' | 'enabled' | 'rejected' | 'disabled';
  reviewNote?: string | null;
}
