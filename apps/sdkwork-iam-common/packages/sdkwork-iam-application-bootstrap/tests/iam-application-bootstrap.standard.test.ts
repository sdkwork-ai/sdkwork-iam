import { describe, expect, it, vi, type Mock } from "vitest";

import { createTestJwt } from "@sdkwork/runtime-bootstrap";
import {
  bootstrapDeployApplication,
  buildBootstrapEnvRecord,
  createFetchIamApplicationBootstrapClient,
  createIamApplicationBootstrap,
  deriveProvisioningIdempotencyKey,
  formatBootstrapEnvFile,
  manifestToProvisionCommand,
  mapManifestAppTypeToApplicationType,
  mergeBootstrapAuth,
  resolveBootstrapEnvironmentFromEnv,
  tenantApplicationInstanceKey,
  validateManifestForBootstrap,
  validateTenantApplicationProvisionCommand,
} from "../src/index";
import type {
  ApplicationBootstrapResult,
  IamTenantApplicationProvisionCommand,
} from "../src/index";

type ClientMock = {
  createAccessCredential: Mock;
  enableTenantApplication: Mock;
  provisionTenantApplication: Mock;
};

const TEST_ACCESS_CREDENTIAL = createTestJwt({
  tenant_id: "100001",
  organization_id: "0",
  app_id: "app-1",
  environment: "dev",
  deployment_mode: "saas",
});
const TEST_AUTH_TOKEN = createTestJwt({
  tenant_id: "100001",
  user_id: "1",
  session_id: "session-1",
  app_id: "app-1",
  auth_level: "system",
});

const manifest = {
  app: {
    key: "demo-app",
    name: "Demo App",
    appType: "APP_REACT",
  },
  backend: {
    appId: "demo-app",
    accessTokenPermissionScope: ["iam.users.read"],
    tenantId: "100001",
    organizationId: "0",
  },
};

const environment = {
  backendApiBaseUrl: "http://127.0.0.1:8080",
  environment: "dev",
  primaryDomain: "demo.local",
  instanceKey: "dev",
};

const deployCommand: IamTenantApplicationProvisionCommand = {
  applicationType: "h5",
  deployApplicationId: "deploy-demo",
  tenantId: "100001",
  organizationId: "0",
  instanceKey: "deploy_demo_dev",
  displayName: "Demo App",
  environment: "dev",
  accessPermissions: ["iam.users.read"],
  provisioningIdempotencyKey: "idem-explicit-1",
};

function createdClient(overrides: Partial<ClientMock> = {}): ClientMock {
  return {
    provisionTenantApplication: vi.fn().mockResolvedValue({ tenantApplicationId: "ta-1", appId: "app-1" }),
    enableTenantApplication: vi.fn().mockResolvedValue({
      tenantApplicationId: "ta-1",
      appId: "app-1",
      status: "enabled",
    }),
    createAccessCredential: vi.fn().mockResolvedValue({
      tenantApplicationId: "ta-1",
      appId: "app-1",
      accessCredential: TEST_ACCESS_CREDENTIAL,
      authToken: TEST_AUTH_TOKEN,
      tenantId: "100001",
      organizationId: "0",
    }),
    ...overrides,
  };
}

function expectEnvHandoff(result: ApplicationBootstrapResult) {
  expect(result.env.SDKWORK_TENANT_APPLICATION_ID).toBe("ta-1");
  expect(result.env.SDKWORK_APP_ID).toBe("app-1");
  expect(result.env.SDKWORK_APP_DOMAIN).toBe("demo.local");
  expect(result.env.SDKWORK_ACCESS_TOKEN).toBe(TEST_ACCESS_CREDENTIAL);
}

