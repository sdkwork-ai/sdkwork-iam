import type { IamInstallationCredentialWithSecret } from './iam-installation-credential-with-secret';

export interface IamInstallationCredentialResponse {
  code: 0;
  data: unknown & { item: IamInstallationCredentialWithSecret; };
  /** Server-owned request correlation id. */
  traceId: string;
}
