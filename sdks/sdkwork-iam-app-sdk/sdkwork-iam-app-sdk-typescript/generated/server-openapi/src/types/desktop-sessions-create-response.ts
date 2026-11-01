export interface DesktopSessionsCreateResponse {
  code: number;
  traceId: string;
  data: { accessToken: string; authToken: string; refreshToken?: string; sessionId?: string; context?: Record<string, unknown>; user?: Record<string, unknown>; };
}
