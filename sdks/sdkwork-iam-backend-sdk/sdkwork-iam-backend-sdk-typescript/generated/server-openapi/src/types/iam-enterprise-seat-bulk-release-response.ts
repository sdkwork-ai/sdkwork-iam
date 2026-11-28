export interface IamEnterpriseSeatBulkReleaseResponse {
  code: 0;
  data: unknown & { items: { seatId: string; success: boolean; }[]; allOrNothing: true; };
  /** Server-owned request correlation id. */
  traceId: string;
}
