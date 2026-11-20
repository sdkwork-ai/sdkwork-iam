export interface AuthorizationsCompletionsCreateResponse201 {
  code: number;
  traceId: string;
  data: { item: { authorizationCode: string; redirectUrl: string; }; };
}
