import type { IamUserPersona } from './iam-user-persona';

export interface IamUserPersonaResponse {
  code: 0;
  data: unknown & { item: IamUserPersona; };
  /** Server-owned request correlation id. */
  traceId: string;
}
