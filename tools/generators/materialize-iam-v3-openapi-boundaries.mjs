import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveIamBackendOperationPermission } from './iam-backend-operation-permissions.mjs';
import {
  isCreateOperation,
  sdkWorkEnvelopeComponentSchemas,
  successResponseSchemaRef,
} from '../../../sdkwork-specs/tools/lib/openapi-envelope-schemas.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iamRoot = resolve(__dirname, '../..');

const routeSources = [
  {
    owner: 'iam',
    packageName: 'sdkwork-routes-iam-app-api',
    path: resolve(iamRoot, 'crates/sdkwork-routes-iam-app-api/src/manifest.rs'),
    constructors: [
      'HttpRoute::credential_entry_bootstrap',
      'HttpRoute::refresh_token',
      'HttpRoute::public',
      'HttpRoute::dual_token',
      'HttpRoute::api_key',
    ],
  },
  {
    owner: 'iam',
    packageName: 'sdkwork-routes-iam-backend-api',
    path: resolve(iamRoot, 'crates/sdkwork-routes-iam-backend-api/src/manifest.rs'),
    constructors: [
      'HttpRoute::bootstrap_body',
      'HttpRoute::credential_entry_bootstrap',
      'HttpRoute::refresh_token',
      'HttpRoute::public',
      'HttpRoute::dual_token',
      'HttpRoute::backend_admin',
      'HttpRoute::api_key',
    ],
  },
  {
    owner: 'iam',
    packageName: 'sdkwork-routes-iam-open-api',
    path: resolve(iamRoot, 'crates/sdkwork-routes-iam-open-api/src/manifest.rs'),
    constructors: [
      'HttpRoute::public',
      'HttpRoute::oauth',
      'HttpRoute::open_api_flexible',
      'HttpRoute::api_key',
    ],
  },
];

const surfaces = {
  app: {
    sdkType: 'app',
    sdkOwner: 'sdkwork-iam',
    familyName: 'sdkwork-iam-app-sdk',
    authorityName: 'sdkwork-iam-app-api',
    title: 'SDKWork IAM App API',
    description: 'App/client contract for sdkwork-iam and foundation modules.',
    prefix: '/app/v3/api',
    audience: 'App, desktop, mobile, H5, and user-facing clients',
  },
  backend: {
    sdkType: 'backend',
    sdkOwner: 'sdkwork-iam',
    familyName: 'sdkwork-iam-backend-sdk',
    authorityName: 'sdkwork-iam-backend-api',
    title: 'SDKWork IAM Backend API',
    description: 'Backend/admin contract for sdkwork-iam and foundation modules.',
    prefix: '/backend/v3/api',
    audience: 'Backend consoles, operators, control-plane integrations, and admin automation',
  },
  open: {
    sdkType: 'open',
    sdkOwner: 'sdkwork-iam',
    familyName: 'sdkwork-iam-open-sdk',
    authorityName: 'sdkwork-iam-open-api',
    title: 'SDKWork IAM Open API',
    description:
      'Public OAuth authorization-server ingress and provider callback contract for sdkwork-iam.',
    prefix: '/iam/v3',
    audience:
      'Public OAuth authorization-server clients, provider callbacks, and open ingress integrations',
  },
};

const openApiExternalWireOperations = {
  'iam.oauth.wellKnown.authorizationServerMetadata.retrieve': 'oauth-authorization-server-metadata',
  'iam.oauth.wellKnown.openidConfiguration.retrieve': 'oidc-discovery',
};

const openApiAuthorityExternalWireOperations = {
  ...openApiExternalWireOperations,
  'iam.oauth.authorizationServerMetadata.retrieve': 'oauth-authorization-server-metadata',
  'iam.oauth.openidConfiguration.retrieve': 'oidc-discovery',
  'iam.oauth.authorize.handleGet': 'oauth-authorization-code',
  'iam.oauth.token.create': 'oauth-token',
  'iam.oauth.revoke.create': 'oauth-revoke',
  'iam.oauth.introspect.create': 'oauth-introspect',
  'iam.oauth.jwks.retrieve': 'oauth-jwks',
  'iam.oauth.userinfo.retrieve': 'oidc-userinfo',
  'iam.oauth.providerCallbacks.create': 'wechat-provider-callback',
  'iam.oauth.providerCallbacks.retrieve': 'wechat-provider-callback-verification',
  // WeChat payment entry points are vendor redirects/callbacks, not SDKWork JSON
  // operations: `start`/`cashier/start` answer a 302 to the WeChat cashier and
  // `callback` receives the vendor notification.
  'wechatPaymentOauth.callback': 'wechat-payment-callback',
  'wechatPaymentOauth.start': 'wechat-payment-redirect',
  'wechatPaymentOauth.cashierStart': 'wechat-payment-redirect',
  'iam.oauth.officialAccounts.wechatNotify.verify': 'wechat-official-account-callback',
  'iam.oauth.officialAccounts.wechatNotify.receive': 'wechat-official-account-callback',
};

const credentialHeaderForbiddenAppOperationIds = new Set([
  'sessions.create',
  'sessions.loginContextSelection.create',
  'sessions.organizationSelection.create',
  'passwordResetRequests.create',
  'passwordResets.create',
  'registrations.create',
  'authorizations.create',
  'deviceAuthorizations.create',
  'deviceAuthorizations.passwordCompletions.create',
  'sessions.create',
]);

const methodNames = {
  Get: 'get',
  Post: 'post',
  Patch: 'patch',
  Put: 'put',
  Delete: 'delete',
};

/**
 * Operations whose SDK resource is not simply `operationId` minus its action.
 *
 * The organization roster is addressed through the organization path
 * (`organizations.members.list`) but is its own resource: it returns
 * `IamOrganizationMember` facts, not organization facts, and generated clients
 * must expose it as `organizationMembers.list` rather than as a child of
 * `organizations`.
 */
const operationResourceOverrides = {
  'organizations.members.list': 'organizationMembers',
};

export async function materializeAppbaseV3OpenApiBoundaries() {
  const routes = await collectRoutes();
  const appRoutes = selectRoutes(routes, surfaces.app.prefix);
  const backendRoutes = selectRoutes(routes, surfaces.backend.prefix);
  const openRoutes = selectOpenRoutes(routes);

  if (appRoutes.length === 0) {
    throw new Error('No app-api routes were materialized from Rust route catalogs.');
  }
  if (backendRoutes.length === 0) {
    throw new Error('No backend-api routes were materialized from Rust route catalogs.');
  }
  if (openRoutes.length === 0) {
    throw new Error('No open-api routes were materialized from Rust route catalogs.');
  }

  await writeSurfaceOpenApi(surfaces.app, appRoutes);
  await writeSurfaceOpenApi(surfaces.backend, backendRoutes);
  await writeSurfaceOpenApi(surfaces.open, openRoutes, {
    sdkRoutes: openRoutes.filter((route) => !openApiExternalWireOperations[route.operationId]),
  });

  console.log(`Materialized ${appRoutes.length} app-api operations.`);
  console.log(`Materialized ${backendRoutes.length} backend-api operations.`);
  console.log(`Materialized ${openRoutes.length} open-api operations.`);
}

function isDirectExecution() {
  return resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url);
}

if (isDirectExecution()) {
  await materializeAppbaseV3OpenApiBoundaries();
}

async function collectRoutes() {
  const routes = [];
  for (const source of routeSources) {
    const content = await readFile(source.path, 'utf8');
    const constructors = source.constructors
      .map((constructor) => escapeRegExp(constructor))
      .join('|');
    const routePattern = new RegExp(
      `(?:${constructors})\\s*\\(\\s*HttpMethod::(Get|Post|Patch|Put|Delete)\\s*,\\s*"([^"]+)"\\s*,\\s*"([^"]+)"\\s*,\\s*"([^"]+)"\\s*,?\\s*\\)`,
      'g',
    );

    for (const match of content.matchAll(routePattern)) {
      routes.push({
        owner: source.owner,
        routeCrate: source.packageName,
        method: methodNames[match[1]],
        path: match[2],
        tag: toLowerCamel(match[3]),
        operationId: match[4],
        routeKind: resolveRouteKind(match[0]),
      });
    }
  }

  const byKey = new Map();
  for (const route of routes) {
    const key = `${route.method.toUpperCase()} ${route.path}`;
    if (!byKey.has(key)) {
      byKey.set(key, route);
      continue;
    }
    const previous = byKey.get(key);
    if (previous.operationId !== route.operationId || previous.tag !== route.tag) {
      throw new Error(
        `Conflicting route metadata for ${key}: ${previous.operationId}/${previous.tag} vs ${route.operationId}/${route.tag}`,
      );
    }
  }

  return Array.from(byKey.values()).sort(compareRoutes);
}

function selectRoutes(routes, prefix) {
  return routes.filter((route) => route.path.startsWith(`${prefix}/`) || route.path === prefix);
}

function selectOpenRoutes(routes) {
  return routes
    .filter((route) => route.routeCrate === 'sdkwork-routes-iam-open-api')
    .sort(compareRoutes);
}

