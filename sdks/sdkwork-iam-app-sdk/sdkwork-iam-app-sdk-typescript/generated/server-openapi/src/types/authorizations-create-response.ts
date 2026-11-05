export interface AuthorizationsCreateResponse {
  code: number;
  traceId: string;
  data: { authorizationStateId: string; expiresAt: string; };
}
