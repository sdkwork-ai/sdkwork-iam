/** Create a one-time-returned workload credential bound to a service account and tenant application. */
export interface ServiceAccountCredentialCreateCommand {
  installationId: string;
  expiresAt?: string;
}