async function writeSurfaceOpenApi(surface, routes, options = {}) {
  const sdkRoutes = options.sdkRoutes ?? routes;
  const authority = buildOpenApi(surface, routes);
  const sdkAuthority = sdkRoutes === routes ? authority : buildOpenApi(surface, sdkRoutes);
  const familyRoot = resolve(iamRoot, 'sdks', surface.familyName);
  const openapiRoot = resolve(familyRoot, 'openapi');
  const apisSurfaceRoot = resolve(
    iamRoot,
    'apis',
    `${surface.sdkType}-api`,
    'iam',
  );
  await mkdir(openapiRoot, { recursive: true });
  await mkdir(apisSurfaceRoot, { recursive: true });

  const authorityPath = resolve(openapiRoot, `${surface.authorityName}.openapi.yaml`);
  const sdkgenPath = resolve(openapiRoot, `${surface.authorityName}.sdkgen.yaml`);
  const flutterSdkgenPath = resolve(openapiRoot, `${surface.authorityName}.flutter.sdkgen.yaml`);
  const apisAuthorityPath = resolve(apisSurfaceRoot, `${surface.authorityName}.openapi.yaml`);
  const apisContent = `${JSON.stringify(authority, null, 2)}\n`;
  const sdkContent = `${JSON.stringify(sdkAuthority, null, 2)}\n`;

  await writeFile(authorityPath, sdkContent, 'utf8');
  await writeFile(sdkgenPath, sdkContent, 'utf8');
  await writeFile(flutterSdkgenPath, sdkContent, 'utf8');
  await writeFile(apisAuthorityPath, apisContent, 'utf8');
}

function buildOpenApi(surface, routes) {
  const paths = {};
  for (const route of routes) {
    const pathItem = paths[route.path] ?? {};
    pathItem[route.method] = buildOperation(surface, route);
    paths[route.path] = pathItem;
  }

  const tags = Array.from(new Set(routes.map((route) => route.tag)))
    .sort()
    .map((name) => ({
      name,
      description: `${toTitle(name)} API resources.`,
      'x-sdk-nested-resource-surface': true,
    }));

  return {
    openapi: '3.1.2',
    info: {
      title: surface.title,
      version: '1.0.0',
      description: surface.description,
      'x-sdkwork-api-authority': surface.authorityName,
      'x-sdkwork-sdk-family': surface.familyName,
      'x-sdkwork-audience': surface.audience,
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Local sdkwork-iam runtime',
      },
    ],
    tags,
    security: surface.sdkType === 'open' ? [] : [{ AuthToken: [], AccessToken: [] }],
    paths,
    components: {
      securitySchemes: buildSecuritySchemes(surface),
      schemas: buildReachableSchemas(paths),
    },
    'x-sdkwork-materialized-from': materializedFromSources(surface).map((source) => ({
      owner: source.owner,
      routeCrate: source.packageName,
      path: relativeForOpenApi(source.path),
    })),
    'x-sdkwork-request-context': buildRequestContext(surface),
  };
}

function buildReachableSchemas(paths) {
  const schemas = buildSchemas();
  const reachable = collectSchemaReferences(paths);
  const pending = [...reachable];

  while (pending.length > 0) {
    const schemaName = pending.pop();
    const schema = schemas[schemaName];
    if (!schema) {
      throw new Error(`OpenAPI path references unknown schema ${schemaName}.`);
    }
    for (const dependency of collectSchemaReferences(schema)) {
      if (reachable.has(dependency)) {
        continue;
      }
      reachable.add(dependency);
      pending.push(dependency);
    }
  }

  return Object.fromEntries(
    Object.entries(schemas).filter(([schemaName]) => reachable.has(schemaName)),
  );
}

function collectSchemaReferences(value, references = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectSchemaReferences(item, references));
    return references;
  }
  if (!value || typeof value !== 'object') {
    return references;
  }

  for (const [key, item] of Object.entries(value)) {
    if (key === '$ref' && typeof item === 'string') {
      const match = item.match(/^#\/components\/schemas\/([^/]+)$/u);
      if (match) {
        references.add(match[1]);
      }
      continue;
    }
    collectSchemaReferences(item, references);
  }
  return references;
}

function buildSecuritySchemes(surface) {
  if (surface.sdkType === 'open') {
    return {
      ApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'SDKWork open-api API key for protected ingress operations.',
      },
      OAuthBearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'OAuth bearer credential for protected open-api operations.',
      },
    };
  }

  return {
    AuthToken: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'SDKWork auth token carried as Authorization: Bearer <auth_token>.',
    },
    AccessToken: {
      type: 'apiKey',
      in: 'header',
      name: 'Access-Token',
      description: 'SDKWork access isolation token.',
    },
  };
}

function buildRequestContext(surface) {
  if (surface.sdkType === 'open') {
    return {
      contextObject: 'WebRequestContext',
      serverRequestId: 'server-owned',
      clientRequestIdHeader: 'forbidden',
      tenantSource: 'ApiKey or OAuthBearer',
      organizationSource: 'ApiKey or OAuthBearer',
      userSource: 'ApiKey or OAuthBearer',
    };
  }

  return {
    contextObject: 'WebRequestContext',
    serverRequestId: 'server-owned',
    clientRequestIdHeader: 'forbidden',
    tenantSource: 'route auth profile',
    organizationSource: 'route auth profile',
    userSource: 'route auth profile',
  };
}

function materializedFromSources(surface) {
  if (surface.sdkType === 'open') {
    return routeSources.filter((source) => source.packageName === 'sdkwork-routes-iam-open-api');
  }
  if (surface.sdkType === 'app') {
    return routeSources.filter((source) => source.packageName === 'sdkwork-routes-iam-app-api');
  }
  if (surface.sdkType === 'backend') {
    return routeSources.filter((source) => source.packageName === 'sdkwork-routes-iam-backend-api');
  }
  return routeSources;
}

