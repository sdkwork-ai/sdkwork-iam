import type { IamInstallationEnvironment } from './iam-installation-environment';

export interface IamInstallationEnvironmentResponse {
  code: 0;
  data: unknown & { item: IamInstallationEnvironment; };
  /** Server-owned request correlation id. */
  traceId: string;
}
