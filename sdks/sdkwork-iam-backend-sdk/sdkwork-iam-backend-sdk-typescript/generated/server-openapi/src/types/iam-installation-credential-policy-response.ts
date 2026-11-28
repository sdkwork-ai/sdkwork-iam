import type { IamInstallationCredential } from './iam-installation-credential';

export interface IamInstallationCredentialPolicyResponse {
  code: 0;
  data: unknown & { item: IamInstallationCredential; };
  /** Server-owned request correlation id. */
  traceId: string;
}