function buildOperation(surface, route) {
  const authMode = operationAuthMode(surface, route);
  const successSchemaRef = personaSuccessSchemaRef(route)
    ?? typedListSuccessSchemaRef(route)
    ?? typedResourceSuccessSchemaRef(route)
    ?? successResponseSchemaRef(route);
  const responses = {
    400: problemResponse('Bad request'),
    401: problemResponse('Unauthorized'),
    403: problemResponse('Forbidden'),
    404: problemResponse('Not found'),
    409: problemResponse('Conflict'),
    422: problemResponse('Unprocessable entity'),
    429: problemResponse('Too many requests'),
    500: problemResponse('Internal server error'),
    503: problemResponse('Service unavailable'),
  };

  if (route.method === 'delete') {
    responses[204] = { description: 'Deleted' };
  } else if (isCreateOperation(route)) {
    responses[201] = jsonResponse('Created', successSchemaRef);
  } else {
    responses[200] = jsonResponse('Success', successSchemaRef);
  }

  const operation = {
    tags: [route.tag],
    summary: `${toTitle(route.operationId)}.`,
    operationId: route.operationId,
    parameters: extractPathParameters(route.path),
    responses,
    security: resolveOperationSecurity(surface, route),
    'x-sdkwork-auth-mode': authMode,
    'x-sdkwork-forbid-credential-headers': operationForbidsCredentialHeaders(surface, route),
    'x-sdkwork-owner': surface.sdkOwner,
    'x-sdkwork-api-authority': surface.authorityName,
    'x-sdkwork-domain': route.owner,
    'x-sdkwork-resource':
      operationResourceOverrides[route.operationId]
      ?? route.operationId.split('.').slice(0, -1).join('.'),
    'x-sdkwork-request-context': 'WebRequestContext',
    'x-sdkwork-api-surface': `${surface.sdkType}-api`,
    'x-sdkwork-server-request-id': true,
  };

  const permission = resolveIamBackendOperationPermission(route.operationId);
  if (permission) {
    operation['x-sdkwork-permission'] = permission;
  }
  if (
    surface.sdkType === 'backend'
    && route.routeKind !== 'public'
    && route.routeKind !== 'bootstrap_body'
  ) {
    operation['x-sdkwork-required-surface'] = 'organizationMember';
  }

  if (usesJsonBody(route.method)) {
    operation.requestBody = {
      required: route.method !== 'patch',
      content: {
        'application/json': {
          schema: { $ref: requestBodySchemaRef(route) },
        },
      },
    };
  }

  if (route.operationId === 'iam.oauth.providerCallbacks.create') {
    operation.parameters.push(
      queryParameter('signature', { type: 'string' }),
      queryParameter('msg_signature', { type: 'string' }),
      queryParameter('timestamp', { type: 'string' }),
      queryParameter('nonce', { type: 'string' }),
    );
    operation.requestBody = {
      required: true,
      content: {
        'application/xml': { schema: { type: 'string' } },
        'application/json': { schema: { type: 'object', additionalProperties: true } },
      },
    };
    operation.responses[200] = {
      description: 'Provider acknowledgement',
      content: {
        'text/plain': { schema: { type: 'string' } },
        'application/json': { schema: { type: 'object', additionalProperties: true } },
      },
    };
    delete operation.responses[201];
  }

  if (route.operationId === 'iam.oauth.providerCallbacks.retrieve') {
    operation.parameters.push(
      queryParameter('signature', { type: 'string' }),
      queryParameter('timestamp', { type: 'string' }),
      queryParameter('nonce', { type: 'string' }),
      queryParameter('echostr', { type: 'string' }),
    );
    operation.responses[200] = {
      description: 'Provider challenge acknowledgement',
      content: { 'text/plain': { schema: { type: 'string' } } },
    };
    delete operation.responses[201];
  }

  if (route.operationId === 'wechatPaymentOauth.start') {
    const redirect = queryParameter('redirect', {
      type: 'string',
      description: 'Relative cashier route the payer returns to after the WeChat OAuth step.',
    });
    redirect.required = true;
    operation.parameters.push(redirect);
  }

  // OAuth protocol operations are external-wire contracts (API_SPEC.md
  // section 4.5.2): the RFC shape is authoritative, so the materialized
  // document describes the redirect/form/error semantics instead of the
  // generic resource envelope. This is the contract any native app reuses to
  // start a hosted browser login and is consumed by client generators.
  if (route.operationId === 'iam.oauth.authorize.handleGet') {
    const requiredQuery = (name, schema) => {
      const parameter = queryParameter(name, schema);
      parameter.required = true;
      return parameter;
    };
    operation.parameters.push(
      requiredQuery('client_id', {
        type: 'string',
        description: 'Registered relying-party (tenant application) identifier.',
      }),
      requiredQuery('redirect_uri', {
        type: 'string',
        format: 'uri',
        description:
          'Registered redirect URI. Native apps register a custom scheme or an RFC 8252 loopback address.',
      }),
      requiredQuery('response_type', { type: 'string', enum: ['code'] }),
      queryParameter('scope', {
        type: 'string',
        description: 'Space-delimited scopes requested by the client; defaults to openid.',
      }),
      requiredQuery('state', {
        type: 'string',
        maxLength: 512,
        description: 'Opaque client state echoed back unchanged with the code or the error.',
      }),
      queryParameter('code_challenge', {
        type: 'string',
        minLength: 43,
        description: 'PKCE S256 challenge; required for public (native) clients.',
      }),
      queryParameter('code_challenge_method', { type: 'string', enum: ['S256'] }),
      queryParameter('tenant_id', {
        type: 'string',
        description: 'Optional tenant hint used to resolve the client registration.',
      }),
    );
    delete operation.responses[200];
    delete operation.responses[201];
    operation.responses[302] = {
      description:
        'Redirect to the hosted login, or back to the registered redirect URI with error + state (RFC 6749 section 4.1.2.1).',
      headers: {
        Location: { required: true, schema: { type: 'string', format: 'uri' } },
      },
    };
  }

  if (route.operationId === 'iam.oauth.token.create') {
    operation.requestBody = {
      required: true,
      content: {
        'application/x-www-form-urlencoded': {
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['grant_type', 'client_id'],
            properties: {
              grant_type: { type: 'string', enum: ['authorization_code', 'refresh_token'] },
              client_id: { type: 'string' },
              client_secret: { type: 'string', format: 'password' },
              code: { type: 'string' },
              redirect_uri: { type: 'string', format: 'uri' },
              code_verifier: { type: 'string', minLength: 43, maxLength: 128 },
              refresh_token: { type: 'string' },
            },
          },
        },
      },
    };
    delete operation.responses[200];
    delete operation.responses[201];
    operation.responses[200] = {
      description: 'OAuth 2.0 token response (RFC 6749 section 5.1).',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['access_token', 'token_type'],
            properties: {
              access_token: { type: 'string' },
              token_type: { type: 'string', enum: ['Bearer'] },
              expires_in: { type: 'integer', minimum: 1 },
              refresh_token: { type: 'string' },
              scope: { type: 'string' },
            },
          },
        },
      },
    };
  }

  if (route.operationId === 'desktopSessions.create') {
    operation.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['clientId', 'authorizationCode', 'codeVerifier', 'redirectUri'],
            description:
              'Native-app exchange of a deep-link authorization code for a dual-token session.',
            properties: {
              clientId: { type: 'string' },
              authorizationCode: { type: 'string' },
              codeVerifier: { type: 'string', minLength: 43, maxLength: 128 },
              redirectUri: {
                type: 'string',
                format: 'uri',
                description:
                  'Registered native redirect URI; the code must have been issued for a desktop surface (custom scheme or loopback).',
              },
              clientSecret: { type: 'string', format: 'password' },
              deviceId: {
                type: 'string',
                minLength: 1,
                maxLength: 128,
                pattern: '^[A-Za-z0-9._:-]+$',
                description:
                  'Stable opaque per-install device identity. A new login replaces only this device\'s previous session for the same application.',
              },
            },
          },
        },
      },
    };
    delete operation.responses[201];
    operation.responses[200] = {
      description: 'Dual-token desktop session installed by the native app.',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['code', 'data', 'traceId'],
            properties: {
              code: { type: 'integer' },
              traceId: { type: 'string' },
              data: {
                type: 'object',
                required: ['accessToken', 'authToken'],
                properties: {
                  accessToken: { type: 'string' },
                  authToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  sessionId: { type: 'string' },
                  context: { type: 'object', additionalProperties: true },
                  user: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
      },
    };
  }

  if (route.operationId === 'sessions.current.logout') {
    operation.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['refreshToken'],
            properties: {
              refreshToken: {
                type: 'string',
                description:
                  'Refresh token of the session to revoke. Accepted without an access token so logout still revokes the server session after the access token expired.',
              },
            },
          },
        },
      },
    };
    delete operation.responses[201];
    delete operation.responses[204];
    operation.responses[200] = jsonResponse('Session revoked.', successSchemaRef);
  }

  if (route.operationId === 'authorizations.create') {
    delete operation.responses[201];
    operation.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: false,
            required: [
              'clientId',
              'responseType',
              'redirectUri',
              'scope',
              'state',
              'codeChallenge',
              'codeChallengeMethod',
            ],
            properties: {
              clientId: { type: 'string' },
              responseType: { type: 'string', enum: ['code'] },
              redirectUri: { type: 'string', format: 'uri' },
              scope: { type: 'string' },
              state: { type: 'string' },
              codeChallenge: { type: 'string' },
              codeChallengeMethod: { type: 'string', enum: ['S256'] },
              tenantId: { type: 'string' },
            },
          },
        },
      },
    };
    operation.responses[200] = {
      description: 'Pending authorization state created for the hosted web login.',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['code', 'data', 'traceId'],
            properties: {
              code: { type: 'integer' },
              traceId: { type: 'string' },
              data: {
                type: 'object',
                required: ['authorizationStateId', 'expiresAt'],
                properties: {
                  authorizationStateId: { type: 'string' },
                  expiresAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    };
  }

  if (route.operationId === 'authorizations.completions.create') {
    operation.requestBody = {
      required: true,
      content: { 'application/json': { schema: { type: 'object', additionalProperties: false } } },
    };
    delete operation.responses[201];
    operation.responses[200] = {
      description: 'Issued authorization code and the registered redirect URL that carries it.',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['code', 'data', 'traceId'],
            properties: {
              code: { type: 'integer' },
              traceId: { type: 'string' },
              data: {
                type: 'object',
                required: ['authorizationCode', 'redirectUrl'],
                properties: {
                  authorizationCode: { type: 'string' },
                  redirectUrl: { type: 'string', format: 'uri' },
                },
              },
            },
          },
        },
      },
    };
  }

  if (isListOperation(route)) {
    operation.parameters.push(
      queryParameter('page', { type: 'integer', minimum: 1, default: 1 }),
      queryParameter('page_size', { type: 'integer', minimum: 1, maximum: 200, default: 20 }),
      queryParameter('cursor', { type: 'string' }),
      queryParameter('sort', { type: 'string' }),
      queryParameter('q', { type: 'string' }),
    );
  }

  if (route.operationId === 'organizations.members.list') {
    operation.parameters.push(
      queryParameter('role', {
        type: 'string',
        enum: ['owner', 'admin', 'member'],
        description:
          'Exact membership kind filter. Omitted returns every active member of the organization.',
      }),
    );
  }

  if (route.operationId === 'providerAccounts.list') {
    operation.parameters.push(
      queryParameter('vendor_code', {
        type: 'string',
        description: 'Exact cloud vendor code filter (for example aliyun).',
      }),
      queryParameter('scope_type', {
        type: 'string',
        description:
          'Restrict to a single account scope: platform | tenant | organization | user.',
      }),
      queryParameter('owner_user_id', {
        type: 'string',
        description: 'Restrict to the personal accounts of one owner.',
      }),
      queryParameter('organization_id', { type: 'string', description: 'Exact organization id filter.' }),
      queryParameter('status', {
        type: 'string',
        description: 'Exact account status filter (active | disabled | deleted).',
      }),
      queryParameter('mine', {
        type: 'boolean',
        description: 'Return only the personal accounts owned by the caller.',
      }),
      queryParameter('include_platform', {
        type: 'boolean',
        default: true,
        description: 'Include the globally shared platform-scope accounts.',
      }),
    );
  }

  if (route.operationId === 'providerAccounts.resolve') {
    const vendorCode = queryParameter('vendor_code', {
      type: 'string',
      description: 'Cloud vendor code to resolve, for example aliyun.',
    });
    vendorCode.required = true;
    operation.parameters.push(
      vendorCode,
      queryParameter('capability_code', {
        type: 'string',
        description: 'Cloud capability the account must serve, for example object_storage.',
      }),
      queryParameter('environment', {
        type: 'string',
        description: 'Exact environment filter (development | sandbox | production).',
      }),
      queryParameter('user_id', {
        type: 'string',
        description: 'Resolve on behalf of this user; defaults to the caller.',
      }),
      queryParameter('organization_id', { type: 'string', description: 'Exact organization id filter.' }),
    );
  }

  if (route.operationId === 'tenantApplications.list') {
    operation.parameters.push(
      queryParameter('status', { type: 'string' }),
      queryParameter('environment', { type: 'string' }),
      queryParameter('application_type', {
        type: 'string',
        description: 'Exact product-semantic application type filter (api | h5 | pc | flutter | miniprogram | ios | android | harmonyos | desktop | other).',
      }),
    );
  }

  if (route.operationId === 'users.list') {
    operation.parameters.push(
      queryParameter('status', {
        type: 'string',
        description: 'Exact user account status filter (active | banned | disabled | locked).',
      }),
    );
  }

  if (route.operationId === 'roleBindings.list') {
    // `API_SPEC.md` section 13: query parameters are lower_snake_case. The
    // handler still accepts the legacy camelCase spellings as aliases
    // (`backend_sql.rs::optional_query_value_any`), but the published contract
    // and every generated SDK expose only the canonical names.
    operation.parameters.push(
      queryParameter('role_id', { type: 'string', description: 'Exact role id filter.' }),
      queryParameter('principal_kind', { type: 'string', description: 'Exact principal kind filter.' }),
      queryParameter('principal_id', { type: 'string', description: 'Exact principal id filter.' }),
      queryParameter('scope_kind', { type: 'string', description: 'Exact scope kind filter.' }),
      queryParameter('scope_id', { type: 'string', description: 'Exact scope id filter.' }),
    );
  }

  const externalProtocolId =
    openApiExternalWireOperations[route.operationId]
    ?? openApiAuthorityExternalWireOperations[route.operationId];
  if (externalProtocolId) {
    operation['x-sdkwork-wire-protocol'] = 'external';
    operation['x-sdkwork-external-protocol-id'] = externalProtocolId;
    if (openApiExternalWireOperations[route.operationId]) {
      operation['x-sdkwork-auth-mode'] = 'compatibility';
      responses[200] = jsonResponse('Success', {
        type: 'object',
        additionalProperties: true,
        description: 'Upstream OAuth/OIDC discovery metadata document.',
      });
    }
  }

  // Create operations that answer a bespoke payload still owe the `201` +
  // `data.item` contract; wrapping keeps the generated SDK's return value equal
  // to the object the bespoke `data` schema described.
  if (
    route.operationId === 'authorizations.create' ||
    route.operationId === 'authorizations.completions.create' ||
    route.operationId === 'desktopSessions.create'
  ) {
    promoteCreateResponse(
      operation,
      route.operationId === 'desktopSessions.create'
        ? 'Dual-token desktop session installed by the native app.'
        : 'Created',
    );
  }

  return operation;
}

