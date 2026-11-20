export interface AuthorizationsCreateResponse201 {
  code: number;
  traceId: string;
  data: { item: { authorizationStateId: string; expiresAt: string; }; };
}
