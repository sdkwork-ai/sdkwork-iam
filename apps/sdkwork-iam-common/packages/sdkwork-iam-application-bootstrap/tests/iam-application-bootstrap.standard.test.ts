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
  resolveManifestApplicationType,
  installationInstanceKey,
  validateManifestForBootstrap,
  validateInstallationProvisionCommand,
} from "../src/index";
import type {
  ApplicationBootstrapResult,
  IamInstallationProvisionCommand,
} from "../src/index";

type ClientMock = {
  createAccessCredential: Mock;
  enableInstallation: Mock;
  provisionInstallation: Mock;
};

const TEST_ACCESS_CREDENTIAL = createTestJwt({
  tenant_id: "100001",
  organization_id: "0",
  app_id: "demo-app",
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

const deployCommand: IamInstallationProvisionCommand = {
  applicationType: "h5",
  deployApplicationId: "demo-app",
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
    // Echo the command so a test that overrides one dimension still exercises
    // the real "stored row reflects the command" contract.
    provisionInstallation: vi.fn(async (body: IamInstallationProvisionCommand) => ({
      installationId: "ta-1",
      appId: "app-1",
      deployApplicationId: body.deployApplicationId,
      tenantId: body.tenantId,
      organizationId: body.organizationId,
      ownershipScope: body.ownershipScope,
      applicationType: body.applicationType,
      instanceKey: body.instanceKey,
      displayName: body.displayName,
      environment: body.environment,
      primaryDomain: body.primaryDomain,
      accessPermissions: body.accessPermissions ?? [],
    })),
    enableInstallation: vi.fn().mockResolvedValue({
      installationId: "ta-1",
      appId: "app-1",
      status: "enabled",
    }),
    createAccessCredential: vi.fn().mockResolvedValue({
      installationId: "ta-1",
      appId: "demo-app",
      accessCredential: TEST_ACCESS_CREDENTIAL,
      authToken: TEST_AUTH_TOKEN,
      tenantId: "100001",
      organizationId: "0",
    }),
    ...overrides,
  };
}

function expectEnvHandoff(result: ApplicationBootstrapResult) {
  expect(result.env.SDKWORK_INSTALLATION_ID).toBe("ta-1");
  expect(result.env.SDKWORK_DEPLOY_APPLICATION_ID).toBe("demo-app");
  expect(result.env.SDKWORK_APP_ID).toBe("demo-app");
  expect(result.env.SDKWORK_APP_DOMAIN).toBe("demo.local");
  expect(result.env.SDKWORK_ACCESS_TOKEN).toBe(TEST_ACCESS_CREDENTIAL);
}

function bootstrapWith(client: ClientMock): Promise<ApplicationBootstrapResult> {
  return createIamApplicationBootstrap({ client }).bootstrapFromManifest({
    client,
    manifest,
    manifestHash: "abc",
    auth: { username: "admin", password: "secret" },
    environment,
  });
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

    expect(client.provisionInstallation).toHaveBeenCalledOnce();
    const provisionBody = client.provisionInstallation.mock.calls[0]?.[0];
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

    expect(client.enableInstallation).toHaveBeenCalledWith(
      "ta-1",
      expect.objectContaining({ tenantId: "100001" }),
    );
    expect(client.createAccessCredential).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "100001",
        organizationId: "0",
        installationId: "ta-1",
      }),
    );
    expect(client).not.toHaveProperty("registerApplication");

    expect(result.deployApplicationId).toBe("demo-app");
    expect(result.applicationType).toBe("pc");
    expect(result.installationId).toBe("ta-1");
    expectEnvHandoff(result);
  });

  it("carries the release scope and refuses a scope that contradicts the organization", () => {
    const command = manifestToProvisionCommand(manifest, environment);
    expect(command.ownershipScope).toBe("TENANT");

    expect(manifestToProvisionCommand(manifest, environment, {
      ownershipScope: "ORGANIZATION",
      organizationId: "42",
    })).toMatchObject({ ownershipScope: "ORGANIZATION", organizationId: "42" });

    expect(() => manifestToProvisionCommand(manifest, environment, {
      ownershipScope: "ORGANIZATION",
    })).toThrow(/ORGANIZATION requires a non-zero organizationId/u);

    expect(() => manifestToProvisionCommand(manifest, environment, {
      ownershipScope: "USER",
    })).toThrow(/USER requires ownerUserId/u);

    expect(manifestToProvisionCommand(manifest, environment, {
      ownershipScope: "USER",
      ownerUserId: "7",
    })).toMatchObject({ ownershipScope: "USER", ownerUserId: "7" });

    expect(() => manifestToProvisionCommand(manifest, environment, {
      ownerUserId: "7",
    })).toThrow(/must not declare ownerUserId/u);

    expect(() => validateInstallationProvisionCommand({
      ...deployCommand,
      ownershipScope: "SUPER",
    })).toThrow(/ownershipScope must be one of TENANT\|ORGANIZATION\|USER/u);
  });

  it("repairs an installation the provisioning surface left unbound", async () => {
    const provisionInstallation = vi
      .fn()
      .mockResolvedValueOnce({ installationId: "ta-1", appId: "app-1", ownershipScope: "TENANT" })
      .mockResolvedValue({
        installationId: "ta-1",
        appId: "app-1",
        deployApplicationId: "demo-app",
        ownershipScope: "TENANT",
      });
    const client = createdClient({ provisionInstallation });

    const result = await bootstrapWith(client);

    expect(provisionInstallation).toHaveBeenCalledTimes(2);
    expect(result.deployApplicationId).toBe("demo-app");
    expect(result.env.SDKWORK_DEPLOY_APPLICATION_ID).toBe("demo-app");
    expect(result.env.SDKWORK_ACCESS_TOKEN).toBe(TEST_ACCESS_CREDENTIAL);
  });

  it("refuses an installation bound to another deployment without retrying", async () => {
    const provisionInstallation = vi.fn().mockResolvedValue({
      installationId: "ta-1",
      appId: "app-1",
      deployApplicationId: "other-app",
      ownershipScope: "TENANT",
    });
    const client = createdClient({ provisionInstallation });

    await expect(bootstrapWith(client)).rejects.toThrow(
      /bound to deploy application other-app, not the provisioned demo-app/u,
    );
    expect(client.createAccessCredential).not.toHaveBeenCalled();
  });

  it("refuses when the anchor is still missing after the repair attempt", async () => {
    const provisionInstallation = vi.fn().mockResolvedValue({
      installationId: "ta-1",
      appId: "app-1",
      ownershipScope: "TENANT",
    });
    const client = createdClient({ provisionInstallation });

    await expect(bootstrapWith(client)).rejects.toThrow(
      /is not bound to deploy application demo-app; the provisioning surface did not persist the anchor/u,
    );
    expect(provisionInstallation).toHaveBeenCalledTimes(2);
  });

  it("refuses a release scope that contradicts the stored installation", async () => {
    const client = createdClient({
      provisionInstallation: vi.fn().mockResolvedValue({
        installationId: "ta-1",
        appId: "app-1",
        deployApplicationId: "demo-app",
        ownershipScope: "USER",
      }),
    });

    await expect(bootstrapWith(client)).rejects.toThrow(
      /ownershipScope USER is not the declared TENANT \(immutable\)/u,
    );
  });

  it("refuses an installation that belongs to another tenant", async () => {
    const client = createdClient({
      provisionInstallation: vi.fn().mockResolvedValue({
        installationId: "ta-1",
        deployApplicationId: "demo-app",
        tenantId: "200002",
      }),
    });

    await expect(bootstrapWith(client)).rejects.toThrow(
      /tenant 200002 is not the requested 100001 \(tenant isolation\)/u,
    );
    expect(client.createAccessCredential).not.toHaveBeenCalled();
  });

  it("reports every configuration disagreement before issuing", async () => {
    const client = createdClient({
      provisionInstallation: vi.fn().mockResolvedValue({
        installationId: "ta-1",
        deployApplicationId: "demo-app",
        applicationType: "api",
        instanceKey: "other",
        environment: "staging",
        primaryDomain: "other.local",
        displayName: "Other",
        accessPermissions: ["other:read"],
      }),
    });

    await expect(bootstrapWith(client)).rejects.toThrow(
      /installation ta-1 is incomplete: applicationType api is not the requested pc; instanceKey other is not the requested dev; environment staging is not the requested dev; primaryDomain other.local is not the requested demo.local; displayName "Other" is not the requested "Demo App"; accessPermissions \[other:read\] is not the requested \[iam.users.read\]/u,
    );
    expect(client.createAccessCredential).not.toHaveBeenCalled();
  });

  it("refuses an installation whose OAuth relying party is another client", async () => {
    const client = createdClient({
      provisionInstallation: vi.fn().mockResolvedValue({
        installationId: "ta-1",
        deployApplicationId: "demo-app",
        oauthRelyingParty: { clientId: "other" },
      }),
    });

    await expect(createIamApplicationBootstrap({ client }).bootstrapFromManifest({
      client,
      manifest: {
        ...manifest,
        oauth: { relyingParty: { clientId: "demo", redirectUris: ["https://demo.local/cb"] } },
      },
      manifestHash: "abc",
      auth: { username: "admin", password: "secret" },
      environment,
    })).rejects.toThrow(/OAuth relying party other is not the declared demo/u);
  });

  it("refuses a credential minted for another tenant", async () => {
    const client = createdClient({
      createAccessCredential: vi.fn().mockResolvedValue({
        installationId: "ta-1",
        appId: "demo-app",
        accessCredential: createTestJwt({ tenant_id: "200002", app_id: "demo-app" }),
        tenantId: "100001",
        organizationId: "0",
      }),
    });

    await expect(bootstrapWith(client)).rejects.toThrow(
      /access credential tenant 200002 does not match the provisioned tenant 100001; tenant isolation requires one tenant/u,
    );
  });

  it("refuses a credential whose release scope contradicts the installation", async () => {
    const client = createdClient({
      createAccessCredential: vi.fn().mockResolvedValue({
        installationId: "ta-1",
        appId: "demo-app",
        accessCredential: createTestJwt({
          tenant_id: "100001",
          app_id: "demo-app",
          ownership_scope: "USER",
        }),
        tenantId: "100001",
        organizationId: "0",
      }),
    });

    await expect(bootstrapWith(client)).rejects.toThrow(
      /access credential ownershipScope USER does not match the provisioned TENANT/u,
    );
  });

  it("refuses a bootstrap whose installation did not reach enabled", async () => {
    const client = createdClient({
      enableInstallation: vi.fn().mockResolvedValue({
        installationId: "ta-1",
        appId: "app-1",
        status: "pending_config",
      }),
    });

    await expect(bootstrapWith(client)).rejects.toThrow(
      /is not enabled after bootstrap \(status=pending_config\)/u,
    );
  });

  it("refuses an access credential issued for another deploy application", async () => {
    const client = createdClient({
      createAccessCredential: vi.fn().mockResolvedValue({
        installationId: "ta-1",
        appId: "other-app",
        accessCredential: createTestJwt({ tenant_id: "100001", app_id: "other-app" }),
        tenantId: "100001",
        organizationId: "0",
      }),
    });

    await expect(bootstrapWith(client)).rejects.toThrow(
      /names deploy application other-app, but this bootstrap provisioned demo-app/u,
    );
  });

  it("refuses a credential that names no deploy application", async () => {
    for (const accessCredential of [
      createTestJwt({ tenant_id: "100001" }),
      createTestJwt({ tenant_id: "100001", app_id: "   " }),
      "header.%%%.signature",
      "header..signature",
    ]) {
      const client = createdClient({
        createAccessCredential: vi.fn().mockResolvedValue({
          installationId: "ta-1",
          accessCredential,
          tenantId: "100001",
          organizationId: "0",
        }),
      });

      await expect(bootstrapWith(client)).rejects.toThrow(
        /does not name the deploy application demo-app/u,
      );
    }
  });

  it("reads the anchor from the credential's own claim when the response omits its appId", async () => {
    const client = createdClient({
      createAccessCredential: vi.fn().mockResolvedValue({
        installationId: "ta-1",
        accessCredential: TEST_ACCESS_CREDENTIAL,
        tenantId: "100001",
        organizationId: "0",
      }),
    });

    const result = await bootstrapWith(client);

    expect(result.deployApplicationId).toBe("demo-app");
    expect(result.env.SDKWORK_ACCESS_TOKEN).toBe(TEST_ACCESS_CREDENTIAL);
  });

  it("falls back to the reported appId when the credential carries no claim", async () => {
    const client = createdClient({
      createAccessCredential: vi.fn().mockResolvedValue({
        installationId: "ta-1",
        appId: "demo-app",
        accessCredential: createTestJwt({ tenant_id: "100001" }),
        tenantId: "100001",
        organizationId: "0",
      }),
    });

    const result = await bootstrapWith(client);

    expect(result.deployApplicationId).toBe("demo-app");
    expect(result.env.SDKWORK_ACCESS_TOKEN).toBeDefined();
  });

  it("names deployApplicationId when neither the caller nor the manifest declares an anchor", () => {
    expect(() =>
      manifestToProvisionCommand(
        { app: { key: "demo", name: "Demo", appType: "APP_HTML" }, backend: {} },
        environment,
      ),
    ).toThrow(/deployApplicationId is required to provision a tenant application/u);

    expect(() =>
      validateInstallationProvisionCommand({ ...deployCommand, deployApplicationId: undefined }),
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
      validateInstallationProvisionCommand({ ...deployCommand, applicationType: undefined }),
    ).toThrow(/^applicationType is required to provision a tenant application$/u);
  });

  it("rejects an applicationType outside the published enum", () => {
    expect(() =>
      validateInstallationProvisionCommand({ ...deployCommand, applicationType: "watchos" }),
    ).toThrow(/applicationType "watchos" is not a valid tenant application type/u);
    expect(() =>
      validateInstallationProvisionCommand({ ...deployCommand, applicationType: "desktop" }),
    ).not.toThrow();
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

    expect(client.provisionInstallation).toHaveBeenCalledOnce();
    expect(client.enableInstallation).toHaveBeenCalledOnce();
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

    expect(client.provisionInstallation).toHaveBeenCalledTimes(2);
  });

  it("evicts a failed idempotency key so a retry provisions again", async () => {
    const provisionInstallation = vi
      .fn()
      .mockRejectedValueOnce(new Error("tenantApplications.create failed (HTTP 503)"))
      .mockResolvedValue({
        installationId: "ta-1",
        appId: "app-1",
        deployApplicationId: "demo-app",
        ownershipScope: "TENANT",
      });
    const client = createdClient({ provisionInstallation });
    const module = createIamApplicationBootstrap({ client });
    const input = {
      client,
      auth: { username: "admin", password: "secret" },
      command: deployCommand,
    };

    await expect(module.bootstrapDeployApplication(input)).rejects.toThrow(/HTTP 503/u);
    const retried = await module.bootstrapDeployApplication(input);

    expect(provisionInstallation).toHaveBeenCalledTimes(2);
    expect(retried.installationId).toBe("ta-1");
  });

  it("derives a stable instance key and idempotency key from the installation identity", () => {
    expect(installationInstanceKey("sdkwork-demo", "development")).toBe("sdkwork_demo_dev");
    expect(installationInstanceKey("sdkwork-demo", "production")).toBe("sdkwork_demo_prod");
    expect(installationInstanceKey("sdkwork-demo", "staging")).toBe("sdkwork_demo_staging");
    expect(mapManifestAppTypeToApplicationType("APP_HTML")).toBe("h5");
    expect(mapManifestAppTypeToApplicationType("APP_FLUTTER")).toBe("flutter");
    expect(mapManifestAppTypeToApplicationType("APP_API")).toBe("api");
    expect(mapManifestAppTypeToApplicationType("APP_UNIAPP")).toBe("miniprogram");
    expect(mapManifestAppTypeToApplicationType("APP_MINIPROGRAM")).toBe("miniprogram");
    expect(mapManifestAppTypeToApplicationType("APP_IOS")).toBe("ios");
    expect(mapManifestAppTypeToApplicationType("APP_ANDROID")).toBe("android");
    expect(mapManifestAppTypeToApplicationType("APP_HARMONY")).toBe("harmonyos");
    expect(mapManifestAppTypeToApplicationType("APP_DESKTOP")).toBe("desktop");
    expect(mapManifestAppTypeToApplicationType(undefined)).toBeUndefined();

    const first = deriveProvisioningIdempotencyKey(deployCommand);
    const second = deriveProvisioningIdempotencyKey({ ...deployCommand });
    expect(first).toBe(second);
    expect(first).toMatch(/^iam-bootstrap-[0-9a-f]{40}$/u);
    expect(deriveProvisioningIdempotencyKey({ ...deployCommand, instanceKey: "other_dev" })).not.toBe(first);
  });

  it("resolves the application type from the runtime surface, not the framework appType", () => {
    expect(resolveManifestApplicationType({
      ...manifest,
      runtime: {
        clientArchitectures: ["mini-program"],
        defaultArchitecture: "mini-program",
        defaultPlatform: "MP_WEIXIN",
        family: "mini-program",
        framework: "mp-weixin",
        targetPlatforms: ["mini-program"],
      },
    })).toBe("miniprogram");
    expect(resolveManifestApplicationType({
      ...manifest,
      app: { ...manifest.app, appType: "APP_HTML" },
      runtime: { defaultArchitecture: "x64", defaultPlatform: "WEB", family: "desktop", framework: "tauri" },
    })).toBe("desktop");
    expect(resolveManifestApplicationType({
      ...manifest,
      runtime: { defaultArchitecture: "h5", defaultPlatform: "H5", family: "mobile" },
    })).toBe("h5");
    expect(resolveManifestApplicationType({
      ...manifest,
      app: { ...manifest.app, appType: "APP_UNIAPP" },
      runtime: { defaultArchitecture: "uniappx", defaultPlatform: "APP_ANDROID", family: "mobile" },
    })).toBe("android");
    expect(resolveManifestApplicationType({
      ...manifest,
      app: { ...manifest.app, appType: "SDK" },
      runtime: { family: "server", framework: "rust-service" },
    })).toBe("api");
    expect(resolveManifestApplicationType({
      ...manifest,
      app: { ...manifest.app, appType: "APP_HTML" },
      publish: { installPlatforms: ["WEB"], platforms: ["WEB"] },
      runtime: { family: "server", framework: "rust-axum" },
    })).toBe("api");
    // No runtime surface: the framework fallback still applies.
    expect(resolveManifestApplicationType(manifest)).toBe("pc");

    // The provisioning command inherits the resolved value.
    expect(manifestToProvisionCommand({
      ...manifest,
      runtime: { defaultArchitecture: "mini-program", defaultPlatform: "MP_WEIXIN", family: "mini-program" },
    }, environment).applicationType).toBe("miniprogram");
    expect(resolveManifestApplicationType({
      ...manifest,
      app: { ...manifest.app, appType: "APP_UNIAPP" },
      publish: { installPlatforms: ["APP_ANDROID", "APP_IOS"], platforms: ["APP_ANDROID", "APP_IOS"] },
    })).toBe("android");

    // The declared framework decides, even when the framework family in
    // `app.appType` is stale: an `APP_HTML` root built with Flutter is Flutter.
    expect(resolveManifestApplicationType({
      ...manifest,
      app: { ...manifest.app, appType: "APP_HTML" },
      runtime: { family: "mobile", framework: "flutter" },
      publish: { platforms: ["APP_ANDROID", "APP_IOS"] },
    })).toBe("flutter");

    // A web root that also lists other delivery surfaces stays the browser
    // surface; the extra platforms are not a new endpoint by themselves.
    expect(resolveManifestApplicationType({
      ...manifest,
      app: { ...manifest.app, appType: "APP_REACT" },
      runtime: { family: "web", framework: "react" },
      publish: { platforms: ["WEB", "H5", "MP_WEIXIN", "DESKTOP_WINDOWS"] },
    })).toBe("pc");
    expect(resolveManifestApplicationType({
      ...manifest,
      runtime: {
        family: "web",
        framework: "web",
        clientArchitectures: ["pc-web", "h5", "tauri", "mini-program"],
      },
      publish: { platforms: ["WEB", "H5", "DESKTOP"] },
    })).toBe("pc");

    // A server root that also advertises a web install platform is the API
    // deployment, and a desktop-family root with only a web artifact is the PC
    // web endpoint; only a desktop host framework is `desktop`.
    expect(resolveManifestApplicationType({
      ...manifest,
      runtime: { family: "server", framework: "rust-axum" },
      publish: { platforms: ["API", "WEB", "H5", "DESKTOP"] },
    })).toBe("api");
    expect(resolveManifestApplicationType({
      ...manifest,
      runtime: { family: "desktop", framework: "react" },
      publish: { platforms: ["WEB", "DESKTOP"] },
    })).toBe("pc");
    expect(resolveManifestApplicationType({
      ...manifest,
      runtime: { family: "desktop", framework: "react-tauri" },
      publish: { platforms: ["WEB", "DESKTOP_WINDOWS"] },
    })).toBe("desktop");

    // An H5-only delivery is the H5 endpoint even when the manifest kept the
    // coarse `web` family; `WEB` plus `H5` stays the browser surface.
    expect(resolveManifestApplicationType({
      ...manifest,
      runtime: { family: "web", framework: "react" },
      publish: { platforms: ["H5"] },
    })).toBe("h5");
    expect(resolveManifestApplicationType({
      ...manifest,
      runtime: { family: "web", framework: "react" },
      publish: { platforms: ["WEB", "H5"] },
    })).toBe("pc");
  });

  it("formats bootstrap env output for local runtime handoff", () => {
    const envFile = formatBootstrapEnvFile({
      primaryDomain: "demo.local",
      result: {
        provisioned: { installationId: "ta-1", tenantId: "100001", organizationId: "0" },
        enabled: { installationId: "ta-1", appId: "app-1" },
        issued: {
          installationId: "ta-1",
          appId: "app-1",
          accessCredential: TEST_ACCESS_CREDENTIAL,
          authToken: TEST_AUTH_TOKEN,
          tenantId: "100001",
          organizationId: "0",
        },
        installationId: "ta-1",
        deployApplicationId: "deploy-demo",
        applicationType: "h5",
        provisioningIdempotencyKey: "idem-explicit-1",
        env: buildBootstrapEnvRecord({
          primaryDomain: "demo.local",
          result: {
            provisioned: { installationId: "ta-1" },
            enabled: { installationId: "ta-1" },
            issued: { accessCredential: TEST_ACCESS_CREDENTIAL, authToken: TEST_AUTH_TOKEN },
            installationId: "ta-1",
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

  it("maps the legacy wire installation id through the fetch transport", async () => {
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

    const provisioned = await client.provisionInstallation(deployCommand);

    expect(provisioned.installationId).toBe("ta-fetch");
    expect(calls).toEqual(["http://127.0.0.1:3900/backend/v3/api/iam/installations"]);
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