function requestBodySchemaRef(route) {
  if (route.operationId === 'appAccessTokens.create') {
    return '#/components/schemas/IamAppAccessTokenCreateCommand';
  }
  if (route.operationId === 'users.current.persona.update') {
    return '#/components/schemas/IamUserPersonaUpdateCommand';
  }
  if (route.operationId === 'sessions.create') {
    return '#/components/schemas/AppbaseSessionCreateCommand';
  }
  if (route.operationId === 'tenantApplications.create') {
    return '#/components/schemas/AppbaseTenantApplicationProvisionCommand';
  }
  if (route.operationId === 'tenantApplications.management.create') {
    return '#/components/schemas/IamTenantApplicationManagementProvisionCommand';
  }
  if (route.operationId === 'tenantApplications.management.update') {
    return '#/components/schemas/IamTenantApplicationManagementUpdateCommand';
  }
  if (
    route.operationId === 'tenantApplications.management.enable'
    || route.operationId === 'tenantApplications.management.disable'
  ) {
    return '#/components/schemas/IamTenantApplicationStatusCommand';
  }
  if (route.operationId === 'tenantApplications.update') {
    return '#/components/schemas/AppbaseTenantApplicationUpdateCommand';
  }
  if (route.operationId === 'tenantApplications.environments.update') {
    return '#/components/schemas/IamInstallationEnvironmentUpsertCommand';
  }
  if (route.operationId === 'tenantApplications.credentials.create') {
    return '#/components/schemas/IamInstallationCredentialCreateCommand';
  }
  if (route.operationId === 'tenantApplications.credentials.rotate') {
    return '#/components/schemas/IamInstallationCredentialRotateCommand';
  }
  if (route.operationId === 'tenantApplications.enable') {
    return '#/components/schemas/AppbaseTenantApplicationEnableCommand';
  }
  if (route.operationId === 'accessCredentials.create') {
    return '#/components/schemas/AppbaseAccessCredentialCreateCommand';
  }
  if (route.operationId === 'serviceAccounts.credentials.create') {
    return '#/components/schemas/ServiceAccountCredentialCreateCommand';
  }
  if (route.operationId === 'serviceAccountCredentials.revoke') {
    return '#/components/schemas/ServiceAccountCredentialRevokeCommand';
  }
  if (route.operationId === 'serviceAccountTokens.create') {
    return '#/components/schemas/ServiceAccountTokenExchangeCommand';
  }

  if (route.operationId === 'miniProgramSessions.create') {
    return '#/components/schemas/WechatMiniProgramSessionCreateCommand';
  }
  if (route.operationId === 'phoneBindingSessions.create') {
    return '#/components/schemas/OauthPhoneBindingSessionCreateCommand';
  }
  if (route.operationId === 'phoneBindingSessions.verificationCodeRequests.create') {
    return '#/components/schemas/OauthPhoneBindingVerificationCodeRequestCommand';
  }
  if (route.operationId === 'iam.oauth.clients.create') {
    return '#/components/schemas/IamOauthClientCreateCommand';
  }

  return '#/components/schemas/AppbaseOperationCommand';
}

function bootstrapBodyAuthProperties() {
  return {
    authToken: {
      type: 'string',
      description: 'Super-admin auth token used for bootstrap body authentication.',
    },
    username: {
      type: 'string',
      description: 'Super-admin username credential for bootstrap body authentication.',
    },
    email: {
      type: 'string',
      description: 'Super-admin email credential for bootstrap body authentication.',
    },
    phone: {
      type: 'string',
      description: 'Super-admin phone credential for bootstrap body authentication.',
    },
    password: {
      type: 'string',
      format: 'password',
      description: 'Super-admin password credential for bootstrap body authentication.',
    },
  };
}

function personaSuccessSchemaRef(route) {
  switch (route.operationId) {
    case 'personaCatalog.retrieve':
      return '#/components/schemas/IamPersonaCatalogResponse';
    case 'users.current.persona.retrieve':
    case 'users.current.persona.update':
      return '#/components/schemas/IamUserPersonaResponse';
    default:
      return undefined;
  }
}

/**
 * Typed list envelope for a list operation whose items are a named schema.
 *
 * The generic `SdkWorkListResponse` keeps `data.items` untyped, which would make
 * generated clients return `Record<string, unknown>[]` and force every consumer
 * to re-declare the item shape. The specialized schema keeps the exact same
 * envelope (`code`/`data.items`/`data.pageInfo`/`traceId`) and only narrows the
 * item type.
 */
function typedListSuccessSchemaRef(route) {
  switch (route.operationId) {
    case 'organizations.members.list':
      return '#/components/schemas/IamOrganizationMemberListResponse';
    case 'tenantApplications.environments.list':
      return '#/components/schemas/IamInstallationEnvironmentListResponse';
    case 'tenantApplications.credentials.list':
      return '#/components/schemas/IamInstallationCredentialListResponse';
    default:
      return undefined;
  }
}

/**
 * Typed single-resource envelope for operations that return the resource itself.
 *
 * Without this the generated clients expose `data.item` as an untyped object and
 * every consumer has to re-declare the environment/credential shape.
 */
function typedResourceSuccessSchemaRef(route) {
  switch (route.operationId) {
    case 'appAccessTokens.create':
      return '#/components/schemas/IamAppAccessTokenResponse';
    case 'tenantApplications.environments.update':
      return '#/components/schemas/IamInstallationEnvironmentResponse';
    case 'tenantApplications.credentials.create':
    case 'tenantApplications.credentials.rotate':
      return '#/components/schemas/IamInstallationCredentialResponse';
    default:
      return undefined;
  }
}