describe("@sdkwork/iam-application-bootstrap", () => {
  it("resolves canonical tenant scope from env when overrides are absent", () => {
    expect(resolveBootstrapEnvironmentFromEnv({}, {})).toMatchObject({
      tenantId: "100001",
      organizationId: "0",
    });
  });

  it("validates manifest permission scope before bootstrap", () => {
    expect(() =>
      validateManifestForBootstrap({
        app: { key: "demo", name: "Demo", appType: "web" },
        backend: { appId: "demo-app" },
      }),
    ).toThrow(/accessTokenPermissionScope/);
  });

  it("merges bootstrap auth from profile when password-only auth is supplied", () => {
    expect(
      mergeBootstrapAuth(
        { deployApplicationId: "deploy-demo" },
        { password: "secret" },
        { email: "admin@example.com" },
      ),
    ).toEqual({
      deployApplicationId: "deploy-demo",
      password: "secret",
      username: "admin@example.com",
    });
  });

  it("onboards the deploy application through create → enable → access credential without a template", async () => {
    const client = createdClient();
    const module = createIamApplicationBootstrap({ client });

    const result = await module.bootstrapFromManifest({
      client,
      manifest,
      manifestHash: "abc",
      auth: { username: "admin", password: "secret" },
      environment,
    });

    expect(client.provisionTenantApplication).toHaveBeenCalledOnce();
    const provisionBody = client.provisionTenantApplication.mock.calls[0]?.[0];
    expect(provisionBody).toMatchObject({
      applicationType: "pc",
      deployApplicationId: "demo-app",
      instanceKey: "dev",
      displayName: "Demo App",
      environment: "dev",
      tenantId: "100001",
      organizationId: "0",
      accessPermissions: ["iam.users.read"],
      username: "admin",
      password: "secret",
    });
    expect(provisionBody?.provisioningIdempotencyKey).toMatch(/^iam-bootstrap-[0-9a-f]{40}$/u);
    expect(provisionBody).not.toHaveProperty("templateId");
    expect(provisionBody).not.toHaveProperty("appKey");

    expect(client.enableTenantApplication).toHaveBeenCalledWith(
      "ta-1",
      expect.objectContaining({ tenantId: "100001" }),
    );
    expect(client.createAccessCredential).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "100001",
        organizationId: "0",
        tenantApplicationId: "ta-1",
      }),
    );
    expect(client).not.toHaveProperty("registerApplication");

    expect(result.deployApplicationId).toBe("demo-app");
    expect(result.applicationType).toBe("pc");
    expect(result.tenantApplicationId).toBe("ta-1");
    expectEnvHandoff(result);
  });

  it("names deployApplicationId when neither the caller nor the manifest declares an anchor", () => {
    expect(() =>
      manifestToProvisionCommand(
        { app: { key: "demo", name: "Demo", appType: "APP_HTML" }, backend: {} },
        environment,
      ),
    ).toThrow(/deployApplicationId is required to provision a tenant application/u);

    expect(() =>
      validateTenantApplicationProvisionCommand({ ...deployCommand, deployApplicationId: undefined }),
    ).toThrow(/^deployApplicationId is required to provision a tenant application$/u);
  });

  it("names applicationType when the manifest declares no app type", () => {
    expect(() =>
      manifestToProvisionCommand(
        { app: { key: "demo", name: "Demo" }, backend: { appId: "demo-app" } },
        environment,
      ),
    ).toThrow(/applicationType is required to provision a tenant application/u);

    expect(() =>
      validateTenantApplicationProvisionCommand({ ...deployCommand, applicationType: undefined }),
    ).toThrow(/^applicationType is required to provision a tenant application$/u);
  });

  it("rejects an applicationType outside the published enum", () => {
    expect(() =>
      validateTenantApplicationProvisionCommand({ ...deployCommand, applicationType: "desktop" }),
    ).toThrow(/applicationType "desktop" is not a valid tenant application type/u);
  });

  it("lets explicit deploy-application input override manifest defaults", () => {
    const command = manifestToProvisionCommand(manifest, environment, {
      applicationType: "h5",
      deployApplicationId: "deploy-override",
      displayName: "Override App",
      accessPermissions: [],
      instanceKey: "override_dev",
      provisioningIdempotencyKey: "idem-override",
      runtimeConfig: { oauth: { relyingParty: { clientId: "demo" } } },
    });

    expect(command).toMatchObject({
      applicationType: "h5",
      deployApplicationId: "deploy-override",
      displayName: "Override App",
      instanceKey: "override_dev",
      provisioningIdempotencyKey: "idem-override",
      runtimeConfig: { oauth: { relyingParty: { clientId: "demo" } } },
    });
    // An empty access-permission list is a valid explicit "no API scope" choice.
    expect(command.accessPermissions).toEqual([]);
  });

  it("maps the manifest OAuth relying party into runtimeConfig", () => {
    const command = manifestToProvisionCommand(
      {
        ...manifest,
        oauth: { relyingParty: { clientId: "demo", redirectUris: ["https://demo.local/callback"] } },
      },
      environment,
    );
    expect(command.runtimeConfig).toEqual({
      oauth: { relyingParty: { clientId: "demo", redirectUris: ["https://demo.local/callback"] } },
    });
  });

  it("replays the first outcome when the idempotency key repeats", async () => {
    const client = createdClient();
    const module = createIamApplicationBootstrap({ client });
    const input = {
      client,
      auth: { username: "admin", password: "secret" },
      command: deployCommand,
    };

    const first = await module.bootstrapDeployApplication(input);
    const second = await module.bootstrapDeployApplication(input);

    expect(client.provisionTenantApplication).toHaveBeenCalledOnce();
    expect(client.enableTenantApplication).toHaveBeenCalledOnce();
    expect(client.createAccessCredential).toHaveBeenCalledOnce();
    expect(second).toBe(first);
    expect(second.provisioningIdempotencyKey).toBe("idem-explicit-1");
  });

  it("provisions again when the idempotency key changes", async () => {
    const client = createdClient();
    const module = createIamApplicationBootstrap({ client });

    await module.bootstrapDeployApplication({
      client,
      auth: { username: "admin", password: "secret" },
      command: deployCommand,
    });
    await module.bootstrapDeployApplication({
      client,
      auth: { username: "admin", password: "secret" },
      command: { ...deployCommand, provisioningIdempotencyKey: "idem-explicit-2" },
    });

    expect(client.provisionTenantApplication).toHaveBeenCalledTimes(2);
  });

  it("evicts a failed idempotency key so a retry provisions again", async () => {
    const provisionTenantApplication = vi
      .fn()
      .mockRejectedValueOnce(new Error("tenantApplications.create failed (HTTP 503)"))
      .mockResolvedValue({ tenantApplicationId: "ta-1", appId: "app-1" });
    const client = createdClient({ provisionTenantApplication });
    const module = createIamApplicationBootstrap({ client });
    const input = {
      client,
      auth: { username: "admin", password: "secret" },
      command: deployCommand,
    };

    await expect(module.bootstrapDeployApplication(input)).rejects.toThrow(/HTTP 503/u);
    const retried = await module.bootstrapDeployApplication(input);

    expect(provisionTenantApplication).toHaveBeenCalledTimes(2);
    expect(retried.tenantApplicationId).toBe("ta-1");
  });

  it("derives a stable instance key and idempotency key from the installation identity", () => {
    expect(tenantApplicationInstanceKey("sdkwork-demo", "development")).toBe("sdkwork_demo_dev");
    expect(tenantApplicationInstanceKey("sdkwork-demo", "production")).toBe("sdkwork_demo_prod");
    expect(tenantApplicationInstanceKey("sdkwork-demo", "staging")).toBe("sdkwork_demo_staging");
    expect(mapManifestAppTypeToApplicationType("APP_HTML")).toBe("h5");
    expect(mapManifestAppTypeToApplicationType("APP_FLUTTER")).toBe("flutter");
    expect(mapManifestAppTypeToApplicationType("APP_API")).toBe("api");
    expect(mapManifestAppTypeToApplicationType(undefined)).toBeUndefined();

    const first = deriveProvisioningIdempotencyKey(deployCommand);
    const second = deriveProvisioningIdempotencyKey({ ...deployCommand });
    expect(first).toBe(second);
    expect(first).toMatch(/^iam-bootstrap-[0-9a-f]{40}$/u);
    expect(deriveProvisioningIdempotencyKey({ ...deployCommand, instanceKey: "other_dev" })).not.toBe(first);
  });

  it("formats bootstrap env output for local runtime handoff", () => {
    const envFile = formatBootstrapEnvFile({
      primaryDomain: "demo.local",
      result: {
        provisioned: { tenantApplicationId: "ta-1", tenantId: "100001", organizationId: "0" },
        enabled: { tenantApplicationId: "ta-1", appId: "app-1" },
        issued: {
          tenantApplicationId: "ta-1",
          appId: "app-1",
          accessCredential: TEST_ACCESS_CREDENTIAL,
          authToken: TEST_AUTH_TOKEN,
          tenantId: "100001",
          organizationId: "0",
        },
        tenantApplicationId: "ta-1",
        deployApplicationId: "deploy-demo",
        applicationType: "h5",
        provisioningIdempotencyKey: "idem-explicit-1",
        env: buildBootstrapEnvRecord({
          primaryDomain: "demo.local",
          result: {
            provisioned: { tenantApplicationId: "ta-1" },
            enabled: { tenantApplicationId: "ta-1" },
            issued: { accessCredential: TEST_ACCESS_CREDENTIAL, authToken: TEST_AUTH_TOKEN },
            tenantApplicationId: "ta-1",
            deployApplicationId: "deploy-demo",
            applicationType: "h5",
            provisioningIdempotencyKey: "idem-explicit-1",
            env: {},
          },
        }),
      },
    });

    expect(envFile).toContain("SDKWORK_APP_DOMAIN=demo.local");
    expect(envFile).toContain(`SDKWORK_ACCESS_TOKEN=${TEST_ACCESS_CREDENTIAL}`);
    expect(envFile).not.toContain("SDKWORK_AUTH_TOKEN=");
    expect(envFile).not.toContain("SDKWORK_APP_ACCESS_CREDENTIAL=");
  });

  it("posts deploy-application onboarding to tenant_applications through the fetch transport", async () => {
    const calls: string[] = [];
    const fetchStub = vi.fn(async (url: string | URL | Request) => {
      calls.push(String(url));
      return new Response(
        JSON.stringify({ code: 0, data: { item: { tenantApplicationId: "ta-fetch", deployApplicationId: "deploy-demo" } } }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    });
    const client = createFetchIamApplicationBootstrapClient({
      baseUrl: "http://127.0.0.1:3900/backend/v3/api",
      fetch: fetchStub as unknown as typeof fetch,
    });

    const provisioned = await client.provisionTenantApplication(deployCommand);

    expect(provisioned.tenantApplicationId).toBe("ta-fetch");
    expect(calls).toEqual(["http://127.0.0.1:3900/backend/v3/api/iam/tenant_applications"]);
  });

  it("reports the API problem detail when provisioning fails", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({ code: 42201, traceId: "trace-1", detail: "applicationType is required to provision a tenant application" }),
        { status: 422, headers: { "content-type": "application/problem+json" } },
      ));
    const client = createFetchIamApplicationBootstrapClient({
      baseUrl: "http://127.0.0.1:3900",
      fetch: fetchStub as unknown as typeof fetch,
    });

    await expect(
      bootstrapDeployApplication({
        client,
        auth: { username: "admin", password: "secret" },
        command: deployCommand,
      }),
    ).rejects.toThrow(/applicationType is required to provision a tenant application/u);
  });
});
