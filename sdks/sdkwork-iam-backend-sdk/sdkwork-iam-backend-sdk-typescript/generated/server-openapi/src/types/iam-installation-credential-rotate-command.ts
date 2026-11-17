/** Rotates the active credential: the replacement becomes active with a new client id and secret, and the predecessor is kept as rotated history. */
export interface IamInstallationCredentialRotateCommand {
  /** Explicit replacement client id. Omitted generates one. */
  clientId?: string;
}