function buildSchemas() {
  const bootstrapAuth = bootstrapBodyAuthProperties();

  return {
    ...sdkWorkEnvelopeComponentSchemas,
    // Application access token exchange (appAccessTokens.create). A signed-in user
    // asks IAM for the signed access credential of an application they own, that
    // their organization owns, or that their tenant owns. Typed end to end so the
    // generated SDK call is
    // `iam.appAccessTokens.create({ appId })` returning the credential item.
    IamAppAccessTokenCreateCommand: {
      type: 'object',
      additionalProperties: false,
      description:
        'Selectors for the application whose access credential is requested. Supply at least '
        + 'one; the tenant and the organization are derived from the authenticated session and '
        + 'the installation, never from this body.',
      properties: {
        appId: {
          type: 'string',
          minLength: 1,
          maxLength: 128,
          description:
            'Installation deploy application anchor (iam_application_installation'
            + '.deploy_application_id). Preferred selector: it is the identity the deployment '
            + 'plane publishes.',
        },
        tenantApplicationId: {
          type: 'string',
          minLength: 1,
          maxLength: 128,
          description: "IAM installation row id (tapp_...) of the caller's tenant.",
        },
        instanceKey: {
          type: 'string',
          minLength: 1,
          maxLength: 128,
          description: "Installation instance key of the caller's tenant.",
        },
        environment: {
          type: 'string',
          enum: ['development', 'test', 'staging', 'demo', 'production'],
          description:
            'Exact installation lifecycle to initialize. Omitted means the caller session '
            + "environment when the installation registered it, otherwise the installation's only "
            + 'active environment. An operator can initialize a lifecycle that differs from its own '
            + 'session environment.',
        },
        ownershipScope: {
          type: 'string',
          enum: ['TENANT', 'ORGANIZATION', 'USER'],
          description:
            'Release scope the caller declares. It is a declaration to be checked, never a '
            + 'selector: the installation decides the level. Omit it to inherit the installation '
            + 'scope (a tenant-level application therefore yields a tenant-level credential); an '
            + 'explicit value that disagrees with the installation is refused.',
        },
      },
    },
    IamAppAccessToken: {
      type: 'object',
      additionalProperties: false,
      required: [
        'accessToken',
        'authToken',
        'expiresAt',
        'appId',
        'tenantApplicationId',
        'ownershipScope',
      ],
      description:
        'Signed application access credential. It is a session-class credential: it expires '
        + 'after one hour and can be revoked like any other IAM session.',
      properties: {
        accessToken: {
          type: 'string',
          description: 'Signed access token; send it as the Access-Token header.',
        },
        authToken: {
          type: 'string',
          description: 'Signed auth token; send it as the Authorization: Bearer header.',
        },
        expiresAt: {
          type: 'string',
          format: 'date-time',
          description: 'Credential expiry instant.',
        },
        appId: {
          type: 'string',
          description: 'Deploy application anchor carried as the token app_id/aud.',
        },
        tenantApplicationId: {
          type: 'string',
          description: 'Installation the credential was issued for.',
        },
        organizationId: {
          type: 'string',
          description:
            'Organization claim of the installation; 0 for tenant- and user-released '
            + 'installations.',
        },
        ownershipScope: {
          type: 'string',
          enum: ['TENANT', 'ORGANIZATION', 'USER'],
          description: 'Release scope of the installation.',
        },
        sessionId: {
          type: 'string',
          description: 'Persisted session that can be revoked.',
        },
        environment: {
          type: 'string',
          description:
            'Installation lifecycle environment the credential was gated on (development, '
            + 'production, ...).',
        },
      },
    },
    IamAppAccessTokenResponse: {
      allOf: [
        { $ref: '#/components/schemas/SdkWorkApiResponse' },
        {
          type: 'object',
          required: ['data'],
          properties: {
            data: {
              type: 'object',
              required: ['item'],
              properties: {
                item: { $ref: '#/components/schemas/IamAppAccessToken' },
              },
            },
          },
        },
      ],
    },
    IamInstallationEnvironment: {
      type: 'object',
      additionalProperties: false,
      required: [
        'environmentId',
        'tenantId',
        'installationId',
        'environmentKey',
        'status',
        'createdAt',
        'updatedAt',
      ],
      description: 'One lifecycle environment registered for an installation.',
      properties: {
        environmentId: { type: 'string' },
        tenantId: { type: 'string' },
        organizationId: { type: 'string' },
        installationId: { type: 'string', description: 'Installation (tenant application) id.' },
        environmentKey: {
          type: 'string',
          pattern: '^[a-z0-9._-]{1,64}$',
          description: 'Environment key, unique per installation.',
        },
        primaryDomain: {
          type: ['string', 'null'],
          description:
            'Public domain of this environment. Null when the environment has no domain; null is the only value allowed to repeat inside one tenant.',
        },
        domainConfig: {
          type: 'object',
          additionalProperties: true,
          description: 'Environment-specific domain configuration document.',
        },
        status: { type: 'string', enum: ['pending', 'active', 'disabled'] },
        createdAt: { type: 'string', description: 'Creation timestamp.' },
        updatedAt: { type: 'string', description: 'Last write timestamp.' },
      },
    },
    IamInstallationEnvironmentUpsertCommand: {
      type: 'object',
      additionalProperties: false,
      description:
        'Idempotent registration of one environment. The path environmentKey is authoritative; an explicit body value must match it. Omitted status keeps the stored status on update and defaults to pending on insert.',
      properties: {
        environmentKey: { type: 'string', pattern: '^[a-z0-9._-]{1,64}$' },
        primaryDomain: {
          type: ['string', 'null'],
          maxLength: 253,
          description: 'Blank or null clears the domain; a domain is unique per tenant.',
        },
        domainConfig: { type: 'object', additionalProperties: true },
        status: { type: 'string', enum: ['pending', 'active', 'disabled'] },
      },
    },
    IamInstallationCredential: {
      type: 'object',
      additionalProperties: false,
      required: [
        'credentialId',
        'tenantId',
        'installationEnvironmentId',
        'environmentKey',
        'clientId',
        'redirectUris',
        'grantedScopes',
        'status',
        'createdAt',
        'updatedAt',
      ],
      description:
        'OAuth client metadata of one installation environment. The secret is write-only and is returned only by create/rotate.',
      properties: {
        credentialId: { type: 'string' },
        tenantId: { type: 'string' },
        installationEnvironmentId: { type: 'string' },
        environmentKey: { type: 'string' },
        clientId: {
          type: 'string',
          description: 'OAuth client id; globally unique across every credential row.',
        },
        redirectUris: { type: 'array', items: { type: 'string', format: 'uri' } },
        grantedScopes: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', enum: ['active', 'rotated', 'retired'] },
        rotatedAt: {
          type: ['string', 'null'],
          description: 'When this credential was replaced by a rotation, or null.',
        },
        retiredAt: {
          type: ['string', 'null'],
          description: 'When this credential was revoked, or null.',
        },
        createdAt: { type: 'string', description: 'Creation timestamp.' },
        updatedAt: { type: 'string', description: 'Last write timestamp.' },
      },
    },
    IamInstallationCredentialWithSecret: {
      type: 'object',
      additionalProperties: false,
      required: [
        'credentialId',
        'tenantId',
        'installationEnvironmentId',
        'environmentKey',
        'clientId',
        'clientSecret',
        'redirectUris',
        'grantedScopes',
        'status',
        'createdAt',
        'updatedAt',
      ],
      description:
        'The create/rotate result: credential metadata plus the one-time plaintext secret. No read operation returns this shape.',
      properties: {
        credentialId: { type: 'string' },
        tenantId: { type: 'string' },
        installationEnvironmentId: { type: 'string' },
        environmentKey: { type: 'string' },
        clientId: { type: 'string' },
        clientSecret: {
          type: 'string',
          description:
            'Plaintext OAuth client secret. Emitted exactly once by create/rotate and never on reads.',
        },
        redirectUris: { type: 'array', items: { type: 'string', format: 'uri' } },
        grantedScopes: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', enum: ['active', 'rotated', 'retired'] },
        rotatedAt: { type: ['string', 'null'] },
        retiredAt: { type: ['string', 'null'] },
        createdAt: { type: 'string', description: 'Creation timestamp.' },
        updatedAt: { type: 'string', description: 'Last write timestamp.' },
      },
    },
    IamInstallationCredentialCreateCommand: {
      type: 'object',
      additionalProperties: false,
      required: ['environmentKey'],
      description:
        'Creates the OAuth client of one environment. Omitted clientId is generated.',
      properties: {
        environmentKey: {
          type: 'string',
          description: 'Registered environment of the installation, by key or canonical alias.',
        },
        clientId: {
          type: 'string',
          description:
            'Explicit client id. Omitted generates one; an id already in use conflicts.',
        },
        redirectUris: { type: 'array', items: { type: 'string', format: 'uri' } },
        grantedScopes: { type: 'array', items: { type: 'string' } },
      },
    },
    IamInstallationCredentialRotateCommand: {
      type: 'object',
      additionalProperties: false,
      description:
        'Rotates the active credential: the replacement becomes active with a new client id and secret, and the predecessor is kept as rotated history.',
      properties: {
        clientId: {
          type: 'string',
          description: 'Explicit replacement client id. Omitted generates one.',
        },
      },
    },
    IamInstallationEnvironmentListResponse: {
      allOf: [
        { $ref: '#/components/schemas/SdkWorkApiResponse' },
        {
          type: 'object',
          required: ['data'],
          properties: {
            data: {
              type: 'object',
              additionalProperties: false,
              required: ['items', 'pageInfo'],
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/IamInstallationEnvironment' },
                },
                pageInfo: { $ref: '#/components/schemas/PageInfo' },
              },
            },
          },
        },
      ],
    },
    IamInstallationEnvironmentResponse: {
      allOf: [
        { $ref: '#/components/schemas/SdkWorkApiResponse' },
        {
          type: 'object',
          required: ['data'],
          properties: {
            data: {
              type: 'object',
              additionalProperties: false,
              required: ['item'],
              properties: {
                item: { $ref: '#/components/schemas/IamInstallationEnvironment' },
              },
            },
          },
        },
      ],
    },
    IamInstallationCredentialResponse: {
      allOf: [
        { $ref: '#/components/schemas/SdkWorkApiResponse' },
        {
          type: 'object',
          required: ['data'],
          properties: {
            data: {
              type: 'object',
              additionalProperties: false,
              required: ['item'],
              properties: {
                item: { $ref: '#/components/schemas/IamInstallationCredentialWithSecret' },
              },
            },
          },
        },
      ],
    },
    IamInstallationCredentialListResponse: {
      allOf: [
        { $ref: '#/components/schemas/SdkWorkApiResponse' },
        {
          type: 'object',
          required: ['data'],
          properties: {
            data: {
              type: 'object',
              additionalProperties: false,
              required: ['items', 'pageInfo'],
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/IamInstallationCredential' },
                },
                pageInfo: { $ref: '#/components/schemas/PageInfo' },
              },
            },
          },
        },
      ],
    },
    IamPersonaLabels: {
      type: 'object',
      additionalProperties: { type: 'string' },
      description: 'Locale to display-text map, for example {"zh-CN":"学员","en-US":"Learner"}.',
    },
    IamPersonaRole: {
      type: 'object',
      additionalProperties: false,
      required: ['code', 'sortOrder', 'labels', 'descriptions'],
      description: 'One selectable persona role.',
      properties: {
        code: { type: 'string', pattern: '^[a-z][a-z0-9-]{0,63}$' },
        iamRoleCode: {
          type: ['string', 'null'],
          description: 'Authorization role code this persona maps onto, when one exists.',
        },
        sortOrder: { type: 'integer', minimum: 0 },
        labels: { $ref: '#/components/schemas/IamPersonaLabels' },
        descriptions: { $ref: '#/components/schemas/IamPersonaLabels' },
      },
    },
    IamPersonaInterest: {
      type: 'object',
      additionalProperties: false,
      required: ['code', 'sortOrder', 'labels'],
      description: 'One selectable interest direction.',
      properties: {
        code: { type: 'string', pattern: '^[a-z][a-z0-9-]{0,63}$' },
        sortOrder: { type: 'integer', minimum: 0 },
        labels: { $ref: '#/components/schemas/IamPersonaLabels' },
      },
    },
    IamPersonaCatalog: {
      type: 'object',
      additionalProperties: false,
      required: ['version', 'roles', 'interests'],
      description: 'The selectable persona taxonomy with every active locale.',
      properties: {
        version: {
          type: 'string',
          description: 'Opaque catalog version; refresh the cached catalog when it changes.',
        },
        roles: {
          type: 'array',
          items: { $ref: '#/components/schemas/IamPersonaRole' },
        },
        interests: {
          type: 'array',
          items: { $ref: '#/components/schemas/IamPersonaInterest' },
        },
      },
    },
    IamUserPersona: {
      type: 'object',
      additionalProperties: false,
      required: [
        'role',
        'interests',
        'promptDismissed',
        'hasSelection',
        'catalogVersion',
        'updatedAt',
      ],
      description: 'The caller persona. role is null until a role is chosen.',
      properties: {
        role: {
          type: ['string', 'null'],
          pattern: '^[a-z][a-z0-9-]{0,63}$',
          description: 'Chosen persona role code, or null while unchosen.',
        },
        interests: {
          type: 'array',
          items: { type: 'string', pattern: '^[a-z][a-z0-9-]{0,63}$' },
          maxItems: 24,
          uniqueItems: true,
          description: 'Followed interest codes in catalog order.',
        },
        promptDismissed: {
          type: 'boolean',
          description: 'Whether the first-run prompt was answered without choosing a role.',
        },
        hasSelection: {
          type: 'boolean',
          description: 'True once a role is chosen.',
        },
        catalogVersion: {
          type: ['string', 'null'],
          description: 'Catalog version the stored selection was validated against.',
        },
        updatedAt: {
          type: ['string', 'null'],
          format: 'date-time',
          description: 'Last write time, or null before the first write.',
        },
      },
    },
    IamPersonaCatalogResponse: {
      allOf: [
        { $ref: '#/components/schemas/SdkWorkApiResponse' },
        {
          type: 'object',
          required: ['data'],
          properties: {
            data: {
              type: 'object',
              required: ['item'],
              properties: {
                item: { $ref: '#/components/schemas/IamPersonaCatalog' },
              },
            },
          },
        },
      ],
    },
    IamUserPersonaResponse: {
      allOf: [
        { $ref: '#/components/schemas/SdkWorkApiResponse' },
        {
          type: 'object',
          required: ['data'],
          properties: {
            data: {
              type: 'object',
              required: ['item'],
              properties: {
                item: { $ref: '#/components/schemas/IamUserPersona' },
              },
            },
          },
        },
      ],
    },
    IamUserPersonaUpdateCommand: {
      type: 'object',
      additionalProperties: false,
      description: 'Full persona replacement; omitted interests mean an empty list.',
      properties: {
        role: {
          type: ['string', 'null'],
          maxLength: 64,
          description: 'Chosen persona role code, or null to clear it.',
        },
        interests: {
          type: 'array',
          items: { type: 'string', maxLength: 64 },
          maxItems: 24,
          uniqueItems: true,
          description: 'Followed interest codes; must be active catalog codes.',
        },
        promptDismissed: {
          type: 'boolean',
          description: 'Whether the first-run prompt was answered.',
        },
      },
    },
    // Organization roster item. The roster is organization-scoped directory
    // data about other people, so the wire type keeps every id a plain string
    // id and makes `email` optional: a caller whose own membership in the
    // organization is `member` never receives it.
    IamOrganizationMember: {
      type: 'object',
      additionalProperties: false,
      required: ['userId', 'membershipId', 'membershipKind', 'status', 'isPrimary'],
      description: 'One member of an organization roster as IAM publishes it.',
      properties: {
        userId: { type: 'string', description: 'IAM user id.' },
        membershipId: {
          type: 'string',
          description: 'Organization membership row id that binds the user to the organization.',
        },
        displayName: { type: 'string', description: 'Display name of the member.' },
        username: { type: 'string', description: 'Login name of the member.' },
        email: {
          type: 'string',
          description:
            'Contact email. Omitted unless the caller holds an owner or admin membership in the same organization.',
        },
        membershipKind: { type: 'string', enum: ['owner', 'admin', 'member'] },
        status: {
          type: 'string',
          description: 'Membership status; an active roster only reports active rows.',
        },
        isPrimary: {
          type: 'boolean',
          description: 'Whether this membership is the member primary organization membership.',
        },
      },
    },
    IamOrganizationMemberListResponse: {
      allOf: [
        { $ref: '#/components/schemas/SdkWorkApiResponse' },
        {
          type: 'object',
          required: ['data'],
          properties: {
            data: {
              type: 'object',
              additionalProperties: false,
              required: ['items', 'pageInfo'],
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/IamOrganizationMember' },
                },
                pageInfo: { $ref: '#/components/schemas/PageInfo' },
              },
            },
          },
        },
      ],
    },
    AppbaseOperationCommand: {
      type: 'object',
      additionalProperties: true,
      description: 'Operation-specific command payload defined by the owning IAM Rust module.',
    },
    WechatMiniProgramSessionCreateCommand: {
      type: 'object',
      additionalProperties: false,
      required: ['jsCode'],
      description: 'One-time WeChat Mini Program login-code exchange command.',
      properties: {
        jsCode: {
          type: 'string',
          minLength: 1,
          maxLength: 512,
          writeOnly: true,
          description: 'One-time code returned by wx.login().',
        },
        phoneCode: {
          type: 'string',
          minLength: 1,
          maxLength: 512,
          writeOnly: true,
          description:
            'One-time code returned by the mini program getPhoneNumber grant. WeChat verified the subscriber SIM for this code, so the resulting phone may associate the WeChat identity with an existing account (subject to the tenant OAuth phone-association policy). Omit it to require the phone-binding step instead.',
        },
        providerCode: {
          type: 'string',
          enum: ['wechat_mini_program'],
          default: 'wechat_mini_program',
        },
        surfaceCode: {
          type: 'string',
          minLength: 1,
          maxLength: 128,
          description: 'Registered IAM OAuth mini-program surface code.',
        },
        deviceId: {
          type: 'string',
          minLength: 1,
          maxLength: 128,
          pattern: '^[A-Za-z0-9._:-]+$',
          description:
            'Opaque client device identity. Sessions are replaced per application per device, so the same device signing in again revokes only its own previous session instead of every session of the application. Carried forward across refresh and the phone-binding step.',
        },
      },
    },
    OauthPhoneBindingSessionCreateCommand: {
      type: 'object',
      additionalProperties: false,
      required: ['continuationToken', 'phone', 'verificationCode'],
      description:
        'Completes a pending OAuth account association after the person proved ownership of the phone. Answered with the standard session payload, or with the `LOGIN_CONTEXT_SELECTION` challenge for an account that belongs to several organizations.',
      properties: {
        continuationToken: {
          type: 'string',
          minLength: 1,
          maxLength: 256,
          description:
            'One-time `continuationToken` returned by the `OAUTH_PHONE_BINDING_REQUIRED` challenge of an OAuth, mini-program, or official-account session exchange.',
        },
        phone: {
          type: 'string',
          minLength: 6,
          maxLength: 32,
          description:
            'Phone number that owns the target IAM account. When no account owns it yet, a new account is registered for the OAuth identity if the tenant allows OAuth auto-registration.',
        },
        verificationCode: {
          type: 'string',
          minLength: 4,
          maxLength: 12,
          writeOnly: true,
          description: 'One-time SMS verification code requested for this phone.',
        },
        surfaceCode: {
          type: 'string',
          minLength: 1,
          maxLength: 128,
          description: 'Originating client surface, recorded with the association.',
        },
        deviceId: {
          type: 'string',
          minLength: 1,
          maxLength: 128,
          pattern: '^[A-Za-z0-9._:-]+$',
          description:
            'Opaque client device identity kept from the challenge. Omit it only when the original request did not send one; the session then binds no device slot.',
        },
      },
    },
    OauthPhoneBindingVerificationCodeRequestCommand: {
      type: 'object',
      additionalProperties: false,
      required: ['continuationToken', 'phone'],
      description:
        'Requests the ownership-proof SMS code for a pending OAuth account association. Unlike `auth/verification_code_requests` the caller is not yet authenticated; the pending-binding ticket is the authorization.',
      properties: {
        continuationToken: {
          type: 'string',
          minLength: 1,
          maxLength: 256,
          description:
            'One-time `continuationToken` returned by the `OAUTH_PHONE_BINDING_REQUIRED` challenge.',
        },
        phone: {
          type: 'string',
          minLength: 6,
          maxLength: 32,
          description: 'Phone number to prove ownership of.',
        },
      },
    },
    IamOauthClientCreateCommand: {
      type: 'object',
      additionalProperties: false,
      required: [
        'integrationId',
        'providerCode',
        'clientCode',
        'displayName',
        'providerClientId',
      ],
      description: 'Tenant-scoped OAuth provider client registration command.',
      properties: {
        integrationId: { type: 'string', minLength: 1, maxLength: 128 },
        providerCode: { type: 'string', minLength: 1, maxLength: 64 },
        clientCode: { type: 'string', minLength: 1, maxLength: 128 },
        displayName: { type: 'string', minLength: 1, maxLength: 255 },
        providerClientId: { type: 'string', minLength: 1, maxLength: 255 },
        providerTenantId: {
          type: 'string',
          minLength: 1,
          maxLength: 255,
          description: 'Provider-owned identity federation scope, such as a WeChat Open Platform account ID.',
        },
      },
    },
    AppbaseSessionCreateCommand: {
      type: 'object',
      additionalProperties: true,
      description: 'Session creation command for credential login and external user-center session exchange.',
      properties: {
        grantType: {
          type: 'string',
          enum: ['password', 'phone_code', 'email_code'],
          default: 'password',
          description:
            'Credential grant to run. Omitted `grantType` means the password grant, which is the body the platform hosted login posts.',
        },
        account: {
          type: 'string',
          description:
            'Shared account identifier understood by hosted-login clients; `email`/`username`/`phone` remain the authoritative identity fields.',
        },
        email: {
          type: 'string',
          description: 'Email credential used by standard password login.',
        },
        username: {
          type: 'string',
          description: 'Username credential used by standard password login.',
        },
        phone: {
          type: 'string',
          description: 'Phone credential used by standard password login.',
        },
        password: {
          type: 'string',
          description: 'Write-only password credential used by standard password login.',
          format: 'password',
        },
        externalToken: {
          type: 'string',
          description: 'Opaque upstream credential used only by an external user-center session exchange.',
        },
        providerKey: {
          type: 'string',
          description: 'External authority provider key used to select the configured bridge.',
        },
        tenantId: {
          type: 'string',
          description: 'Verified tenant id supplied by an external user-center session exchange after upstream identity validation.',
        },
        organizationId: {
          type: 'string',
          description: 'Verified organization id supplied by an external user-center session exchange when the upstream identity resolved an organization scope.',
        },
        deviceId: {
          type: 'string',
          minLength: 1,
          maxLength: 128,
          pattern: '^[A-Za-z0-9._:-]+$',
          description:
            'Opaque client device identity. Sessions are replaced per application per device; omitting it keeps the legacy single-slot behaviour where only sessions without a device are revoked.',
        },
      },
    },
    IamTenantApplicationManagementProvisionCommand: {
      type: 'object',
      additionalProperties: false,
      description:
        'Provision a tenant installation from the deploy application it serves plus explicit attributes, through an authenticated operator workflow. Application templates are retired, so no template reference is accepted.',
      required: ['organizationId', 'instanceKey', 'displayName', 'environment', 'applicationType'],
      properties: {
        organizationId: { type: 'string', minLength: 1, maxLength: 255 },
        instanceKey: { type: 'string', minLength: 1, maxLength: 255 },
        displayName: { type: 'string', minLength: 1, maxLength: 255 },
        environment: { type: 'string', minLength: 1, maxLength: 64 },
        applicationType: {
          type: 'string',
          description:
            'Product-semantic application type (api | h5 | pc | flutter | miniprogram | ios | android | harmonyos | desktop | other). Names the endpoint the installation serves, not the rendering technology. Required: application templates are retired, so nothing else can supply it.',
          enum: ['api', 'h5', 'pc', 'flutter', 'miniprogram', 'ios', 'android', 'harmonyos', 'desktop', 'other'],
        },
        primaryDomain: { type: 'string', minLength: 1, maxLength: 255 },
        accessPermissions: {
          type: ['array', 'null'],
          description:
            'Access permissions granted to the installation. An empty array or null is a valid explicit choice: the installation grants no API scope.',
          items: { type: 'string', minLength: 1, maxLength: 255 },
        },
        runtimeConfig: {
          type: 'object',
          additionalProperties: true,
          description: 'Explicit runtime config, including `oauth.relyingParty`; absent registers no OAuth relying party.',
        },
        deployApplicationId: {
          type: 'string',
          minLength: 1,
          maxLength: 255,
          description:
            'Deploy application this installation serves. It is the identity every access token carries, and the one-to-one relation is enforced by the database.',
        },
        ownershipScope: {
          type: 'string',
          enum: ['TENANT', 'ORGANIZATION', 'USER'],
          default: 'TENANT',
          description:
            'Release scope of the installation (`APPLICATION_IDENTITY_SPEC.md` section 4.1). TENANT is the default: the application serves the whole tenant and its isolation key is (tenantId, appId). ORGANIZATION serves one organization and requires a non-zero organizationId. USER serves one person and requires ownerUserId. The scope is immutable once provisioned; publishing at another level needs a new installation.',
        },
        ownerUserId: {
          type: 'string',
          minLength: 1,
          maxLength: 255,
          description:
            'Owner of a USER-scoped installation. Required for ownershipScope USER and rejected for the other two levels.',
        },
        provisioningIdempotencyKey: {
          type: 'string',
          minLength: 1,
          maxLength: 255,
          description: 'Replay-safe key for the cross-module provisioning call.',
        },
      },
    },
    IamTenantApplicationManagementUpdateCommand: {
      type: 'object',
      additionalProperties: false,
      description: 'Update operator-managed tenant application domain and access permissions.',
      properties: {
        primaryDomain: { type: 'string', minLength: 1, maxLength: 255 },
        accessPermissions: {
          type: 'array',
          items: { type: 'string', minLength: 1, maxLength: 255 },
        },
      },
    },
    IamTenantApplicationStatusCommand: {
      type: 'object',
      additionalProperties: false,
      description: 'Authenticated operator command for a tenant application status transition.',
      properties: {},
    },
    AppbaseTenantApplicationProvisionCommand: {
      type: 'object',
      additionalProperties: true,
      description:
        'Provision a tenant installation from the deploy application it serves plus explicit attributes. Application templates are retired, so no template reference is accepted.',
      required: ['tenantId', 'organizationId', 'instanceKey', 'displayName', 'environment', 'applicationType'],
      properties: {
        ...bootstrapAuth,
        tenantId: { type: 'string' },
        organizationId: { type: 'string' },
        instanceKey: { type: 'string' },
        displayName: { type: 'string' },
        environment: { type: 'string' },
        applicationType: {
          type: 'string',
          description:
            'Product-semantic application type (api | h5 | pc | flutter | miniprogram | ios | android | harmonyos | desktop | other). Names the endpoint the installation serves, not the rendering technology. Required: application templates are retired, so nothing else can supply it.',
          enum: ['api', 'h5', 'pc', 'flutter', 'miniprogram', 'ios', 'android', 'harmonyos', 'desktop', 'other'],
        },
        primaryDomain: { type: 'string' },
        accessPermissions: {
          type: ['array', 'null'],
          description:
            'Access permissions granted to the installation. An empty array or null is a valid explicit choice: the installation grants no API scope.',
          items: { type: 'string' },
        },
        runtimeConfig: { type: 'object', additionalProperties: true },
        deployApplicationId: {
          type: 'string',
          description:
            'Deploy application this installation serves. It is the identity every access token carries, and the one-to-one relation is enforced by the database.',
        },
        ownershipScope: {
          type: 'string',
          enum: ['TENANT', 'ORGANIZATION', 'USER'],
          default: 'TENANT',
          description:
            'Release scope of the installation (`APPLICATION_IDENTITY_SPEC.md` section 4.1). TENANT is the default: the application serves the whole tenant and its isolation key is (tenantId, appId). ORGANIZATION serves one organization and requires a non-zero organizationId. USER serves one person and requires ownerUserId. The scope is immutable once provisioned; publishing at another level needs a new installation.',
        },
        ownerUserId: {
          type: 'string',
          description:
            'Owner of a USER-scoped installation. Required for ownershipScope USER and rejected for the other two levels.',
        },
        provisioningIdempotencyKey: {
          type: 'string',
          description: 'Replay-safe key for the cross-module provisioning call.',
        },
      },
    },
    AppbaseTenantApplicationUpdateCommand: {
      type: 'object',
      additionalProperties: true,
      description: 'Update tenant application access and runtime configuration.',
      properties: {
        ...bootstrapAuth,
        primaryDomain: { type: 'string' },
        domainConfig: { type: 'object', additionalProperties: true },
        accessPermissions: {
          type: 'array',
          items: { type: 'string' },
        },
        runtimeConfig: { type: 'object', additionalProperties: true },
      },
    },
    AppbaseTenantApplicationEnableCommand: {
      type: 'object',
      additionalProperties: true,
      description: 'Enable a provisioned tenant application before access credential issuance.',
      properties: {
        ...bootstrapAuth,
      },
    },
    AppbaseAccessCredentialCreateCommand: {
      type: 'object',
      additionalProperties: true,
      description: 'Issue a delegated access credential for an enabled tenant application.',
      required: ['tenantId', 'organizationId'],
      properties: {
        ...bootstrapAuth,
        tenantId: { type: 'string' },
        organizationId: { type: 'string' },
        tenantApplicationId: { type: 'string' },
        appId: { type: 'string' },
        instanceKey: { type: 'string' },
        ownershipScope: {
          type: 'string',
          enum: ['TENANT', 'ORGANIZATION', 'USER'],
          description:
            'Release scope the caller declares. It is checked against the installation, never used to select one: a value the installation was not released at fails closed (`APPLICATION_IDENTITY_SPEC.md` section 4.1 rule 3). Omit it to inherit the installation scope.',
        },
      },
    },
    ServiceAccountCredentialCreateCommand: {
      type: 'object',
      additionalProperties: false,
      required: ['tenantApplicationId'],
      description: 'Create a one-time-returned workload credential bound to a service account and tenant application.',
      properties: {
        tenantApplicationId: { type: 'string', minLength: 1, maxLength: 255 },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
    ServiceAccountCredentialRevokeCommand: {
      type: 'object',
      additionalProperties: false,
      description: 'Revoke a workload credential and all sessions issued from it.',
      properties: {},
    },
    ServiceAccountTokenExchangeCommand: {
      type: 'object',
      additionalProperties: false,
      required: ['clientId', 'clientSecret'],
      description: 'Exchange a workload client credential for short-lived tenant-bound dual tokens.',
      properties: {
        clientId: { type: 'string', minLength: 1, maxLength: 255 },
        clientSecret: { type: 'string', minLength: 1, maxLength: 512, format: 'password', writeOnly: true },
      },
    },
  };
}

