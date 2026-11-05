export interface AuthorizationsCreateRequest {
  clientId: string;
  responseType: 'code';
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  tenantId?: string;
}
