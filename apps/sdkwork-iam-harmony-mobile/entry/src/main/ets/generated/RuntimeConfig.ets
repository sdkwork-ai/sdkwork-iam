// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Source: `config/app/runtime-env.<profile-id>.json`, itself derived from
 * `etc/sdkwork.deployment.config.json` and `etc/topology/<profile-id>.env`.
 * Generator: `scripts/materialize-client-app-surfaces.mjs`.
 *
 * `ENVIRONMENT_SPEC.md` section 5.1.3 requires a native HarmonyOS root to package
 * one selected non-secret runtime resource. A HAP cannot read the tracked JSON at
 * runtime, so the ten documents are projected into this module and the selection
 * happens in `bootstrap/Environment.ets`.
 */
import { type IamHarmonyRuntimeEnvDocument } from '../bootstrap/EnvironmentContract';

export const IAM_HARMONY_DEFAULT_PROFILE_ID: string = 'standalone.development';

/** Every tracked runtime document, ordered by profile id. */
export const IAM_HARMONY_RUNTIME_ENV_DOCUMENTS: IamHarmonyRuntimeEnvDocument[] = [
  {
    environment: "development",
    deploymentProfile: "standalone",
    profileId: "standalone.development",
    runtimeTarget: "harmony-native",
    application: {
      publicHttpUrl: "http://127.0.0.1:3901",
      publicWebsocketUrl: "ws://127.0.0.1:3901",
    },
    appbase: {
      appApiBaseUrl: "http://127.0.0.1:3901",
      loginUrl: "http://127.0.0.1:3901",
    },
    platform: {
      apiGatewayHttpUrl: "http://127.0.0.1:3901",
    },
  },
  {
    environment: "test",
    deploymentProfile: "standalone",
    profileId: "standalone.test",
    runtimeTarget: "harmony-native",
    application: {
      publicHttpUrl: "https://iam-test.sdkwork.com",
      publicWebsocketUrl: "wss://iam-test.sdkwork.com",
    },
    appbase: {
      appApiBaseUrl: "https://iam-test.sdkwork.com",
      loginUrl: "https://iam-test.sdkwork.com",
    },
    platform: {
      apiGatewayHttpUrl: "https://iam-test.sdkwork.com",
    },
  },
  {
    environment: "staging",
    deploymentProfile: "standalone",
    profileId: "standalone.staging",
    runtimeTarget: "harmony-native",
    application: {
      publicHttpUrl: "https://iam-staging.sdkwork.com",
      publicWebsocketUrl: "wss://iam-staging.sdkwork.com",
    },
    appbase: {
      appApiBaseUrl: "https://iam-staging.sdkwork.com",
      loginUrl: "https://iam-staging.sdkwork.com",
    },
    platform: {
      apiGatewayHttpUrl: "https://iam-staging.sdkwork.com",
    },
  },
  {
    environment: "demo",
    deploymentProfile: "standalone",
    profileId: "standalone.demo",
    runtimeTarget: "harmony-native",
    application: {
      publicHttpUrl: "https://iam-demo.sdkwork.com",
      publicWebsocketUrl: "wss://iam-demo.sdkwork.com",
    },
    appbase: {
      appApiBaseUrl: "https://iam-demo.sdkwork.com",
      loginUrl: "https://iam-demo.sdkwork.com",
    },
    platform: {
      apiGatewayHttpUrl: "https://iam-demo.sdkwork.com",
    },
  },
  {
    environment: "production",
    deploymentProfile: "standalone",
    profileId: "standalone.production",
    runtimeTarget: "harmony-native",
    application: {
      publicHttpUrl: "http://127.0.0.1:3901",
      publicWebsocketUrl: "ws://127.0.0.1:3901",
    },
    appbase: {
      appApiBaseUrl: "http://127.0.0.1:3901",
      loginUrl: "http://127.0.0.1:3901",
    },
    platform: {
      apiGatewayHttpUrl: "http://127.0.0.1:3901",
    },
  },
  {
    environment: "development",
    deploymentProfile: "cloud",
    profileId: "cloud.development",
    runtimeTarget: "harmony-native",
    application: {
      publicHttpUrl: "http://iam-dev.sdkwork.com:3901",
      publicWebsocketUrl: "wss://api-dev.sdkwork.com",
    },
    appbase: {
      appApiBaseUrl: "http://127.0.0.1:3900",
      loginUrl: "http://iam-dev.sdkwork.com:3901",
    },
    platform: {
      apiGatewayHttpUrl: "http://127.0.0.1:3900",
    },
  },
  {
    environment: "test",
    deploymentProfile: "cloud",
    profileId: "cloud.test",
    runtimeTarget: "harmony-native",
    application: {
      publicHttpUrl: "https://iam-test.sdkwork.com",
      publicWebsocketUrl: "wss://api-test.sdkwork.com",
    },
    appbase: {
      appApiBaseUrl: "https://api-test.sdkwork.com;https://api-test.birdcoder.com;https://api-test.dtupay.com;https://api-test.noaper.com;https://api-test.sdkwork.cn;https://api-test.birdcoder.cn;https://api-test.dtupay.cn;https://api-test.noaper.cn;https://api-test.skubc.com;https://api-test.skubc.cn;https://api-test.zowalk.com;https://api-test.zowalk.cn;https://api-test.offer86.com;https://api-test.offer86.cn;https://api-test.86offer.com;https://api-test.86offer.cn",
      loginUrl: "https://iam-test.sdkwork.com",
    },
    platform: {
      apiGatewayHttpUrl: "https://api-test.sdkwork.com;https://api-test.birdcoder.com;https://api-test.dtupay.com;https://api-test.noaper.com;https://api-test.sdkwork.cn;https://api-test.birdcoder.cn;https://api-test.dtupay.cn;https://api-test.noaper.cn;https://api-test.skubc.com;https://api-test.skubc.cn;https://api-test.zowalk.com;https://api-test.zowalk.cn;https://api-test.offer86.com;https://api-test.offer86.cn;https://api-test.86offer.com;https://api-test.86offer.cn",
    },
  },
  {
    environment: "staging",
    deploymentProfile: "cloud",
    profileId: "cloud.staging",
    runtimeTarget: "harmony-native",
    application: {
      publicHttpUrl: "https://iam-staging.sdkwork.com",
      publicWebsocketUrl: "wss://api-staging.sdkwork.com",
    },
    appbase: {
      appApiBaseUrl: "https://api-staging.sdkwork.com;https://api-staging.birdcoder.com;https://api-staging.dtupay.com;https://api-staging.noaper.com;https://api-staging.sdkwork.cn;https://api-staging.birdcoder.cn;https://api-staging.dtupay.cn;https://api-staging.noaper.cn;https://api-staging.skubc.com;https://api-staging.skubc.cn;https://api-staging.zowalk.com;https://api-staging.zowalk.cn;https://api-staging.offer86.com;https://api-staging.offer86.cn;https://api-staging.86offer.com;https://api-staging.86offer.cn",
      loginUrl: "https://iam-staging.sdkwork.com",
    },
    platform: {
      apiGatewayHttpUrl: "https://api-staging.sdkwork.com;https://api-staging.birdcoder.com;https://api-staging.dtupay.com;https://api-staging.noaper.com;https://api-staging.sdkwork.cn;https://api-staging.birdcoder.cn;https://api-staging.dtupay.cn;https://api-staging.noaper.cn;https://api-staging.skubc.com;https://api-staging.skubc.cn;https://api-staging.zowalk.com;https://api-staging.zowalk.cn;https://api-staging.offer86.com;https://api-staging.offer86.cn;https://api-staging.86offer.com;https://api-staging.86offer.cn",
    },
  },
  {
    environment: "demo",
    deploymentProfile: "cloud",
    profileId: "cloud.demo",
    runtimeTarget: "harmony-native",
    application: {
      publicHttpUrl: "https://iam-demo.sdkwork.com",
      publicWebsocketUrl: "wss://api-demo.sdkwork.com",
    },
    appbase: {
      appApiBaseUrl: "https://api-demo.sdkwork.com;https://api-demo.birdcoder.com;https://api-demo.dtupay.com;https://api-demo.noaper.com;https://api-demo.sdkwork.cn;https://api-demo.birdcoder.cn;https://api-demo.dtupay.cn;https://api-demo.noaper.cn;https://api-demo.skubc.com;https://api-demo.skubc.cn;https://api-demo.zowalk.com;https://api-demo.zowalk.cn;https://api-demo.offer86.com;https://api-demo.offer86.cn;https://api-demo.86offer.com;https://api-demo.86offer.cn",
      loginUrl: "https://iam-demo.sdkwork.com",
    },
    platform: {
      apiGatewayHttpUrl: "https://api-demo.sdkwork.com;https://api-demo.birdcoder.com;https://api-demo.dtupay.com;https://api-demo.noaper.com;https://api-demo.sdkwork.cn;https://api-demo.birdcoder.cn;https://api-demo.dtupay.cn;https://api-demo.noaper.cn;https://api-demo.skubc.com;https://api-demo.skubc.cn;https://api-demo.zowalk.com;https://api-demo.zowalk.cn;https://api-demo.offer86.com;https://api-demo.offer86.cn;https://api-demo.86offer.com;https://api-demo.86offer.cn",
    },
  },
  {
    environment: "production",
    deploymentProfile: "cloud",
    profileId: "cloud.production",
    runtimeTarget: "harmony-native",
    application: {
      publicHttpUrl: "https://iam.sdkwork.com",
      publicWebsocketUrl: "wss://api.sdkwork.com",
    },
    appbase: {
      appApiBaseUrl: "https://api.sdkwork.com;https://api.birdcoder.com;https://api.dtupay.com;https://api.noaper.com;https://api.sdkwork.cn;https://api.birdcoder.cn;https://api.dtupay.cn;https://api.noaper.cn;https://api.skubc.com;https://api.skubc.cn;https://api.zowalk.com;https://api.zowalk.cn;https://api.offer86.com;https://api.offer86.cn;https://api.86offer.com;https://api.86offer.cn",
      loginUrl: "https://iam.sdkwork.com",
    },
    platform: {
      apiGatewayHttpUrl: "https://api.sdkwork.com;https://api.birdcoder.com;https://api.dtupay.com;https://api.noaper.com;https://api.sdkwork.cn;https://api.birdcoder.cn;https://api.dtupay.cn;https://api.noaper.cn;https://api.skubc.com;https://api.skubc.cn;https://api.zowalk.com;https://api.zowalk.cn;https://api.offer86.com;https://api.offer86.cn;https://api.86offer.com;https://api.86offer.cn",
    },
  },
];