/**
 * Re-shapes a bespoke create response into the `201` + `data.item` contract
 * (API_SPEC section 15.4) without changing the object the generated SDK returns:
 * the schema's `data` object moves under `data.item`, so an SDK that unwraps
 * `data.item` yields exactly the previous `data` payload.
 */
function promoteCreateResponse(operation, description) {
  const ok = operation.responses[200];
  if (!ok) return;
  const schema = ok.content?.['application/json']?.schema;
  const data = schema?.properties?.data;
  if (data) {
    schema.properties.data = {
      type: 'object',
      required: ['item'],
      properties: { item: data },
    };
  }
  operation.responses[201] = { ...ok, description };
  delete operation.responses[200];
}
function jsonResponse(description, schemaRef) {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: schemaRef },
      },
    },
  };
}

function problemResponse(description) {
  return {
    description,
    content: {
      'application/problem+json': {
        schema: { $ref: '#/components/schemas/ProblemDetail' },
      },
    },
  };
}

function extractPathParameters(path) {
  const parameters = [];
  for (const match of path.matchAll(/\{([^}]+)\}/g)) {
    parameters.push({
      name: match[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
    });
  }
  return parameters;
}

function queryParameter(name, schema) {
  return {
    name,
    in: 'query',
    required: false,
    schema,
  };
}

