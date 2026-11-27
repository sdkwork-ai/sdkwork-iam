// SDKWORK-IAM-H5-ADMIN-SDK: authored backend-admin client boundary.
import { createClient, type SdkworkBackendClient } from "@sdkwork/iam-backend-sdk";

export interface CreateIamH5AdminBackendClientInput {
  baseUrl: string;
  accessToken?: string;
  authToken?: string;
}

export interface iamH5AdminBackendAdminSdkClient {
  readonly surface: "backend-api";
  readonly baseUrl: string;
  readonly client: SdkworkBackendClient;
  setAccessToken(token: string | undefined): void;
  setAuthToken(token: string | undefined): void;
}

export function createIamH5AdminBackendAdminSdkClient(
  input: CreateIamH5AdminBackendClientInput,
): iamH5AdminBackendAdminSdkClient {
  const baseUrl = input.baseUrl.trim();
  if (!baseUrl) {
    throw new Error("@sdkwork/iam-h5-admin-core: backend admin base url is required");
  }
  const client = createClient({
    baseUrl,
    ...(input.accessToken ? { accessToken: input.accessToken } : {}),
    ...(input.authToken ? { authToken: input.authToken } : {}),
  });
  return {
    surface: "backend-api",
    baseUrl,
    client,
    setAccessToken(token: string | undefined) {
      client.setAccessToken(token ?? "");
    },
    setAuthToken(token: string | undefined) {
      client.setAuthToken(token ?? "");
    },
  };
}
