import type { IamPersonaCatalog } from './iam-persona-catalog';

export interface IamPersonaCatalogResponse {
  code: 0;
  data: unknown & { item: IamPersonaCatalog; };
  /** Server-owned request correlation id. */
  traceId: string;
}