function routeIsPublic(surface, route) {
  void surface;
  return route.routeKind === 'public';
}

function operationAuthMode(surface, route) {
  if (surface.sdkType === 'open') {
    if (route.routeKind === 'api_key') {
      return 'api-key';
    }
    if (route.routeKind === 'oauth') {
      return 'oauth';
    }
    if (route.routeKind === 'open_api_flexible') {
      return routeIsPublic(surface, route) ? 'anonymous' : 'open-api-flexible';
    }
    return 'anonymous';
  }
  if (route.routeKind === 'credential_entry_bootstrap') {
    return 'credential-entry-bootstrap';
  }
  if (route.routeKind === 'bootstrap_body') {
    return 'bootstrap-body';
  }
  if (route.routeKind === 'refresh_token') {
    return 'refresh-token';
  }
  if (route.routeKind === 'public') {
    return 'anonymous';
  }
  return 'dual-token';
}

function resolveOperationSecurity(surface, route) {
  const authMode = operationAuthMode(surface, route);
  if (authMode === 'anonymous' || authMode === 'bootstrap-body' || authMode === 'refresh-token') {
    return [];
  }
  if (surface.sdkType === 'open') {
    if (route.routeKind === 'oauth') {
      return [{ OAuthBearer: [] }];
    }
    if (route.routeKind === 'api_key') {
      return [{ ApiKey: [] }];
    }
    return [{ ApiKey: [] }, { OAuthBearer: [] }];
  }
  if (authMode === 'credential-entry-bootstrap') {
    return [{ AccessToken: [] }];
  }
  return [{ AuthToken: [], AccessToken: [] }];
}

