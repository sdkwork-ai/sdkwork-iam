export interface IamEnterpriseSeatExportResponse {
  code: 0;
  data: unknown & { fileName: string; csv: string; };
  /** Server-owned request correlation id. */
  traceId: string;
}
