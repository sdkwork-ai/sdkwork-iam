// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Runtime environment access of the app core.
 *
 * Authority: `ENVIRONMENT_SPEC.md` sections 5.1.2 and 5.1.3. A native HarmonyOS
 * root materializes exactly one non-secret runtime document per profile under
 * `config/app/` and packages all of them into the HAP, so selection happens at
 * runtime and an unknown profile id fails instead of silently falling back to
 * development endpoints.
 *
 * Section 5.1.4.1 assigns canonical API path prefixing to the generated SDK
 * transport, so every origin here is bare.
 */

/** Required identity keys of one runtime document. */
export interface IamHarmonyRuntimeEnvDocument {
  readonly environment: string;
  readonly deploymentProfile: string;
  readonly profileId: string;
  readonly runtimeTarget: string;
  readonly application: {
    readonly publicHttpUrl: string;
    readonly publicWebsocketUrl: string;
  };
  readonly appbase: {
    readonly appApiBaseUrl: string;
    readonly loginUrl: string;
  };
  readonly platform: {
    readonly apiGatewayHttpUrl: string;
  };
}

/** A validated environment ready for SDK construction. */
export interface IamHarmonyEnvironment {
  readonly environment: string;
  readonly deploymentProfile: string;
  readonly profileId: string;
  readonly runtimeTarget: string;
  readonly applicationPublicHttpUrl: string;
  readonly applicationPublicWebsocketUrl: string;
  readonly appbaseAppApiBaseUrl: string;
  readonly appbaseLoginUrl: string;
  readonly platformApiGatewayHttpUrl: string;
}

/** Runtime target every document in this root must declare. */
export const IAM_HARMONY_RUNTIME_TARGET: string = 'harmony-native';

function requireNonEmpty(value: string | undefined, key: string): string {
  const normalized: string = value === undefined ? '' : value.trim();
  if (normalized.length === 0) {
    throw new Error('Harmony runtime config is missing ' + key);
  }
  return normalized;
}

const CANONICAL_API_PREFIXES: string[] = ['/app/v3/api', '/backend/v3/api'];

/**
 * Validates one origin, or a semicolon-joined origin family, and strips trailing
 * slashes.
 *
 * A `cloud` profile materializes the registered origin family
 * (`ENVIRONMENT_SPEC.md` section 5.1.0.1) because this application registers
 * sixteen base domains, so a single-origin assumption would reject every cloud
 * document in the root. The family form is accepted and preserved rather than
 * folded to its primary member: section 5.1.0.1 assigns member selection to the
 * SDK factory, and a validator that truncated here would make that impossible.
 */
export function normalizeIamHarmonyOrigin(
  value: string,
  key: string,
  schemes: string[],
): string {
  const segments: string[] = requireNonEmpty(value, key).split(';');
  const normalized: string[] = [];
  for (const raw of segments) {
    const origin: string = raw.trim().replace(/\/+$/u, '');
    if (origin.length === 0) {
      throw new Error('Harmony runtime config ' + key + ' contains an empty origin');
    }
    const match: RegExpMatchArray | null = origin.match(/^([a-z][a-z0-9+.-]*):\/\/([^/\s]+)$/u);
    if (match === null) {
      throw new Error('Harmony runtime config ' + key + ' must be an absolute origin, found ' + origin);
    }
    if (!schemes.includes(match[1].toLowerCase())) {
      throw new Error(
        'Harmony runtime config ' + key + ' must use ' + schemes.join('/') + ', found ' + match[1],
      );
    }
    for (const prefix of CANONICAL_API_PREFIXES) {
      if (origin.endsWith(prefix)) {
        throw new Error(
          'Harmony runtime config ' + key + ' must be an origin without ' + prefix
          + ' (ENVIRONMENT_SPEC.md section 5.1.4.1)',
        );
      }
    }
    normalized.push(origin);
  }
  return normalized.join(';');
}

/**
 * Validates and normalizes one runtime document.
 *
 * Identity coherence is checked here as well as by the generator: the generator
 * guards the tracked JSON, this guards whatever document bootstrap is handed at
 * runtime, and the two must not be able to disagree.
 */
export function createIamHarmonyEnvironment(
  document: IamHarmonyRuntimeEnvDocument,
): IamHarmonyEnvironment {
  const environment: string = requireNonEmpty(document.environment, 'environment');
  const deploymentProfile: string = requireNonEmpty(document.deploymentProfile, 'deploymentProfile');
  const profileId: string = requireNonEmpty(document.profileId, 'profileId');
  const runtimeTarget: string = requireNonEmpty(document.runtimeTarget, 'runtimeTarget');
  if (runtimeTarget !== IAM_HARMONY_RUNTIME_TARGET) {
    throw new Error(
      'Harmony runtime config runtimeTarget must be ' + IAM_HARMONY_RUNTIME_TARGET
      + ', found ' + runtimeTarget,
    );
  }
  const expectedProfileId: string = deploymentProfile + '.' + environment;
  if (profileId !== expectedProfileId) {
    throw new Error(
      'Harmony runtime config profileId ' + profileId + ' does not match ' + expectedProfileId,
    );
  }
  if (document.application === undefined || document.appbase === undefined
    || document.platform === undefined) {
    throw new Error('Harmony runtime config requires application, appbase and platform groups');
  }
  return {
    environment,
    deploymentProfile,
    profileId,
    runtimeTarget,
    applicationPublicHttpUrl: normalizeIamHarmonyOrigin(
      document.application.publicHttpUrl, 'application.publicHttpUrl', ['http', 'https'],
    ),
    applicationPublicWebsocketUrl: normalizeIamHarmonyOrigin(
      document.application.publicWebsocketUrl, 'application.publicWebsocketUrl', ['ws', 'wss'],
    ),
    appbaseAppApiBaseUrl: normalizeIamHarmonyOrigin(
      document.appbase.appApiBaseUrl, 'appbase.appApiBaseUrl', ['http', 'https'],
    ),
    appbaseLoginUrl: normalizeIamHarmonyOrigin(
      document.appbase.loginUrl, 'appbase.loginUrl', ['http', 'https'],
    ),
    platformApiGatewayHttpUrl: normalizeIamHarmonyOrigin(
      document.platform.apiGatewayHttpUrl, 'platform.apiGatewayHttpUrl', ['http', 'https'],
    ),
  };
}