function resolveRouteKind(routeExpression) {
  if (routeExpression.includes('HttpRoute::open_api_flexible')) {
    return 'open_api_flexible';
  }
  if (routeExpression.includes('HttpRoute::api_key')) {
    return 'api_key';
  }
  if (routeExpression.includes('HttpRoute::credential_entry_bootstrap')) {
    return 'credential_entry_bootstrap';
  }
  if (routeExpression.includes('HttpRoute::bootstrap_body')) {
    return 'bootstrap_body';
  }
  if (routeExpression.includes('HttpRoute::refresh_token')) {
    return 'refresh_token';
  }
  if (routeExpression.includes('HttpRoute::public')) {
    return 'public';
  }
  if (routeExpression.includes('HttpRoute::oauth')) {
    return 'oauth';
  }
  if (routeExpression.includes('HttpRoute::dual_token')) {
    return 'dual_token';
  }
  if (routeExpression.includes('HttpRoute::backend_admin')) {
    return 'backend_admin';
  }
  return 'unknown';
}

function operationForbidsCredentialHeaders(surface, route) {
  const authMode = operationAuthMode(surface, route);
  return authMode === 'anonymous'
    || authMode === 'bootstrap-body'
    || authMode === 'refresh-token'
    || authMode === 'credential-entry-bootstrap'
    || (surface.sdkType === 'app' && credentialHeaderForbiddenAppOperationIds.has(route.operationId));
}

function usesJsonBody(method) {
  return method === 'post' || method === 'put' || method === 'patch';
}

function isListOperation(route) {
  return route.method === 'get' && route.operationId.endsWith('.list');
}

function compareRoutes(left, right) {
  return left.path.localeCompare(right.path) || left.method.localeCompare(right.method);
}

function toLowerCamel(value) {
  const parts = String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return 'api';
  }
  const [first, ...rest] = parts;
  return [
    first.charAt(0).toLowerCase() + first.slice(1),
    ...rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1)),
  ].join('');
}

function toTitle(value) {
  return String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());
}

function relativeForOpenApi(path) {
  return path.replace(iamRoot, '<sdkwork-iam>').replace(/\\/g, '/');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
