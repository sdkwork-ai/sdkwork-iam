export interface AuthorizationsCompletionsCreateResponse {
  code: number;
  traceId: string;
  data: { authorizationCode: string; redirectUrl: string; };
}
