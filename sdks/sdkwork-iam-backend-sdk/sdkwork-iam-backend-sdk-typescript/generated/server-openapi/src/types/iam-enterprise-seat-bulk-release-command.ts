export interface IamEnterpriseSeatBulkReleaseCommand {
  items: { seatId: string; }[];
  reason?: string | null;
}
