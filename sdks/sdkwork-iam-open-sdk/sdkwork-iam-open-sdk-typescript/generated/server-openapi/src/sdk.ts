import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkCustomConfig } from './types/common';



export class SdkworkCustomClient {
  private httpClient: HttpClient;


  constructor(config: SdkworkCustomConfig) {
    this.httpClient = createHttpClient(config);

  }

  setApiKey(apiKey: string): this {
    this.httpClient.setApiKey(apiKey);
    return this;
  }
  get http(): HttpClient {
    return this.httpClient;
  }
}

export function createClient(config: SdkworkCustomConfig): SdkworkCustomClient {
  return new SdkworkCustomClient(config);
}

export default SdkworkCustomClient;
