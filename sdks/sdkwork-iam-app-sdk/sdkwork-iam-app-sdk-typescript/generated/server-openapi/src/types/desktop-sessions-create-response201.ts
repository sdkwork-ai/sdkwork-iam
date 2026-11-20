export interface DesktopSessionsCreateResponse201 {
  code: number;
  traceId: string;
  data: { item: { accessToken: string; authToken: string; refreshToken?: string; sessionId?: string; context?: Record<string, unknown>; user?: Record<string, unknown>; }; };
}
