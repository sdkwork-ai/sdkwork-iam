"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/bootstrap/runtimeBundle.ts
var runtimeBundle_exports = {};
__export(runtimeBundle_exports, {
  IAMMP_ROUTE_CONTRIBUTIONS: () => IAMMP_ROUTE_CONTRIBUTIONS,
  IAM_MP_IMPLEMENTED_ROUTE_IDS: () => IAM_MP_IMPLEMENTED_ROUTE_IDS,
  IAM_MP_PAGE_PATHS: () => IAM_MP_PAGE_PATHS,
  bootstrapIamMpApp: () => bootstrapIamMpApp,
  composeIamMpAppJson: () => composeIamMpAppJson,
  getIamMpRuntime: () => getIamMpRuntime,
  resolveIamMpMessage: () => resolveIamMpMessage
});
module.exports = __toCommonJS(runtimeBundle_exports);

// packages/sdkwork-iam-mp-core/src/modules/index.ts
var IAMMP_ROUTE_CONTRIBUTIONS = [
  {
    id: "app.iam.auth.login",
    surface: "app",
    domain: "iam",
    capability: "auth",
    screen: "login",
    path: "/auth/login",
    titleKey: "iam.auth.login.title",
    auth: "public",
    presentation: { miniProgram: "page" },
    miniProgram: { pagePath: "pages/login/index" }
  },
  {
    id: "app.iam.auth.register",
    surface: "app",
    domain: "iam",
    capability: "auth",
    screen: "register",
    path: "/auth/register",
    titleKey: "iam.auth.register.title",
    auth: "public",
    presentation: { miniProgram: "page" },
    miniProgram: { pagePath: "pages/register/index" }
  },
  {
    id: "app.iam.auth.forgot-password",
    surface: "app",
    domain: "iam",
    capability: "auth",
    screen: "forgot-password",
    path: "/auth/forgot-password",
    titleKey: "iam.auth.forgotPassword.title",
    auth: "public",
    presentation: { miniProgram: "page" },
    miniProgram: { pagePath: "pages/forgot-password/index" }
  },
  {
    id: "app.iam.auth.oauth-callback",
    surface: "app",
    domain: "iam",
    capability: "auth",
    screen: "oauth-callback",
    path: "/auth/oauth/callback",
    titleKey: "iam.auth.oauthCallback.title",
    auth: "public",
    presentation: { miniProgram: "page" },
    miniProgram: { pagePath: "pages/oauth-callback/index" }
  },
  {
    id: "app.iam.auth.context-selection",
    surface: "app",
    domain: "iam",
    capability: "auth",
    screen: "context-selection",
    path: "/auth/login/context",
    titleKey: "iam.auth.contextSelection.title",
    auth: "required",
    presentation: { miniProgram: "subpackagePage" },
    miniProgram: { pagePath: "pages/context-selection/index" }
  },
  {
    id: "app.iam.user-center.profile",
    surface: "app",
    domain: "iam",
    capability: "user-center",
    screen: "profile",
    path: "/user/profile",
    titleKey: "iam.userCenter.profile.title",
    auth: "required",
    permissionHint: "iam.self",
    presentation: { miniProgram: "subpackagePage" },
    miniProgram: { subpackage: "app-user-center", pagePath: "pages/profile/index" }
  },
  {
    id: "app.iam.user-center.password",
    surface: "app",
    domain: "iam",
    capability: "user-center",
    screen: "password",
    path: "/user/password",
    titleKey: "iam.userCenter.password.title",
    auth: "required",
    permissionHint: "iam.self",
    presentation: { miniProgram: "subpackagePage" },
    miniProgram: { subpackage: "app-user-center", pagePath: "pages/password/index" }
  },
  {
    id: "app.iam.account-binding.list",
    surface: "app",
    domain: "iam",
    capability: "account-binding",
    screen: "list",
    path: "/user/account-binding",
    titleKey: "iam.accountBinding.list.title",
    auth: "required",
    permissionHint: "iam.self",
    presentation: { miniProgram: "subpackagePage" },
    miniProgram: { subpackage: "app-account-binding", pagePath: "pages/list/index" }
  },
  {
    id: "app.iam.user.list",
    surface: "app",
    domain: "iam",
    capability: "user",
    screen: "list",
    path: "/user/directory",
    titleKey: "iam.user.list.title",
    auth: "required",
    permissionHint: "iam.users.read",
    presentation: { miniProgram: "subpackagePage" },
    miniProgram: { subpackage: "app-user", pagePath: "pages/list/index" }
  },
  {
    id: "app.iam.tenant.overview",
    surface: "app",
    domain: "iam",
    capability: "tenant",
    screen: "overview",
    path: "/tenant",
    titleKey: "iam.tenant.overview.title",
    auth: "required",
    permissionHint: "iam.tenants.read",
    presentation: { miniProgram: "subpackagePage" },
    miniProgram: { subpackage: "app-tenant", pagePath: "pages/overview/index" }
  },
  {
    id: "app.iam.organization.directory",
    surface: "app",
    domain: "iam",
    capability: "organization",
    screen: "directory",
    path: "/organizations",
    titleKey: "iam.organization.directory.title",
    auth: "required",
    permissionHint: "iam.organizations.read",
    presentation: { miniProgram: "subpackagePage" },
    miniProgram: { subpackage: "app-organization", pagePath: "pages/directory/index" }
  },
  {
    id: "app.iam.oauth.providers",
    surface: "app",
    domain: "iam",
    capability: "oauth",
    screen: "providers",
    path: "/oauth/providers",
    titleKey: "iam.oauth.providers.title",
    auth: "required",
    permissionHint: "iam.oauth.read",
    presentation: { miniProgram: "subpackagePage" },
    miniProgram: { subpackage: "app-oauth", pagePath: "pages/providers/index" }
  }
];

// packages/sdkwork-iam-mp-core/src/session/index.ts
function createIamMpSessionStore() {
  let current;
  const listeners = /* @__PURE__ */ new Set();
  const emit = () => {
    for (const listener of listeners) listener(current);
  };
  return {
    clear() {
      current = void 0;
      emit();
    },
    get() {
      return current;
    },
    set(snapshot) {
      current = snapshot;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/node_modules/.pnpm/@sdkwork+sdk-common@1.0.9/node_modules/@sdkwork/sdk-common/dist/core/types.js
var DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1e3,
  retryBackoff: "exponential",
  maxRetryDelay: 3e4
};
var DEFAULT_CACHE_CONFIG = {
  enabled: false,
  ttl: 300 * 1e3,
  maxSize: 100
};
var SUCCESS_CODES = [
  0,
  200,
  2e3,
  "0",
  "200",
  "2000"
];
var HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};
var MIME_TYPES = {
  JSON: "application/json",
  FORM_DATA: "multipart/form-data",
  URL_ENCODED: "application/x-www-form-urlencoded",
  OCTET_STREAM: "application/octet-stream",
  TEXT_PLAIN: "text/plain",
  TEXT_HTML: "text/html"
};

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/node_modules/.pnpm/@sdkwork+sdk-common@1.0.9/node_modules/@sdkwork/sdk-common/dist/auth/token-manager.js
var DefaultAuthTokenManager = class {
  constructor(initialTokens, events) {
    __publicField(this, "tokens", {});
    __publicField(this, "events");
    if (initialTokens) {
      this.tokens = { ...initialTokens };
      if (initialTokens.expiresIn && !initialTokens.expiresAt) this.tokens.expiresAt = Date.now() + initialTokens.expiresIn * 1e3;
    }
    this.events = events;
  }
  getAccessToken() {
    return this.tokens.accessToken;
  }
  getAuthToken() {
    return this.tokens.authToken;
  }
  getRefreshToken() {
    return this.tokens.refreshToken;
  }
  getTokens() {
    return { ...this.tokens };
  }
  setTokens(tokens) {
    this.tokens = { ...tokens };
    if (tokens.expiresIn && !tokens.expiresAt) this.tokens.expiresAt = Date.now() + tokens.expiresIn * 1e3;
    this.events?.onTokenSet?.(this.tokens);
  }
  setAccessToken(token) {
    this.tokens.accessToken = token;
    this.events?.onTokenSet?.(this.tokens);
  }
  setAuthToken(token) {
    this.tokens.authToken = token;
    this.events?.onTokenSet?.(this.tokens);
  }
  setRefreshToken(token) {
    this.tokens.refreshToken = token;
  }
  clearTokens() {
    this.tokens = {};
    this.events?.onTokenCleared?.();
  }
  clearAuthToken() {
    delete this.tokens.authToken;
  }
  clearAccessToken() {
    delete this.tokens.accessToken;
  }
  isExpired() {
    if (!this.tokens.expiresAt) return false;
    const expired = Date.now() >= this.tokens.expiresAt;
    if (expired) this.events?.onTokenExpired?.();
    return expired;
  }
  isValid() {
    return this.hasToken() && !this.isExpired();
  }
  hasToken() {
    return !!(this.tokens.accessToken || this.tokens.authToken);
  }
  hasAuthToken() {
    return !!this.tokens.authToken;
  }
  hasAccessToken() {
    return !!this.tokens.accessToken;
  }
  willExpireIn(seconds) {
    if (!this.tokens.expiresAt) return false;
    return Date.now() + seconds * 1e3 >= this.tokens.expiresAt;
  }
};
function buildAuthHeaders(authMode, apiKey, tokenManager) {
  const headers = {};
  if (authMode === "apikey") {
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  } else if (authMode === "dual-token") {
    if (tokenManager) {
      const accessToken = tokenManager.getAccessToken();
      const authToken = tokenManager.getAuthToken();
      if (accessToken) headers["Access-Token"] = accessToken;
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    }
  }
  return headers;
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/node_modules/.pnpm/@sdkwork+sdk-common@1.0.9/node_modules/@sdkwork/sdk-common/dist/utils/logger.js
var LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4
};
var ConsoleLogger = class {
  constructor(config = {}) {
    __publicField(this, "level");
    __publicField(this, "prefix");
    __publicField(this, "timestamp");
    __publicField(this, "colors");
    this.level = config.level ?? "info";
    this.prefix = config.prefix ?? "[SDK]";
    this.timestamp = config.timestamp ?? true;
    this.colors = config.colors ?? true;
  }
  formatMessage(level, message) {
    const parts = [];
    if (this.timestamp) parts.push((/* @__PURE__ */ new Date()).toISOString());
    parts.push(this.prefix);
    parts.push(`[${level.toUpperCase()}]`);
    parts.push(message);
    return parts.join(" ");
  }
  getColorCode(level) {
    if (!this.colors) return "";
    return {
      debug: "\x1B[36m",
      info: "\x1B[32m",
      warn: "\x1B[33m",
      error: "\x1B[31m",
      silent: ""
    }[level];
  }
  getResetCode() {
    return this.colors ? "\x1B[0m" : "";
  }
  log(level, message, ...args) {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.level]) return;
    const formattedMessage = this.formatMessage(level, message);
    const output = `${this.getColorCode(level)}${formattedMessage}${this.getResetCode()}`;
    switch (level) {
      case "debug":
        console.debug(output, ...args);
        break;
      case "info":
        console.info(output, ...args);
        break;
      case "warn":
        console.warn(output, ...args);
        break;
      case "error":
        console.error(output, ...args);
        break;
    }
  }
  debug(message, ...args) {
    this.log("debug", message, ...args);
  }
  info(message, ...args) {
    this.log("info", message, ...args);
  }
  warn(message, ...args) {
    this.log("warn", message, ...args);
  }
  error(message, ...args) {
    this.log("error", message, ...args);
  }
  setLevel(level) {
    this.level = level;
  }
};
var noopLogger = {
  debug: () => {
  },
  info: () => {
  },
  warn: () => {
  },
  error: () => {
  },
  log: () => {
  },
  setLevel: () => {
  }
};
function createLogger(config) {
  if (config?.level === "silent") return noopLogger;
  return new ConsoleLogger(config);
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/node_modules/.pnpm/@sdkwork+sdk-common@1.0.9/node_modules/@sdkwork/sdk-common/dist/utils/cache.js
var MemoryCacheStore = class {
  constructor(config = {}) {
    __publicField(this, "cache", /* @__PURE__ */ new Map());
    __publicField(this, "maxSize");
    __publicField(this, "defaultTtl");
    this.maxSize = config.maxSize ?? DEFAULT_CACHE_CONFIG.maxSize;
    this.defaultTtl = config.ttl ?? DEFAULT_CACHE_CONFIG.ttl;
  }
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }
  set(key, value, ttl) {
    if (this.cache.size >= this.maxSize) this.evictOldest();
    const expiresAt = Date.now() + (ttl ?? this.defaultTtl);
    this.cache.set(key, {
      value,
      expiresAt
    });
  }
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
  delete(key) {
    return this.cache.delete(key);
  }
  clear() {
    this.cache.clear();
  }
  size() {
    return this.cache.size;
  }
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache) if (entry.expiresAt < oldestTime) {
      oldestTime = entry.expiresAt;
      oldestKey = key;
    }
    if (oldestKey) this.cache.delete(oldestKey);
  }
};
function createCacheStore(config) {
  return new MemoryCacheStore(config);
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/node_modules/.pnpm/@sdkwork+sdk-common@1.0.9/node_modules/@sdkwork/sdk-common/dist/errors/index.js
var SdkError = class extends Error {
  constructor(message, code = "UNKNOWN", httpStatus, options) {
    super(message, { cause: options?.cause });
    __publicField(this, "code");
    __publicField(this, "httpStatus");
    __publicField(this, "details");
    __publicField(this, "timestamp");
    __publicField(this, "traceId");
    __publicField(this, "problem");
    __publicField(this, "metadata");
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = options?.details;
    this.timestamp = Date.now();
    this.traceId = options?.traceId ?? options?.problem?.traceId;
    this.problem = options?.problem;
    this.metadata = options?.metadata;
    Object.setPrototypeOf(this, new.target.prototype);
  }
  static fromApiResult(result, httpStatus) {
    const code = String(result.code);
    const message = result.msg || result.message || "Unknown error";
    switch (code) {
      case "400":
      case "4000":
        return new ValidationError(message);
      case "401":
      case "4010":
        return new AuthenticationError(message);
      case "403":
      case "4030":
        return new ForbiddenError(message);
      case "404":
      case "4040":
        return new NotFoundError(message);
      case "409":
      case "4090":
        return new ConflictError(message);
      case "429":
      case "4290":
        return new RateLimitError(message);
      default:
        if (code.startsWith("5")) return new ServerError(message, httpStatus ?? HTTP_STATUS.INTERNAL_SERVER_ERROR);
        return new BusinessError(message, result.code, result.data);
    }
  }
  static fromHttpStatus(status, message, options) {
    const defaultMessage = message ?? `HTTP Error ${status}`;
    switch (status) {
      case HTTP_STATUS.BAD_REQUEST:
      case HTTP_STATUS.UNPROCESSABLE_ENTITY:
        return new ValidationError(defaultMessage, void 0, options);
      case HTTP_STATUS.UNAUTHORIZED:
        return new AuthenticationError(defaultMessage, options);
      case HTTP_STATUS.FORBIDDEN:
        return new ForbiddenError(defaultMessage, options);
      case HTTP_STATUS.NOT_FOUND:
        return new NotFoundError(defaultMessage, options);
      case HTTP_STATUS.METHOD_NOT_ALLOWED:
        return new ValidationError(defaultMessage, void 0, options);
      case HTTP_STATUS.CONFLICT:
        return new ConflictError(defaultMessage, options);
      case HTTP_STATUS.TOO_MANY_REQUESTS:
        return new RateLimitError(defaultMessage, void 0, options);
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
        return new ServerError(defaultMessage, status, options);
      case HTTP_STATUS.BAD_GATEWAY:
        return new BadGatewayError(defaultMessage, options);
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
        return new ServiceUnavailableError(defaultMessage, options);
      case HTTP_STATUS.GATEWAY_TIMEOUT:
        return new GatewayTimeoutError(defaultMessage, options);
      default:
        if (status >= 500) return new ServerError(defaultMessage, status, options);
        return new NetworkError(defaultMessage, options);
    }
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      httpStatus: this.httpStatus,
      details: this.details,
      timestamp: this.timestamp,
      traceId: this.traceId,
      problem: this.problem,
      metadata: this.metadata
    };
  }
  toString() {
    return `${this.name}: ${this.message} (code: ${this.code})`;
  }
  isRetryable() {
    return isRetryableError(this);
  }
  isAuthError() {
    return this.code === "UNAUTHORIZED" || this.code === "TOKEN_EXPIRED" || this.code === "TOKEN_INVALID";
  }
  isNetworkError() {
    return this.code === "NETWORK_ERROR" || this.code === "TIMEOUT";
  }
  isClientError() {
    return this.httpStatus !== void 0 && this.httpStatus >= 400 && this.httpStatus < 500;
  }
  isServerError() {
    return this.httpStatus !== void 0 && this.httpStatus >= 500;
  }
};
var NetworkError = class extends SdkError {
  constructor(message = "Network error", options) {
    super(message, "NETWORK_ERROR", void 0, options);
  }
};
var TimeoutError = class extends SdkError {
  constructor(message = "Request timeout", timeout, options) {
    super(message, "TIMEOUT", void 0, options);
    __publicField(this, "timeout");
    this.timeout = timeout;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      timeout: this.timeout
    };
  }
};
var CancelledError = class extends SdkError {
  constructor(message = "Request cancelled", options) {
    super(message, "CANCELLED", void 0, options);
  }
};
var AuthenticationError = class extends SdkError {
  constructor(message = "Authentication failed", options) {
    super(message, "UNAUTHORIZED", HTTP_STATUS.UNAUTHORIZED, options);
  }
};
var ForbiddenError = class extends SdkError {
  constructor(message = "Access forbidden", options) {
    super(message, "FORBIDDEN", HTTP_STATUS.FORBIDDEN, options);
  }
};
var NotFoundError = class extends SdkError {
  constructor(message = "Resource not found", options) {
    super(message, "NOT_FOUND", HTTP_STATUS.NOT_FOUND, options);
  }
};
var ValidationError = class extends SdkError {
  constructor(message = "Validation error", details, options) {
    super(message, "VALIDATION_ERROR", HTTP_STATUS.BAD_REQUEST, details === void 0 ? options : {
      ...options,
      details
    });
  }
};
var ConflictError = class extends SdkError {
  constructor(message = "Resource conflict", options) {
    super(message, "CONFLICT", HTTP_STATUS.CONFLICT, options);
  }
};
var RateLimitError = class extends SdkError {
  constructor(message = "Rate limit exceeded", retryAfter, options) {
    super(message, "RATE_LIMIT", HTTP_STATUS.TOO_MANY_REQUESTS, options);
    __publicField(this, "retryAfter");
    this.retryAfter = retryAfter;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter
    };
  }
};
var ServerError = class extends SdkError {
  constructor(message = "Server error", httpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR, options) {
    super(message, "SERVER_ERROR", httpStatus, options);
  }
};
var BadGatewayError = class extends ServerError {
  constructor(message = "Bad gateway", options) {
    super(message, HTTP_STATUS.BAD_GATEWAY, options);
    this.code = "BAD_GATEWAY";
  }
};
var ServiceUnavailableError = class extends ServerError {
  constructor(message = "Service unavailable", options) {
    super(message, HTTP_STATUS.SERVICE_UNAVAILABLE, options);
    this.code = "SERVICE_UNAVAILABLE";
  }
};
var GatewayTimeoutError = class extends ServerError {
  constructor(message = "Gateway timeout", options) {
    super(message, HTTP_STATUS.GATEWAY_TIMEOUT, options);
    this.code = "GATEWAY_TIMEOUT";
  }
};
var BusinessError = class extends SdkError {
  constructor(message, code, data, options) {
    super(message, "BUSINESS_ERROR", void 0, options);
    __publicField(this, "businessCode");
    __publicField(this, "data");
    this.businessCode = code;
    this.data = data;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      businessCode: this.businessCode,
      data: this.data
    };
  }
};
function isRetryableError(error) {
  if (!(error instanceof SdkError)) return false;
  return error instanceof NetworkError || error instanceof TimeoutError || error instanceof ServerError || error instanceof RateLimitError || error instanceof BadGatewayError || error instanceof ServiceUnavailableError || error instanceof GatewayTimeoutError;
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/node_modules/.pnpm/@sdkwork+sdk-common@1.0.9/node_modules/@sdkwork/sdk-common/dist/utils/retry.js
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function calculateDelay(attempt, baseDelay, backoff, maxDelay) {
  let delay;
  switch (backoff) {
    case "fixed":
      delay = baseDelay;
      break;
    case "linear":
      delay = baseDelay * attempt;
      break;
    case "exponential":
      delay = baseDelay * Math.pow(2, attempt - 1);
      break;
    default:
      delay = baseDelay;
  }
  return Math.min(delay, maxDelay);
}
function shouldRetry(error, attempt, config) {
  if (attempt >= config.maxRetries) return false;
  if (config.retryCondition) return config.retryCondition(error, attempt);
  return isRetryableError(error);
}
async function withRetry(fn, config = {}) {
  const fullConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config
  };
  let lastError;
  let attempt = 0;
  while (attempt <= fullConfig.maxRetries) try {
    return await fn();
  } catch (error) {
    lastError = error;
    attempt++;
    if (!shouldRetry(lastError, attempt, fullConfig)) throw lastError;
    await sleep(calculateDelay(attempt, fullConfig.retryDelay, fullConfig.retryBackoff, fullConfig.maxRetryDelay));
  }
  throw lastError;
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/node_modules/.pnpm/@sdkwork+sdk-common@1.0.9/node_modules/@sdkwork/sdk-common/dist/sdkwork-utils/packages/sdkwork-utils-typescript/src/runtime/random.js
function getCrypto() {
  const crypto = globalThis.crypto;
  if (!crypto?.getRandomValues) throw new Error("Web Crypto API is not available in this environment.");
  return crypto;
}
function randomBytes(length) {
  const bytes = new Uint8Array(length);
  getCrypto().getRandomValues(bytes);
  return bytes;
}
function randomUuid() {
  const crypto = getCrypto();
  if (typeof crypto.randomUUID === "function") try {
    return crypto.randomUUID.call(crypto);
  } catch {
  }
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] ?? 0) & 15 | 64;
  bytes[8] = (bytes[8] ?? 0) & 63 | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/node_modules/.pnpm/@sdkwork+sdk-common@1.0.9/node_modules/@sdkwork/sdk-common/dist/sdkwork-utils/packages/sdkwork-utils-typescript/src/id.js
function uuid() {
  return randomUuid();
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/node_modules/.pnpm/@sdkwork+sdk-common@1.0.9/node_modules/@sdkwork/sdk-common/dist/utils/string.js
var StringUtils;
(function(StringUtils2) {
  function isEmpty(value) {
    return value === null || value === void 0 || value === "";
  }
  StringUtils2.isEmpty = isEmpty;
  function isNotEmpty(value) {
    return !isEmpty(value);
  }
  StringUtils2.isNotEmpty = isNotEmpty;
  function isBlank3(value) {
    if (isEmpty(value)) return true;
    if (typeof value !== "string") return false;
    return value.trim().length === 0;
  }
  StringUtils2.isBlank = isBlank3;
  function isNotBlank(value) {
    return !isBlank3(value);
  }
  StringUtils2.isNotBlank = isNotBlank;
  function trim3(value) {
    return value?.trim() ?? "";
  }
  StringUtils2.trim = trim3;
  function trimStart(value) {
    return value?.trimStart() ?? "";
  }
  StringUtils2.trimStart = trimStart;
  function trimEnd(value) {
    return value?.trimEnd() ?? "";
  }
  StringUtils2.trimEnd = trimEnd;
  function toLowerCase(value) {
    return value?.toLowerCase() ?? "";
  }
  StringUtils2.toLowerCase = toLowerCase;
  function toUpperCase(value) {
    return value?.toUpperCase() ?? "";
  }
  StringUtils2.toUpperCase = toUpperCase;
  function capitalize(value) {
    if (isEmpty(value)) return "";
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
  StringUtils2.capitalize = capitalize;
  function capitalizeWords(value) {
    if (isEmpty(value)) return "";
    return value.split(/\s+/).map(capitalize).join(" ");
  }
  StringUtils2.capitalizeWords = capitalizeWords;
  function camelCase(value) {
    if (isEmpty(value)) return "";
    return value.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : "").replace(/^(.)/, (char) => char.toLowerCase());
  }
  StringUtils2.camelCase = camelCase;
  function pascalCase(value) {
    if (isEmpty(value)) return "";
    const camel = camelCase(value);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }
  StringUtils2.pascalCase = pascalCase;
  function kebabCase(value) {
    if (isEmpty(value)) return "";
    return value.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[\s_]+/g, "-").toLowerCase();
  }
  StringUtils2.kebabCase = kebabCase;
  function snakeCase(value) {
    if (isEmpty(value)) return "";
    return value.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[\s-]+/g, "_").toLowerCase();
  }
  StringUtils2.snakeCase = snakeCase;
  function constantCase(value) {
    return snakeCase(value).toUpperCase();
  }
  StringUtils2.constantCase = constantCase;
  function truncate(value, length, suffix = "...") {
    if (isEmpty(value) || value.length <= length) return value ?? "";
    return value.slice(0, length - suffix.length) + suffix;
  }
  StringUtils2.truncate = truncate;
  function truncateWords(value, wordCount2, suffix = "...") {
    if (isEmpty(value)) return "";
    const words2 = value.split(/\s+/);
    if (words2.length <= wordCount2) return value;
    return words2.slice(0, wordCount2).join(" ") + suffix;
  }
  StringUtils2.truncateWords = truncateWords;
  function padStart(value, length, padChar = " ") {
    return value?.padStart(length, padChar) ?? "";
  }
  StringUtils2.padStart = padStart;
  function padEnd(value, length, padChar = " ") {
    return value?.padEnd(length, padChar) ?? "";
  }
  StringUtils2.padEnd = padEnd;
  function repeat(value, count) {
    if (isEmpty(value) || count <= 0) return "";
    return value.repeat(count);
  }
  StringUtils2.repeat = repeat;
  function reverse(value) {
    if (isEmpty(value)) return "";
    return value.split("").reverse().join("");
  }
  StringUtils2.reverse = reverse;
  function startsWith(value, prefix) {
    return value?.startsWith(prefix) ?? false;
  }
  StringUtils2.startsWith = startsWith;
  function endsWith(value, suffix) {
    return value?.endsWith(suffix) ?? false;
  }
  StringUtils2.endsWith = endsWith;
  function contains(value, search) {
    return value?.includes(search) ?? false;
  }
  StringUtils2.contains = contains;
  function containsIgnoreCase(value, search) {
    return value?.toLowerCase().includes(search.toLowerCase()) ?? false;
  }
  StringUtils2.containsIgnoreCase = containsIgnoreCase;
  function indexOf(value, search) {
    return value?.indexOf(search) ?? -1;
  }
  StringUtils2.indexOf = indexOf;
  function lastIndexOf(value, search) {
    return value?.lastIndexOf(search) ?? -1;
  }
  StringUtils2.lastIndexOf = lastIndexOf;
  function substring(value, start, end) {
    if (isEmpty(value)) return "";
    return end !== void 0 ? value.slice(start, end) : value.slice(start);
  }
  StringUtils2.substring = substring;
  function slice(value, start, end) {
    return substring(value, start, end);
  }
  StringUtils2.slice = slice;
  function split(value, separator, limit) {
    if (isEmpty(value)) return [];
    return value.split(separator, limit);
  }
  StringUtils2.split = split;
  function join(values, separator = "") {
    return values?.join(separator) ?? "";
  }
  StringUtils2.join = join;
  function replace(value, search, replacement) {
    return value?.replace(search, replacement) ?? "";
  }
  StringUtils2.replace = replace;
  function replaceAll(value, search, replacement) {
    return value?.replaceAll(search, replacement) ?? "";
  }
  StringUtils2.replaceAll = replaceAll;
  function remove(value, search) {
    return value?.replace(search, "") ?? "";
  }
  StringUtils2.remove = remove;
  function removeAll(value, search) {
    const regex = typeof search === "string" ? new RegExp(search, "g") : new RegExp(search.source, `${search.flags}g`);
    return value?.replace(regex, "") ?? "";
  }
  StringUtils2.removeAll = removeAll;
  function countOccurrences(value, search) {
    if (isEmpty(value) || isEmpty(search)) return 0;
    return (value.match(new RegExp(escapeRegex(search), "g")) || []).length;
  }
  StringUtils2.countOccurrences = countOccurrences;
  function escapeHtml(value) {
    const htmlEntities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return value?.replace(/[&<>"']/g, (char) => htmlEntities[char] || char) ?? "";
  }
  StringUtils2.escapeHtml = escapeHtml;
  function unescapeHtml(value) {
    const htmlEntities = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'",
      "&#x27;": "'",
      "&apos;": "'"
    };
    return value?.replace(/&(?:amp|lt|gt|quot|#39|#x27|apos);/g, (entity) => htmlEntities[entity] || entity) ?? "";
  }
  StringUtils2.unescapeHtml = unescapeHtml;
  function escapeRegex(value) {
    return value?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") ?? "";
  }
  StringUtils2.escapeRegex = escapeRegex;
  function isNumeric(value) {
    if (isEmpty(value)) return false;
    return !isNaN(Number(value)) && !isNaN(parseFloat(value));
  }
  StringUtils2.isNumeric = isNumeric;
  function isAlpha(value) {
    if (isEmpty(value)) return false;
    return /^[a-zA-Z]+$/.test(value);
  }
  StringUtils2.isAlpha = isAlpha;
  function isAlphanumeric(value) {
    if (isEmpty(value)) return false;
    return /^[a-zA-Z0-9]+$/.test(value);
  }
  StringUtils2.isAlphanumeric = isAlphanumeric;
  function isHex(value) {
    if (isEmpty(value)) return false;
    return /^[0-9a-fA-F]+$/.test(value);
  }
  StringUtils2.isHex = isHex;
  function isUuid(value) {
    if (isEmpty(value)) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
  StringUtils2.isUuid = isUuid;
  function isEmail(value) {
    if (isEmpty(value)) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
  StringUtils2.isEmail = isEmail;
  function isUrl(value) {
    if (isEmpty(value)) return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
  StringUtils2.isUrl = isUrl;
  function isPhoneNumber(value) {
    if (isEmpty(value)) return false;
    return /^\+?[\d\s-()]{10,}$/.test(value);
  }
  StringUtils2.isPhoneNumber = isPhoneNumber;
  function mask(value, start, end, maskChar = "*") {
    if (isEmpty(value)) return "";
    const actualStart = Math.max(0, start);
    const actualEnd = Math.min(value.length, end);
    if (actualStart >= actualEnd) return value;
    const masked = maskChar.repeat(actualEnd - actualStart);
    return value.slice(0, actualStart) + masked + value.slice(actualEnd);
  }
  StringUtils2.mask = mask;
  function maskEmail(value) {
    if (!isEmail(value)) return value;
    const parts = value.split("@");
    const localPart = parts[0];
    const domain = parts[1];
    if (!localPart || !domain) return value;
    return `${mask(localPart, 2, localPart.length - 2)}@${domain}`;
  }
  StringUtils2.maskEmail = maskEmail;
  function maskPhone(value) {
    if (isEmpty(value)) return value;
    const digits = value.replace(/\D/g, "");
    if (digits.length < 7) return value;
    return mask(digits, 3, digits.length - 4);
  }
  StringUtils2.maskPhone = maskPhone;
  function maskCreditCard(value) {
    if (isEmpty(value)) return value;
    const digits = value.replace(/\D/g, "");
    if (digits.length < 8) return value;
    return mask(digits, 4, digits.length - 4);
  }
  StringUtils2.maskCreditCard = maskCreditCard;
  function formatNumber(value, options) {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "";
    return num.toLocaleString(void 0, options);
  }
  StringUtils2.formatNumber = formatNumber;
  function formatCurrency(value, currency = "USD", locale) {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "";
    return num.toLocaleString(locale, {
      style: "currency",
      currency
    });
  }
  StringUtils2.formatCurrency = formatCurrency;
  function formatPercentage(value, decimals = 0) {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "";
    return `${(num * 100).toFixed(decimals)}%`;
  }
  StringUtils2.formatPercentage = formatPercentage;
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = [
      "Bytes",
      "KB",
      "MB",
      "GB",
      "TB",
      "PB"
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
  }
  StringUtils2.formatBytes = formatBytes;
  function random(length = 16, charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") {
    let result = "";
    for (let i = 0; i < length; i++) result += charset.charAt(Math.floor(Math.random() * charset.length));
    return result;
  }
  StringUtils2.random = random;
  function uuid$1() {
    return uuid();
  }
  StringUtils2.uuid = uuid$1;
  function slugify(value) {
    return value?.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "") ?? "";
  }
  StringUtils2.slugify = slugify;
  function unslugify(value) {
    return value?.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) ?? "";
  }
  StringUtils2.unslugify = unslugify;
  function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) if (matrix[0]) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) for (let j = 1; j <= a.length; j++) if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
    else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    return matrix[b.length][a.length];
  }
  StringUtils2.levenshteinDistance = levenshteinDistance;
  function similarity(a, b) {
    if (isEmpty(a) && isEmpty(b)) return 1;
    if (isEmpty(a) || isEmpty(b)) return 0;
    return 1 - levenshteinDistance(a, b) / Math.max(a.length, b.length);
  }
  StringUtils2.similarity = similarity;
  function fuzzyMatch(text, pattern, threshold = 0.6) {
    return similarity(text, pattern) >= threshold;
  }
  StringUtils2.fuzzyMatch = fuzzyMatch;
  function equals(a, b, ignoreCase = false) {
    if (ignoreCase) return a?.toLowerCase() === b?.toLowerCase();
    return a === b;
  }
  StringUtils2.equals = equals;
  function equalsIgnoreCase(a, b) {
    return equals(a, b, true);
  }
  StringUtils2.equalsIgnoreCase = equalsIgnoreCase;
  function wordCount(value) {
    if (isEmpty(value)) return 0;
    return value.trim().split(/\s+/).filter(Boolean).length;
  }
  StringUtils2.wordCount = wordCount;
  function characterCount(value, includeSpaces = true) {
    if (isEmpty(value)) return 0;
    return includeSpaces ? value.length : value.replace(/\s/g, "").length;
  }
  StringUtils2.characterCount = characterCount;
  function lineCount(value) {
    if (isEmpty(value)) return 0;
    return value.split(/\r?\n/).length;
  }
  StringUtils2.lineCount = lineCount;
  function splitLines(value) {
    if (isEmpty(value)) return [];
    return value.split(/\r?\n/);
  }
  StringUtils2.splitLines = splitLines;
  function words(value) {
    if (isEmpty(value)) return [];
    return value.trim().split(/\s+/).filter(Boolean);
  }
  StringUtils2.words = words;
  function charAt(value, index) {
    return value?.charAt(index) ?? "";
  }
  StringUtils2.charAt = charAt;
  function charCodeAt(value, index) {
    return value?.charCodeAt(index) ?? NaN;
  }
  StringUtils2.charCodeAt = charCodeAt;
  function fromCharCode(...codes) {
    return String.fromCharCode(...codes);
  }
  StringUtils2.fromCharCode = fromCharCode;
  function insert(value, index, insertValue) {
    if (isEmpty(value)) return insertValue;
    return value.slice(0, index) + insertValue + value.slice(index);
  }
  StringUtils2.insert = insert;
  function swapCase(value) {
    return value?.replace(/[a-zA-Z]/g, (char) => {
      return char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase();
    }) ?? "";
  }
  StringUtils2.swapCase = swapCase;
  function surround(value, wrapper) {
    return `${wrapper}${value}${wrapper}`;
  }
  StringUtils2.surround = surround;
  function quote(value, quoteChar = '"') {
    return `${quoteChar}${value}${quoteChar}`;
  }
  StringUtils2.quote = quote;
  function unquote(value) {
    if (isEmpty(value)) return "";
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'") || value.startsWith("`") && value.endsWith("`")) return value.slice(1, -1);
    return value;
  }
  StringUtils2.unquote = unquote;
  function wrap(value, prefix, suffix = prefix) {
    return `${prefix}${value}${suffix}`;
  }
  StringUtils2.wrap = wrap;
  function unwrap2(value, prefix, suffix = prefix) {
    if (isEmpty(value)) return "";
    if (value.startsWith(prefix) && value.endsWith(suffix)) return value.slice(prefix.length, -suffix.length);
    return value;
  }
  StringUtils2.unwrap = unwrap2;
  function template(templateStr, values) {
    return templateStr?.replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key] ?? "")) ?? "";
  }
  StringUtils2.template = template;
  function interpolate(templateStr, values) {
    return template(templateStr, values);
  }
  StringUtils2.interpolate = interpolate;
  function dedent(value) {
    const lines = value.split("\n");
    const minIndent = Math.min(...lines.filter((line) => line.trim().length > 0).map((line) => line.match(/^\s*/)?.[0].length ?? 0));
    return lines.map((line) => line.slice(minIndent)).join("\n");
  }
  StringUtils2.dedent = dedent;
  function indent(value, spaces = 2) {
    const indentation = " ".repeat(spaces);
    return value.split("\n").map((line) => indentation + line).join("\n");
  }
  StringUtils2.indent = indent;
  function center(value, width, padChar = " ") {
    if (isEmpty(value) || value.length >= width) return value ?? "";
    const padding = width - value.length;
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return padChar.repeat(leftPad) + value + padChar.repeat(rightPad);
  }
  StringUtils2.center = center;
  function alignLeft(value, width, padChar = " ") {
    return padEnd(value, width, padChar);
  }
  StringUtils2.alignLeft = alignLeft;
  function alignRight(value, width, padChar = " ") {
    return padStart(value, width, padChar);
  }
  StringUtils2.alignRight = alignRight;
  function alignCenter(value, width, padChar = " ") {
    return center(value, width, padChar);
  }
  StringUtils2.alignCenter = alignCenter;
  function toBoolean(value) {
    return [
      "true",
      "1",
      "yes",
      "on",
      "y"
    ].includes(value?.toLowerCase().trim());
  }
  StringUtils2.toBoolean = toBoolean;
  function toNumber(value, defaultValue = 0) {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  }
  StringUtils2.toNumber = toNumber;
  function toArray(value, separator = ",") {
    return split(value, separator);
  }
  StringUtils2.toArray = toArray;
  function hashCode(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }
  StringUtils2.hashCode = hashCode;
  function isPalindrome(value) {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9]/g, "");
    return cleaned === cleaned.split("").reverse().join("");
  }
  StringUtils2.isPalindrome = isPalindrome;
  function isAnagram(a, b) {
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "").split("").sort().join("");
    return normalize(a) === normalize(b);
  }
  StringUtils2.isAnagram = isAnagram;
  function reverseWords(value) {
    return value?.split(/\s+/).reverse().join(" ") ?? "";
  }
  StringUtils2.reverseWords = reverseWords;
  function sortCharacters(value) {
    return value?.split("").sort().join("") ?? "";
  }
  StringUtils2.sortCharacters = sortCharacters;
  function uniqueCharacters(value) {
    return [...new Set(value)].join("");
  }
  StringUtils2.uniqueCharacters = uniqueCharacters;
  function removeDuplicates(value) {
    return value?.split("").filter((char, index, arr) => arr.indexOf(char) === index).join("") ?? "";
  }
  StringUtils2.removeDuplicates = removeDuplicates;
  function longestCommonSubstring(a, b) {
    if (isEmpty(a) || isEmpty(b)) return "";
    const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
    let maxLength = 0;
    let endIndex = 0;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) if (a[i - 1] === b[j - 1]) {
      matrix[i][j] = matrix[i - 1][j - 1] + 1;
      if (matrix[i][j] > maxLength) {
        maxLength = matrix[i][j];
        endIndex = i;
      }
    }
    return a.slice(endIndex - maxLength, endIndex);
  }
  StringUtils2.longestCommonSubstring = longestCommonSubstring;
  function longestCommonPrefix(strings) {
    if (strings.length === 0) return "";
    if (strings.length === 1) return strings[0] ?? "";
    const sorted = [...strings].sort();
    const first = sorted[0] ?? "";
    const last = sorted[sorted.length - 1] ?? "";
    let i = 0;
    while (i < first.length && first[i] === last[i]) i++;
    return first.slice(0, i);
  }
  StringUtils2.longestCommonPrefix = longestCommonPrefix;
  function longestCommonSuffix(strings) {
    return longestCommonPrefix(strings.map((s) => s?.split("").reverse().join("") ?? "")).split("").reverse().join("");
  }
  StringUtils2.longestCommonSuffix = longestCommonSuffix;
  function truncateMiddle(value, maxLength, separator = "...") {
    if (isEmpty(value) || value.length <= maxLength) return value ?? "";
    const charsToShow = maxLength - separator.length;
    const frontChars = Math.ceil(charsToShow / 2);
    const backChars = Math.floor(charsToShow / 2);
    return value.slice(0, frontChars) + separator + value.slice(-backChars);
  }
  StringUtils2.truncateMiddle = truncateMiddle;
  function ellipsis(value, maxLength) {
    return truncate(value, maxLength, "...");
  }
  StringUtils2.ellipsis = ellipsis;
  function ellipsisMiddle(value, maxLength) {
    return truncateMiddle(value, maxLength, "...");
  }
  StringUtils2.ellipsisMiddle = ellipsisMiddle;
  function pad(value, length, padChar = " ") {
    return center(value, length, padChar);
  }
  StringUtils2.pad = pad;
  function padCenter(value, length, padChar = " ") {
    return center(value, length, padChar);
  }
  StringUtils2.padCenter = padCenter;
  function isAscii(value) {
    return /^[\x00-\x7F]*$/.test(value);
  }
  StringUtils2.isAscii = isAscii;
  function isLowerCase(value) {
    return value === value.toLowerCase();
  }
  StringUtils2.isLowerCase = isLowerCase;
  function isUpperCase(value) {
    return value === value.toUpperCase();
  }
  StringUtils2.isUpperCase = isUpperCase;
  function isCapitalized(value) {
    return value.charAt(0) === value.charAt(0).toUpperCase();
  }
  StringUtils2.isCapitalized = isCapitalized;
  function swapPrefix(value, oldPrefix, newPrefix) {
    if (value.startsWith(oldPrefix)) return newPrefix + value.slice(oldPrefix.length);
    return value;
  }
  StringUtils2.swapPrefix = swapPrefix;
  function swapSuffix(value, oldSuffix, newSuffix) {
    if (value.endsWith(oldSuffix)) return value.slice(0, -oldSuffix.length) + newSuffix;
    return value;
  }
  StringUtils2.swapSuffix = swapSuffix;
  function ensurePrefix(value, prefix) {
    return value.startsWith(prefix) ? value : prefix + value;
  }
  StringUtils2.ensurePrefix = ensurePrefix;
  function ensureSuffix(value, suffix) {
    return value.endsWith(suffix) ? value : value + suffix;
  }
  StringUtils2.ensureSuffix = ensureSuffix;
  function removePrefix(value, prefix) {
    return value.startsWith(prefix) ? value.slice(prefix.length) : value;
  }
  StringUtils2.removePrefix = removePrefix;
  function removeSuffix(value, suffix) {
    return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
  }
  StringUtils2.removeSuffix = removeSuffix;
  function take(value, n) {
    return value?.slice(0, n) ?? "";
  }
  StringUtils2.take = take;
  function takeRight(value, n) {
    return value?.slice(-n) ?? "";
  }
  StringUtils2.takeRight = takeRight;
  function takeWhile(value, predicate) {
    let result = "";
    for (const char of value ?? "") {
      if (!predicate(char)) break;
      result += char;
    }
    return result;
  }
  StringUtils2.takeWhile = takeWhile;
  function takeRightWhile(value, predicate) {
    let result = "";
    for (let i = (value?.length ?? 0) - 1; i >= 0; i--) {
      const char = value?.charAt(i) ?? "";
      if (!predicate(char)) break;
      result = char + result;
    }
    return result;
  }
  StringUtils2.takeRightWhile = takeRightWhile;
  function drop(value, n) {
    return value?.slice(n) ?? "";
  }
  StringUtils2.drop = drop;
  function dropRight(value, n) {
    return value?.slice(0, -n) ?? "";
  }
  StringUtils2.dropRight = dropRight;
  function dropWhile(value, predicate) {
    let i = 0;
    for (const char of value ?? "") {
      if (!predicate(char)) break;
      i++;
    }
    return value?.slice(i) ?? "";
  }
  StringUtils2.dropWhile = dropWhile;
  function dropRightWhile(value, predicate) {
    let i = (value?.length ?? 0) - 1;
    while (i >= 0 && predicate(value?.charAt(i) ?? "")) i--;
    return value?.slice(0, i + 1) ?? "";
  }
  StringUtils2.dropRightWhile = dropRightWhile;
  function countLines(value) {
    return lineCount(value);
  }
  StringUtils2.countLines = countLines;
  function getLine(value, lineNumber) {
    return splitLines(value)[lineNumber] ?? "";
  }
  StringUtils2.getLine = getLine;
  function getLines(value) {
    return splitLines(value);
  }
  StringUtils2.getLines = getLines;
  function isSingleLine(value) {
    return !value?.includes("\n");
  }
  StringUtils2.isSingleLine = isSingleLine;
  function isMultiLine(value) {
    return value?.includes("\n") ?? false;
  }
  StringUtils2.isMultiLine = isMultiLine;
  function normalizeLineEndings(value, lineEnding = "\n") {
    return value?.replace(/\r\n|\r|\n/g, lineEnding) ?? "";
  }
  StringUtils2.normalizeLineEndings = normalizeLineEndings;
  function toCamelCase(value) {
    return camelCase(value);
  }
  StringUtils2.toCamelCase = toCamelCase;
  function toKebabCase(value) {
    return kebabCase(value);
  }
  StringUtils2.toKebabCase = toKebabCase;
  function toSnakeCase(value) {
    return snakeCase(value);
  }
  StringUtils2.toSnakeCase = toSnakeCase;
  function toPascalCase(value) {
    return pascalCase(value);
  }
  StringUtils2.toPascalCase = toPascalCase;
  function toConstantCase(value) {
    return constantCase(value);
  }
  StringUtils2.toConstantCase = toConstantCase;
  function toSentenceCase(value) {
    if (isEmpty(value)) return "";
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
  StringUtils2.toSentenceCase = toSentenceCase;
  function toTitleCase(value) {
    return capitalizeWords(value);
  }
  StringUtils2.toTitleCase = toTitleCase;
  function toCapitalCase(value) {
    return capitalizeWords(value);
  }
  StringUtils2.toCapitalCase = toCapitalCase;
  function toDotCase(value) {
    return value?.replace(/([a-z])([A-Z])/g, "$1.$2").replace(/[-_\s]+/g, ".").toLowerCase() ?? "";
  }
  StringUtils2.toDotCase = toDotCase;
  function toPathCase(value) {
    return value?.replace(/([a-z])([A-Z])/g, "$1/$2").replace(/[-_\s]+/g, "/").toLowerCase() ?? "";
  }
  StringUtils2.toPathCase = toPathCase;
  function stripTags(value) {
    return value?.replace(/<[^>]*>/g, "") ?? "";
  }
  StringUtils2.stripTags = stripTags;
  function stripNumbers(value) {
    return value?.replace(/\d+/g, "") ?? "";
  }
  StringUtils2.stripNumbers = stripNumbers;
  function stripWhitespace(value) {
    return value?.replace(/\s+/g, "") ?? "";
  }
  StringUtils2.stripWhitespace = stripWhitespace;
  function stripPunctuation(value) {
    return value?.replace(/[^\w\s]/g, "") ?? "";
  }
  StringUtils2.stripPunctuation = stripPunctuation;
  function normalizeWhitespace(value) {
    return value?.replace(/\s+/g, " ").trim() ?? "";
  }
  StringUtils2.normalizeWhitespace = normalizeWhitespace;
  function includesAll(value, searches) {
    return searches.every((search) => value?.includes(search) ?? false);
  }
  StringUtils2.includesAll = includesAll;
  function includesAny(value, searches) {
    return searches.some((search) => value?.includes(search) ?? false);
  }
  StringUtils2.includesAny = includesAny;
})(StringUtils || (StringUtils = {}));

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/node_modules/.pnpm/@sdkwork+sdk-common@1.0.9/node_modules/@sdkwork/sdk-common/dist/utils/encoding.js
var Encoding;
(function(Encoding2) {
  function base64Encode3(input) {
    let bytes;
    if (typeof input === "string") bytes = new TextEncoder().encode(input);
    else bytes = input;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = "";
    let i = 0;
    while (i < bytes.length) {
      const a = bytes[i++] ?? 0;
      const b = i < bytes.length ? bytes[i++] ?? 0 : 0;
      const c = i < bytes.length ? bytes[i++] ?? 0 : 0;
      const bitmap = a << 16 | b << 8 | c;
      result += chars[bitmap >> 18 & 63];
      result += chars[bitmap >> 12 & 63];
      result += i > bytes.length + 1 ? "=" : chars[bitmap >> 6 & 63];
      result += i > bytes.length ? "=" : chars[bitmap & 63];
    }
    return result;
  }
  Encoding2.base64Encode = base64Encode3;
  function base64Decode3(input) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    input = input.replace(/[^A-Za-z0-9+/]/g, "");
    const len = input.length;
    let result = "";
    let i = 0;
    while (i < len) {
      const a = chars.indexOf(input[i++] ?? "");
      const b = chars.indexOf(input[i++] ?? "");
      const c = chars.indexOf(input[i++] ?? "");
      const d = chars.indexOf(input[i++] ?? "");
      const bitmap = a << 18 | b << 12 | c << 6 | d;
      result += String.fromCharCode(bitmap >> 16 & 255);
      if (c !== 64 && input[i - 2] !== "=") result += String.fromCharCode(bitmap >> 8 & 255);
      if (d !== 64 && input[i - 1] !== "=") result += String.fromCharCode(bitmap & 255);
    }
    return result;
  }
  Encoding2.base64Decode = base64Decode3;
  function base64UrlEncode3(input) {
    return base64Encode3(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
  Encoding2.base64UrlEncode = base64UrlEncode3;
  function base64UrlDecode3(input) {
    input = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = input.length % 4;
    if (pad) input += "=".repeat(4 - pad);
    return base64Decode3(input);
  }
  Encoding2.base64UrlDecode = base64UrlDecode3;
  function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  Encoding2.base64ToBytes = base64ToBytes;
  function bytesToBase64(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] ?? 0);
    return btoa(binary);
  }
  Encoding2.bytesToBase64 = bytesToBase64;
  function utf8Encode(input) {
    return new TextEncoder().encode(input);
  }
  Encoding2.utf8Encode = utf8Encode;
  function utf8Decode(input) {
    return new TextDecoder().decode(input);
  }
  Encoding2.utf8Decode = utf8Decode;
  function hexEncode3(input) {
    const bytes = typeof input === "string" ? utf8Encode(input) : input;
    return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  Encoding2.hexEncode = hexEncode3;
  function hexDecode3(input) {
    const bytes = new Uint8Array(input.length / 2);
    for (let i = 0; i < input.length; i += 2) bytes[i / 2] = parseInt(input.substr(i, 2), 16);
    return utf8Decode(bytes);
  }
  Encoding2.hexDecode = hexDecode3;
  function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    return bytes;
  }
  Encoding2.hexToBytes = hexToBytes;
  function bytesToHex(bytes) {
    return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  Encoding2.bytesToHex = bytesToHex;
  function urlEncode(input) {
    return encodeURIComponent(input);
  }
  Encoding2.urlEncode = urlEncode;
  function urlDecode(input) {
    return decodeURIComponent(input);
  }
  Encoding2.urlDecode = urlDecode;
  function urlEncodeComponent(input) {
    return encodeURIComponent(input);
  }
  Encoding2.urlEncodeComponent = urlEncodeComponent;
  function urlDecodeComponent(input) {
    return decodeURIComponent(input);
  }
  Encoding2.urlDecodeComponent = urlDecodeComponent;
  function htmlEncode(input) {
    const htmlEntities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "/": "&#x2F;",
      "`": "&#x60;",
      "=": "&#x3D;"
    };
    return input.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
  }
  Encoding2.htmlEncode = htmlEncode;
  function htmlDecode(input) {
    const htmlEntities = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'",
      "&#x27;": "'",
      "&#x2F;": "/",
      "&#x60;": "`",
      "&#x3D;": "=",
      "&nbsp;": " "
    };
    return input.replace(/&[^;]+;/g, (entity) => htmlEntities[entity] || entity);
  }
  Encoding2.htmlDecode = htmlDecode;
  function jsonEncode(value, replacer, space) {
    return JSON.stringify(value, replacer, space);
  }
  Encoding2.jsonEncode = jsonEncode;
  function jsonDecode(input) {
    return JSON.parse(input);
  }
  Encoding2.jsonDecode = jsonDecode;
  function jsonEncodePretty(value, indent = 2) {
    return JSON.stringify(value, null, indent);
  }
  Encoding2.jsonEncodePretty = jsonEncodePretty;
  function tryJsonDecode(input, defaultValue) {
    try {
      return JSON.parse(input);
    } catch {
      return defaultValue;
    }
  }
  Encoding2.tryJsonDecode = tryJsonDecode;
  function isJson(input) {
    try {
      JSON.parse(input);
      return true;
    } catch {
      return false;
    }
  }
  Encoding2.isJson = isJson;
  function xmlEncode(input) {
    const xmlEntities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;"
    };
    return input.replace(/[&<>"']/g, (char) => xmlEntities[char] || char);
  }
  Encoding2.xmlEncode = xmlEncode;
  function xmlDecode(input) {
    const xmlEntities = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&apos;": "'"
    };
    return input.replace(/&[^;]+;/g, (entity) => xmlEntities[entity] || entity);
  }
  Encoding2.xmlDecode = xmlDecode;
  function escapeRegex(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  Encoding2.escapeRegex = escapeRegex;
  function escapeSql(input) {
    return input.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      return {
        "\0": "\\0",
        "\b": "\\b",
        "	": "\\t",
        "": "\\z",
        "\n": "\\n",
        "\r": "\\r",
        '"': '\\"',
        "'": "\\'",
        "\\": "\\\\",
        "%": "\\%"
      }[char] || char;
    });
  }
  Encoding2.escapeSql = escapeSql;
  function escapeShell(input) {
    return input.replace(/[^A-Za-z0-9_\-.,:\/@\n]/g, (char) => {
      if (char === "\n") return "'\\n'";
      return `\\${char}`;
    });
  }
  Encoding2.escapeShell = escapeShell;
  function escapeCString(input) {
    return input.replace(/[\\"'\n\r\t\b\f\v\0]/g, (char) => {
      return {
        "\\": "\\\\",
        '"': '\\"',
        "'": "\\'",
        "\n": "\\n",
        "\r": "\\r",
        "	": "\\t",
        "\b": "\\b",
        "\f": "\\f",
        "\v": "\\v",
        "\0": "\\0"
      }[char] || char;
    });
  }
  Encoding2.escapeCString = escapeCString;
  function unescapeCString(input) {
    return input.replace(/\\([\\\"'nrtbfv0])/g, (_, char) => {
      return {
        "\\": "\\",
        '"': '"',
        "'": "'",
        "n": "\n",
        "r": "\r",
        "t": "	",
        "b": "\b",
        "f": "\f",
        "v": "\v",
        "0": "\0"
      }[char] || char;
    });
  }
  Encoding2.unescapeCString = unescapeCString;
  function camelToSnake(input) {
    return input.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
  Encoding2.camelToSnake = camelToSnake;
  function snakeToCamel(input) {
    return input.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
  Encoding2.snakeToCamel = snakeToCamel;
  function camelToKebab(input) {
    return input.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }
  Encoding2.camelToKebab = camelToKebab;
  function kebabToCamel(input) {
    return input.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }
  Encoding2.kebabToCamel = kebabToCamel;
  function camelToPascal(input) {
    return input.charAt(0).toUpperCase() + input.slice(1);
  }
  Encoding2.camelToPascal = camelToPascal;
  function pascalToCamel(input) {
    return input.charAt(0).toLowerCase() + input.slice(1);
  }
  Encoding2.pascalToCamel = pascalToCamel;
  function pascalToSnake(input) {
    return camelToSnake(input);
  }
  Encoding2.pascalToSnake = pascalToSnake;
  function snakeToPascal(input) {
    return camelToPascal(snakeToCamel(input));
  }
  Encoding2.snakeToPascal = snakeToPascal;
  function pascalToKebab(input) {
    return camelToKebab(input);
  }
  Encoding2.pascalToKebab = pascalToKebab;
  function kebabToPascal(input) {
    return camelToPascal(kebabToCamel(input));
  }
  Encoding2.kebabToPascal = kebabToPascal;
  function toSnakeCase(input) {
    return input.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[-\s]+/g, "_").toLowerCase();
  }
  Encoding2.toSnakeCase = toSnakeCase;
  function toKebabCase(input) {
    return input.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[_\s]+/g, "-").toLowerCase();
  }
  Encoding2.toKebabCase = toKebabCase;
  function toCamelCase(input) {
    return input.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : "").replace(/^(.)/, (char) => char.toLowerCase());
  }
  Encoding2.toCamelCase = toCamelCase;
  function toPascalCase(input) {
    const camel = toCamelCase(input);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }
  Encoding2.toPascalCase = toPascalCase;
  function toConstantCase(input) {
    return toSnakeCase(input).toUpperCase();
  }
  Encoding2.toConstantCase = toConstantCase;
  function toSentenceCase(input) {
    return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
  }
  Encoding2.toSentenceCase = toSentenceCase;
  function toTitleCase(input) {
    return input.replace(/\b\w/g, (char) => char.toUpperCase());
  }
  Encoding2.toTitleCase = toTitleCase;
  function toCapitalCase(input) {
    return input.replace(/[-_\s]+(.)?/g, (_, char) => char ? ` ${char.toUpperCase()}` : "").trim();
  }
  Encoding2.toCapitalCase = toCapitalCase;
  function toDotCase(input) {
    return input.replace(/([a-z])([A-Z])/g, "$1.$2").replace(/[-_\s]+/g, ".").toLowerCase();
  }
  Encoding2.toDotCase = toDotCase;
  function toPathCase(input) {
    return input.replace(/([a-z])([A-Z])/g, "$1/$2").replace(/[-_\s]+/g, "/").toLowerCase();
  }
  Encoding2.toPathCase = toPathCase;
  function rot13(input) {
    return input.replace(/[a-zA-Z]/g, (char) => {
      const start = char <= "Z" ? 65 : 97;
      return String.fromCharCode((char.charCodeAt(0) - start + 13) % 26 + start);
    });
  }
  Encoding2.rot13 = rot13;
  function caesarCipher(input, shift) {
    return input.replace(/[a-zA-Z]/g, (char) => {
      const start = char <= "Z" ? 65 : 97;
      const shifted = ((char.charCodeAt(0) - start + shift) % 26 + 26) % 26;
      return String.fromCharCode(shifted + start);
    });
  }
  Encoding2.caesarCipher = caesarCipher;
  function caesarDecipher(input, shift) {
    return caesarCipher(input, -shift);
  }
  Encoding2.caesarDecipher = caesarDecipher;
  function xorEncode(input, key) {
    const inputBytes = utf8Encode(input);
    const keyBytes = utf8Encode(key);
    const result = new Uint8Array(inputBytes.length);
    for (let i = 0; i < inputBytes.length; i++) result[i] = (inputBytes[i] ?? 0) ^ (keyBytes[i % keyBytes.length] ?? 0);
    return bytesToHex(result);
  }
  Encoding2.xorEncode = xorEncode;
  function xorDecode(input, key) {
    const inputBytes = hexToBytes(input);
    const keyBytes = utf8Encode(key);
    const result = new Uint8Array(inputBytes.length);
    for (let i = 0; i < inputBytes.length; i++) result[i] = (inputBytes[i] ?? 0) ^ (keyBytes[i % keyBytes.length] ?? 0);
    return utf8Decode(result);
  }
  Encoding2.xorDecode = xorDecode;
  function charCodeEncode(input) {
    return Array.from(input).map((char) => char.charCodeAt(0));
  }
  Encoding2.charCodeEncode = charCodeEncode;
  function charCodeDecode(codes) {
    return String.fromCharCode(...codes);
  }
  Encoding2.charCodeDecode = charCodeDecode;
  function binaryEncode(input) {
    return Array.from(input).map((char) => char.charCodeAt(0).toString(2).padStart(8, "0")).join(" ");
  }
  Encoding2.binaryEncode = binaryEncode;
  function binaryDecode(input) {
    return input.split(/\s+/).map((byte) => String.fromCharCode(parseInt(byte, 2))).join("");
  }
  Encoding2.binaryDecode = binaryDecode;
  function octalEncode(input) {
    return Array.from(input).map((char) => char.charCodeAt(0).toString(8).padStart(3, "0")).join(" ");
  }
  Encoding2.octalEncode = octalEncode;
  function octalDecode(input) {
    return input.split(/\s+/).map((byte) => String.fromCharCode(parseInt(byte, 8))).join("");
  }
  Encoding2.octalDecode = octalDecode;
  function decimalEncode(input) {
    return Array.from(input).map((char) => char.charCodeAt(0).toString(10)).join(" ");
  }
  Encoding2.decimalEncode = decimalEncode;
  function decimalDecode(input) {
    return input.split(/\s+/).map((code) => String.fromCharCode(parseInt(code, 10))).join("");
  }
  Encoding2.decimalDecode = decimalDecode;
  function punycodeEncode(input) {
    const prefix = "xn--";
    if (input.startsWith(prefix)) return input;
    const asciiPart = input.replace(/[^\x00-\x7F]/g, "");
    const nonAsciiPart = input.replace(/[\x00-\x7F]/g, "");
    if (!nonAsciiPart) return input;
    return prefix + asciiPart + "-" + nonAsciiPart.split("").map((c) => c.charCodeAt(0).toString(36)).join("");
  }
  Encoding2.punycodeEncode = punycodeEncode;
  function slugify(input) {
    return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
  }
  Encoding2.slugify = slugify;
  function unslugify(input) {
    return input.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }
  Encoding2.unslugify = unslugify;
  function queryStringEncode(params) {
    return Object.entries(params).filter(([, value]) => value !== void 0 && value !== null).map(([key, value]) => {
      if (Array.isArray(value)) return value.map((v) => `${urlEncode(key)}=${urlEncode(String(v))}`).join("&");
      return `${urlEncode(key)}=${urlEncode(String(value))}`;
    }).join("&");
  }
  Encoding2.queryStringEncode = queryStringEncode;
  function queryStringDecode(query) {
    const result = {};
    if (!query) return result;
    query = query.replace(/^[?#]/, "");
    for (const pair of query.split("&")) {
      const parts = pair.split("=");
      const key = parts[0];
      const value = parts[1];
      if (!key) continue;
      const decodedKey = urlDecode(key);
      const decodedValue = value ? urlDecode(value) : "";
      if (result[decodedKey]) if (Array.isArray(result[decodedKey])) result[decodedKey].push(decodedValue);
      else result[decodedKey] = [result[decodedKey], decodedValue];
      else result[decodedKey] = decodedValue;
    }
    return result;
  }
  Encoding2.queryStringDecode = queryStringDecode;
  function formDataEncode(data) {
    return Object.entries(data).filter(([, value]) => value !== void 0 && value !== null).map(([key, value]) => `${urlEncode(key)}=${urlEncode(String(value))}`).join("&");
  }
  Encoding2.formDataEncode = formDataEncode;
  function mimeTypeToExtension(mimeType) {
    return {
      "application/json": "json",
      "application/xml": "xml",
      "application/pdf": "pdf",
      "application/zip": "zip",
      "application/gzip": "gz",
      "application/x-tar": "tar",
      "application/x-rar-compressed": "rar",
      "application/x-7z-compressed": "7z",
      "application/vnd.ms-excel": "xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
      "application/vnd.ms-powerpoint": "ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
      "text/plain": "txt",
      "text/html": "html",
      "text/css": "css",
      "text/javascript": "js",
      "text/csv": "csv",
      "text/xml": "xml",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/svg+xml": "svg",
      "image/webp": "webp",
      "image/bmp": "bmp",
      "image/tiff": "tiff",
      "image/x-icon": "ico",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/ogg": "ogg",
      "audio/aac": "aac",
      "video/mp4": "mp4",
      "video/mpeg": "mpeg",
      "video/webm": "webm",
      "video/ogg": "ogv",
      "video/x-msvideo": "avi",
      "video/quicktime": "mov"
    }[mimeType.toLowerCase()] || "";
  }
  Encoding2.mimeTypeToExtension = mimeTypeToExtension;
  function extensionToMimeType(extension) {
    return {
      "json": "application/json",
      "xml": "application/xml",
      "pdf": "application/pdf",
      "zip": "application/zip",
      "gz": "application/gzip",
      "tar": "application/x-tar",
      "rar": "application/x-rar-compressed",
      "7z": "application/x-7z-compressed",
      "xls": "application/vnd.ms-excel",
      "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "ppt": "application/vnd.ms-powerpoint",
      "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "doc": "application/msword",
      "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "txt": "text/plain",
      "html": "text/html",
      "htm": "text/html",
      "css": "text/css",
      "js": "text/javascript",
      "csv": "text/csv",
      "jpg": "image/jpeg",
      "jpeg": "image/jpeg",
      "png": "image/png",
      "gif": "image/gif",
      "svg": "image/svg+xml",
      "webp": "image/webp",
      "bmp": "image/bmp",
      "tiff": "image/tiff",
      "tif": "image/tiff",
      "ico": "image/x-icon",
      "mp3": "audio/mpeg",
      "wav": "audio/wav",
      "ogg": "audio/ogg",
      "aac": "audio/aac",
      "mp4": "video/mp4",
      "mpeg": "video/mpeg",
      "mpg": "video/mpeg",
      "webm": "video/webm",
      "ogv": "video/ogg",
      "avi": "video/x-msvideo",
      "mov": "video/quicktime"
    }[extension.toLowerCase().replace(/^\./, "")] || "application/octet-stream";
  }
  Encoding2.extensionToMimeType = extensionToMimeType;
  function charsetEncode(input, _charset) {
    return new TextEncoder().encode(input);
  }
  Encoding2.charsetEncode = charsetEncode;
  function charsetDecode(input, charset) {
    return new TextDecoder(charset).decode(input);
  }
  Encoding2.charsetDecode = charsetDecode;
  function stripBom(input) {
    if (input.charCodeAt(0) === 65279) return input.slice(1);
    return input;
  }
  Encoding2.stripBom = stripBom;
  function addBom(input, bom = "utf-8") {
    return {
      "utf-8": "\uFEFF",
      "utf-16le": "\uFFFE",
      "utf-16be": "\uFEFF"
    }[bom] + input;
  }
  Encoding2.addBom = addBom;
  function normalizeEncoding(input, fromEncoding, toEncoding) {
    return charsetDecode(charsetEncode(input, fromEncoding), toEncoding);
  }
  Encoding2.normalizeEncoding = normalizeEncoding;
  function isValidBase64(input) {
    if (!input || input.length % 4 !== 0) return false;
    return /^[A-Za-z0-9+/]*={0,2}$/.test(input);
  }
  Encoding2.isValidBase64 = isValidBase64;
  function isValidHex(input) {
    return /^[0-9a-fA-F]*$/.test(input) && input.length % 2 === 0;
  }
  Encoding2.isValidHex = isValidHex;
  function isValidUrl(input) {
    try {
      new URL(input);
      return true;
    } catch {
      return false;
    }
  }
  Encoding2.isValidUrl = isValidUrl;
  function isValidEmail(input) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  }
  Encoding2.isValidEmail = isValidEmail;
  function detectEncoding(input) {
    if (input.charCodeAt(0) === 65279) return "utf-8-bom";
    if (input.charCodeAt(0) === 65534) return "utf-16le";
    if (input.charCodeAt(0) === 65279 && input.charCodeAt(1) === 0) return "utf-16be";
    if (/[\u4e00-\u9fa5]/.test(input)) return "utf-8";
    return "ascii";
  }
  Encoding2.detectEncoding = detectEncoding;
})(Encoding || (Encoding = {}));
Encoding.base64Encode;
Encoding.base64Decode;
Encoding.base64UrlEncode;
Encoding.base64UrlDecode;
Encoding.utf8Encode;
Encoding.utf8Decode;
Encoding.hexEncode;
Encoding.hexDecode;
Encoding.urlEncode;
Encoding.urlDecode;
Encoding.htmlEncode;
Encoding.htmlDecode;
Encoding.jsonEncode;
Encoding.jsonDecode;
Encoding.xmlEncode;
Encoding.xmlDecode;
Encoding.escapeRegex;
Encoding.escapeSql;
Encoding.escapeShell;
Encoding.queryStringEncode;
Encoding.queryStringDecode;
Encoding.slugify;
Encoding.unslugify;

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/node_modules/.pnpm/@sdkwork+sdk-common@1.0.9/node_modules/@sdkwork/sdk-common/dist/utils/date.js
var MILLISECONDS_IN_SECOND = 1e3;
var MILLISECONDS_IN_MINUTE = 60 * MILLISECONDS_IN_SECOND;
var MILLISECONDS_IN_HOUR = 60 * MILLISECONDS_IN_MINUTE;
var MILLISECONDS_IN_DAY = 24 * MILLISECONDS_IN_HOUR;
var MILLISECONDS_IN_WEEK = 7 * MILLISECONDS_IN_DAY;
var TIME_UNITS_IN_MS = {
  millisecond: 1,
  second: MILLISECONDS_IN_SECOND,
  minute: MILLISECONDS_IN_MINUTE,
  hour: MILLISECONDS_IN_HOUR,
  day: MILLISECONDS_IN_DAY,
  week: MILLISECONDS_IN_WEEK,
  month: 30 * MILLISECONDS_IN_DAY,
  quarter: 90 * MILLISECONDS_IN_DAY,
  year: 365 * MILLISECONDS_IN_DAY
};

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/node_modules/.pnpm/@sdkwork+sdk-common@1.0.9/node_modules/@sdkwork/sdk-common/dist/http/stream-parser.js
function extractStreamLines(buffer, flush = false) {
  const lines = [];
  let lineStart = 0;
  let index = 0;
  while (index < buffer.length) {
    const character = buffer[index];
    if (character === "\n") {
      lines.push(buffer.slice(lineStart, index));
      index += 1;
      lineStart = index;
      continue;
    }
    if (character === "\r") {
      if (!flush && index === buffer.length - 1) break;
      lines.push(buffer.slice(lineStart, index));
      index += buffer[index + 1] === "\n" ? 2 : 1;
      lineStart = index;
      continue;
    }
    index += 1;
  }
  if (flush && lineStart < buffer.length) {
    lines.push(buffer.slice(lineStart));
    lineStart = buffer.length;
  }
  return {
    lines,
    remainder: buffer.slice(lineStart)
  };
}
var ServerSentEventDataParser = class {
  constructor() {
    __publicField(this, "dataLines", []);
    __publicField(this, "firstLine", true);
  }
  pushLine(rawLine) {
    const line = this.firstLine && rawLine.charCodeAt(0) === 65279 ? rawLine.slice(1) : rawLine;
    this.firstLine = false;
    if (line === "") return this.dispatch();
    if (line.startsWith(":")) return;
    const separatorIndex = line.indexOf(":");
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    let value = separatorIndex === -1 ? "" : line.slice(separatorIndex + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "data") this.dataLines.push(value);
  }
  flush() {
    return this.dispatch();
  }
  dispatch() {
    if (this.dataLines.length === 0) return;
    const data = this.dataLines.join("\n");
    this.dataLines = [];
    return data === "" || data === "[DONE]" ? void 0 : data;
  }
};
function normalizeLegacyStreamLine(line) {
  const trimmedLine = line.trim();
  if (trimmedLine === "" || trimmedLine === "data: [DONE]") return;
  if (trimmedLine.startsWith("data: ")) return trimmedLine.slice(6);
  return trimmedLine;
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/node_modules/.pnpm/@sdkwork+sdk-common@1.0.9/node_modules/@sdkwork/sdk-common/dist/http/base-client.js
var SDKWORK_API_PREFIXES = [
  "/app/v3/api",
  "/backend/v3/api",
  "/gateway/v3/api"
];
function dedupeSdkWorkApiPath(baseUrl, path) {
  for (const prefix of SDKWORK_API_PREFIXES) if (baseUrl.endsWith(prefix) && path.startsWith(prefix)) {
    const remainder = path.slice(prefix.length);
    return remainder.startsWith("/") ? remainder : `/${remainder}`;
  }
  return path;
}
function isApiResultEnvelope(value) {
  return value !== null && value !== void 0 && typeof value === "object" && !Array.isArray(value) && "code" in value && ("data" in value || "msg" in value || "message" in value);
}
var IDENTITY_PROJECTION_HEADER_NAMES = /* @__PURE__ */ new Set([
  "x-sdkwork-tenant-id",
  "x-sdkwork-organization-id",
  "x-sdkwork-user-id",
  "x-sdkwork-actor-id",
  "x-sdkwork-actor-kind",
  "x-sdkwork-session-id",
  "x-sdkwork-app-id",
  "x-sdkwork-environment",
  "x-sdkwork-deployment-profile",
  "x-sdkwork-deployment-mode",
  "x-sdkwork-runtime-target",
  "x-sdkwork-auth-level",
  "x-sdkwork-data-scope",
  "x-sdkwork-permission-scope",
  "x-sdkwork-device-id",
  "x-sdkwork-context-signature",
  "x-sdkwork-subject-tenant-id",
  "x-sdkwork-subject-organization-id",
  "x-sdkwork-subject-user-id",
  "x-sdkwork-subject-timestamp",
  "x-sdkwork-subject-signature",
  "x-tenant-id",
  "x-organization-id",
  "x-platform",
  "x-user-id"
]);
function stripIdentityProjectionHeaders(headers) {
  for (const name of Object.keys(headers)) if (IDENTITY_PROJECTION_HEADER_NAMES.has(name.toLowerCase())) delete headers[name];
}
var BaseHttpClient = class {
  constructor(config) {
    __publicField(this, "config");
    __publicField(this, "authConfig");
    __publicField(this, "logger");
    __publicField(this, "cache");
    __publicField(this, "interceptors");
    this.config = {
      baseUrl: config.baseUrl,
      timeout: config.timeout ?? 3e4,
      headers: config.headers ?? {},
      retry: {
        maxRetries: 3,
        retryDelay: 1e3,
        retryBackoff: "exponential",
        maxRetryDelay: 3e4,
        ...config.retry
      },
      cache: {
        enabled: false,
        ttl: 300 * 1e3,
        maxSize: 100,
        ...config.cache
      },
      logger: {
        level: "info",
        prefix: "[SDK]",
        timestamp: true,
        colors: true,
        ...config.logger
      }
    };
    this.logger = createLogger(this.config.logger);
    this.cache = createCacheStore(this.config.cache);
    this.interceptors = config.interceptors ?? {
      request: [],
      response: [],
      error: []
    };
    const authMode = this.determineAuthMode(config);
    const tokenManager = config.tokenManager ?? new DefaultAuthTokenManager({
      ...config.accessToken !== void 0 ? { accessToken: config.accessToken } : {},
      ...config.authToken !== void 0 ? { authToken: config.authToken } : {}
    });
    this.authConfig = {
      authMode,
      ...config.apiKey !== void 0 ? { apiKey: config.apiKey } : {},
      tokenManager
    };
  }
  determineAuthMode(config) {
    if (config.apiKey) return "apikey";
    return "dual-token";
  }
  getAuthMode() {
    return this.authConfig.authMode;
  }
  setAuthMode(mode) {
    this.authConfig.authMode = mode;
  }
  getTokenManager() {
    return this.authConfig.tokenManager;
  }
  setTokenManager(manager) {
    this.authConfig.tokenManager = manager;
  }
  setApiKey(apiKey) {
    this.authConfig.apiKey = apiKey;
    this.authConfig.authMode = "apikey";
    this.authConfig.tokenManager?.clearTokens();
  }
  setAuthToken(token) {
    this.authConfig.tokenManager?.setAuthToken(token);
    if (this.authConfig.authMode === "apikey") {
      this.authConfig.authMode = "dual-token";
      delete this.authConfig.apiKey;
    }
  }
  setAccessToken(token) {
    this.authConfig.tokenManager?.setAccessToken(token);
    if (this.authConfig.authMode === "apikey") {
      this.authConfig.authMode = "dual-token";
      delete this.authConfig.apiKey;
    }
  }
  clearAuthToken() {
    this.authConfig.tokenManager?.clearTokens();
  }
  addRequestInterceptor(interceptor) {
    this.interceptors.request.push(interceptor);
    return () => {
      const index = this.interceptors.request.indexOf(interceptor);
      if (index > -1) this.interceptors.request.splice(index, 1);
    };
  }
  addResponseInterceptor(interceptor) {
    this.interceptors.response.push(interceptor);
    return () => {
      const index = this.interceptors.response.indexOf(interceptor);
      if (index > -1) this.interceptors.response.splice(index, 1);
    };
  }
  addErrorInterceptor(interceptor) {
    this.interceptors.error.push(interceptor);
    return () => {
      const index = this.interceptors.error.indexOf(interceptor);
      if (index > -1) this.interceptors.error.splice(index, 1);
    };
  }
  clearCache() {
    this.cache.clear();
  }
  getConfig() {
    return {
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout,
      authMode: this.authConfig.authMode,
      apiKey: this.authConfig.apiKey,
      accessToken: this.authConfig.tokenManager?.getAccessToken(),
      authToken: this.authConfig.tokenManager?.getAuthToken()
    };
  }
  isAuthenticated() {
    return this.authConfig.tokenManager?.isValid() ?? false;
  }
  buildBaseUrl(path, params) {
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");
    let url = `${baseUrl}${dedupeSdkWorkApiPath(baseUrl, path.startsWith("/") ? path : `/${path}`)}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item !== void 0 && item !== null) searchParams.append(key, String(item));
          });
          return;
        }
        if (value !== void 0 && value !== null) searchParams.append(key, String(value));
      });
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }
    return url;
  }
  buildHeaders(config, skipAuth = false) {
    const headers = {
      "Content-Type": MIME_TYPES.JSON,
      ...this.config.headers,
      ...config.headers
    };
    if (!skipAuth && !config.skipAuth) {
      const authHeaders = buildAuthHeaders(this.authConfig.authMode, this.authConfig.apiKey, this.authConfig.tokenManager);
      Object.assign(headers, authHeaders);
    }
    stripIdentityProjectionHeaders(headers);
    return headers;
  }
  serializeRequestBody(body, headers) {
    if (body === void 0 || body === null) return;
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      delete headers["Content-Type"];
      return body;
    }
    if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
      headers["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8";
      return body.toString();
    }
    if (typeof Blob !== "undefined" && body instanceof Blob) {
      delete headers["Content-Type"];
      return body;
    }
    if (typeof ArrayBuffer !== "undefined") {
      if (body instanceof ArrayBuffer) {
        delete headers["Content-Type"];
        return body;
      }
      if (ArrayBuffer.isView(body)) {
        delete headers["Content-Type"];
        return body;
      }
    }
    if (typeof body === "string") {
      headers["Content-Type"] = headers["Content-Type"] || "text/plain;charset=UTF-8";
      return body;
    }
    return JSON.stringify(body);
  }
  async applyRequestInterceptors(config) {
    let processedConfig = config;
    for (const interceptor of this.interceptors.request) processedConfig = await interceptor(processedConfig);
    return processedConfig;
  }
  async applyResponseInterceptors(response, config) {
    let processedResponse = response;
    for (const interceptor of this.interceptors.response) processedResponse = await interceptor(processedResponse, config);
    return processedResponse;
  }
  async applyErrorInterceptors(error, config) {
    for (const interceptor of this.interceptors.error) await interceptor(error, config);
  }
  async handleErrorResponse(response, config) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let problem;
    try {
      const result = await response.json();
      errorMessage = String(result.detail || result.msg || result.message || result.title || errorMessage);
      if (response.headers.get("content-type")?.includes("application/problem+json") || "status" in result && "code" in result && "traceId" in result) problem = result;
    } catch {
    }
    const error = SdkError.fromHttpStatus(response.status, errorMessage, problem === void 0 ? void 0 : { problem });
    await this.applyErrorInterceptors(error, config);
    throw error;
  }
  async processResponse(response, config) {
    if (!response.ok) await this.handleErrorResponse(response, config);
    if (response.status === HTTP_STATUS.NO_CONTENT) return;
    const contentType = response.headers.get("content-type");
    if (contentType?.includes(MIME_TYPES.JSON)) {
      const body = await response.text();
      if (!body.trim()) return;
      const result = JSON.parse(body);
      if (!isApiResultEnvelope(result)) return result;
      if (!SUCCESS_CODES.includes(result.code) && !SUCCESS_CODES.includes(String(result.code))) throw SdkError.fromApiResult(result, response.status);
      return result.data;
    }
    if (contentType?.includes("text/")) return await response.text();
    return await response.json();
  }
  async executeFetch(url, options) {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, options.timeout);
    const abortHandler = () => controller.abort();
    if (options.signal) if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener("abort", abortHandler, { once: true });
    try {
      this.logger.debug(`${options.method} ${url}`);
      return await fetch(url, {
        method: options.method,
        headers: options.headers,
        ...options.body !== void 0 ? { body: options.body } : {},
        signal: controller.signal
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          if (timedOut) throw new TimeoutError(`Request timeout after ${options.timeout}ms`, options.timeout);
          throw new CancelledError("Request was cancelled");
        }
        throw new NetworkError(error.message);
      }
      throw new NetworkError("Unknown network error");
    } finally {
      clearTimeout(timeoutId);
      if (options.signal) options.signal.removeEventListener("abort", abortHandler);
    }
  }
  async execute(config) {
    const processedConfig = await this.applyRequestInterceptors(config);
    const url = this.buildBaseUrl(processedConfig.url, processedConfig.params);
    const headers = this.buildHeaders(processedConfig);
    const serializedBody = this.serializeRequestBody(processedConfig.body, headers);
    const response = await this.executeFetch(url, {
      method: processedConfig.method,
      headers,
      ...serializedBody !== void 0 ? { body: serializedBody } : {},
      timeout: processedConfig.timeout ?? this.config.timeout,
      ...processedConfig.signal !== void 0 ? { signal: processedConfig.signal } : {}
    });
    return this.processResponse(response, processedConfig);
  }
  async upload(path, options) {
    const formData = new FormData();
    formData.append(options.fieldName ?? "file", options.file);
    if (options.additionalData) Object.entries(options.additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
    const config = {
      url: path,
      method: "POST",
      body: formData,
      skipAuth: false
    };
    const processedConfig = await this.applyRequestInterceptors(config);
    const url = this.buildBaseUrl(processedConfig.url, processedConfig.params);
    const headers = this.buildHeaders(processedConfig);
    delete headers["Content-Type"];
    const response = await this.executeFetch(url, {
      method: "POST",
      headers,
      body: formData,
      timeout: processedConfig.timeout ?? this.config.timeout,
      ...processedConfig.signal !== void 0 ? { signal: processedConfig.signal } : {}
    });
    return this.processResponse(response, processedConfig);
  }
  async download(path, _options) {
    const config = {
      url: path,
      method: "GET",
      skipAuth: false
    };
    const processedConfig = await this.applyRequestInterceptors(config);
    const url = this.buildBaseUrl(processedConfig.url, processedConfig.params);
    const headers = this.buildHeaders(processedConfig);
    const response = await this.executeFetch(url, {
      method: "GET",
      headers,
      timeout: processedConfig.timeout ?? this.config.timeout,
      ...processedConfig.signal !== void 0 ? { signal: processedConfig.signal } : {}
    });
    if (!response.ok) await this.handleErrorResponse(response, processedConfig);
    return response.blob();
  }
  async *stream(path, options) {
    const config = {
      url: path,
      method: options?.method ?? "POST",
      ...options?.body !== void 0 ? { body: options.body } : {},
      ...options?.headers !== void 0 ? { headers: options.headers } : {},
      ...options?.params !== void 0 ? { params: options.params } : {},
      ...options?.timeout !== void 0 ? { timeout: options.timeout } : {},
      ...options?.signal !== void 0 ? { signal: options.signal } : {},
      ...options?.skipAuth !== void 0 ? { skipAuth: options.skipAuth } : {},
      ...options?.metadata !== void 0 ? { metadata: options.metadata } : {}
    };
    const processedConfig = await this.applyRequestInterceptors(config);
    const url = this.buildBaseUrl(processedConfig.url, processedConfig.params);
    const headers = this.buildHeaders(processedConfig);
    const serializedBody = this.serializeRequestBody(processedConfig.body, headers);
    const response = await this.executeFetch(url, {
      method: processedConfig.method,
      headers,
      ...serializedBody !== void 0 ? { body: serializedBody } : {},
      timeout: processedConfig.timeout ?? this.config.timeout,
      ...processedConfig.signal !== void 0 ? { signal: processedConfig.signal } : {}
    });
    if (!response.ok) await this.handleErrorResponse(response, processedConfig);
    const reader = response.body?.getReader();
    if (!reader) throw new NetworkError("No response body");
    const decoder = new TextDecoder();
    let buffer = "";
    const eventParser = response.headers.get("content-type")?.toLowerCase().includes("text/event-stream") === true ? new ServerSentEventDataParser() : void 0;
    const parseLine = eventParser ? (line) => eventParser.pushLine(line) : normalizeLegacyStreamLine;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const extracted2 = extractStreamLines(buffer);
        buffer = extracted2.remainder;
        for (const line of extracted2.lines) {
          const data = parseLine(line);
          if (data !== void 0) yield data;
        }
      }
      buffer += decoder.decode();
      const extracted = extractStreamLines(buffer, true);
      for (const line of extracted.lines) {
        const data = parseLine(line);
        if (data !== void 0) yield data;
      }
      const finalData = eventParser?.flush();
      if (finalData !== void 0) yield finalData;
    } finally {
      reader.releaseLock();
    }
  }
};

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/node_modules/.pnpm/@sdkwork+utils@0.11.0/node_modules/@sdkwork/utils/dist/runtime/binary.js
var textEncoder = new TextEncoder();
function toUtf8(value) {
  return textEncoder.encode(value);
}
var HEX = "0123456789abcdef";
function hexEncode(bytes) {
  let result = "";
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];
    result += HEX[byte >> 4];
    result += HEX[byte & 15];
  }
  return result;
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/node_modules/.pnpm/@sdkwork+utils@0.11.0/node_modules/@sdkwork/utils/dist/runtime/sha256.js
var K = new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var BLOCK_SIZE = 64;
function rotr(value, shift) {
  return value >>> shift | value << 32 - shift;
}
function sha256Block(state, block, offset) {
  const words = new Uint32Array(64);
  for (let index = 0; index < 16; index += 1) {
    const start = offset + index * 4;
    words[index] = block[start] << 24 | block[start + 1] << 16 | block[start + 2] << 8 | block[start + 3];
  }
  for (let index = 16; index < 64; index += 1) {
    const s0 = rotr(words[index - 15], 7) ^ rotr(words[index - 15], 18) ^ words[index - 15] >>> 3;
    const s1 = rotr(words[index - 2], 17) ^ rotr(words[index - 2], 19) ^ words[index - 2] >>> 10;
    words[index] = words[index - 16] + s0 + words[index - 7] + s1 >>> 0;
  }
  let a = state[0];
  let b = state[1];
  let c = state[2];
  let d = state[3];
  let e = state[4];
  let f = state[5];
  let g = state[6];
  let h = state[7];
  for (let index = 0; index < 64; index += 1) {
    const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
    const ch = e & f ^ ~e & g;
    const temp1 = h + s1 + ch + K[index] + words[index] >>> 0;
    const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
    const maj = a & b ^ a & c ^ b & c;
    const temp2 = s0 + maj >>> 0;
    h = g;
    g = f;
    f = e;
    e = d + temp1 >>> 0;
    d = c;
    c = b;
    b = a;
    a = temp1 + temp2 >>> 0;
  }
  state[0] = state[0] + a >>> 0;
  state[1] = state[1] + b >>> 0;
  state[2] = state[2] + c >>> 0;
  state[3] = state[3] + d >>> 0;
  state[4] = state[4] + e >>> 0;
  state[5] = state[5] + f >>> 0;
  state[6] = state[6] + g >>> 0;
  state[7] = state[7] + h >>> 0;
}
function sha256Digest(value) {
  const bitLength = value.length * 8;
  const paddingLength = (BLOCK_SIZE - (value.length + 9) % BLOCK_SIZE) % BLOCK_SIZE + 9;
  const padded = new Uint8Array(value.length + paddingLength);
  padded.set(value);
  padded[value.length] = 128;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLength >>> 0, false);
  view.setUint32(padded.length - 8, Math.floor(bitLength / 4294967296), false);
  const state = new Uint32Array([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);
  for (let offset = 0; offset < padded.length; offset += BLOCK_SIZE) {
    sha256Block(state, padded, offset);
  }
  const digest = new Uint8Array(32);
  const digestView = new DataView(digest.buffer);
  for (let index = 0; index < state.length; index += 1) {
    digestView.setUint32(index * 4, state[index], false);
  }
  return digest;
}
var SHA256_INITIAL_STATE = new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);
function sha256Hex(value) {
  const bytes = typeof value === "string" ? toUtf8(value) : value;
  return hexEncode(sha256Digest(bytes));
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/node_modules/.pnpm/@sdkwork+utils@0.11.0/node_modules/@sdkwork/utils/dist/crypto.js
function sha256Hash(value) {
  return sha256Hex(value);
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/src/http/client.ts
var _HttpClient = class _HttpClient extends BaseHttpClient {
  constructor(config) {
    super(config);
  }
  static normalizeCredential(value) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0;
  }
  getInternalAuthConfig() {
    const self = this;
    self.authConfig = self.authConfig || {};
    return self.authConfig;
  }
  getInternalHeaders() {
    const self = this;
    self.config = self.config || {};
    self.config.headers = self.config.headers || {};
    return self.config.headers;
  }
  buildRequestHeaders(headers, contentType) {
    const mergedHeaders = {
      ...headers ?? {}
    };
    if (contentType && contentType.toLowerCase() !== "multipart/form-data") {
      mergedHeaders["Content-Type"] = contentType;
    }
    return Object.keys(mergedHeaders).length > 0 ? mergedHeaders : void 0;
  }
  async applySdkworkRequestBodyFingerprint(headers, body) {
    if (!_HttpClient.SDKWORK_V3_REQUEST_FINGERPRINTS || body == null || !this.hasNonEmptyHeader(headers, "Idempotency-Key") || this.hasNonEmptyHeader(headers, "X-Content-SHA256") || this.hasNonEmptyHeader(headers, "X-Idempotency-Fingerprint")) {
      return headers;
    }
    const fingerprint = await this.createSdkworkRequestBodyFingerprint(body);
    if (!fingerprint) {
      return headers;
    }
    const normalizedFingerprintHeader = fingerprint.header.toLowerCase();
    const preparedHeaders = Object.fromEntries(
      Object.entries(headers ?? {}).filter(
        ([headerName]) => headerName.toLowerCase() !== normalizedFingerprintHeader
      )
    );
    return {
      ...preparedHeaders,
      [fingerprint.header]: fingerprint.value
    };
  }
  hasNonEmptyHeader(headers, name) {
    const normalizedName = name.toLowerCase();
    return Object.entries(headers ?? {}).some(
      ([headerName, value]) => headerName.toLowerCase() === normalizedName && value.trim().length > 0
    );
  }
  async createSdkworkRequestBodyFingerprint(body) {
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      const canonicalForm = await this.serializeSdkworkFormData(body);
      return {
        header: "X-Idempotency-Fingerprint",
        value: await this.sha256Hex(new TextEncoder().encode(canonicalForm))
      };
    }
    const bytes = await this.serializeSdkworkRequestBodyBytes(body);
    if (!bytes) {
      return void 0;
    }
    return {
      header: "X-Content-SHA256",
      value: await this.sha256Hex(bytes)
    };
  }
  async serializeSdkworkRequestBodyBytes(body) {
    if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
      return new TextEncoder().encode(body.toString());
    }
    if (typeof Blob !== "undefined" && body instanceof Blob) {
      return new Uint8Array(await body.arrayBuffer());
    }
    if (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) {
      return new Uint8Array(body.slice(0));
    }
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(body)) {
      return new Uint8Array(new Uint8Array(body.buffer, body.byteOffset, body.byteLength));
    }
    if (typeof body === "string") {
      return new TextEncoder().encode(body);
    }
    const serialized = JSON.stringify(body);
    return serialized === void 0 ? void 0 : new TextEncoder().encode(serialized);
  }
  async serializeSdkworkFormData(body) {
    const parts = [];
    for (const [name, value] of body.entries()) {
      if (typeof value === "string") {
        parts.push({ kind: "field", name, value });
        continue;
      }
      const bytes = new Uint8Array(await value.arrayBuffer());
      parts.push({
        kind: "file",
        name,
        fileName: "name" in value ? String(value.name) : "",
        contentType: value.type,
        size: value.size,
        contentSha256: await this.sha256Hex(bytes)
      });
    }
    return JSON.stringify(parts);
  }
  async sha256Hex(bytes) {
    return sha256Hash(bytes);
  }
  buildHeaders(config, skipAuth = false) {
    const headers = super.buildHeaders(config, skipAuth);
    if (config?.accessTokenOnly) {
      this.stripCredentialHeaders(headers, true);
      return headers;
    }
    if (!skipAuth && !config?.skipAuth) {
      return headers;
    }
    this.stripCredentialHeaders(headers, false);
    return headers;
  }
  stripCredentialHeaders(headers, preserveAccessToken) {
    [
      ...preserveAccessToken ? [] : [_HttpClient.ACCESS_TOKEN_HEADER, "Access-Token"],
      "Authorization",
      ["X", "API", "Key"].join("-"),
      "X-Tenant-Id",
      "X-App-Id",
      "X-Organization-Id",
      "X-Platform",
      "X-User-Id",
      "X-Sdkwork-Tenant-Id",
      "X-Sdkwork-App-Id",
      "X-Sdkwork-User-Id",
      "X-Sdkwork-Organization-Id",
      "X-Sdkwork-Actor-Id",
      "X-Sdkwork-Actor-Kind",
      "X-Sdkwork-Session-Id",
      "X-Sdkwork-Environment",
      "X-Sdkwork-Deployment-Profile",
      "X-Sdkwork-Deployment-Mode",
      "X-Sdkwork-Runtime-Target",
      "X-Sdkwork-Auth-Level",
      "X-Sdkwork-Data-Scope",
      "X-Sdkwork-Permission-Scope",
      "X-Sdkwork-Device-Id",
      "X-Sdkwork-Context-Signature",
      "X-Sdkwork-Operation-Id",
      "X-Sdkwork-Subject-Tenant-Id",
      "X-Sdkwork-Subject-Organization-Id",
      "X-Sdkwork-Subject-User-Id",
      "X-Sdkwork-Subject-Timestamp",
      "X-Sdkwork-Subject-Signature"
    ].forEach((key) => {
      delete headers[key];
    });
  }
  buildRequestBody(body, contentType) {
    if (body == null) {
      return body;
    }
    const normalizedContentType = (contentType ?? "").toLowerCase();
    if (normalizedContentType === "application/x-www-form-urlencoded") {
      return this.encodeFormBody(body);
    }
    if (normalizedContentType === "multipart/form-data") {
      return this.encodeMultipartBody(body);
    }
    return body;
  }
  encodeMultipartBody(body) {
    if (body instanceof FormData) {
      return body;
    }
    const formData = new FormData();
    if (body instanceof Map) {
      for (const [key, value] of body.entries()) {
        this.appendMultipartValue(formData, String(key), value);
      }
      return formData;
    }
    if (typeof body === "object") {
      const record = body;
      for (const [key, value] of Object.entries(record)) {
        if (this.isMultipartMetadataField(key)) {
          continue;
        }
        this.appendMultipartValue(formData, key, value, this.resolveMultipartFileName(record, key));
      }
      return formData;
    }
    this.appendMultipartValue(formData, "value", body);
    return formData;
  }
  appendMultipartValue(formData, key, value, fileName) {
    if (value == null) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => this.appendMultipartValue(formData, key, item, fileName));
      return;
    }
    if (value instanceof Blob) {
      if (fileName) {
        formData.append(key, value, fileName);
        return;
      }
      formData.append(key, value);
      return;
    }
    if (value instanceof Date) {
      formData.append(key, value.toISOString());
      return;
    }
    if (typeof value === "object") {
      formData.append(key, JSON.stringify(value));
      return;
    }
    formData.append(key, String(value));
  }
  resolveMultipartFileName(record, key) {
    const fieldSpecificName = record[`${key}FileName`];
    if (typeof fieldSpecificName === "string" && fieldSpecificName.trim()) {
      return fieldSpecificName.trim();
    }
    const genericName = record.fileName;
    if (key === "file" && typeof genericName === "string" && genericName.trim()) {
      return genericName.trim();
    }
    return void 0;
  }
  isMultipartMetadataField(key) {
    return key === "fileName" || key.endsWith("FileName");
  }
  encodeFormBody(body) {
    if (body instanceof URLSearchParams) {
      return body.toString();
    }
    if (typeof body === "string") {
      return body;
    }
    const params = new URLSearchParams();
    if (body instanceof Map) {
      for (const [key, value] of body.entries()) {
        this.appendFormValue(params, String(key), value);
      }
      return params.toString();
    }
    if (typeof body === "object") {
      for (const [key, value] of Object.entries(body)) {
        this.appendFormValue(params, key, value);
      }
      return params.toString();
    }
    params.append("value", String(body));
    return params.toString();
  }
  appendFormValue(params, key, value) {
    if (value == null) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => this.appendFormValue(params, key, item));
      return;
    }
    if (value instanceof Date) {
      params.append(key, value.toISOString());
      return;
    }
    if (typeof value === "object") {
      params.append(key, JSON.stringify(value));
      return;
    }
    params.append(key, String(value));
  }
  setAuthToken(token) {
    super.setAuthToken(token);
  }
  setAccessToken(token) {
    const headers = this.getInternalHeaders();
    headers[_HttpClient.ACCESS_TOKEN_HEADER] = token;
    super.setAccessToken(token);
  }
  setTokenManager(manager) {
    const baseProto = Object.getPrototypeOf(_HttpClient.prototype);
    if (typeof baseProto.setTokenManager === "function") {
      baseProto.setTokenManager.call(this, manager);
      return;
    }
    this.getInternalAuthConfig().tokenManager = manager;
  }
  applyAccessTokenOnlyHeaders(headers) {
    const authConfig = this.getInternalAuthConfig();
    const tokenManager = authConfig.tokenManager;
    const accessToken = tokenManager?.getAccessToken?.();
    if (typeof accessToken !== "string" || accessToken.trim().length === 0) {
      throw new Error(
        "access-token-only request requires Access-Token before request dispatch"
      );
    }
    const result = { ...headers ?? {} };
    this.stripCredentialHeaders(result, false);
    result[_HttpClient.ACCESS_TOKEN_HEADER] = accessToken.trim();
    return result;
  }
  applySdkworkAuthHeaders(headers) {
    const authConfig = this.getInternalAuthConfig();
    const tokenManager = authConfig.tokenManager;
    const accessToken = _HttpClient.normalizeCredential(tokenManager?.getAccessToken?.());
    const authToken = _HttpClient.normalizeCredential(tokenManager?.getAuthToken?.());
    if (_HttpClient.REQUIRES_SDKWORK_ACCESS_TOKEN && (typeof accessToken !== "string" || accessToken.trim().length === 0)) {
      throw new Error("non-open-api request requires Access-Token before request dispatch");
    }
    if (!accessToken && !authToken) {
      return headers;
    }
    const authHeaders = buildAuthHeaders("dual-token", void 0, tokenManager);
    return Object.keys(authHeaders).length > 0 ? { ...headers ?? {}, ...authHeaders } : headers;
  }
  unwrapSdkworkV3Payload(payload, unwrapKind = "data") {
    if (!_HttpClient.SDKWORK_V3_UNWRAP || payload == null || typeof payload !== "object") {
      return payload;
    }
    const record = payload;
    if (record.code !== 0 || !("data" in record)) {
      return this.unwrapSdkworkV3Data(record, unwrapKind);
    }
    const data = record.data;
    if (!data || typeof data !== "object") {
      return data;
    }
    return this.unwrapSdkworkV3Data(data, unwrapKind);
  }
  unwrapSdkworkV3Data(data, unwrapKind) {
    if (unwrapKind === "void") {
      return void 0;
    }
    if (unwrapKind === "item" && "item" in data) {
      return data.item;
    }
    return data;
  }
  async request(path, options = {}) {
    const execute = this.execute;
    if (typeof execute !== "function") {
      throw new Error("BaseHttpClient execute method is not available");
    }
    const {
      body,
      headers,
      contentType,
      method = "GET",
      skipAuth,
      accessTokenOnly,
      sdkworkUnwrapKind = "data",
      ...rest
    } = options;
    const requestHeaders = accessTokenOnly ? this.applyAccessTokenOnlyHeaders(headers) : skipAuth ? headers : this.applySdkworkAuthHeaders(headers);
    const requestBody = this.buildRequestBody(body, contentType);
    const preparedHeaders = await this.applySdkworkRequestBodyFingerprint(
      this.buildRequestHeaders(requestHeaders, body == null ? void 0 : contentType),
      requestBody
    );
    const payload = await withRetry(
      () => execute.call(this, {
        url: path,
        method,
        ...rest,
        ...skipAuth !== void 0 ? { skipAuth } : {},
        ...accessTokenOnly !== void 0 ? { accessTokenOnly } : {},
        ...requestBody !== void 0 ? { body: requestBody } : {},
        ...preparedHeaders !== void 0 ? { headers: preparedHeaders } : {}
      }),
      // Per-request retry overrides (e.g. disabling 5xx retries for
      // idempotent-terminal operations like turn execution) flow through
      // options.retry; the default keeps maxRetries: 3.
      { maxRetries: 3, ...options.retry }
    );
    return this.unwrapSdkworkV3Payload(payload, sdkworkUnwrapKind);
  }
  async *streamJson(path, options = {}) {
    const stream = BaseHttpClient.prototype.stream;
    if (typeof stream !== "function") {
      throw new Error("BaseHttpClient stream method is not available");
    }
    const {
      body,
      headers,
      contentType,
      method = "GET",
      skipAuth,
      accessTokenOnly,
      ...rest
    } = options;
    const authHeaders = accessTokenOnly ? this.applyAccessTokenOnlyHeaders(headers) : skipAuth ? headers : this.applySdkworkAuthHeaders(headers);
    const requestBody = this.buildRequestBody(body, contentType);
    const requestHeaders = await this.applySdkworkRequestBodyFingerprint(
      this.buildRequestHeaders(
        { Accept: "text/event-stream", ...authHeaders ?? {} },
        body == null ? void 0 : contentType
      ),
      requestBody
    );
    for await (const data of stream.call(this, path, {
      method,
      ...rest,
      ...skipAuth !== void 0 ? { skipAuth } : {},
      ...accessTokenOnly !== void 0 ? { accessTokenOnly } : {},
      ...requestBody !== void 0 ? { body: requestBody } : {},
      ...requestHeaders !== void 0 ? { headers: requestHeaders } : {}
    })) {
      if (data === "[DONE]") {
        return;
      }
      if (typeof data !== "string" || data.trim().length === 0) {
        continue;
      }
      yield JSON.parse(data);
    }
  }
  async get(path, params, headers) {
    return this.request(path, {
      method: "GET",
      ...params !== void 0 ? { params } : {},
      ...headers !== void 0 ? { headers } : {}
    });
  }
  async post(path, body, params, headers, contentType) {
    return this.request(path, {
      method: "POST",
      ...body !== void 0 ? { body } : {},
      ...params !== void 0 ? { params } : {},
      ...headers !== void 0 ? { headers } : {},
      ...contentType !== void 0 ? { contentType } : {}
    });
  }
  async put(path, body, params, headers, contentType) {
    return this.request(path, {
      method: "PUT",
      ...body !== void 0 ? { body } : {},
      ...params !== void 0 ? { params } : {},
      ...headers !== void 0 ? { headers } : {},
      ...contentType !== void 0 ? { contentType } : {}
    });
  }
  async delete(path, params, headers) {
    return this.request(path, {
      method: "DELETE",
      ...params !== void 0 ? { params } : {},
      ...headers !== void 0 ? { headers } : {}
    });
  }
  async patch(path, body, params, headers, contentType) {
    return this.request(path, {
      method: "PATCH",
      ...body !== void 0 ? { body } : {},
      ...params !== void 0 ? { params } : {},
      ...headers !== void 0 ? { headers } : {},
      ...contentType !== void 0 ? { contentType } : {}
    });
  }
};
__publicField(_HttpClient, "ACCESS_TOKEN_HEADER", "Access-Token");
__publicField(_HttpClient, "SDKWORK_V3_UNWRAP", true);
__publicField(_HttpClient, "SDKWORK_V3_REQUEST_FINGERPRINTS", true);
__publicField(_HttpClient, "REQUIRES_SDKWORK_ACCESS_TOKEN", true);
var HttpClient = _HttpClient;
function createHttpClient(config) {
  return new HttpClient(config);
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/src/api/paths.ts
var APP_API_PREFIX = "/app/v3/api";
function appApiPath(path) {
  if (!path) {
    return APP_API_PREFIX;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPrefixRaw = (APP_API_PREFIX || "").trim();
  const normalizedPrefix = normalizedPrefixRaw ? `/${normalizedPrefixRaw.replace(/^\/+|\/+$/g, "")}` : "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!normalizedPrefix || normalizedPrefix === "/") {
    return normalizedPath;
  }
  if (normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`)) {
    return normalizedPath;
  }
  return `${normalizedPrefix}${normalizedPath}`;
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/src/api/auth.ts
var AuthVerificationCodeRequestsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Verification Code Requests create. */
  async create(body, requestOptions) {
    return this.client.request(appApiPath(`/auth/verification_code_requests`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", accessTokenOnly: true, sdkworkUnwrapKind: "item" });
  }
};
var AuthSessionsOrganizationSelectionApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Sessions organization Selection create. */
  async create(body, requestOptions) {
    return this.client.request(appApiPath(`/auth/sessions/organization_selection`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", accessTokenOnly: true, sdkworkUnwrapKind: "item" });
  }
};
var AuthSessionsLoginContextSelectionApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Sessions login Context Selection create. */
  async create(body, requestOptions) {
    return this.client.request(appApiPath(`/auth/sessions/login_context_selection`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", accessTokenOnly: true, sdkworkUnwrapKind: "item" });
  }
};
var AuthSessionsCurrentApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Sessions current delete. */
  async delete(requestOptions) {
    return this.client.request(appApiPath(`/auth/sessions/current`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "DELETE" });
  }
  /** Sessions current retrieve. */
  async retrieve(requestOptions) {
    return this.client.request(appApiPath(`/auth/sessions/current`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "item" });
  }
  /** Sessions current update. */
  async update(body, requestOptions) {
    return this.client.request(appApiPath(`/auth/sessions/current`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "PATCH", ...body !== void 0 ? { body, contentType: "application/json" } : {}, sdkworkUnwrapKind: "item" });
  }
};
var AuthSessionsApi = class {
  constructor(client) {
    __publicField(this, "client");
    __publicField(this, "current");
    __publicField(this, "loginContextSelection");
    __publicField(this, "organizationSelection");
    this.client = client;
    this.current = new AuthSessionsCurrentApi(client);
    this.loginContextSelection = new AuthSessionsLoginContextSelectionApi(client);
    this.organizationSelection = new AuthSessionsOrganizationSelectionApi(client);
  }
  /** Sessions create. */
  async create(body, requestOptions) {
    return this.client.request(appApiPath(`/auth/sessions`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", accessTokenOnly: true, sdkworkUnwrapKind: "item" });
  }
  /** Sessions refresh. */
  async refresh(body, requestOptions) {
    return this.client.request(appApiPath(`/auth/sessions/refresh`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", skipAuth: true, sdkworkUnwrapKind: "command" });
  }
};
var AuthRegistrationsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Registrations create. */
  async create(body, requestOptions) {
    return this.client.request(appApiPath(`/auth/registrations`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", accessTokenOnly: true, sdkworkUnwrapKind: "item" });
  }
};
var AuthPasswordResetsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Password Resets create. */
  async create(body, requestOptions) {
    return this.client.request(appApiPath(`/auth/password_resets`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", accessTokenOnly: true, sdkworkUnwrapKind: "item" });
  }
};
var AuthPasswordResetRequestsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Password Reset Requests create. */
  async create(body, requestOptions) {
    return this.client.request(appApiPath(`/auth/password_reset_requests`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", accessTokenOnly: true, sdkworkUnwrapKind: "item" });
  }
};
var AuthApi = class {
  constructor(client) {
    __publicField(this, "passwordResetRequests");
    __publicField(this, "passwordResets");
    __publicField(this, "registrations");
    __publicField(this, "sessions");
    __publicField(this, "verificationCodeRequests");
    this.passwordResetRequests = new AuthPasswordResetRequestsApi(client);
    this.passwordResets = new AuthPasswordResetsApi(client);
    this.registrations = new AuthRegistrationsApi(client);
    this.sessions = new AuthSessionsApi(client);
    this.verificationCodeRequests = new AuthVerificationCodeRequestsApi(client);
  }
};
function createAuthApi(client) {
  return new AuthApi(client);
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/src/api/iam.ts
var IamUsersCurrentPhoneBindingsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Users current phone Bindings delete. */
  async delete(requestOptions) {
    return this.client.request(appApiPath(`/iam/users/current/phone_bindings`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "DELETE" });
  }
  /** Users current phone Bindings create. */
  async create(body, requestOptions) {
    return this.client.request(appApiPath(`/iam/users/current/phone_bindings`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", sdkworkUnwrapKind: "item" });
  }
};
var IamUsersCurrentPersonaApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Users current persona delete. */
  async delete(requestOptions) {
    return this.client.request(appApiPath(`/iam/users/current/persona`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "DELETE" });
  }
  /** Users current persona retrieve. */
  async retrieve(requestOptions) {
    return this.client.request(appApiPath(`/iam/users/current/persona`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "item" });
  }
  /** Users current persona update. */
  async update(body, requestOptions) {
    return this.client.request(appApiPath(`/iam/users/current/persona`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "PUT", body, contentType: "application/json", sdkworkUnwrapKind: "item" });
  }
};
var IamUsersCurrentPasswordApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Users current password update. */
  async update(body, requestOptions) {
    return this.client.request(appApiPath(`/iam/users/current/password`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "PATCH", ...body !== void 0 ? { body, contentType: "application/json" } : {}, sdkworkUnwrapKind: "item" });
  }
};
var IamUsersCurrentEmailBindingsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Users current email Bindings delete. */
  async delete(requestOptions) {
    return this.client.request(appApiPath(`/iam/users/current/email_bindings`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "DELETE" });
  }
  /** Users current email Bindings create. */
  async create(body, requestOptions) {
    return this.client.request(appApiPath(`/iam/users/current/email_bindings`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", sdkworkUnwrapKind: "item" });
  }
};
var IamUsersCurrentApi = class {
  constructor(client) {
    __publicField(this, "client");
    __publicField(this, "emailBindings");
    __publicField(this, "password");
    __publicField(this, "persona");
    __publicField(this, "phoneBindings");
    this.client = client;
    this.emailBindings = new IamUsersCurrentEmailBindingsApi(client);
    this.password = new IamUsersCurrentPasswordApi(client);
    this.persona = new IamUsersCurrentPersonaApi(client);
    this.phoneBindings = new IamUsersCurrentPhoneBindingsApi(client);
  }
  /** Users current retrieve. */
  async retrieve(requestOptions) {
    return this.client.request(appApiPath(`/iam/users/current`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "item" });
  }
  /** Users current update. */
  async update(body, requestOptions) {
    return this.client.request(appApiPath(`/iam/users/current`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "PATCH", ...body !== void 0 ? { body, contentType: "application/json" } : {}, sdkworkUnwrapKind: "item" });
  }
};
var IamUsersApi = class {
  constructor(client) {
    __publicField(this, "current");
    this.current = new IamUsersCurrentApi(client);
  }
};
var IamRoleBindingsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Role Bindings list. */
  async list(params, requestOptions) {
    const query = buildQueryString([
      { name: "page", value: params?.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params?.pageSize, style: "form", explode: true, allowReserved: false },
      { name: "cursor", value: params?.cursor, style: "form", explode: true, allowReserved: false },
      { name: "sort", value: params?.sort, style: "form", explode: true, allowReserved: false },
      { name: "q", value: params?.q, style: "form", explode: true, allowReserved: false },
      { name: "roleId", value: params?.roleId, style: "form", explode: true, allowReserved: false },
      { name: "principalKind", value: params?.principalKind, style: "form", explode: true, allowReserved: false },
      { name: "principalId", value: params?.principalId, style: "form", explode: true, allowReserved: false },
      { name: "scopeKind", value: params?.scopeKind, style: "form", explode: true, allowReserved: false },
      { name: "scopeId", value: params?.scopeId, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString(appApiPath(`/iam/role_bindings`), query), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
};
var IamPositionsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Positions list. */
  async list(params, requestOptions) {
    const query = buildQueryString([
      { name: "page", value: params?.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params?.pageSize, style: "form", explode: true, allowReserved: false },
      { name: "cursor", value: params?.cursor, style: "form", explode: true, allowReserved: false },
      { name: "sort", value: params?.sort, style: "form", explode: true, allowReserved: false },
      { name: "q", value: params?.q, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString(appApiPath(`/iam/positions`), query), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
};
var IamPositionAssignmentsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Position Assignments list. */
  async list(params, requestOptions) {
    const query = buildQueryString([
      { name: "page", value: params?.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params?.pageSize, style: "form", explode: true, allowReserved: false },
      { name: "cursor", value: params?.cursor, style: "form", explode: true, allowReserved: false },
      { name: "sort", value: params?.sort, style: "form", explode: true, allowReserved: false },
      { name: "q", value: params?.q, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString(appApiPath(`/iam/position_assignments`), query), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
};
var IamPersonaCatalogApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Persona Catalog retrieve. */
  async retrieve(requestOptions) {
    return this.client.request(appApiPath(`/iam/persona_catalog`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "item" });
  }
};
var IamOrganizationsTreeApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Organizations tree retrieve. */
  async retrieve(requestOptions) {
    return this.client.request(appApiPath(`/iam/organizations/tree`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "item" });
  }
};
var IamOrganizationsApi = class {
  constructor(client) {
    __publicField(this, "client");
    __publicField(this, "tree");
    this.client = client;
    this.tree = new IamOrganizationsTreeApi(client);
  }
  /** Organizations list. */
  async list(params, requestOptions) {
    const query = buildQueryString([
      { name: "page", value: params?.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params?.pageSize, style: "form", explode: true, allowReserved: false },
      { name: "cursor", value: params?.cursor, style: "form", explode: true, allowReserved: false },
      { name: "sort", value: params?.sort, style: "form", explode: true, allowReserved: false },
      { name: "q", value: params?.q, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString(appApiPath(`/iam/organizations`), query), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
};
var IamOrganizationMembershipsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Organization Memberships list. */
  async list(params, requestOptions) {
    const query = buildQueryString([
      { name: "page", value: params?.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params?.pageSize, style: "form", explode: true, allowReserved: false },
      { name: "cursor", value: params?.cursor, style: "form", explode: true, allowReserved: false },
      { name: "sort", value: params?.sort, style: "form", explode: true, allowReserved: false },
      { name: "q", value: params?.q, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString(appApiPath(`/iam/organization_memberships`), query), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
};
var IamDepartmentsTreeApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Departments tree retrieve. */
  async retrieve(requestOptions) {
    return this.client.request(appApiPath(`/iam/departments/tree`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "item" });
  }
};
var IamDepartmentsApi = class {
  constructor(client) {
    __publicField(this, "client");
    __publicField(this, "tree");
    this.client = client;
    this.tree = new IamDepartmentsTreeApi(client);
  }
  /** Departments list. */
  async list(params, requestOptions) {
    const query = buildQueryString([
      { name: "page", value: params?.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params?.pageSize, style: "form", explode: true, allowReserved: false },
      { name: "cursor", value: params?.cursor, style: "form", explode: true, allowReserved: false },
      { name: "sort", value: params?.sort, style: "form", explode: true, allowReserved: false },
      { name: "q", value: params?.q, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString(appApiPath(`/iam/departments`), query), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
};
var IamDepartmentAssignmentsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Department Assignments list. */
  async list(params, requestOptions) {
    const query = buildQueryString([
      { name: "page", value: params?.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params?.pageSize, style: "form", explode: true, allowReserved: false },
      { name: "cursor", value: params?.cursor, style: "form", explode: true, allowReserved: false },
      { name: "sort", value: params?.sort, style: "form", explode: true, allowReserved: false },
      { name: "q", value: params?.q, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString(appApiPath(`/iam/department_assignments`), query), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
};
var IamApi = class {
  constructor(client) {
    __publicField(this, "departmentAssignments");
    __publicField(this, "departments");
    __publicField(this, "organizationMemberships");
    __publicField(this, "organizations");
    __publicField(this, "personaCatalog");
    __publicField(this, "positionAssignments");
    __publicField(this, "positions");
    __publicField(this, "roleBindings");
    __publicField(this, "users");
    this.departmentAssignments = new IamDepartmentAssignmentsApi(client);
    this.departments = new IamDepartmentsApi(client);
    this.organizationMemberships = new IamOrganizationMembershipsApi(client);
    this.organizations = new IamOrganizationsApi(client);
    this.personaCatalog = new IamPersonaCatalogApi(client);
    this.positionAssignments = new IamPositionAssignmentsApi(client);
    this.positions = new IamPositionsApi(client);
    this.roleBindings = new IamRoleBindingsApi(client);
    this.users = new IamUsersApi(client);
  }
};
function createIamApi(client) {
  return new IamApi(client);
}
function appendQueryString(path, rawQueryString) {
  const query = rawQueryString.replace(/^\?+/, "");
  if (!query) {
    return path;
  }
  return path.includes("?") ? `${path}&${query}` : `${path}?${query}`;
}
function buildQueryString(parameters) {
  const pairs = [];
  for (const parameter of parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join("&");
}
function appendSerializedParameter(pairs, parameter) {
  if (parameter.value === void 0 || parameter.value === null) {
    return;
  }
  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }
  const style = parameter.style || "form";
  if (style === "deepObject") {
    appendDeepObjectParameter(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }
  if (Array.isArray(parameter.value)) {
    appendArrayParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  if (typeof parameter.value === "object") {
    appendObjectParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(serializePrimitive(parameter.value), parameter.allowReserved)}`);
}
function appendArrayParameter(pairs, name, value, style, explode, allowReserved) {
  const values = value.filter((item) => item !== void 0 && item !== null).map((item) => serializePrimitive(item));
  if (values.length === 0) {
    return;
  }
  if (style === "form" && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(item, allowReserved)}`);
    }
    return;
  }
  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(values.join(","), allowReserved)}`);
}
function appendObjectParameter(pairs, name, value, style, explode, allowReserved) {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== void 0 && entryValue !== null);
  if (entries.length === 0) {
    return;
  }
  if (style === "form" && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent(key)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
    }
    return;
  }
  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive(entryValue)]).join(",");
  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serialized, allowReserved)}`);
}
function appendDeepObjectParameter(pairs, name, value, allowReserved) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serializePrimitive(value), allowReserved)}`);
    return;
  }
  for (const [key, entryValue] of Object.entries(value)) {
    if (entryValue === void 0 || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent(`${name}[${key}]`)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
  }
}
function serializePrimitive(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
function encodeQueryComponent(value) {
  return encodeURIComponent(value);
}
function encodeQueryValue(value, allowReserved) {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ":").replace(/%2F/gi, "/").replace(/%3F/gi, "?").replace(/%23/gi, "#").replace(/%5B/gi, "[").replace(/%5D/gi, "]").replace(/%40/gi, "@").replace(/%21/gi, "!").replace(/%24/gi, "$").replace(/%26/gi, "&").replace(/%27/gi, "'").replace(/%28/gi, "(").replace(/%29/gi, ")").replace(/%2A/gi, "*").replace(/%2B/gi, "+").replace(/%2C/gi, ",").replace(/%3B/gi, ";").replace(/%3D/gi, "=");
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/src/api/oauth.ts
var OauthWechatPaymentOauthApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Wechat Payment Oauth callback. */
  async callback(requestOptions) {
    return this.client.request(appApiPath(`/oauth/wechat/payment/callback`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", skipAuth: true, sdkworkUnwrapKind: "item" });
  }
  /** Wechat Payment Oauth start. */
  async start(params, requestOptions) {
    const query = buildQueryString2([
      { name: "redirect", value: params.redirect, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString2(appApiPath(`/oauth/wechat/payment/start`), query), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "item" });
  }
};
var OauthSessionsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Sessions create. */
  async create(body, requestOptions) {
    return this.client.request(appApiPath(`/oauth/sessions`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", accessTokenOnly: true, sdkworkUnwrapKind: "item" });
  }
};
var OauthScanLoginModesApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Scan Login Modes list. */
  async list(params, requestOptions) {
    const query = buildQueryString2([
      { name: "page", value: params?.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params?.pageSize, style: "form", explode: true, allowReserved: false },
      { name: "cursor", value: params?.cursor, style: "form", explode: true, allowReserved: false },
      { name: "sort", value: params?.sort, style: "form", explode: true, allowReserved: false },
      { name: "q", value: params?.q, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString2(appApiPath(`/oauth/scan_login_modes`), query), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", accessTokenOnly: true, sdkworkUnwrapKind: "page" });
  }
};
var OauthProvidersApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Providers list. */
  async list(params, requestOptions) {
    const query = buildQueryString2([
      { name: "page", value: params?.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params?.pageSize, style: "form", explode: true, allowReserved: false },
      { name: "cursor", value: params?.cursor, style: "form", explode: true, allowReserved: false },
      { name: "sort", value: params?.sort, style: "form", explode: true, allowReserved: false },
      { name: "q", value: params?.q, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString2(appApiPath(`/oauth/providers`), query), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", accessTokenOnly: true, sdkworkUnwrapKind: "page" });
  }
};
var OauthMiniProgramSessionsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Mini Program Sessions create. */
  async create(body, requestOptions) {
    return this.client.request(appApiPath(`/oauth/mini_program_sessions`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", accessTokenOnly: true, sdkworkUnwrapKind: "item" });
  }
};
var OauthGrantsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Grants list. */
  async list(params, requestOptions) {
    const query = buildQueryString2([
      { name: "page", value: params?.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params?.pageSize, style: "form", explode: true, allowReserved: false },
      { name: "cursor", value: params?.cursor, style: "form", explode: true, allowReserved: false },
      { name: "sort", value: params?.sort, style: "form", explode: true, allowReserved: false },
      { name: "q", value: params?.q, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString2(appApiPath(`/oauth/grants`), query), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
  /** Grants delete. */
  async delete(grantId, requestOptions) {
    return this.client.request(appApiPath(`/oauth/grants/${serializePathParameter(grantId, { name: "grantId", style: "simple", explode: false })}`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "DELETE" });
  }
};
var OauthDeviceAuthorizationsSessionExchangesApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Device Authorizations session Exchanges create. */
  async create(deviceAuthorizationId, body, requestOptions) {
    return this.client.request(appApiPath(`/oauth/device_authorizations/${serializePathParameter(deviceAuthorizationId, { name: "deviceAuthorizationId", style: "simple", explode: false })}/session_exchanges`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", skipAuth: true, sdkworkUnwrapKind: "item" });
  }
};
var OauthDeviceAuthorizationsSessionCompletionsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Device Authorizations session Completions create. */
  async create(deviceAuthorizationId, body, requestOptions) {
    return this.client.request(appApiPath(`/oauth/device_authorizations/${serializePathParameter(deviceAuthorizationId, { name: "deviceAuthorizationId", style: "simple", explode: false })}/session_completions`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", accessTokenOnly: true, sdkworkUnwrapKind: "item" });
  }
};
var OauthDeviceAuthorizationsScansApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Device Authorizations scans create. */
  async create(deviceAuthorizationId, body, requestOptions) {
    return this.client.request(appApiPath(`/oauth/device_authorizations/${serializePathParameter(deviceAuthorizationId, { name: "deviceAuthorizationId", style: "simple", explode: false })}/scans`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", accessTokenOnly: true, sdkworkUnwrapKind: "item" });
  }
};
var OauthDeviceAuthorizationsPasswordCompletionsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Device Authorizations password Completions create. */
  async create(deviceAuthorizationId, body, requestOptions) {
    return this.client.request(appApiPath(`/oauth/device_authorizations/${serializePathParameter(deviceAuthorizationId, { name: "deviceAuthorizationId", style: "simple", explode: false })}/password_completions`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", accessTokenOnly: true, sdkworkUnwrapKind: "item" });
  }
};
var OauthDeviceAuthorizationsApi = class {
  constructor(client) {
    __publicField(this, "client");
    __publicField(this, "passwordCompletions");
    __publicField(this, "scans");
    __publicField(this, "sessionCompletions");
    __publicField(this, "sessionExchanges");
    this.client = client;
    this.passwordCompletions = new OauthDeviceAuthorizationsPasswordCompletionsApi(client);
    this.scans = new OauthDeviceAuthorizationsScansApi(client);
    this.sessionCompletions = new OauthDeviceAuthorizationsSessionCompletionsApi(client);
    this.sessionExchanges = new OauthDeviceAuthorizationsSessionExchangesApi(client);
  }
  /** Device Authorizations create. */
  async create(body, requestOptions) {
    return this.client.request(appApiPath(`/oauth/device_authorizations`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", skipAuth: true, sdkworkUnwrapKind: "item" });
  }
  /** Device Authorizations retrieve. */
  async retrieve(deviceAuthorizationId, requestOptions) {
    return this.client.request(appApiPath(`/oauth/device_authorizations/${serializePathParameter(deviceAuthorizationId, { name: "deviceAuthorizationId", style: "simple", explode: false })}`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", skipAuth: true, sdkworkUnwrapKind: "item" });
  }
};
var OauthDesktopSessionsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Desktop Sessions create. */
  async create(body, requestOptions) {
    return this.client.request(appApiPath(`/oauth/desktop_sessions`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", skipAuth: true, sdkworkUnwrapKind: "data" });
  }
};
var OauthCallbacksApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Callbacks retrieve. */
  async retrieve(providerCode, requestOptions) {
    return this.client.request(appApiPath(`/oauth/callbacks/${serializePathParameter(providerCode, { name: "providerCode", style: "simple", explode: false })}`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", accessTokenOnly: true, sdkworkUnwrapKind: "item" });
  }
  /** Callbacks create. */
  async create(providerCode, body, requestOptions) {
    return this.client.request(appApiPath(`/oauth/callbacks/${serializePathParameter(providerCode, { name: "providerCode", style: "simple", explode: false })}`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", accessTokenOnly: true, sdkworkUnwrapKind: "item" });
  }
};
var OauthAuthorizationsCompletionsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Authorizations completions create. */
  async create(authorizationStateId, body, requestOptions) {
    return this.client.request(appApiPath(`/oauth/authorizations/${serializePathParameter(authorizationStateId, { name: "authorizationStateId", style: "simple", explode: false })}/completions`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", sdkworkUnwrapKind: "data" });
  }
};
var OauthAuthorizationsApi = class {
  constructor(client) {
    __publicField(this, "completions");
    this.completions = new OauthAuthorizationsCompletionsApi(client);
  }
};
var OauthAuthorizationUrlsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Authorization Urls create. */
  async create(body, requestOptions) {
    return this.client.request(appApiPath(`/oauth/authorization_urls`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", accessTokenOnly: true, sdkworkUnwrapKind: "item" });
  }
};
var OauthAccountLinksApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Account Links list. */
  async list(params, requestOptions) {
    const query = buildQueryString2([
      { name: "page", value: params?.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params?.pageSize, style: "form", explode: true, allowReserved: false },
      { name: "cursor", value: params?.cursor, style: "form", explode: true, allowReserved: false },
      { name: "sort", value: params?.sort, style: "form", explode: true, allowReserved: false },
      { name: "q", value: params?.q, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString2(appApiPath(`/oauth/account_links`), query), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
  /** Account Links delete. */
  async delete(accountLinkId, requestOptions) {
    return this.client.request(appApiPath(`/oauth/account_links/${serializePathParameter(accountLinkId, { name: "accountLinkId", style: "simple", explode: false })}`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "DELETE" });
  }
};
var OauthApi = class {
  constructor(client) {
    __publicField(this, "accountLinks");
    __publicField(this, "authorizationUrls");
    __publicField(this, "authorizations");
    __publicField(this, "callbacks");
    __publicField(this, "desktopSessions");
    __publicField(this, "deviceAuthorizations");
    __publicField(this, "grants");
    __publicField(this, "miniProgramSessions");
    __publicField(this, "providers");
    __publicField(this, "scanLoginModes");
    __publicField(this, "sessions");
    __publicField(this, "wechatPaymentOauth");
    this.accountLinks = new OauthAccountLinksApi(client);
    this.authorizationUrls = new OauthAuthorizationUrlsApi(client);
    this.authorizations = new OauthAuthorizationsApi(client);
    this.callbacks = new OauthCallbacksApi(client);
    this.desktopSessions = new OauthDesktopSessionsApi(client);
    this.deviceAuthorizations = new OauthDeviceAuthorizationsApi(client);
    this.grants = new OauthGrantsApi(client);
    this.miniProgramSessions = new OauthMiniProgramSessionsApi(client);
    this.providers = new OauthProvidersApi(client);
    this.scanLoginModes = new OauthScanLoginModesApi(client);
    this.sessions = new OauthSessionsApi(client);
    this.wechatPaymentOauth = new OauthWechatPaymentOauthApi(client);
  }
};
function createOauthApi(client) {
  return new OauthApi(client);
}
function appendQueryString2(path, rawQueryString) {
  const query = rawQueryString.replace(/^\?+/, "");
  if (!query) {
    return path;
  }
  return path.includes("?") ? `${path}&${query}` : `${path}?${query}`;
}
function serializePathParameter(value, spec) {
  if (value === void 0 || value === null) {
    return "";
  }
  const style = spec.style || "simple";
  if (Array.isArray(value)) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (typeof value === "object") {
    return serializePathObject(spec.name, value, style, spec.explode);
  }
  return pathPrefix(spec.name, style, false) + encodePathValue(serializePathPrimitive(value));
}
function serializePathArray(name, values, style, explode) {
  const serialized = values.filter((item) => item !== void 0 && item !== null).map((item) => encodePathValue(serializePathPrimitive(item)));
  if (serialized.length === 0) {
    return pathPrefix(name, style, false);
  }
  if (style === "matrix") {
    return explode ? serialized.map((item) => `;${name}=${item}`).join("") : `;${name}=${serialized.join(",")}`;
  }
  return pathPrefix(name, style, false) + serialized.join(explode ? "." : ",");
}
function serializePathObject(name, value, style, explode) {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== void 0 && entryValue !== null);
  if (entries.length === 0) {
    return pathPrefix(name, style, true);
  }
  if (style === "matrix") {
    return explode ? entries.map(([key, entryValue]) => `;${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join("") : `;${name}=${entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(",")}`;
  }
  const serialized = explode ? entries.map(([key, entryValue]) => `${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join(style === "label" ? "." : ",") : entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(",");
  return pathPrefix(name, style, true) + serialized;
}
function pathPrefix(name, style, _objectValue) {
  if (style === "label") return ".";
  if (style === "matrix") return `;${name}`;
  return "";
}
function encodePathValue(value) {
  return encodeURIComponent(value);
}
function serializePathPrimitive(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
function buildQueryString2(parameters) {
  const pairs = [];
  for (const parameter of parameters) {
    appendSerializedParameter2(pairs, parameter);
  }
  return pairs.join("&");
}
function appendSerializedParameter2(pairs, parameter) {
  if (parameter.value === void 0 || parameter.value === null) {
    return;
  }
  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent2(parameter.name)}=${encodeQueryValue2(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }
  const style = parameter.style || "form";
  if (style === "deepObject") {
    appendDeepObjectParameter2(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }
  if (Array.isArray(parameter.value)) {
    appendArrayParameter2(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  if (typeof parameter.value === "object") {
    appendObjectParameter2(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  pairs.push(`${encodeQueryComponent2(parameter.name)}=${encodeQueryValue2(serializePrimitive2(parameter.value), parameter.allowReserved)}`);
}
function appendArrayParameter2(pairs, name, value, style, explode, allowReserved) {
  const values = value.filter((item) => item !== void 0 && item !== null).map((item) => serializePrimitive2(item));
  if (values.length === 0) {
    return;
  }
  if (style === "form" && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent2(name)}=${encodeQueryValue2(item, allowReserved)}`);
    }
    return;
  }
  pairs.push(`${encodeQueryComponent2(name)}=${encodeQueryValue2(values.join(","), allowReserved)}`);
}
function appendObjectParameter2(pairs, name, value, style, explode, allowReserved) {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== void 0 && entryValue !== null);
  if (entries.length === 0) {
    return;
  }
  if (style === "form" && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent2(key)}=${encodeQueryValue2(serializePrimitive2(entryValue), allowReserved)}`);
    }
    return;
  }
  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive2(entryValue)]).join(",");
  pairs.push(`${encodeQueryComponent2(name)}=${encodeQueryValue2(serialized, allowReserved)}`);
}
function appendDeepObjectParameter2(pairs, name, value, allowReserved) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent2(name)}=${encodeQueryValue2(serializePrimitive2(value), allowReserved)}`);
    return;
  }
  for (const [key, entryValue] of Object.entries(value)) {
    if (entryValue === void 0 || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent2(`${name}[${key}]`)}=${encodeQueryValue2(serializePrimitive2(entryValue), allowReserved)}`);
  }
}
function serializePrimitive2(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
function encodeQueryComponent2(value) {
  return encodeURIComponent(value);
}
function encodeQueryValue2(value, allowReserved) {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ":").replace(/%2F/gi, "/").replace(/%3F/gi, "?").replace(/%23/gi, "#").replace(/%5B/gi, "[").replace(/%5D/gi, "]").replace(/%40/gi, "@").replace(/%21/gi, "!").replace(/%24/gi, "$").replace(/%26/gi, "&").replace(/%27/gi, "'").replace(/%28/gi, "(").replace(/%29/gi, ")").replace(/%2A/gi, "*").replace(/%2B/gi, "+").replace(/%2C/gi, ",").replace(/%3B/gi, ";").replace(/%3D/gi, "=");
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/src/api/system.ts
var SystemIamVerificationPolicyApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Iam verification Policy retrieve. */
  async retrieve(requestOptions) {
    return this.client.request(appApiPath(`/system/iam/verification_policy`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", accessTokenOnly: true, sdkworkUnwrapKind: "item" });
  }
};
var SystemIamRuntimeApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Iam runtime retrieve. */
  async retrieve(requestOptions) {
    return this.client.request(appApiPath(`/system/iam/runtime`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", accessTokenOnly: true, sdkworkUnwrapKind: "item" });
  }
};
var SystemIamAccountBindingPolicyApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Iam account Binding Policy retrieve. */
  async retrieve(requestOptions) {
    return this.client.request(appApiPath(`/system/iam/account_binding_policy`), { ...requestOptions?.signal !== void 0 ? { signal: requestOptions.signal } : {}, ...requestOptions?.timeout !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", accessTokenOnly: true, sdkworkUnwrapKind: "item" });
  }
};
var SystemIamApi = class {
  constructor(client) {
    __publicField(this, "accountBindingPolicy");
    __publicField(this, "runtime");
    __publicField(this, "verificationPolicy");
    this.accountBindingPolicy = new SystemIamAccountBindingPolicyApi(client);
    this.runtime = new SystemIamRuntimeApi(client);
    this.verificationPolicy = new SystemIamVerificationPolicyApi(client);
  }
};
var SystemApi = class {
  constructor(client) {
    __publicField(this, "iam");
    this.iam = new SystemIamApi(client);
  }
};
function createSystemApi(client) {
  return new SystemApi(client);
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/src/sdk.ts
var SdkworkAppClient = class {
  constructor(config) {
    __publicField(this, "httpClient");
    __publicField(this, "auth");
    __publicField(this, "iam");
    __publicField(this, "oauth");
    __publicField(this, "system");
    this.httpClient = createHttpClient(config);
    this.auth = createAuthApi(this.httpClient);
    this.iam = createIamApi(this.httpClient);
    this.oauth = createOauthApi(this.httpClient);
    this.system = createSystemApi(this.httpClient);
  }
  setAuthToken(token) {
    this.httpClient.setAuthToken(token);
    return this;
  }
  setAccessToken(token) {
    this.httpClient.setAccessToken(token);
    return this;
  }
  setTokenManager(manager) {
    this.httpClient.setTokenManager(manager);
    return this;
  }
  get http() {
    return this.httpClient;
  }
};
function createClient(config) {
  return new SdkworkAppClient(config);
}

// ../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/src/index.ts
function createClient2(config) {
  return createClient(config);
}

// ../../../sdkwork-utils/packages/sdkwork-utils-typescript/src/string.js
function isBlank2(value) {
  return value == null || value.trim().length === 0;
}
function trim2(value) {
  return value.trim();
}

// ../../../sdkwork-utils/packages/sdkwork-utils-typescript/src/httpApi.js
var SDKWORK_SUCCESS_CODE = 0;
function isSdkWorkSuccessCode(code) {
  return code === SDKWORK_SUCCESS_CODE;
}

// ../../../sdkwork-utils/packages/sdkwork-utils-typescript/src/runtime/binary.js
var textEncoder2 = new TextEncoder();

// ../../../sdkwork-utils/packages/sdkwork-utils-typescript/src/runtime/sha256.js
var K2 = new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var SHA256_INITIAL_STATE2 = new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);

// ../../../sdkwork-utils/packages/sdkwork-utils-typescript/src/money.js
var LOCALE_RULES = {
  "en-us": {
    prefix: true,
    decimal: ".",
    grouping: ",",
    nameSpace: true,
    compact: [
      { exponent: 12, unit: "T" },
      { exponent: 9, unit: "B" },
      { exponent: 6, unit: "M" },
      { exponent: 3, unit: "K" }
    ]
  },
  "zh-cn": {
    prefix: true,
    decimal: ".",
    grouping: ",",
    nameSpace: false,
    compact: [
      { exponent: 12, unit: "\u5146" },
      { exponent: 8, unit: "\u4EBF" },
      { exponent: 4, unit: "\u4E07" }
    ]
  },
  "ja-jp": {
    prefix: true,
    decimal: ".",
    grouping: ",",
    nameSpace: false,
    compact: [
      { exponent: 12, unit: "\u5146" },
      { exponent: 8, unit: "\u5104" },
      { exponent: 4, unit: "\u4E07" }
    ]
  },
  "ko-kr": {
    prefix: true,
    decimal: ".",
    grouping: ",",
    nameSpace: false,
    compact: [
      { exponent: 12, unit: "\uC870" },
      { exponent: 8, unit: "\uC5B5" },
      { exponent: 4, unit: "\uB9CC" }
    ]
  },
  "de-de": {
    prefix: false,
    decimal: ",",
    grouping: ".",
    nameSpace: true,
    compact: [
      { exponent: 12, unit: "Bio." },
      { exponent: 9, unit: "Mrd." },
      { exponent: 6, unit: "Mio." },
      { exponent: 3, unit: "Tsd." }
    ]
  },
  "fr-fr": {
    prefix: false,
    decimal: ",",
    grouping: " ",
    nameSpace: true,
    compact: [
      { exponent: 12, unit: "B" },
      { exponent: 9, unit: "Md" },
      { exponent: 6, unit: "M" },
      { exponent: 3, unit: "k" }
    ]
  },
  "it-it": {
    prefix: false,
    decimal: ",",
    grouping: ".",
    nameSpace: true,
    compact: [
      { exponent: 12, unit: "Bio." },
      { exponent: 9, unit: "Mrd." },
      { exponent: 6, unit: "M" },
      { exponent: 3, unit: "k" }
    ]
  },
  "es-es": {
    prefix: false,
    decimal: ",",
    grouping: ".",
    nameSpace: true,
    compact: [
      { exponent: 12, unit: "T" },
      { exponent: 9, unit: "B" },
      { exponent: 6, unit: "M" },
      { exponent: 3, unit: "k" }
    ]
  },
  "ru-ru": {
    prefix: false,
    decimal: ",",
    grouping: " ",
    nameSpace: true,
    compact: [
      { exponent: 12, unit: "\u0442\u0440\u043B\u043D" },
      { exponent: 9, unit: "\u043C\u043B\u0440\u0434" },
      { exponent: 6, unit: "\u043C\u043B\u043D" },
      { exponent: 3, unit: "\u0442\u044B\u0441." }
    ]
  }
};
var CURRENCY_NAMES = {
  "en-us": {
    USD: "US dollars",
    EUR: "euros",
    GBP: "British pounds",
    CNY: "Chinese yuan",
    JPY: "Japanese yen",
    KRW: "South Korean won",
    HKD: "Hong Kong dollars",
    TWD: "New Taiwan dollars",
    CHF: "Swiss francs",
    CAD: "Canadian dollars",
    AUD: "Australian dollars",
    INR: "Indian rupees",
    BHD: "Bahraini dinars",
    KWD: "Kuwaiti dinars"
  },
  "zh-cn": {
    USD: "\u7F8E\u5143",
    EUR: "\u6B27\u5143",
    GBP: "\u82F1\u9563",
    CNY: "\u4EBA\u6C11\u5E01",
    JPY: "\u65E5\u5143",
    KRW: "\u97E9\u5143",
    HKD: "\u6E2F\u5E01",
    TWD: "\u65B0\u53F0\u5E01",
    CHF: "\u745E\u58EB\u6CD5\u90CE",
    CAD: "\u52A0\u62FF\u5927\u5143",
    AUD: "\u6FB3\u5927\u5229\u4E9A\u5143",
    INR: "\u5370\u5EA6\u5362\u6BD4",
    BHD: "\u5DF4\u6797\u7B2C\u7EB3\u5C14",
    KWD: "\u79D1\u5A01\u7279\u7B2C\u7EB3\u5C14"
  },
  "de-de": {
    USD: "US-Dollar",
    EUR: "Euro",
    GBP: "Britisches Pfund",
    CNY: "Chinesischer Yuan",
    JPY: "Japanischer Yen",
    KRW: "S\xFCdkoreanischer Won",
    HKD: "Hongkong-Dollar",
    TWD: "Neuer Taiwan-Dollar",
    CHF: "Schweizer Franken",
    CAD: "Kanadischer Dollar",
    AUD: "Australischer Dollar",
    INR: "Indische Rupie",
    BHD: "Bahrainischer Dinar",
    KWD: "Kuwaitischer Dinar"
  },
  "fr-fr": {
    USD: "dollar am\xE9ricain",
    EUR: "euro",
    GBP: "livre sterling",
    CNY: "yuan chinois",
    JPY: "yen japonais",
    KRW: "won sud-cor\xE9en",
    HKD: "dollar de Hong Kong",
    TWD: "nouveau dollar de Ta\xEFwan",
    CHF: "franc suisse",
    CAD: "dollar canadien",
    AUD: "dollar australien",
    INR: "roupie indienne",
    BHD: "dinar bahre\xEFni",
    KWD: "dinar kowe\xEFtien"
  },
  "it-it": {
    USD: "dollaro statunitense",
    EUR: "euro",
    GBP: "sterlina britannica",
    CNY: "yuan cinese",
    JPY: "yen giapponese",
    KRW: "won sudcoreano",
    HKD: "dollaro di Hong Kong",
    TWD: "nuovo dollaro taiwanese",
    CHF: "franco svizzero",
    CAD: "dollaro canadese",
    AUD: "dollaro australiano",
    INR: "rupia indiana",
    BHD: "dinaro bahreinita",
    KWD: "dinaro kuwaitiano"
  },
  "es-es": {
    USD: "d\xF3lar estadounidense",
    EUR: "euro",
    GBP: "libra esterlina",
    CNY: "yuan chino",
    JPY: "yen japon\xE9s",
    KRW: "won surcoreano",
    HKD: "d\xF3lar de Hong Kong",
    TWD: "nuevo d\xF3lar taiwan\xE9s",
    CHF: "franco suizo",
    CAD: "d\xF3lar canadiense",
    AUD: "d\xF3lar australiano",
    INR: "rupia india",
    BHD: "dinar bahrein\xED",
    KWD: "dinar kuwait\xED"
  },
  "ja-jp": {
    USD: "\u7C73\u30C9\u30EB",
    EUR: "\u30E6\u30FC\u30ED",
    GBP: "\u82F1\u30DD\u30F3\u30C9",
    CNY: "\u4E2D\u56FD\u4EBA\u6C11\u5143",
    JPY: "\u65E5\u672C\u5186",
    KRW: "\u97D3\u56FD\u30A6\u30A9\u30F3",
    HKD: "\u9999\u6E2F\u30C9\u30EB",
    TWD: "\u53F0\u6E7E\u30C9\u30EB",
    CHF: "\u30B9\u30A4\u30B9\u30D5\u30E9\u30F3",
    CAD: "\u30AB\u30CA\u30C0\u30C9\u30EB",
    AUD: "\u30AA\u30FC\u30B9\u30C8\u30E9\u30EA\u30A2\u30C9\u30EB",
    INR: "\u30A4\u30F3\u30C9\u30EB\u30D4\u30FC",
    BHD: "\u30D0\u30FC\u30EC\u30FC\u30F3\u30C7\u30A3\u30FC\u30CA\u30FC\u30EB",
    KWD: "\u30AF\u30A6\u30A7\u30FC\u30C8\u30C7\u30A3\u30CA\u30FC\u30EB"
  },
  "ko-kr": {
    USD: "\uBBF8\uAD6D \uB2EC\uB7EC",
    EUR: "\uC720\uB85C",
    GBP: "\uC601\uAD6D \uD30C\uC6B4\uB4DC",
    CNY: "\uC911\uAD6D \uC704\uC548",
    JPY: "\uC77C\uBCF8 \uC5D4",
    KRW: "\uB300\uD55C\uBBFC\uAD6D \uC6D0",
    HKD: "\uD64D\uCF69 \uB2EC\uB7EC",
    TWD: "\uC2E0 \uB300\uB9CC \uB2EC\uB7EC",
    CHF: "\uC2A4\uC704\uC2A4 \uD504\uB791",
    CAD: "\uCE90\uB098\uB2E4 \uB2EC\uB7EC",
    AUD: "\uD638\uC8FC \uB2EC\uB7EC",
    INR: "\uC778\uB3C4 \uB8E8\uD53C",
    BHD: "\uBC14\uB808\uC778 \uB514\uB098\uB974",
    KWD: "\uCFE0\uC6E8\uC774\uD2B8 \uB514\uB098\uB974"
  },
  "ru-ru": {
    USD: "\u0434\u043E\u043B\u043B\u0430\u0440 \u0421\u0428\u0410",
    EUR: "\u0435\u0432\u0440\u043E",
    GBP: "\u0431\u0440\u0438\u0442\u0430\u043D\u0441\u043A\u0438\u0439 \u0444\u0443\u043D\u0442",
    CNY: "\u043A\u0438\u0442\u0430\u0439\u0441\u043A\u0438\u0439 \u044E\u0430\u043D\u044C",
    JPY: "\u044F\u043F\u043E\u043D\u0441\u043A\u0430\u044F \u0438\u0435\u043D\u0430",
    KRW: "\u044E\u0436\u043D\u043E\u043A\u043E\u0440\u0435\u0439\u0441\u043A\u0430\u044F \u0432\u043E\u043D\u0430",
    HKD: "\u0433\u043E\u043D\u043A\u043E\u043D\u0433\u0441\u043A\u0438\u0439 \u0434\u043E\u043B\u043B\u0430\u0440",
    TWD: "\u043D\u043E\u0432\u044B\u0439 \u0442\u0430\u0439\u0432\u0430\u043D\u044C\u0441\u043A\u0438\u0439 \u0434\u043E\u043B\u043B\u0430\u0440",
    CHF: "\u0448\u0432\u0435\u0439\u0446\u0430\u0440\u0441\u043A\u0438\u0439 \u0444\u0440\u0430\u043D\u043A",
    CAD: "\u043A\u0430\u043D\u0430\u0434\u0441\u043A\u0438\u0439 \u0434\u043E\u043B\u043B\u0430\u0440",
    AUD: "\u0430\u0432\u0441\u0442\u0440\u0430\u043B\u0438\u0439\u0441\u043A\u0438\u0439 \u0434\u043E\u043B\u043B\u0430\u0440",
    INR: "\u0438\u043D\u0434\u0438\u0439\u0441\u043A\u0430\u044F \u0440\u0443\u043F\u0438\u044F",
    BHD: "\u0431\u0430\u0445\u0440\u0435\u0439\u043D\u0441\u043A\u0438\u0439 \u0434\u0438\u043D\u0430\u0440",
    KWD: "\u043A\u0443\u0432\u0435\u0439\u0442\u0441\u043A\u0438\u0439 \u0434\u0438\u043D\u0430\u0440"
  }
};
var DEFAULT_LOCALE_RULES = LOCALE_RULES["en-us"];
var DEFAULT_CURRENCY_NAMES = CURRENCY_NAMES["en-us"];

// ../sdkwork-iam-common/packages/sdkwork-iam-contracts/src/login-context.ts
var PLATFORM_ORGANIZATION_ID = "0";
function isPlatformOrganizationId(value) {
  return typeof value === "string" && trim2(value) === PLATFORM_ORGANIZATION_ID;
}
function normalizeLoginOrganizationClaim(value) {
  if (value === null || value === void 0) {
    return PLATFORM_ORGANIZATION_ID;
  }
  const normalized = typeof value === "string" ? trim2(value) : "";
  if (isBlank2(normalized) || normalized === PLATFORM_ORGANIZATION_ID) {
    return PLATFORM_ORGANIZATION_ID;
  }
  return normalized;
}
function isLoginEligibleOrganizationId(value) {
  return typeof value === "string" && !isBlank2(value) && !isPlatformOrganizationId(value);
}
function resolveSessionOrganizationId(input) {
  const loginScope = typeof input.loginScope === "string" ? trim2(input.loginScope).toUpperCase() : "";
  if (loginScope === "TENANT") {
    return PLATFORM_ORGANIZATION_ID;
  }
  return normalizeLoginOrganizationClaim(input.organizationId);
}

// ../sdkwork-iam-common/packages/sdkwork-iam-contracts/src/list-page.ts
var SDKWORK_DEFAULT_LIST_PAGE_SIZE = 20;
var SDKWORK_MAX_LIST_PAGE_SIZE = 200;
function clampListPageSize(pageSize) {
  if (pageSize === void 0) {
    return void 0;
  }
  return Math.min(Math.max(1, Math.floor(pageSize)), SDKWORK_MAX_LIST_PAGE_SIZE);
}
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
function extractSdkWorkTreeNodes(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (!isRecord(value)) {
    return [];
  }
  if (Array.isArray(value.nodes)) {
    return value.nodes;
  }
  if (isRecord(value.item) && Array.isArray(value.item.nodes)) {
    return value.item.nodes;
  }
  if (isRecord(value.data) && isRecord(value.data.item) && Array.isArray(value.data.item.nodes)) {
    return value.data.item.nodes;
  }
  return [];
}
var LIST_QUERY_KEYS = /* @__PURE__ */ new Set(["page", "page_size", "pageSize", "cursor", "sort", "q"]);
function readOptionalString(value) {
  if (typeof value !== "string") {
    return void 0;
  }
  const normalized = value.trim();
  return normalized || void 0;
}
function readOptionalNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : void 0;
  }
  return void 0;
}
function buildSdkWorkListQuery(input) {
  const query = {};
  const useCursor = Boolean(input?.cursor?.trim());
  if (!useCursor && input?.page !== void 0) {
    query.page = input.page;
  }
  if (input?.pageSize !== void 0) {
    query.page_size = clampListPageSize(input.pageSize) ?? SDKWORK_DEFAULT_LIST_PAGE_SIZE;
  }
  if (useCursor && input?.cursor) {
    query.cursor = input.cursor.trim();
  }
  if (input?.sort) {
    query.sort = input.sort;
  }
  if (input?.q) {
    query.q = input.q;
  }
  if (!("page_size" in query)) {
    query.page_size = SDKWORK_DEFAULT_LIST_PAGE_SIZE;
  }
  return query;
}
function resolveSdkWorkListQuery(params) {
  const page = readOptionalNumber(params?.page);
  const pageSize = clampListPageSize(
    readOptionalNumber(params?.page_size ?? params?.pageSize)
  ) ?? SDKWORK_DEFAULT_LIST_PAGE_SIZE;
  const cursor = readOptionalString(params?.cursor);
  const q = readOptionalString(params?.q);
  const sort = readOptionalString(params?.sort);
  const query = buildSdkWorkListQuery({
    ...page !== void 0 ? { page } : {},
    pageSize,
    ...cursor !== void 0 ? { cursor } : {},
    ...q !== void 0 ? { q } : {},
    ...sort !== void 0 ? { sort } : {}
  });
  if (!params) {
    return query;
  }
  for (const [key, value] of Object.entries(params)) {
    if (LIST_QUERY_KEYS.has(key) || value === void 0 || value === null) {
      continue;
    }
    if (typeof value === "string" || typeof value === "number") {
      query[key] = value;
      continue;
    }
    if (typeof value === "boolean") {
      query[key] = String(value);
    }
  }
  return query;
}

// ../sdkwork-iam-common/packages/sdkwork-iam-contracts/src/login-context-challenge.ts
function optionalString(value) {
  const normalized = typeof value === "string" ? trim2(value) : "";
  return isBlank2(normalized) ? void 0 : normalized;
}
function isRecord2(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function normalizeLoginContextSelectionOption(value) {
  if (!isRecord2(value)) {
    return void 0;
  }
  const loginScope = optionalString(value.loginScope) || optionalString(value.login_scope);
  if (loginScope !== "TENANT" && loginScope !== "ORGANIZATION") {
    return void 0;
  }
  const displayName = optionalString(value.displayName) || optionalString(value.display_name);
  const organizationId = optionalString(value.organizationId) || optionalString(value.organization_id);
  return {
    loginScope,
    ...displayName ? { displayName } : {},
    ...organizationId ? { organizationId } : {},
    ...value.requiresOrganizationSelection === true || value.requires_organization_selection === true ? { requiresOrganizationSelection: true } : {}
  };
}
function normalizeLoginContextOrganizationChoice(value) {
  if (!isRecord2(value)) {
    return void 0;
  }
  const organizationId = optionalString(value.organizationId) || optionalString(value.organization_id) || optionalString(value.id);
  if (!organizationId || !isLoginEligibleOrganizationId(organizationId)) {
    return void 0;
  }
  const displayName = optionalString(value.displayName) || optionalString(value.display_name);
  const membershipKind = optionalString(value.membershipKind) || optionalString(value.membership_kind);
  const name = optionalString(value.name);
  const tenantId = optionalString(value.tenantId) || optionalString(value.tenant_id);
  return {
    organizationId,
    ...displayName ? { displayName } : {},
    ...membershipKind ? { membershipKind } : {},
    ...name ? { name } : {},
    ...tenantId ? { tenantId } : {}
  };
}
function normalizeIamLoginContextSelectionChallenge(value) {
  if (!isRecord2(value)) {
    return void 0;
  }
  const challengeType = optionalString(value.challengeType) || optionalString(value.challenge_type);
  if (challengeType !== "LOGIN_CONTEXT_SELECTION" && challengeType !== "ORGANIZATION_SELECTION") {
    return void 0;
  }
  const continuationToken = optionalString(value.continuationToken) || optionalString(value.continuation_token);
  if (!continuationToken) {
    return void 0;
  }
  const organizations = Array.isArray(value.organizations) ? value.organizations.map(normalizeLoginContextOrganizationChoice).filter((organization) => Boolean(organization)) : [];
  const options = Array.isArray(value.options) ? value.options.map(normalizeLoginContextSelectionOption).filter((option) => Boolean(option)) : void 0;
  const expiresAt = typeof value.expiresAt === "number" || typeof value.expiresAt === "string" ? value.expiresAt : optionalString(value.expiresAt);
  return {
    challengeType,
    continuationToken,
    organizations,
    ...expiresAt !== void 0 ? { expiresAt } : {},
    ...options && options.length > 0 ? { options } : {}
  };
}
function isIamLoginContextSelectionChallenge(value) {
  return normalizeIamLoginContextSelectionChallenge(value) !== void 0;
}
function buildTenantCurrentSessionUpdateBody() {
  return {
    loginScope: "TENANT",
    organizationId: PLATFORM_ORGANIZATION_ID
  };
}

// ../sdkwork-iam-common/packages/sdkwork-iam-contracts/src/cloud-account-vocabulary.ts
var IAM_CLOUD_ACCOUNT_TYPE_LONG_TERM_KEY = "long_term_key";
var IAM_CLOUD_ACCOUNT_TYPE_TEMPORARY_CREDENTIAL = "temporary_credential";
var IAM_CLOUD_ACCOUNT_TYPE_SERVICE_ACCOUNT = "service_account";
var IAM_CLOUD_ACCOUNT_TYPE_SERVICE_LINKED_ROLE = "service_linked_role";
var IAM_CLOUD_ACCOUNT_TYPE_FEDERATED_IDENTITY = "federated_identity";
var IAM_CLOUD_ACCOUNT_TYPE_MANAGED_IDENTITY = "managed_identity";
var IAM_CLOUD_ACCOUNT_TYPE_API_KEY = "api_key";
var IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR = "access_key_pair";
var IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SERVICE_ACCOUNT_JSON = "service_account_json";
var IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SECRET_TEXT = "secret_text";
var IAM_CLOUD_ACCOUNT_TYPE_CREDENTIAL_KINDS = {
  [IAM_CLOUD_ACCOUNT_TYPE_LONG_TERM_KEY]: IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR,
  [IAM_CLOUD_ACCOUNT_TYPE_TEMPORARY_CREDENTIAL]: IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR,
  [IAM_CLOUD_ACCOUNT_TYPE_SERVICE_ACCOUNT]: IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SERVICE_ACCOUNT_JSON,
  [IAM_CLOUD_ACCOUNT_TYPE_SERVICE_LINKED_ROLE]: void 0,
  [IAM_CLOUD_ACCOUNT_TYPE_FEDERATED_IDENTITY]: void 0,
  [IAM_CLOUD_ACCOUNT_TYPE_MANAGED_IDENTITY]: void 0,
  [IAM_CLOUD_ACCOUNT_TYPE_API_KEY]: IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SECRET_TEXT
};

// ../sdkwork-iam-common/packages/sdkwork-iam-contracts/src/index.ts
var SDKWORK_IAM_STANDARD = {
  api: {
    appPrefix: "/app/v3/api",
    backendPrefix: "/backend/v3/api",
    openapi: "3.1.2"
  },
  databasePrefix: "iam",
  domain: "iam",
  sdkNamespaces: ["auth", "iam", "oauth", "system"]
};
var SDKWORK_STANDARD_ROLE_CODES = {
  APP_USER: "app_user",
  ORG_ADMIN: "org_admin",
  ORG_ASSISTANT: "org_assistant",
  ORG_AUDITOR: "org_auditor",
  ORG_FINANCE: "org_finance",
  ORG_OPERATIONS: "org_operations",
  PLATFORM_SYSTEM_ADMIN: "platform_system_admin",
  PLATFORM_SUPER_ADMIN: "platform_super_admin",
  LEGACY_OWNER: "owner"
};
var SDKWORK_STANDARD_ROLE_CODE_LIST = [
  SDKWORK_STANDARD_ROLE_CODES.APP_USER,
  SDKWORK_STANDARD_ROLE_CODES.ORG_ADMIN,
  SDKWORK_STANDARD_ROLE_CODES.ORG_ASSISTANT,
  SDKWORK_STANDARD_ROLE_CODES.ORG_AUDITOR,
  SDKWORK_STANDARD_ROLE_CODES.ORG_FINANCE,
  SDKWORK_STANDARD_ROLE_CODES.ORG_OPERATIONS,
  SDKWORK_STANDARD_ROLE_CODES.PLATFORM_SYSTEM_ADMIN,
  SDKWORK_STANDARD_ROLE_CODES.PLATFORM_SUPER_ADMIN
];
var SDKWORK_IAM_TABLES = {
  apiKey: "iam_api_key",
  auditEvent: "iam_audit_event",
  credential: "iam_credential",
  device: "iam_device",
  mfaFactor: "iam_mfa_factor",
  department: "iam_department",
  departmentAssignment: "iam_department_assignment",
  departmentClosure: "iam_department_closure",
  organization: "iam_organization",
  organizationClosure: "iam_organization_closure",
  organizationMembership: "iam_organization_membership",
  permission: "iam_permission",
  policy: "iam_policy",
  position: "iam_position",
  positionAssignment: "iam_position_assignment",
  role: "iam_role",
  roleBinding: "iam_role_binding",
  rolePermission: "iam_role_permission",
  securityEvent: "iam_security_event",
  session: "iam_session",
  tenant: "iam_tenant",
  user: "iam_user",
  userIdentity: "iam_user_identity",
  userPersona: "iam_user_persona",
  personaRole: "iam_persona_role",
  personaInterest: "iam_persona_interest",
  oauthIntegration: "iam_oauth_integration",
  oauthClient: "iam_oauth_client",
  oauthSecret: "iam_oauth_secret",
  oauthSurface: "iam_oauth_surface",
  oauthWebhookConfig: "iam_oauth_webhook_config"
};
var SDKWORK_IAM_DOMAIN_MODELS = [
  model("tenant", "tenant", ["tenantManagement"], [
    "id",
    "tenant_id",
    "code",
    "name",
    "status",
    "created_at",
    "updated_at"
  ]),
  model("organization", "tenant", ["organizationManagement"], [
    "id",
    "tenant_id",
    "parent_organization_id",
    "code",
    "name",
    "organization_kind",
    "tenant_boundary_kind",
    "data_boundary_kind",
    "app_boundary_enabled",
    "verification_status",
    "path",
    "status",
    "created_at",
    "updated_at"
  ]),
  model("organizationClosure", "tenant", ["organizationManagement"], [
    "id",
    "tenant_id",
    "ancestor_organization_id",
    "descendant_organization_id",
    "depth",
    "created_at"
  ]),
  model("organizationMembership", "tenant", ["organizationManagement", "userDirectory"], [
    "id",
    "tenant_id",
    "organization_id",
    "user_id",
    "membership_kind",
    "employee_no",
    "display_name",
    "status",
    "joined_at",
    "left_at",
    "remark"
  ]),
  model("department", "tenant", ["departmentManagement", "organizationManagement"], [
    "id",
    "tenant_id",
    "organization_id",
    "parent_department_id",
    "code",
    "name",
    "path",
    "status",
    "created_at",
    "updated_at"
  ]),
  model("departmentClosure", "tenant", ["departmentManagement", "organizationManagement"], [
    "id",
    "tenant_id",
    "organization_id",
    "ancestor_department_id",
    "descendant_department_id",
    "depth",
    "created_at"
  ]),
  model("departmentAssignment", "tenant", ["departmentManagement", "userDirectory"], [
    "id",
    "tenant_id",
    "organization_id",
    "organization_membership_id",
    "department_id",
    "user_id",
    "assignment_kind",
    "is_primary",
    "effective_from",
    "effective_to",
    "status",
    "created_at",
    "updated_at"
  ]),
  model("position", "tenant", ["positionManagement", "departmentManagement"], [
    "id",
    "tenant_id",
    "organization_id",
    "department_id",
    "code",
    "name",
    "position_kind",
    "rank_level",
    "status",
    "created_at",
    "updated_at"
  ]),
  model("positionAssignment", "tenant", ["positionManagement", "departmentManagement", "userDirectory"], [
    "id",
    "tenant_id",
    "organization_id",
    "department_assignment_id",
    "position_id",
    "user_id",
    "is_primary",
    "effective_from",
    "effective_to",
    "status",
    "created_at",
    "updated_at"
  ]),
  model("roleBinding", "tenant", ["accessControl", "organizationManagement", "departmentManagement"], [
    "id",
    "tenant_id",
    "organization_id",
    "role_id",
    "principal_kind",
    "principal_id",
    "scope_kind",
    "scope_id",
    "effect",
    "condition_json",
    "status",
    "created_at",
    "updated_at"
  ]),
  model("user", "tenant", ["userDirectory", "accountIdentity"], [
    "id",
    "tenant_id",
    "username",
    "display_name",
    "email",
    "phone",
    "avatar_media_resource_id",
    "avatar_object_blob_id",
    "avatar_resource_snapshot",
    "status",
    "created_at",
    "updated_at"
  ]),
  model("userIdentity", "tenant", ["accountIdentity"], [
    "id",
    "tenant_id",
    "user_id",
    "provider",
    "subject",
    "email",
    "created_at"
  ]),
  model("credential", "tenant", ["accountIdentity", "sessionSecurity"], [
    "id",
    "tenant_id",
    "user_id",
    "credential_type",
    "credential_hash",
    "status",
    "expires_at",
    "created_at",
    "updated_at"
  ]),
  model("session", "tenant", ["sessionSecurity"], [
    "id",
    "tenant_id",
    "organization_id",
    "user_id",
    "app_id",
    "environment",
    "deployment_mode",
    "auth_level",
    "auth_token_hash",
    "access_token_hash",
    "refresh_token_hash",
    "sharding_key",
    "sharding_strategy",
    "data_scope_json",
    "permission_scope_json",
    "expires_at",
    "revoked_at",
    "created_at",
    "updated_at"
  ]),
  model("mfaFactor", "tenant", ["sessionSecurity"], [
    "id",
    "tenant_id",
    "user_id",
    "factor_type",
    "secret_ref",
    "status",
    "created_at",
    "updated_at"
  ]),
  model("device", "tenant", ["sessionSecurity"], [
    "id",
    "tenant_id",
    "user_id",
    "device_fingerprint",
    "name",
    "trusted",
    "last_seen_at",
    "created_at"
  ]),
  model("role", "tenant", ["accessControl"], [
    "id",
    "tenant_id",
    "code",
    "name",
    "status",
    "created_at",
    "updated_at"
  ]),
  model("permission", "global", ["accessControl"], [
    "id",
    "code",
    "name",
    "resource",
    "action",
    "created_at"
  ]),
  model("policy", "tenant", ["accessControl"], [
    "id",
    "tenant_id",
    "code",
    "name",
    "policy_json",
    "status",
    "created_at",
    "updated_at"
  ]),
  model("rolePermission", "tenant", ["accessControl"], [
    "id",
    "tenant_id",
    "role_id",
    "permission_id",
    "created_at"
  ]),
  model("apiKey", "tenant", ["apiAccess"], [
    "id",
    "tenant_id",
    "organization_id",
    "user_id",
    "name",
    "key_hash",
    "permission_scope_json",
    "status",
    "expires_at",
    "created_at",
    "updated_at"
  ]),
  model("securityEvent", "tenant", ["securityAudit"], [
    "id",
    "tenant_id",
    "organization_id",
    "user_id",
    "session_id",
    "event_type",
    "severity",
    "detail_json",
    "created_at"
  ]),
  model("auditEvent", "tenant", ["securityAudit"], [
    "id",
    "tenant_id",
    "organization_id",
    "actor_user_id",
    "action",
    "resource_type",
    "resource_id",
    "request_id",
    "app_id",
    "environment",
    "sharding_key",
    "detail_json",
    "created_at"
  ])
];
var app = SDKWORK_IAM_STANDARD.api.appPrefix;
var backend = SDKWORK_IAM_STANDARD.api.backendPrefix;
var SDKWORK_IAM_API_ROUTES = {
  auth: {
    passwordResetRequests: {
      create: operation("POST", `${app}/auth/password_reset_requests`, "auth", "passwordResetRequests.create", "public", {
        forbidCredentialHeaders: true
      })
    },
    passwordResets: {
      create: operation("POST", `${app}/auth/password_resets`, "auth", "passwordResets.create", "public", {
        forbidCredentialHeaders: true
      })
    },
    verificationCodeRequests: {
      create: operation("POST", `${app}/auth/verification_code_requests`, "auth", "verificationCodeRequests.create", "public", {
        forbidCredentialHeaders: true
      })
    },
    registrations: {
      create: operation("POST", `${app}/auth/registrations`, "auth", "registrations.create", "public", {
        forbidCredentialHeaders: true
      })
    },
    sessions: {
      create: operation("POST", `${app}/auth/sessions`, "auth", "sessions.create", "public", {
        forbidCredentialHeaders: true
      }),
      organizationSelection: {
        create: operation(
          "POST",
          `${app}/auth/sessions/organization_selection`,
          "auth",
          "sessions.organizationSelection.create",
          "public",
          { forbidCredentialHeaders: true }
        )
      },
      loginContextSelection: {
        create: operation(
          "POST",
          `${app}/auth/sessions/login_context_selection`,
          "auth",
          "sessions.loginContextSelection.create",
          "public",
          { forbidCredentialHeaders: true }
        )
      },
      current: {
        delete: operation("DELETE", `${app}/auth/sessions/current`, "auth", "sessions.current.delete", "dualToken"),
        retrieve: operation("GET", `${app}/auth/sessions/current`, "auth", "sessions.current.retrieve", "dualToken"),
        update: operation("PATCH", `${app}/auth/sessions/current`, "auth", "sessions.current.update", "dualToken")
      },
      refresh: operation("POST", `${app}/auth/sessions/refresh`, "auth", "sessions.refresh", "refreshToken")
    }
  },
  oauth: {
    providers: {
      list: operation("GET", `${app}/oauth/providers`, "oauth", "oauth.providers.list", "public")
    },
    authorizationUrls: {
      create: operation("POST", `${app}/oauth/authorization_urls`, "oauth", "oauth.authorizationUrls.create", "public", {
        forbidCredentialHeaders: true
      })
    },
    authorizations: {
      completions: {
        create: operation(
          "POST",
          `${app}/oauth/authorizations/{authorizationStateId}/completions`,
          "oauth",
          "oauth.authorizations.completions.create",
          "dualToken"
        )
      }
    },
    deviceAuthorizations: {
      create: operation(
        "POST",
        `${app}/oauth/device_authorizations`,
        "oauth",
        "oauth.deviceAuthorizations.create",
        "public",
        { forbidCredentialHeaders: true }
      ),
      retrieve: operation(
        "GET",
        `${app}/oauth/device_authorizations/{deviceAuthorizationId}`,
        "oauth",
        "oauth.deviceAuthorizations.retrieve",
        "public"
      ),
      scans: {
        create: operation(
          "POST",
          `${app}/oauth/device_authorizations/{deviceAuthorizationId}/scans`,
          "oauth",
          "oauth.deviceAuthorizations.scans.create",
          "public"
        )
      },
      passwordCompletions: {
        create: operation(
          "POST",
          `${app}/oauth/device_authorizations/{deviceAuthorizationId}/password_completions`,
          "oauth",
          "oauth.deviceAuthorizations.passwordCompletions.create",
          "public",
          { forbidCredentialHeaders: true }
        )
      },
      sessionExchanges: {
        create: operation(
          "POST",
          `${app}/oauth/device_authorizations/{deviceAuthorizationId}/session_exchanges`,
          "oauth",
          "oauth.deviceAuthorizations.sessionExchanges.create",
          "public"
        )
      },
      sessionCompletions: {
        create: operation(
          "POST",
          `${app}/oauth/device_authorizations/{deviceAuthorizationId}/session_completions`,
          "oauth",
          "oauth.deviceAuthorizations.sessionCompletions.create",
          "public",
          { forbidCredentialHeaders: true }
        )
      }
    },
    callbacks: {
      retrieve: operation("GET", `${app}/oauth/callbacks/{providerCode}`, "oauth", "oauth.callbacks.retrieve", "public", {
        forbidCredentialHeaders: true
      }),
      create: operation("POST", `${app}/oauth/callbacks/{providerCode}`, "oauth", "oauth.callbacks.create", "public", {
        forbidCredentialHeaders: true
      })
    },
    miniProgramSessions: {
      create: operation("POST", `${app}/oauth/mini_program_sessions`, "oauth", "oauth.miniProgramSessions.create", "public", {
        forbidCredentialHeaders: true
      })
    },
    sessions: {
      create: operation("POST", `${app}/oauth/sessions`, "oauth", "oauth.sessions.create", "public", {
        forbidCredentialHeaders: true
      })
    },
    scanLoginModes: {
      list: operation("GET", `${app}/oauth/scan_login_modes`, "oauth", "oauth.scanLoginModes.list", "public", {
        forbidCredentialHeaders: true
      })
    },
    accountLinks: {
      list: operation("GET", `${app}/oauth/account_links`, "oauth", "oauth.accountLinks.list", "dualToken"),
      delete: operation("DELETE", `${app}/oauth/account_links/{accountLinkId}`, "oauth", "oauth.accountLinks.delete", "dualToken")
    },
    grants: {
      list: operation("GET", `${app}/oauth/grants`, "oauth", "oauth.grants.list", "dualToken"),
      delete: operation("DELETE", `${app}/oauth/grants/{grantId}`, "oauth", "oauth.grants.delete", "dualToken")
    }
  },
  system: {
    iam: {
      runtime: {
        retrieve: operation("GET", `${app}/system/iam/runtime`, "system", "iam.runtime.retrieve", "public")
      },
      verificationPolicy: {
        retrieve: operation("GET", `${app}/system/iam/verification_policy`, "system", "iam.verificationPolicy.retrieve", "public")
      },
      accountBindingPolicy: {
        retrieve: operation("GET", `${app}/system/iam/account_binding_policy`, "system", "iam.accountBindingPolicy.retrieve", "public")
      }
    }
  },
  iam: {
    apiKeys: {
      list: operation("GET", `${backend}/iam/api_keys`, "iam", "apiKeys.list", "dualToken"),
      revoke: operation("POST", `${backend}/iam/api_keys/{apiKeyId}/revoke`, "iam", "apiKeys.revoke", "dualToken")
    },
    accessCredentials: {
      create: operation("POST", `${backend}/iam/access_credentials`, "iam", "accessCredentials.create", "public")
    },
    applications: {
      register: operation("POST", `${backend}/iam/applications/register`, "iam", "applications.register", "public")
    },
    tenantApplications: {
      list: operation("GET", `${backend}/iam/tenants/{tenantId}/applications`, "iam", "tenantApplications.list", "dualToken"),
      create: operation("POST", `${backend}/iam/tenant_applications`, "iam", "tenantApplications.create", "public"),
      retrieve: operation("GET", `${backend}/iam/tenant_applications/{tenantApplicationId}`, "iam", "tenantApplications.retrieve", "dualToken"),
      enable: operation("POST", `${backend}/iam/tenant_applications/{tenantApplicationId}/enable`, "iam", "tenantApplications.enable", "public"),
      update: operation("PATCH", `${backend}/iam/tenant_applications/{tenantApplicationId}`, "iam", "tenantApplications.update", "public"),
      management: {
        create: operation("POST", `${backend}/iam/tenants/{tenantId}/applications`, "iam", "tenantApplications.management.create", "dualToken"),
        update: operation("PATCH", `${backend}/iam/tenants/{tenantId}/applications/{tenantApplicationId}`, "iam", "tenantApplications.management.update", "dualToken"),
        enable: operation("POST", `${backend}/iam/tenants/{tenantId}/applications/{tenantApplicationId}/enable`, "iam", "tenantApplications.management.enable", "dualToken"),
        disable: operation("POST", `${backend}/iam/tenants/{tenantId}/applications/{tenantApplicationId}/disable`, "iam", "tenantApplications.management.disable", "dualToken")
      },
      summary: {
        retrieve: operation("GET", `${backend}/iam/tenants/{tenantId}/applications/summary`, "iam", "tenantApplications.summary.retrieve", "dualToken")
      }
    },
    auditEvents: {
      list: operation("GET", `${backend}/iam/audit_events`, "iam", "auditEvents.list", "dualToken"),
      retrieve: operation("GET", `${backend}/iam/audit_events/{auditEventId}`, "iam", "auditEvents.retrieve", "dualToken")
    },
    organizations: {
      create: operation("POST", `${backend}/iam/organizations`, "iam", "organizations.create", "dualToken"),
      delete: operation("DELETE", `${backend}/iam/organizations/{organizationId}`, "iam", "organizations.delete", "dualToken"),
      list: operation("GET", `${app}/iam/organizations`, "iam", "organizations.list", "dualToken"),
      retrieve: operation("GET", `${backend}/iam/organizations/{organizationId}`, "iam", "organizations.retrieve", "dualToken"),
      tree: {
        retrieve: operation("GET", `${app}/iam/organizations/tree`, "iam", "organizations.tree.retrieve", "dualToken")
      },
      update: operation("PATCH", `${backend}/iam/organizations/{organizationId}`, "iam", "organizations.update", "dualToken")
    },
    organizationMemberships: {
      create: operation("POST", `${backend}/iam/organization_memberships`, "iam", "organizationMemberships.create", "dualToken"),
      list: operation("GET", `${app}/iam/organization_memberships`, "iam", "organizationMemberships.list", "dualToken"),
      update: operation("PATCH", `${backend}/iam/organization_memberships/{membershipId}`, "iam", "organizationMemberships.update", "dualToken")
    },
    departments: {
      create: operation("POST", `${backend}/iam/departments`, "iam", "departments.create", "dualToken"),
      delete: operation("DELETE", `${backend}/iam/departments/{departmentId}`, "iam", "departments.delete", "dualToken"),
      list: operation("GET", `${app}/iam/departments`, "iam", "departments.list", "dualToken"),
      retrieve: operation("GET", `${backend}/iam/departments/{departmentId}`, "iam", "departments.retrieve", "dualToken"),
      tree: {
        retrieve: operation("GET", `${app}/iam/departments/tree`, "iam", "departments.tree.retrieve", "dualToken")
      },
      update: operation("PATCH", `${backend}/iam/departments/{departmentId}`, "iam", "departments.update", "dualToken")
    },
    departmentAssignments: {
      create: operation("POST", `${backend}/iam/department_assignments`, "iam", "departmentAssignments.create", "dualToken"),
      list: operation("GET", `${app}/iam/department_assignments`, "iam", "departmentAssignments.list", "dualToken"),
      update: operation("PATCH", `${backend}/iam/department_assignments/{assignmentId}`, "iam", "departmentAssignments.update", "dualToken")
    },
    permissions: {
      create: operation("POST", `${backend}/iam/permissions`, "iam", "permissions.create", "dualToken"),
      delete: operation("DELETE", `${backend}/iam/permissions/{permissionId}`, "iam", "permissions.delete", "dualToken"),
      list: operation("GET", `${backend}/iam/permissions`, "iam", "permissions.list", "dualToken"),
      retrieve: operation("GET", `${backend}/iam/permissions/{permissionId}`, "iam", "permissions.retrieve", "dualToken"),
      update: operation("PATCH", `${backend}/iam/permissions/{permissionId}`, "iam", "permissions.update", "dualToken")
    },
    positions: {
      create: operation("POST", `${backend}/iam/positions`, "iam", "positions.create", "dualToken"),
      delete: operation("DELETE", `${backend}/iam/positions/{positionId}`, "iam", "positions.delete", "dualToken"),
      list: operation("GET", `${app}/iam/positions`, "iam", "positions.list", "dualToken"),
      update: operation("PATCH", `${backend}/iam/positions/{positionId}`, "iam", "positions.update", "dualToken")
    },
    positionAssignments: {
      create: operation("POST", `${backend}/iam/position_assignments`, "iam", "positionAssignments.create", "dualToken"),
      list: operation("GET", `${app}/iam/position_assignments`, "iam", "positionAssignments.list", "dualToken"),
      update: operation("PATCH", `${backend}/iam/position_assignments/{assignmentId}`, "iam", "positionAssignments.update", "dualToken")
    },
    policies: {
      create: operation("POST", `${backend}/iam/policies`, "iam", "policies.create", "dualToken"),
      delete: operation("DELETE", `${backend}/iam/policies/{policyId}`, "iam", "policies.delete", "dualToken"),
      list: operation("GET", `${backend}/iam/policies`, "iam", "policies.list", "dualToken"),
      retrieve: operation("GET", `${backend}/iam/policies/{policyId}`, "iam", "policies.retrieve", "dualToken"),
      update: operation("PATCH", `${backend}/iam/policies/{policyId}`, "iam", "policies.update", "dualToken")
    },
    providerAccounts: {
      create: operation("POST", `${backend}/iam/provider_accounts`, "iam", "providerAccounts.create", "dualToken"),
      delete: operation("DELETE", `${backend}/iam/provider_accounts/{providerAccountId}`, "iam", "providerAccounts.delete", "dualToken"),
      list: operation("GET", `${backend}/iam/provider_accounts`, "iam", "providerAccounts.list", "dualToken"),
      resolve: operation("GET", `${backend}/iam/provider_accounts/resolve`, "iam", "providerAccounts.resolve", "dualToken"),
      retrieve: operation("GET", `${backend}/iam/provider_accounts/{providerAccountId}`, "iam", "providerAccounts.retrieve", "dualToken"),
      setDefault: operation("POST", `${backend}/iam/provider_accounts/{providerAccountId}/default`, "iam", "providerAccounts.setDefault", "dualToken"),
      update: operation("PATCH", `${backend}/iam/provider_accounts/{providerAccountId}`, "iam", "providerAccounts.update", "dualToken"),
      credentials: {
        create: operation("POST", `${backend}/iam/provider_accounts/{providerAccountId}/credentials`, "iam", "providerAccounts.credentials.create", "dualToken"),
        list: operation("GET", `${backend}/iam/provider_accounts/{providerAccountId}/credentials`, "iam", "providerAccounts.credentials.list", "dualToken")
      }
    },
    providerCredentials: {
      revoke: operation("POST", `${backend}/iam/provider_credentials/{credentialId}/revoke`, "iam", "providerCredentials.revoke", "dualToken")
    },
    accountBindingPolicy: {
      retrieve: operation("GET", `${backend}/iam/account_binding_policy`, "iam", "accountBindingPolicy.retrieve", "dualToken"),
      update: operation("PATCH", `${backend}/iam/account_binding_policy`, "iam", "accountBindingPolicy.update", "dualToken")
    },
    roles: {
      create: operation("POST", `${backend}/iam/roles`, "iam", "roles.create", "dualToken"),
      delete: operation("DELETE", `${backend}/iam/roles/{roleId}`, "iam", "roles.delete", "dualToken"),
      list: operation("GET", `${backend}/iam/roles`, "iam", "roles.list", "dualToken"),
      retrieve: operation("GET", `${backend}/iam/roles/{roleId}`, "iam", "roles.retrieve", "dualToken"),
      update: operation("PATCH", `${backend}/iam/roles/{roleId}`, "iam", "roles.update", "dualToken"),
      permissions: {
        create: operation("POST", `${backend}/iam/roles/{roleId}/permissions`, "iam", "roles.permissions.create", "dualToken"),
        delete: operation("DELETE", `${backend}/iam/roles/{roleId}/permissions/{permissionId}`, "iam", "roles.permissions.delete", "dualToken"),
        list: operation("GET", `${backend}/iam/roles/{roleId}/permissions`, "iam", "roles.permissions.list", "dualToken")
      }
    },
    roleBindings: {
      create: operation("POST", `${backend}/iam/role_bindings`, "iam", "roleBindings.create", "dualToken"),
      delete: operation("DELETE", `${backend}/iam/role_bindings/{roleBindingId}`, "iam", "roleBindings.delete", "dualToken"),
      list: operation("GET", `${app}/iam/role_bindings`, "iam", "roleBindings.list", "dualToken")
    },
    securityEvents: {
      list: operation("GET", `${backend}/iam/security_events`, "iam", "securityEvents.list", "dualToken"),
      retrieve: operation("GET", `${backend}/iam/security_events/{securityEventId}`, "iam", "securityEvents.retrieve", "dualToken")
    },
    tenants: {
      create: operation("POST", `${backend}/iam/tenants`, "iam", "tenants.create", "dualToken"),
      delete: operation("DELETE", `${backend}/iam/tenants/{tenantId}`, "iam", "tenants.delete", "dualToken"),
      list: operation("GET", `${backend}/iam/tenants`, "iam", "tenants.list", "dualToken"),
      retrieve: operation("GET", `${backend}/iam/tenants/{tenantId}`, "iam", "tenants.retrieve", "dualToken"),
      update: operation("PATCH", `${backend}/iam/tenants/{tenantId}`, "iam", "tenants.update", "dualToken"),
      members: {
        create: operation("POST", `${backend}/iam/tenants/{tenantId}/members`, "iam", "tenants.members.create", "dualToken"),
        delete: operation("DELETE", `${backend}/iam/tenants/{tenantId}/members/{userId}`, "iam", "tenants.members.delete", "dualToken"),
        list: operation("GET", `${backend}/iam/tenants/{tenantId}/members`, "iam", "tenants.members.list", "dualToken"),
        update: operation("PATCH", `${backend}/iam/tenants/{tenantId}/members/{userId}`, "iam", "tenants.members.update", "dualToken")
      }
    },
    oauth: {
      accountLinks: {
        list: operation("GET", `${backend}/iam/oauth/account_links`, "iam", "iam.oauth.accountLinks.list", "dualToken"),
        update: operation("PATCH", `${backend}/iam/oauth/account_links/{accountLinkId}`, "iam", "iam.oauth.accountLinks.update", "dualToken")
      },
      callbackEvents: {
        list: operation("GET", `${backend}/iam/oauth/callback_events`, "iam", "iam.oauth.callbackEvents.list", "dualToken")
      },
      claimMappings: {
        create: operation("POST", `${backend}/iam/oauth/claim_mappings`, "iam", "iam.oauth.claimMappings.create", "dualToken"),
        list: operation("GET", `${backend}/iam/oauth/claim_mappings`, "iam", "iam.oauth.claimMappings.list", "dualToken"),
        update: operation("PATCH", `${backend}/iam/oauth/claim_mappings/{mappingId}`, "iam", "iam.oauth.claimMappings.update", "dualToken")
      },
      clients: {
        create: operation("POST", `${backend}/iam/oauth/clients`, "iam", "iam.oauth.clients.create", "dualToken"),
        delete: operation("DELETE", `${backend}/iam/oauth/clients/{oauthClientId}`, "iam", "iam.oauth.clients.delete", "dualToken"),
        list: operation("GET", `${backend}/iam/oauth/clients`, "iam", "iam.oauth.clients.list", "dualToken"),
        retrieve: operation("GET", `${backend}/iam/oauth/clients/{oauthClientId}`, "iam", "iam.oauth.clients.retrieve", "dualToken"),
        update: operation("PATCH", `${backend}/iam/oauth/clients/{oauthClientId}`, "iam", "iam.oauth.clients.update", "dualToken")
      },
      diagnosticRuns: {
        create: operation("POST", `${backend}/iam/oauth/diagnostic_runs`, "iam", "iam.oauth.diagnosticRuns.create", "dualToken"),
        list: operation("GET", `${backend}/iam/oauth/diagnostic_runs`, "iam", "iam.oauth.diagnosticRuns.list", "dualToken"),
        retrieve: operation("GET", `${backend}/iam/oauth/diagnostic_runs/{diagnosticRunId}`, "iam", "iam.oauth.diagnosticRuns.retrieve", "dualToken")
      },
      flowConfigs: {
        create: operation("POST", `${backend}/iam/oauth/flow_configs`, "iam", "iam.oauth.flowConfigs.create", "dualToken"),
        list: operation("GET", `${backend}/iam/oauth/flow_configs`, "iam", "iam.oauth.flowConfigs.list", "dualToken"),
        update: operation("PATCH", `${backend}/iam/oauth/flow_configs/{flowConfigId}`, "iam", "iam.oauth.flowConfigs.update", "dualToken")
      },
      grants: {
        delete: operation("DELETE", `${backend}/iam/oauth/grants/{grantId}`, "iam", "iam.oauth.grants.delete", "dualToken"),
        list: operation("GET", `${backend}/iam/oauth/grants`, "iam", "iam.oauth.grants.list", "dualToken")
      },
      integrations: {
        create: operation("POST", `${backend}/iam/oauth/integrations`, "iam", "iam.oauth.integrations.create", "dualToken"),
        delete: operation("DELETE", `${backend}/iam/oauth/integrations/{integrationId}`, "iam", "iam.oauth.integrations.delete", "dualToken"),
        list: operation("GET", `${backend}/iam/oauth/integrations`, "iam", "iam.oauth.integrations.list", "dualToken"),
        retrieve: operation("GET", `${backend}/iam/oauth/integrations/{integrationId}`, "iam", "iam.oauth.integrations.retrieve", "dualToken"),
        update: operation("PATCH", `${backend}/iam/oauth/integrations/{integrationId}`, "iam", "iam.oauth.integrations.update", "dualToken")
      },
      operationalResources: {
        create: operation("POST", `${backend}/iam/oauth/operational_resources`, "iam", "iam.oauth.operationalResources.create", "dualToken"),
        delete: operation("DELETE", `${backend}/iam/oauth/operational_resources/{resourceId}`, "iam", "iam.oauth.operationalResources.delete", "dualToken"),
        list: operation("GET", `${backend}/iam/oauth/operational_resources`, "iam", "iam.oauth.operationalResources.list", "dualToken"),
        publishes: {
          create: operation("POST", `${backend}/iam/oauth/operational_resources/{resourceId}/publishes`, "iam", "iam.oauth.operationalResources.publishes.create", "dualToken")
        },
        update: operation("PATCH", `${backend}/iam/oauth/operational_resources/{resourceId}`, "iam", "iam.oauth.operationalResources.update", "dualToken")
      },
      operatorPlatforms: {
        create: operation("POST", `${backend}/iam/oauth/operator_platforms`, "iam", "iam.oauth.operatorPlatforms.create", "dualToken"),
        list: operation("GET", `${backend}/iam/oauth/operator_platforms`, "iam", "iam.oauth.operatorPlatforms.list", "dualToken"),
        preAuthorizations: {
          create: operation("POST", `${backend}/iam/oauth/operator_platforms/{operatorPlatformId}/pre_authorizations`, "iam", "iam.oauth.operatorPlatforms.preAuthorizations.create", "dualToken")
        },
        update: operation("PATCH", `${backend}/iam/oauth/operator_platforms/{operatorPlatformId}`, "iam", "iam.oauth.operatorPlatforms.update", "dualToken")
      },
      policies: {
        create: operation("POST", `${backend}/iam/oauth/policies`, "iam", "iam.oauth.policies.create", "dualToken"),
        list: operation("GET", `${backend}/iam/oauth/policies`, "iam", "iam.oauth.policies.list", "dualToken"),
        update: operation("PATCH", `${backend}/iam/oauth/policies/{policyId}`, "iam", "iam.oauth.policies.update", "dualToken")
      },
      providerCatalog: {
        create: operation("POST", `${backend}/iam/oauth/provider_catalog`, "iam", "iam.oauth.providerCatalog.create", "dualToken"),
        list: operation("GET", `${backend}/iam/oauth/provider_catalog`, "iam", "iam.oauth.providerCatalog.list", "dualToken"),
        retrieve: operation("GET", `${backend}/iam/oauth/provider_catalog/{providerCatalogId}`, "iam", "iam.oauth.providerCatalog.retrieve", "dualToken"),
        update: operation("PATCH", `${backend}/iam/oauth/provider_catalog/{providerCatalogId}`, "iam", "iam.oauth.providerCatalog.update", "dualToken")
      },
      resourceAccounts: {
        authorizationRefreshes: {
          create: operation("POST", `${backend}/iam/oauth/resource_accounts/{resourceAccountId}/authorization_refreshes`, "iam", "iam.oauth.resourceAccounts.authorizationRefreshes.create", "dualToken")
        },
        create: operation("POST", `${backend}/iam/oauth/resource_accounts`, "iam", "iam.oauth.resourceAccounts.create", "dualToken"),
        customMenus: {
          retrieve: operation("GET", `${backend}/iam/oauth/resource_accounts/{resourceAccountId}/custom_menus`, "iam", "iam.oauth.resourceAccounts.customMenus.retrieve", "dualToken"),
          update: operation("PATCH", `${backend}/iam/oauth/resource_accounts/{resourceAccountId}/custom_menus`, "iam", "iam.oauth.resourceAccounts.customMenus.update", "dualToken"),
          publish: operation("POST", `${backend}/iam/oauth/resource_accounts/{resourceAccountId}/custom_menus/publish`, "iam", "iam.oauth.resourceAccounts.customMenus.publish", "dualToken")
        },
        delete: operation("DELETE", `${backend}/iam/oauth/resource_accounts/{resourceAccountId}`, "iam", "iam.oauth.resourceAccounts.delete", "dualToken"),
        followQrCodes: {
          create: operation("POST", `${backend}/iam/oauth/resource_accounts/{resourceAccountId}/follow_qr_codes`, "iam", "iam.oauth.resourceAccounts.followQrCodes.create", "dualToken")
        },
        list: operation("GET", `${backend}/iam/oauth/resource_accounts`, "iam", "iam.oauth.resourceAccounts.list", "dualToken"),
        miniProgramLoginChecks: {
          create: operation("POST", `${backend}/iam/oauth/resource_accounts/{resourceAccountId}/mini_program_login_checks`, "iam", "iam.oauth.resourceAccounts.miniProgramLoginChecks.create", "dualToken")
        },
        update: operation("PATCH", `${backend}/iam/oauth/resource_accounts/{resourceAccountId}`, "iam", "iam.oauth.resourceAccounts.update", "dualToken"),
        verifications: {
          create: operation("POST", `${backend}/iam/oauth/resource_accounts/{resourceAccountId}/verifications`, "iam", "iam.oauth.resourceAccounts.verifications.create", "dualToken")
        }
      },
      scanLoginPreviews: {
        create: operation("POST", `${backend}/iam/oauth/scan_login_previews`, "iam", "iam.oauth.scanLoginPreviews.create", "dualToken")
      },
      scanLoginSettings: {
        retrieve: operation("GET", `${backend}/iam/oauth/scan_login_settings`, "iam", "iam.oauth.scanLoginSettings.retrieve", "dualToken"),
        update: operation("PATCH", `${backend}/iam/oauth/scan_login_settings`, "iam", "iam.oauth.scanLoginSettings.update", "dualToken")
      },
      resourceAuthorizations: {
        create: operation("POST", `${backend}/iam/oauth/resource_authorizations`, "iam", "iam.oauth.resourceAuthorizations.create", "dualToken"),
        list: operation("GET", `${backend}/iam/oauth/resource_authorizations`, "iam", "iam.oauth.resourceAuthorizations.list", "dualToken"),
        update: operation("PATCH", `${backend}/iam/oauth/resource_authorizations/{authorizationId}`, "iam", "iam.oauth.resourceAuthorizations.update", "dualToken")
      },
      scopeProfiles: {
        create: operation("POST", `${backend}/iam/oauth/scope_profiles`, "iam", "iam.oauth.scopeProfiles.create", "dualToken"),
        list: operation("GET", `${backend}/iam/oauth/scope_profiles`, "iam", "iam.oauth.scopeProfiles.list", "dualToken"),
        update: operation("PATCH", `${backend}/iam/oauth/scope_profiles/{scopeProfileId}`, "iam", "iam.oauth.scopeProfiles.update", "dualToken")
      },
      secrets: {
        create: operation("POST", `${backend}/iam/oauth/secrets`, "iam", "iam.oauth.secrets.create", "dualToken"),
        delete: operation("DELETE", `${backend}/iam/oauth/secrets/{secretId}`, "iam", "iam.oauth.secrets.delete", "dualToken"),
        list: operation("GET", `${backend}/iam/oauth/secrets`, "iam", "iam.oauth.secrets.list", "dualToken")
      },
      surfaces: {
        create: operation("POST", `${backend}/iam/oauth/surfaces`, "iam", "iam.oauth.surfaces.create", "dualToken"),
        delete: operation("DELETE", `${backend}/iam/oauth/surfaces/{surfaceId}`, "iam", "iam.oauth.surfaces.delete", "dualToken"),
        list: operation("GET", `${backend}/iam/oauth/surfaces`, "iam", "iam.oauth.surfaces.list", "dualToken"),
        update: operation("PATCH", `${backend}/iam/oauth/surfaces/{surfaceId}`, "iam", "iam.oauth.surfaces.update", "dualToken")
      },
      tenantBindings: {
        create: operation("POST", `${backend}/iam/oauth/tenant_bindings`, "iam", "iam.oauth.tenantBindings.create", "dualToken"),
        list: operation("GET", `${backend}/iam/oauth/tenant_bindings`, "iam", "iam.oauth.tenantBindings.list", "dualToken"),
        update: operation("PATCH", `${backend}/iam/oauth/tenant_bindings/{bindingId}`, "iam", "iam.oauth.tenantBindings.update", "dualToken")
      },
      webhookConfigs: {
        create: operation("POST", `${backend}/iam/oauth/webhook_configs`, "iam", "iam.oauth.webhookConfigs.create", "dualToken"),
        delete: operation("DELETE", `${backend}/iam/oauth/webhook_configs/{webhookConfigId}`, "iam", "iam.oauth.webhookConfigs.delete", "dualToken"),
        list: operation("GET", `${backend}/iam/oauth/webhook_configs`, "iam", "iam.oauth.webhookConfigs.list", "dualToken"),
        update: operation("PATCH", `${backend}/iam/oauth/webhook_configs/{webhookConfigId}`, "iam", "iam.oauth.webhookConfigs.update", "dualToken"),
        verifications: {
          create: operation("POST", `${backend}/iam/oauth/webhook_configs/{webhookConfigId}/verifications`, "iam", "iam.oauth.webhookConfigs.verifications.create", "dualToken")
        }
      }
    },
    users: {
      current: {
        retrieve: operation("GET", `${app}/iam/users/current`, "iam", "users.current.retrieve", "dualToken"),
        update: operation("PATCH", `${app}/iam/users/current`, "iam", "users.current.update", "dualToken"),
        password: {
          update: operation("PATCH", `${app}/iam/users/current/password`, "iam", "users.current.password.update", "dualToken")
        },
        emailBindings: {
          create: operation("POST", `${app}/iam/users/current/email_bindings`, "iam", "users.current.emailBindings.create", "dualToken"),
          delete: operation("DELETE", `${app}/iam/users/current/email_bindings`, "iam", "users.current.emailBindings.delete", "dualToken")
        },
        phoneBindings: {
          create: operation("POST", `${app}/iam/users/current/phone_bindings`, "iam", "users.current.phoneBindings.create", "dualToken"),
          delete: operation("DELETE", `${app}/iam/users/current/phone_bindings`, "iam", "users.current.phoneBindings.delete", "dualToken")
        }
      },
      create: operation("POST", `${backend}/iam/users`, "iam", "users.create", "dualToken"),
      delete: operation("DELETE", `${backend}/iam/users/{userId}`, "iam", "users.delete", "dualToken"),
      list: operation("GET", `${backend}/iam/users`, "iam", "users.list", "dualToken"),
      retrieve: operation("GET", `${backend}/iam/users/{userId}`, "iam", "users.retrieve", "dualToken"),
      update: operation("PATCH", `${backend}/iam/users/{userId}`, "iam", "users.update", "dualToken"),
      ban: operation("POST", `${backend}/iam/users/{userId}/ban`, "iam", "users.ban", "dualToken"),
      unban: operation("POST", `${backend}/iam/users/{userId}/unban`, "iam", "users.unban", "dualToken")
    }
  }
};
var SDKWORK_IAM_OPERATION_IDS = flattenOperations(SDKWORK_IAM_API_ROUTES);
var SDKWORK_IAM_CAPABILITIES = [
  capability(
    "tenantManagement",
    ["iam"],
    ["tenant"],
    [
      "tenants.create",
      "tenants.delete",
      "tenants.list",
      "tenants.members.create",
      "tenants.members.delete",
      "tenants.members.list",
      "tenants.members.update",
      "tenants.retrieve",
      "tenants.update"
    ]
  ),
  capability(
    "organizationManagement",
    ["iam"],
    ["organization", "organizationClosure", "organizationMembership"],
    [
      "organizations.create",
      "organizations.delete",
      "organizations.list",
      "organizationMemberships.create",
      "organizationMemberships.list",
      "organizationMemberships.update",
      "organizations.retrieve",
      "organizations.tree.retrieve",
      "organizations.update"
    ]
  ),
  capability(
    "departmentManagement",
    ["iam"],
    ["department", "departmentClosure", "departmentAssignment"],
    [
      "departmentAssignments.create",
      "departmentAssignments.list",
      "departmentAssignments.update",
      "departments.create",
      "departments.delete",
      "departments.list",
      "departments.retrieve",
      "departments.tree.retrieve",
      "departments.update"
    ]
  ),
  capability(
    "positionManagement",
    ["iam"],
    ["position", "positionAssignment"],
    [
      "positionAssignments.create",
      "positionAssignments.list",
      "positionAssignments.update",
      "positions.create",
      "positions.delete",
      "positions.list",
      "positions.update"
    ]
  ),
  capability(
    "userDirectory",
    ["iam"],
    ["user", "organizationMembership", "departmentAssignment", "positionAssignment"],
    ["users.ban", "users.create", "users.delete", "users.list", "users.retrieve", "users.unban", "users.update"]
  ),
  capability(
    "accountIdentity",
    ["auth", "iam", "system"],
    ["user", "userIdentity", "credential"],
    [
      "iam.runtime.retrieve",
      "iam.verificationPolicy.retrieve",
      "iam.accountBindingPolicy.retrieve",
      "passwordResetRequests.create",
      "passwordResets.create",
      "registrations.create",
      "verificationCodeRequests.create",
      "users.current.emailBindings.create",
      "users.current.emailBindings.delete",
      "users.current.password.update",
      "users.current.phoneBindings.create",
      "users.current.phoneBindings.delete",
      "users.current.retrieve",
      "users.current.update"
    ]
  ),
  capability(
    "sessionSecurity",
    ["auth", "oauth"],
    ["session", "credential", "mfaFactor", "device"],
    [
      "oauth.accountLinks.delete",
      "oauth.accountLinks.list",
      "oauth.authorizationUrls.create",
      "oauth.authorizations.completions.create",
      "oauth.callbacks.retrieve",
      "oauth.callbacks.create",
      "oauth.deviceAuthorizations.create",
      "oauth.deviceAuthorizations.passwordCompletions.create",
      "oauth.deviceAuthorizations.retrieve",
      "oauth.deviceAuthorizations.scans.create",
      "oauth.deviceAuthorizations.sessionCompletions.create",
      "oauth.deviceAuthorizations.sessionExchanges.create",
      "oauth.grants.delete",
      "oauth.grants.list",
      "oauth.miniProgramSessions.create",
      "oauth.providers.list",
      "oauth.scanLoginModes.list",
      "oauth.sessions.create",
      "sessions.create",
      "sessions.loginContextSelection.create",
      "sessions.organizationSelection.create",
      "sessions.current.delete",
      "sessions.current.retrieve",
      "sessions.current.update",
      "sessions.refresh"
    ]
  ),
  capability(
    "accessControl",
    ["iam"],
    ["role", "roleBinding", "permission", "policy", "rolePermission"],
    [
      "permissions.create",
      "permissions.delete",
      "permissions.list",
      "permissions.retrieve",
      "permissions.update",
      "policies.create",
      "policies.delete",
      "policies.list",
      "policies.retrieve",
      "policies.update",
      "accountBindingPolicy.retrieve",
      "accountBindingPolicy.update",
      "roles.create",
      "roles.delete",
      "roles.list",
      "roles.retrieve",
      "roles.permissions.create",
      "roles.permissions.delete",
      "roles.permissions.list",
      "roles.update",
      "roleBindings.create",
      "roleBindings.delete",
      "roleBindings.list"
    ]
  ),
  capability(
    "apiAccess",
    ["iam"],
    ["apiKey"],
    ["apiKeys.list", "apiKeys.revoke", "accessCredentials.create", "applications.register", "tenantApplications.list", "tenantApplications.create", "tenantApplications.retrieve", "tenantApplications.update", "tenantApplications.enable", "tenantApplications.management.create", "tenantApplications.management.update", "tenantApplications.management.enable", "tenantApplications.management.disable", "tenantApplications.summary.retrieve"]
  ),
  capability(
    "securityAudit",
    ["iam"],
    ["securityEvent", "auditEvent"],
    ["securityEvents.list", "auditEvents.list", "securityEvents.retrieve", "auditEvents.retrieve"]
  ),
  capability(
    "oauthManagement",
    ["iam"],
    ["oauthIntegration", "oauthClient", "oauthSecret", "oauthSurface", "oauthWebhookConfig"],
    [
      "iam.oauth.accountLinks.list",
      "iam.oauth.accountLinks.update",
      "iam.oauth.callbackEvents.list",
      "iam.oauth.claimMappings.create",
      "iam.oauth.claimMappings.list",
      "iam.oauth.claimMappings.update",
      "iam.oauth.clients.create",
      "iam.oauth.clients.delete",
      "iam.oauth.clients.list",
      "iam.oauth.clients.retrieve",
      "iam.oauth.clients.update",
      "iam.oauth.diagnosticRuns.create",
      "iam.oauth.diagnosticRuns.list",
      "iam.oauth.diagnosticRuns.retrieve",
      "iam.oauth.flowConfigs.create",
      "iam.oauth.flowConfigs.list",
      "iam.oauth.flowConfigs.update",
      "iam.oauth.grants.delete",
      "iam.oauth.grants.list",
      "iam.oauth.integrations.create",
      "iam.oauth.integrations.delete",
      "iam.oauth.integrations.list",
      "iam.oauth.integrations.retrieve",
      "iam.oauth.integrations.update",
      "iam.oauth.operationalResources.create",
      "iam.oauth.operationalResources.delete",
      "iam.oauth.operationalResources.list",
      "iam.oauth.operationalResources.publishes.create",
      "iam.oauth.operationalResources.update",
      "iam.oauth.operatorPlatforms.create",
      "iam.oauth.operatorPlatforms.list",
      "iam.oauth.operatorPlatforms.preAuthorizations.create",
      "iam.oauth.operatorPlatforms.update",
      "iam.oauth.policies.create",
      "iam.oauth.policies.list",
      "iam.oauth.policies.update",
      "iam.oauth.providerCatalog.create",
      "iam.oauth.providerCatalog.list",
      "iam.oauth.providerCatalog.retrieve",
      "iam.oauth.providerCatalog.update",
      "iam.oauth.resourceAccounts.authorizationRefreshes.create",
      "iam.oauth.resourceAccounts.create",
      "iam.oauth.resourceAccounts.customMenus.publish",
      "iam.oauth.resourceAccounts.customMenus.retrieve",
      "iam.oauth.resourceAccounts.customMenus.update",
      "iam.oauth.resourceAccounts.delete",
      "iam.oauth.resourceAccounts.followQrCodes.create",
      "iam.oauth.resourceAccounts.list",
      "iam.oauth.resourceAccounts.miniProgramLoginChecks.create",
      "iam.oauth.resourceAccounts.update",
      "iam.oauth.resourceAccounts.verifications.create",
      "iam.oauth.resourceAuthorizations.create",
      "iam.oauth.resourceAuthorizations.list",
      "iam.oauth.resourceAuthorizations.update",
      "iam.oauth.scanLoginPreviews.create",
      "iam.oauth.scanLoginSettings.retrieve",
      "iam.oauth.scanLoginSettings.update",
      "iam.oauth.scopeProfiles.create",
      "iam.oauth.scopeProfiles.list",
      "iam.oauth.scopeProfiles.update",
      "iam.oauth.secrets.create",
      "iam.oauth.secrets.delete",
      "iam.oauth.secrets.list",
      "iam.oauth.surfaces.create",
      "iam.oauth.surfaces.delete",
      "iam.oauth.surfaces.list",
      "iam.oauth.surfaces.update",
      "iam.oauth.tenantBindings.create",
      "iam.oauth.tenantBindings.list",
      "iam.oauth.tenantBindings.update",
      "iam.oauth.webhookConfigs.create",
      "iam.oauth.webhookConfigs.delete",
      "iam.oauth.webhookConfigs.list",
      "iam.oauth.webhookConfigs.update",
      "iam.oauth.webhookConfigs.verifications.create",
      "providerAccounts.create",
      "providerAccounts.credentials.create",
      "providerAccounts.credentials.list",
      "providerAccounts.delete",
      "providerAccounts.list",
      "providerAccounts.resolve",
      "providerAccounts.retrieve",
      "providerAccounts.setDefault",
      "providerAccounts.update",
      "providerCredentials.revoke"
    ]
  )
];
function createIamAppContext(input) {
  const hasLoginOrganizationHint = input.loginScope !== void 0 || input.organizationId !== void 0;
  const organizationId = hasLoginOrganizationHint ? resolveSessionOrganizationId({
    loginScope: input.loginScope,
    organizationId: input.organizationId
  }) : void 0;
  return {
    appId: input.appId,
    authLevel: input.authLevel,
    dataScope: [...input.dataScope],
    deploymentMode: input.deploymentMode,
    environment: input.environment,
    permissionScope: [...input.permissionScope],
    sessionId: input.sessionId,
    tenantId: input.tenantId,
    userId: input.userId,
    ...organizationId !== void 0 ? { organizationId } : {},
    ...input.loginScope ? { loginScope: input.loginScope } : {},
    ...input.userSurface ? { userSurface: { ...input.userSurface } } : {},
    ...input.standardRoleCodes ? { standardRoleCodes: [...input.standardRoleCodes] } : {}
  };
}
function operation(method, path, tag, operationId, security, options = {}) {
  return {
    authMode: authModeForSecurity(security),
    forbidCredentialHeaders: options.forbidCredentialHeaders === true,
    method,
    operationId,
    path,
    security,
    tag
  };
}
function authModeForSecurity(security) {
  if (security === "public") {
    return "anonymous";
  }
  if (security === "refreshToken") {
    return "refresh-token";
  }
  return "dual-token";
}
function model(name, ownership, capabilities, fields) {
  return {
    capabilities,
    domain: "iam",
    fields,
    name,
    ownership,
    table: SDKWORK_IAM_TABLES[name]
  };
}
function capability(name, sdkNamespaces, models, operations) {
  return {
    domain: "iam",
    models,
    name,
    operations,
    sdkNamespaces
  };
}
function flattenOperations(value) {
  const result = {};
  function visit(node) {
    if (!node || typeof node !== "object") {
      return;
    }
    if ("operationId" in node && "path" in node) {
      const operation2 = node;
      result[operation2.operationId] = operation2;
      return;
    }
    for (const child of Object.values(node)) {
      visit(child);
    }
  }
  visit(value);
  return result;
}

// ../sdkwork-iam-common/packages/sdkwork-iam-service/src/iam-backend-oauth-service.ts
function iamOauthListQuery(params) {
  return resolveSdkWorkListQuery(params);
}
function createIamBackendOauthService(backendOauth) {
  return {
    accountLinks: {
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.accountLinks, "list", "iam.oauth.accountLinks.list", iamOauthListQuery(params)),
      update: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.accountLinks, "update", "iam.oauth.accountLinks.update", ...args)
    },
    callbackEvents: {
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.callbackEvents, "list", "iam.oauth.callbackEvents.list", iamOauthListQuery(params))
    },
    claimMappings: {
      create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.claimMappings, "create", "iam.oauth.claimMappings.create", ...args),
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.claimMappings, "list", "iam.oauth.claimMappings.list", iamOauthListQuery(params)),
      update: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.claimMappings, "update", "iam.oauth.claimMappings.update", ...args)
    },
    clients: {
      create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.clients, "create", "iam.oauth.clients.create", ...args),
      delete: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.clients, "delete", "iam.oauth.clients.delete", ...args),
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.clients, "list", "iam.oauth.clients.list", iamOauthListQuery(params)),
      retrieve: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.clients, "retrieve", "iam.oauth.clients.retrieve", ...args),
      update: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.clients, "update", "iam.oauth.clients.update", ...args)
    },
    diagnosticRuns: {
      create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.diagnosticRuns, "create", "iam.oauth.diagnosticRuns.create", ...args),
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.diagnosticRuns, "list", "iam.oauth.diagnosticRuns.list", iamOauthListQuery(params)),
      retrieve: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.diagnosticRuns, "retrieve", "iam.oauth.diagnosticRuns.retrieve", ...args)
    },
    flowConfigs: {
      create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.flowConfigs, "create", "iam.oauth.flowConfigs.create", ...args),
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.flowConfigs, "list", "iam.oauth.flowConfigs.list", iamOauthListQuery(params)),
      update: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.flowConfigs, "update", "iam.oauth.flowConfigs.update", ...args)
    },
    grants: {
      delete: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.grants, "delete", "iam.oauth.grants.delete", ...args),
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.grants, "list", "iam.oauth.grants.list", iamOauthListQuery(params))
    },
    integrations: {
      create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.integrations, "create", "iam.oauth.integrations.create", ...args),
      delete: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.integrations, "delete", "iam.oauth.integrations.delete", ...args),
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.integrations, "list", "iam.oauth.integrations.list", iamOauthListQuery(params)),
      retrieve: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.integrations, "retrieve", "iam.oauth.integrations.retrieve", ...args),
      update: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.integrations, "update", "iam.oauth.integrations.update", ...args)
    },
    operationalResources: {
      create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.operationalResources, "create", "iam.oauth.operationalResources.create", ...args),
      delete: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.operationalResources, "delete", "iam.oauth.operationalResources.delete", ...args),
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.operationalResources, "list", "iam.oauth.operationalResources.list", iamOauthListQuery(params)),
      publishes: {
        create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.operationalResources?.publishes, "create", "iam.oauth.operationalResources.publishes.create", ...args)
      },
      update: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.operationalResources, "update", "iam.oauth.operationalResources.update", ...args)
    },
    operatorPlatforms: {
      create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.operatorPlatforms, "create", "iam.oauth.operatorPlatforms.create", ...args),
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.operatorPlatforms, "list", "iam.oauth.operatorPlatforms.list", iamOauthListQuery(params)),
      preAuthorizations: {
        create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.operatorPlatforms?.preAuthorizations, "create", "iam.oauth.operatorPlatforms.preAuthorizations.create", ...args)
      },
      update: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.operatorPlatforms, "update", "iam.oauth.operatorPlatforms.update", ...args)
    },
    policies: {
      create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.policies, "create", "iam.oauth.policies.create", ...args),
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.policies, "list", "iam.oauth.policies.list", iamOauthListQuery(params)),
      update: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.policies, "update", "iam.oauth.policies.update", ...args)
    },
    providerCatalog: {
      create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.providerCatalog, "create", "iam.oauth.providerCatalog.create", ...args),
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.providerCatalog, "list", "iam.oauth.providerCatalog.list", iamOauthListQuery(params)),
      retrieve: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.providerCatalog, "retrieve", "iam.oauth.providerCatalog.retrieve", ...args),
      update: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.providerCatalog, "update", "iam.oauth.providerCatalog.update", ...args)
    },
    resourceAccounts: {
      authorizationRefreshes: {
        create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.resourceAccounts?.authorizationRefreshes, "create", "iam.oauth.resourceAccounts.authorizationRefreshes.create", ...args)
      },
      create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.resourceAccounts, "create", "iam.oauth.resourceAccounts.create", ...args),
      customMenus: {
        retrieve: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.resourceAccounts?.customMenus, "retrieve", "iam.oauth.resourceAccounts.customMenus.retrieve", ...args),
        update: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.resourceAccounts?.customMenus, "update", "iam.oauth.resourceAccounts.customMenus.update", ...args),
        publish: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.resourceAccounts?.customMenus, "publish", "iam.oauth.resourceAccounts.customMenus.publish", ...args)
      },
      delete: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.resourceAccounts, "delete", "iam.oauth.resourceAccounts.delete", ...args),
      followQrCodes: {
        create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.resourceAccounts?.followQrCodes, "create", "iam.oauth.resourceAccounts.followQrCodes.create", ...args)
      },
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.resourceAccounts, "list", "iam.oauth.resourceAccounts.list", iamOauthListQuery(params)),
      miniProgramLoginChecks: {
        create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.resourceAccounts?.miniProgramLoginChecks, "create", "iam.oauth.resourceAccounts.miniProgramLoginChecks.create", ...args)
      },
      update: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.resourceAccounts, "update", "iam.oauth.resourceAccounts.update", ...args),
      verifications: {
        create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.resourceAccounts?.verifications, "create", "iam.oauth.resourceAccounts.verifications.create", ...args)
      }
    },
    resourceAuthorizations: {
      create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.resourceAuthorizations, "create", "iam.oauth.resourceAuthorizations.create", ...args),
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.resourceAuthorizations, "list", "iam.oauth.resourceAuthorizations.list", iamOauthListQuery(params)),
      update: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.resourceAuthorizations, "update", "iam.oauth.resourceAuthorizations.update", ...args)
    },
    scopeProfiles: {
      create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.scopeProfiles, "create", "iam.oauth.scopeProfiles.create", ...args),
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.scopeProfiles, "list", "iam.oauth.scopeProfiles.list", iamOauthListQuery(params)),
      update: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.scopeProfiles, "update", "iam.oauth.scopeProfiles.update", ...args)
    },
    scanLoginPreviews: {
      create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.scanLoginPreviews, "create", "iam.oauth.scanLoginPreviews.create", ...args)
    },
    scanLoginSettings: {
      retrieve: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.scanLoginSettings, "retrieve", "iam.oauth.scanLoginSettings.retrieve", ...args),
      update: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.scanLoginSettings, "update", "iam.oauth.scanLoginSettings.update", ...args)
    },
    secrets: {
      create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.secrets, "create", "iam.oauth.secrets.create", ...args),
      delete: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.secrets, "delete", "iam.oauth.secrets.delete", ...args),
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.secrets, "list", "iam.oauth.secrets.list", iamOauthListQuery(params))
    },
    surfaces: {
      create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.surfaces, "create", "iam.oauth.surfaces.create", ...args),
      delete: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.surfaces, "delete", "iam.oauth.surfaces.delete", ...args),
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.surfaces, "list", "iam.oauth.surfaces.list", iamOauthListQuery(params)),
      update: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.surfaces, "update", "iam.oauth.surfaces.update", ...args)
    },
    tenantBindings: {
      create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.tenantBindings, "create", "iam.oauth.tenantBindings.create", ...args),
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.tenantBindings, "list", "iam.oauth.tenantBindings.list", iamOauthListQuery(params)),
      update: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.tenantBindings, "update", "iam.oauth.tenantBindings.update", ...args)
    },
    webhookConfigs: {
      create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.webhookConfigs, "create", "iam.oauth.webhookConfigs.create", ...args),
      delete: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.webhookConfigs, "delete", "iam.oauth.webhookConfigs.delete", ...args),
      list: (params) => callBackendOauth(backendOauth, (oauth) => oauth?.webhookConfigs, "list", "iam.oauth.webhookConfigs.list", iamOauthListQuery(params)),
      update: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.webhookConfigs, "update", "iam.oauth.webhookConfigs.update", ...args),
      verifications: {
        create: (...args) => callBackendOauth(backendOauth, (oauth) => oauth?.webhookConfigs?.verifications, "create", "iam.oauth.webhookConfigs.verifications.create", ...args)
      }
    }
  };
}
async function callBackendOauth(backendOauth, selectResource, key, name, ...args) {
  const resource = backendOauth ? selectResource(backendOauth) : void 0;
  const method = resource && resource[key];
  if (typeof method !== "function") {
    throw new Error(`Missing SDKWork IAM SDK resource: ${name}`);
  }
  return method.call(resource, ...args);
}

// ../../../sdkwork-appbase/packages/common/foundation/sdkwork-runtime-bootstrap/src/media.ts
function readSdkworkMediaResource(value) {
  if (!value || typeof value !== "object") {
    return void 0;
  }
  const record = value;
  const kind = normalizeSdkworkMediaKind(record.kind);
  const source = normalizeSdkworkMediaSource(record.source);
  if (!kind || !source) {
    return void 0;
  }
  return {
    ...record,
    kind,
    source
  };
}
function normalizeSdkworkMediaKind(value) {
  const normalized = normalizeOptionalText(value);
  if (normalized === "archive" || normalized === "audio" || normalized === "document" || normalized === "image" || normalized === "model" || normalized === "other" || normalized === "video") {
    return normalized;
  }
  return void 0;
}
function normalizeSdkworkMediaSource(value) {
  const normalized = normalizeOptionalText(value);
  if (normalized === "data_url" || normalized === "external_url" || normalized === "object_storage") {
    return normalized;
  }
  return void 0;
}
function normalizeOptionalText(value) {
  const normalized = typeof value === "string" ? trim2(value) : "";
  return isBlank2(normalized) ? void 0 : normalized;
}

// ../sdkwork-iam-common/packages/sdkwork-iam-service/src/index.ts
function iamListQuery(params) {
  const query = resolveSdkWorkListQuery(params);
  const { page_size: pageSize, ...domainFilters } = query;
  return { ...domainFilters, pageSize };
}
function createSdkworkIamService(input) {
  const appSessions = input.appbaseAppClient.auth?.sessions;
  const appOauth = input.appbaseAppClient.oauth;
  const appSystem = input.appbaseAppClient.system;
  const backendIam = input.appbaseBackendClient?.iam;
  const backendOauth = input.appbaseBackendClient?.iamOauth?.iam?.oauth;
  const appIam = input.appbaseAppClient.iam;
  return {
    auth: {
      passwordResetRequests: {
        create: (body) => callRaw(input.appbaseAppClient.auth?.passwordResetRequests, "create", "appbaseAppClient.auth.passwordResetRequests.create", body)
      },
      verificationCodeRequests: {
        create: (body) => callRaw(input.appbaseAppClient.auth?.verificationCodeRequests, "create", "appbaseAppClient.auth.verificationCodeRequests.create", body)
      },
      passwordResets: {
        create: (body) => callRaw(input.appbaseAppClient.auth?.passwordResets, "create", "appbaseAppClient.auth.passwordResets.create", body)
      },
      registrations: {
        create: async (body) => {
          await input.clearSession?.();
          return handleAuthSession(
            await callResourceMethod(
              input.appbaseAppClient.auth?.registrations,
              "create",
              "appbaseAppClient.auth.registrations.create",
              body
            ),
            input
          );
        }
      },
      sessions: {
        create: async (body) => {
          await input.clearSession?.();
          return handleAuthSession(
            await callResourceMethod(appSessions, "create", "appbaseAppClient.auth.sessions.create", body),
            input
          );
        },
        loginContextSelection: {
          create: async (body) => {
            await input.clearSession?.();
            return handleAuthSession(
              await callResourceMethod(
                appSessions?.loginContextSelection,
                "create",
                "appbaseAppClient.auth.sessions.loginContextSelection.create",
                body
              ),
              input
            );
          }
        },
        organizationSelection: {
          create: async (body) => {
            await input.clearSession?.();
            return handleAuthSession(
              await callResourceMethod(
                appSessions?.organizationSelection,
                "create",
                "appbaseAppClient.auth.sessions.organizationSelection.create",
                body
              ),
              input
            );
          }
        },
        current: {
          delete: async () => {
            try {
              await callRaw(appSessions?.current, "delete", "appbaseAppClient.auth.sessions.current.delete");
            } finally {
              await input.clearSession?.();
            }
          },
          retrieve: async () => handleSession(
            await callResourceMethod(appSessions?.current, "retrieve", "appbaseAppClient.auth.sessions.current.retrieve"),
            input,
            { preserveRefreshToken: true }
          ),
          update: async (body) => handleSession(
            await callResourceMethod(
              appSessions?.current,
              "update",
              "appbaseAppClient.auth.sessions.current.update",
              normalizeCurrentSessionUpdateBody(body)
            ),
            input,
            { preserveRefreshToken: true }
          )
        },
        refresh: async (body) => handleSession(
          await callResourceMethod(appSessions, "refresh", "appbaseAppClient.auth.sessions.refresh", body),
          input,
          { preserveRefreshToken: true }
        )
      }
    },
    oauth: {
      providers: {
        list: (params) => callRaw(appOauth?.providers, "list", "appbaseAppClient.oauth.providers.list", iamListQuery(params))
      },
      authorizationUrls: {
        create: (params) => callOAuthAuthorizationUrlCreate(
          appOauth?.authorizationUrls,
          "appbaseAppClient.oauth.authorizationUrls.create",
          params
        )
      },
      deviceAuthorizations: {
        create: (body) => callRaw(appOauth?.deviceAuthorizations, "create", "appbaseAppClient.oauth.deviceAuthorizations.create", body),
        retrieve: (deviceAuthorizationId) => callRaw(
          appOauth?.deviceAuthorizations,
          "retrieve",
          "appbaseAppClient.oauth.deviceAuthorizations.retrieve",
          deviceAuthorizationId
        ),
        scans: {
          create: (deviceAuthorizationId, body) => callRaw(
            appOauth?.deviceAuthorizations?.scans,
            "create",
            "appbaseAppClient.oauth.deviceAuthorizations.scans.create",
            deviceAuthorizationId,
            body
          )
        },
        passwordCompletions: {
          create: (deviceAuthorizationId, body) => callRaw(
            appOauth?.deviceAuthorizations?.passwordCompletions,
            "create",
            "appbaseAppClient.oauth.deviceAuthorizations.passwordCompletions.create",
            deviceAuthorizationId,
            body
          )
        },
        sessionCompletions: {
          create: (deviceAuthorizationId, body) => callRaw(
            appOauth?.deviceAuthorizations?.sessionCompletions,
            "create",
            "appbaseAppClient.oauth.deviceAuthorizations.sessionCompletions.create",
            deviceAuthorizationId,
            body
          )
        },
        sessionExchanges: {
          create: (deviceAuthorizationId, body) => callRaw(
            appOauth?.deviceAuthorizations?.sessionExchanges,
            "create",
            "appbaseAppClient.oauth.deviceAuthorizations.sessionExchanges.create",
            deviceAuthorizationId,
            body
          )
        }
      },
      scanLoginModes: {
        list: (params) => callRaw(appOauth?.scanLoginModes, "list", "appbaseAppClient.oauth.scanLoginModes.list", iamListQuery(params))
      },
      callbacks: {
        retrieve: (params) => callRaw(appOauth?.callbacks, "retrieve", "appbaseAppClient.oauth.callbacks.retrieve", params),
        create: (body) => callRaw(appOauth?.callbacks, "create", "appbaseAppClient.oauth.callbacks.create", body)
      },
      miniProgramSessions: {
        create: async (body) => {
          await input.clearSession?.();
          return handleSession(
            await callResourceMethod(
              appOauth?.miniProgramSessions,
              "create",
              "appbaseAppClient.oauth.miniProgramSessions.create",
              body
            ),
            input
          );
        }
      },
      authorizations: {
        completions: {
          create: (authorizationStateId, body) => callRaw(
            appOauth?.authorizations?.completions,
            "create",
            "appbaseAppClient.oauth.authorizations.completions.create",
            authorizationStateId,
            body
          )
        }
      },
      sessions: {
        create: async (body) => {
          await input.clearSession?.();
          return handleSession(await callResourceMethod(appOauth?.sessions, "create", "appbaseAppClient.oauth.sessions.create", body), input);
        }
      },
      accountLinks: {
        delete: (accountLinkId) => callRaw(appOauth?.accountLinks, "delete", "appbaseAppClient.oauth.accountLinks.delete", accountLinkId),
        list: (params) => callRaw(appOauth?.accountLinks, "list", "appbaseAppClient.oauth.accountLinks.list", iamListQuery(params))
      },
      grants: {
        delete: (grantId) => callRaw(appOauth?.grants, "delete", "appbaseAppClient.oauth.grants.delete", grantId),
        list: (params) => callRaw(appOauth?.grants, "list", "appbaseAppClient.oauth.grants.list", iamListQuery(params))
      }
    },
    system: {
      iam: {
        runtime: {
          retrieve: (params) => callRaw(appSystem?.iam?.runtime, "retrieve", "appbaseAppClient.system.iam.runtime.retrieve", params)
        },
        verificationPolicy: {
          retrieve: () => callRaw(appSystem?.iam?.verificationPolicy, "retrieve", "appbaseAppClient.system.iam.verificationPolicy.retrieve")
        },
        accountBindingPolicy: {
          retrieve: () => callRaw(appSystem?.iam?.accountBindingPolicy, "retrieve", "appbaseAppClient.system.iam.accountBindingPolicy.retrieve")
        }
      }
    },
    iam: {
      apiKeys: {
        list: (params) => callBackendIam(backendIam, (iam) => iam.apiKeys, "list", "iam.apiKeys.list", iamListQuery(params)),
        revoke: (apiKeyId) => callBackendIam(backendIam, (iam) => iam.apiKeys, "revoke", "iam.apiKeys.revoke", apiKeyId)
      },
      auditEvents: {
        list: (params) => callBackendIam(backendIam, (iam) => iam.auditEvents, "list", "iam.auditEvents.list", iamListQuery(params)),
        retrieve: (auditEventId) => callBackendIam(backendIam, (iam) => iam.auditEvents, "retrieve", "iam.auditEvents.retrieve", auditEventId)
      },
      organizations: {
        create: (body) => callBackendIam(backendIam, (iam) => iam.organizations, "create", "iam.organizations.create", body),
        delete: (organizationId) => callBackendIam(backendIam, (iam) => iam.organizations, "delete", "iam.organizations.delete", organizationId),
        list: (params) => callRaw(appIam?.organizations, "list", "appbaseAppClient.iam.organizations.list", iamListQuery(params)),
        retrieve: (organizationId) => callBackendIam(backendIam, (iam) => iam.organizations, "retrieve", "iam.organizations.retrieve", organizationId),
        tree: {
          retrieve: async (params) => extractSdkWorkTreeNodes(
            await callRaw(
              appIam?.organizations?.tree,
              "retrieve",
              "appbaseAppClient.iam.organizations.tree.retrieve",
              params
            )
          )
        },
        update: (organizationId, body) => callBackendIam(backendIam, (iam) => iam.organizations, "update", "iam.organizations.update", organizationId, body)
      },
      organizationMemberships: {
        create: (body) => callBackendIam(backendIam, (iam) => iam.organizationMemberships, "create", "iam.organizationMemberships.create", body),
        list: (params) => callRaw(appIam?.organizationMemberships, "list", "appbaseAppClient.iam.organizationMemberships.list", iamListQuery(params)),
        update: (membershipId, body) => callBackendIam(backendIam, (iam) => iam.organizationMemberships, "update", "iam.organizationMemberships.update", membershipId, body)
      },
      departments: {
        create: (body) => callBackendIam(backendIam, (iam) => iam.departments, "create", "iam.departments.create", body),
        delete: (departmentId) => callBackendIam(backendIam, (iam) => iam.departments, "delete", "iam.departments.delete", departmentId),
        list: (params) => callRaw(appIam?.departments, "list", "appbaseAppClient.iam.departments.list", iamListQuery(params)),
        retrieve: (departmentId) => callBackendIam(backendIam, (iam) => iam.departments, "retrieve", "iam.departments.retrieve", departmentId),
        tree: {
          retrieve: async (params) => extractSdkWorkTreeNodes(
            await callRaw(
              appIam?.departments?.tree,
              "retrieve",
              "appbaseAppClient.iam.departments.tree.retrieve",
              params
            )
          )
        },
        update: (departmentId, body) => callBackendIam(backendIam, (iam) => iam.departments, "update", "iam.departments.update", departmentId, body)
      },
      departmentAssignments: {
        create: (body) => callBackendIam(backendIam, (iam) => iam.departmentAssignments, "create", "iam.departmentAssignments.create", body),
        list: (params) => callRaw(appIam?.departmentAssignments, "list", "appbaseAppClient.iam.departmentAssignments.list", iamListQuery(params)),
        update: (assignmentId, body) => callBackendIam(backendIam, (iam) => iam.departmentAssignments, "update", "iam.departmentAssignments.update", assignmentId, body)
      },
      permissions: {
        create: (body) => callBackendIam(backendIam, (iam) => iam.permissions, "create", "iam.permissions.create", body),
        delete: (permissionId) => callBackendIam(backendIam, (iam) => iam.permissions, "delete", "iam.permissions.delete", permissionId),
        list: (params) => callBackendIam(backendIam, (iam) => iam.permissions, "list", "iam.permissions.list", iamListQuery(params)),
        retrieve: (permissionId) => callBackendIam(backendIam, (iam) => iam.permissions, "retrieve", "iam.permissions.retrieve", permissionId),
        update: (permissionId, body) => callBackendIam(backendIam, (iam) => iam.permissions, "update", "iam.permissions.update", permissionId, body)
      },
      positions: {
        create: (body) => callBackendIam(backendIam, (iam) => iam.positions, "create", "iam.positions.create", body),
        delete: (positionId) => callBackendIam(backendIam, (iam) => iam.positions, "delete", "iam.positions.delete", positionId),
        list: (params) => callRaw(appIam?.positions, "list", "appbaseAppClient.iam.positions.list", iamListQuery(params)),
        update: (positionId, body) => callBackendIam(backendIam, (iam) => iam.positions, "update", "iam.positions.update", positionId, body)
      },
      positionAssignments: {
        create: (body) => callBackendIam(backendIam, (iam) => iam.positionAssignments, "create", "iam.positionAssignments.create", body),
        list: (params) => callRaw(appIam?.positionAssignments, "list", "appbaseAppClient.iam.positionAssignments.list", iamListQuery(params)),
        update: (assignmentId, body) => callBackendIam(backendIam, (iam) => iam.positionAssignments, "update", "iam.positionAssignments.update", assignmentId, body)
      },
      providerAccounts: {
        create: (body) => callBackendIam(backendIam, (iam) => iam.providerAccounts, "create", "iam.providerAccounts.create", body),
        delete: (providerAccountId) => callBackendIam(backendIam, (iam) => iam.providerAccounts, "delete", "iam.providerAccounts.delete", providerAccountId),
        list: (params) => callBackendIam(backendIam, (iam) => iam.providerAccounts, "list", "iam.providerAccounts.list", iamListQuery(params)),
        resolve: (params) => callBackendIam(backendIam, (iam) => iam.providerAccounts, "resolve", "iam.providerAccounts.resolve", params),
        retrieve: (providerAccountId) => callBackendIam(backendIam, (iam) => iam.providerAccounts, "retrieve", "iam.providerAccounts.retrieve", providerAccountId),
        setDefault: (providerAccountId, body) => callBackendIam(backendIam, (iam) => iam.providerAccounts, "setDefault", "iam.providerAccounts.setDefault", providerAccountId, body),
        update: (providerAccountId, body) => callBackendIam(backendIam, (iam) => iam.providerAccounts, "update", "iam.providerAccounts.update", providerAccountId, body),
        credentials: {
          create: (providerAccountId, body) => callBackendIam(backendIam, (iam) => iam.providerAccounts?.credentials, "create", "iam.providerAccounts.credentials.create", providerAccountId, body),
          list: (providerAccountId, params) => callBackendIam(backendIam, (iam) => iam.providerAccounts?.credentials, "list", "iam.providerAccounts.credentials.list", providerAccountId, iamListQuery(params)),
          // `credentials.reveal` is optional in the SDK port contract: only surface
          // it when the generated backend client actually carries the method, so
          // the facade surface equals the canonical port surface.
          ...typeof backendIam?.providerAccounts?.credentials?.reveal === "function" ? {
            reveal: (providerAccountId) => callBackendIam(backendIam, (iam) => iam.providerAccounts?.credentials, "reveal", "iam.providerAccounts.credentials.reveal", providerAccountId)
          } : {}
        }
      },
      providerCredentials: {
        revoke: (credentialId) => callBackendIam(backendIam, (iam) => iam.providerCredentials, "revoke", "iam.providerCredentials.revoke", credentialId, {})
      },
      policies: {
        create: (body) => callBackendIam(backendIam, (iam) => iam.policies, "create", "iam.policies.create", body),
        delete: (policyId) => callBackendIam(backendIam, (iam) => iam.policies, "delete", "iam.policies.delete", policyId),
        list: (params) => callBackendIam(backendIam, (iam) => iam.policies, "list", "iam.policies.list", iamListQuery(params)),
        retrieve: (policyId) => callBackendIam(backendIam, (iam) => iam.policies, "retrieve", "iam.policies.retrieve", policyId),
        update: (policyId, body) => callBackendIam(backendIam, (iam) => iam.policies, "update", "iam.policies.update", policyId, body)
      },
      accountBindingPolicy: {
        retrieve: () => callBackendIam(backendIam, (iam) => iam.accountBindingPolicy, "retrieve", "iam.accountBindingPolicy.retrieve"),
        update: (body) => callBackendIam(backendIam, (iam) => iam.accountBindingPolicy, "update", "iam.accountBindingPolicy.update", body)
      },
      oauth: createIamBackendOauthService(backendOauth),
      roles: {
        create: (body) => callBackendIam(backendIam, (iam) => iam.roles, "create", "iam.roles.create", body),
        delete: (roleId) => callBackendIam(backendIam, (iam) => iam.roles, "delete", "iam.roles.delete", roleId),
        list: (params) => callBackendIam(backendIam, (iam) => iam.roles, "list", "iam.roles.list", iamListQuery(params)),
        retrieve: (roleId) => callBackendIam(backendIam, (iam) => iam.roles, "retrieve", "iam.roles.retrieve", roleId),
        update: (roleId, body) => callBackendIam(backendIam, (iam) => iam.roles, "update", "iam.roles.update", roleId, body),
        permissions: {
          create: (roleId, permissionId) => callBackendIam(backendIam, (iam) => iam.roles?.permissions, "create", "iam.roles.permissions.create", roleId, permissionId),
          delete: (roleId, permissionId) => callBackendIam(backendIam, (iam) => iam.roles?.permissions, "delete", "iam.roles.permissions.delete", roleId, permissionId),
          list: (roleId, params) => callBackendIam(backendIam, (iam) => iam.roles?.permissions, "list", "iam.roles.permissions.list", roleId, iamListQuery(params))
        }
      },
      roleBindings: {
        create: (body) => callBackendIam(backendIam, (iam) => iam.roleBindings, "create", "iam.roleBindings.create", body),
        delete: (roleBindingId) => callBackendIam(backendIam, (iam) => iam.roleBindings, "delete", "iam.roleBindings.delete", roleBindingId),
        list: (params) => callRaw(appIam?.roleBindings, "list", "appbaseAppClient.iam.roleBindings.list", iamListQuery(params))
      },
      securityEvents: {
        list: (params) => callBackendIam(backendIam, (iam) => iam.securityEvents, "list", "iam.securityEvents.list", iamListQuery(params)),
        retrieve: (securityEventId) => callBackendIam(backendIam, (iam) => iam.securityEvents, "retrieve", "iam.securityEvents.retrieve", securityEventId)
      },
      accessCredentials: {
        create: (body) => callBackendIam(backendIam, (iam) => iam.accessCredentials, "create", "iam.accessCredentials.create", body)
      },
      applications: {
        register: (body) => callBackendIam(backendIam, (iam) => iam.applications, "register", "iam.applications.register", body)
      },
      tenantApplications: {
        create: (body) => callBackendIam(backendIam, (iam) => iam.tenantApplications, "create", "iam.tenantApplications.create", body),
        list: (tenantId, params) => callBackendIam(backendIam, (iam) => iam.tenantApplications, "list", "iam.tenantApplications.list", tenantId, iamListQuery(params)),
        retrieve: (tenantApplicationId) => callBackendIam(backendIam, (iam) => iam.tenantApplications, "retrieve", "iam.tenantApplications.retrieve", tenantApplicationId),
        update: (tenantApplicationId, body) => callBackendIam(backendIam, (iam) => iam.tenantApplications, "update", "iam.tenantApplications.update", tenantApplicationId, body),
        enable: (tenantApplicationId, body) => callBackendIam(backendIam, (iam) => iam.tenantApplications, "enable", "iam.tenantApplications.enable", tenantApplicationId, body),
        management: {
          disable: (tenantId, tenantApplicationId) => callBackendIam(backendIam, (iam) => iam.tenantApplications?.management, "disable", "iam.tenantApplications.management.disable", tenantId, tenantApplicationId, {}),
          enable: (tenantId, tenantApplicationId) => callBackendIam(backendIam, (iam) => iam.tenantApplications?.management, "enable", "iam.tenantApplications.management.enable", tenantId, tenantApplicationId, {}),
          create: (tenantId, body) => callBackendIam(backendIam, (iam) => iam.tenantApplications?.management, "create", "iam.tenantApplications.management.create", tenantId, body),
          update: (tenantId, tenantApplicationId, body) => callBackendIam(backendIam, (iam) => iam.tenantApplications?.management, "update", "iam.tenantApplications.management.update", tenantId, tenantApplicationId, body)
        },
        summary: {
          retrieve: (tenantId) => callBackendIam(backendIam, (iam) => iam.tenantApplications?.summary, "retrieve", "iam.tenantApplications.summary.retrieve", tenantId)
        }
      },
      tenants: {
        create: (body) => callBackendIam(backendIam, (iam) => iam.tenants, "create", "iam.tenants.create", body),
        delete: (tenantId) => callBackendIam(backendIam, (iam) => iam.tenants, "delete", "iam.tenants.delete", tenantId),
        list: (params) => callBackendIam(backendIam, (iam) => iam.tenants, "list", "iam.tenants.list", iamListQuery(params)),
        retrieve: (tenantId) => callBackendIam(backendIam, (iam) => iam.tenants, "retrieve", "iam.tenants.retrieve", tenantId),
        update: (tenantId, body) => callBackendIam(backendIam, (iam) => iam.tenants, "update", "iam.tenants.update", tenantId, body),
        members: {
          create: (tenantId, body) => callBackendIam(backendIam, (iam) => iam.tenants?.members, "create", "iam.tenants.members.create", tenantId, body),
          delete: (tenantId, userId) => callBackendIam(backendIam, (iam) => iam.tenants?.members, "delete", "iam.tenants.members.delete", tenantId, userId),
          list: (tenantId, params) => callBackendIam(backendIam, (iam) => iam.tenants?.members, "list", "iam.tenants.members.list", tenantId, iamListQuery(params)),
          update: (tenantId, userId, body) => callBackendIam(backendIam, (iam) => iam.tenants?.members, "update", "iam.tenants.members.update", tenantId, userId, body)
        }
      },
      users: {
        current: {
          retrieve: async () => toUser(unwrap(await callResourceMethod(appIam?.users?.current, "retrieve", "appbaseAppClient.iam.users.current.retrieve"), "appbaseAppClient.iam.users.current.retrieve")),
          update: async (body) => toUser(unwrap(await callResourceMethod(appIam?.users?.current, "update", "appbaseAppClient.iam.users.current.update", body), "appbaseAppClient.iam.users.current.update")),
          emailBindings: {
            create: async (body) => toUser(unwrap(await callRaw(appIam?.users?.current?.emailBindings, "create", "appbaseAppClient.iam.users.current.emailBindings.create", body), "appbaseAppClient.iam.users.current.emailBindings.create")),
            delete: async (body) => toUser(unwrap(await callRaw(appIam?.users?.current?.emailBindings, "delete", "appbaseAppClient.iam.users.current.emailBindings.delete", body), "appbaseAppClient.iam.users.current.emailBindings.delete"))
          },
          phoneBindings: {
            create: async (body) => toUser(unwrap(await callRaw(appIam?.users?.current?.phoneBindings, "create", "appbaseAppClient.iam.users.current.phoneBindings.create", body), "appbaseAppClient.iam.users.current.phoneBindings.create")),
            delete: async (body) => toUser(unwrap(await callRaw(appIam?.users?.current?.phoneBindings, "delete", "appbaseAppClient.iam.users.current.phoneBindings.delete", body), "appbaseAppClient.iam.users.current.phoneBindings.delete"))
          },
          password: {
            update: async (body) => {
              await callRaw(appIam?.users?.current?.password, "update", "appbaseAppClient.iam.users.current.password.update", body);
            }
          }
        },
        create: (body) => callBackendIam(backendIam, (iam) => iam.users, "create", "iam.users.create", body),
        delete: (userId) => callBackendIam(backendIam, (iam) => iam.users, "delete", "iam.users.delete", userId),
        list: (params) => callBackendIam(backendIam, (iam) => iam.users, "list", "iam.users.list", iamListQuery(params)),
        retrieve: async (userId) => toUser(unwrap(await callBackendIam(backendIam, (iam) => iam.users, "retrieve", "iam.users.retrieve", userId), "iam.users.retrieve")),
        update: (userId, body) => callBackendIam(backendIam, (iam) => iam.users, "update", "iam.users.update", userId, body),
        ban: (userId) => callBackendIam(backendIam, (iam) => iam.users, "ban", "iam.users.ban", userId, {}),
        unban: (userId) => callBackendIam(backendIam, (iam) => iam.users, "unban", "iam.users.unban", userId, {})
      }
    }
  };
}
async function handleSession(value, input, options) {
  const session = toSession(unwrap(value, "iam.session"));
  if (options) {
    await input.commitSession?.(session, options);
  } else {
    await input.commitSession?.(session);
  }
  return session;
}
async function handleAuthSession(value, input, options) {
  const payload = unwrap(value, "iam.session");
  if (isAuthSelectionChallenge(payload)) {
    return payload;
  }
  return handleSession(value, input, options);
}
function isAuthSelectionChallenge(value) {
  return isIamLoginContextSelectionChallenge(value);
}
async function callRaw(resource, key, name, ...args) {
  return unwrap(await callResourceMethod(resource, key, name, ...args), name);
}
async function callOAuthAuthorizationUrlCreate(resource, name, params) {
  const create = requireResourceMethod(resource, "create", name);
  if (create.length > 1) {
    return unwrap(
      await create.call(
        resource,
        params?.provider,
        params?.redirectUri,
        params?.state,
        params?.scope
      ),
      name
    );
  }
  return unwrap(await create.call(resource, params), name);
}
async function callBackendIam(backendIam, selectResource, key, name, ...args) {
  return callRaw(backendIam ? selectResource(backendIam) : void 0, key, name, ...args);
}
async function callResourceMethod(resource, key, name, ...args) {
  return requireResourceMethod(resource, key, name).call(resource, ...args);
}
function requireResourceMethod(resource, key, name) {
  const method = resource && resource[key];
  if (typeof method !== "function") {
    return (async () => {
      throw new Error(`Missing SDKWork IAM SDK resource: ${name}`);
    });
  }
  return method;
}
function unwrap(value, name) {
  if (!value || typeof value !== "object") {
    return value;
  }
  if (!("data" in value) && !("code" in value)) {
    return value;
  }
  const envelope = value;
  if (!isSuccessCode(envelope.code)) {
    throw new Error(String(envelope.message || envelope.msg || `${name} failed`));
  }
  return envelope.data;
}
function isSuccessCode(code) {
  if (code === void 0 || code === null) {
    return true;
  }
  const parsed = Number(trim2(String(code)));
  return Number.isFinite(parsed) && isSdkWorkSuccessCode(parsed);
}
function toSession(value) {
  const remote = value && typeof value === "object" ? value : {};
  const accessToken = optionalString2(remote.accessToken);
  const authToken = optionalString2(remote.authToken);
  if (!accessToken) {
    throw new Error("SDKWork IAM session is missing accessToken");
  }
  if (!authToken) {
    throw new Error("SDKWork IAM session is missing authToken");
  }
  const expiresAt = optionalString2(remote.expiresAt);
  const refreshToken = optionalString2(remote.refreshToken);
  const sessionId = optionalString2(remote.sessionId);
  return {
    accessToken,
    authToken,
    ...remote.context ? { context: createIamAppContext(remote.context) } : {},
    ...expiresAt !== void 0 ? { expiresAt } : {},
    ...refreshToken !== void 0 ? { refreshToken } : {},
    ...sessionId !== void 0 ? { sessionId } : {},
    ...remote.user ? { user: toUser(remote.user) } : {}
  };
}
function toUser(value) {
  const remote = value && typeof value === "object" ? value : {};
  const displayName = optionalString2(remote.displayName) || optionalString2(remote.nickname) || optionalString2(remote.name) || optionalString2(remote.username) || optionalString2(remote.email) || "SDKWork User";
  const avatar = readSdkworkMediaResource(remote.avatar);
  const email = optionalString2(remote.email);
  const id = optionalString2(remote.userId) || optionalString2(remote.id);
  const username = optionalString2(remote.username);
  return {
    displayName,
    ...avatar !== void 0 ? { avatar } : {},
    ...email !== void 0 ? { email } : {},
    ...id !== void 0 ? { id } : {},
    ...username !== void 0 ? { username } : {}
  };
}
function optionalString2(value) {
  const normalized = typeof value === "string" ? trim2(value) : "";
  return isBlank2(normalized) ? void 0 : normalized;
}
function normalizeCurrentSessionUpdateBody(body) {
  if (!body) {
    return body;
  }
  const loginScope = optionalString2(body.loginScope)?.toUpperCase();
  if (loginScope === "TENANT") {
    return {
      ...body,
      ...buildTenantCurrentSessionUpdateBody()
    };
  }
  return body;
}

// packages/sdkwork-iam-mp-core/src/runtime/iam-service.ts
function createIamMpAppClient(input) {
  const baseUrl = input.baseUrl.trim();
  if (!baseUrl) {
    throw new Error("sdkwork-iam-mini-program: app-api base url is required to build the IAM client");
  }
  return createClient2({
    baseUrl,
    ...input.accessToken ? { accessToken: input.accessToken } : {},
    ...input.timeoutMs !== void 0 ? { timeout: input.timeoutMs } : {}
  });
}
function createIamMpRuntimeService(input) {
  const client = createIamMpAppClient(input);
  const service = createSdkworkIamService({
    appbaseAppClient: client,
    ...input.clearSession ? { clearSession: input.clearSession } : {},
    ...input.commitSession ? { commitSession: input.commitSession } : {}
  });
  return {
    client,
    service,
    setAccessToken(token) {
      client.setAccessToken(token ?? "");
    }
  };
}

// src/bootstrap/runtimeBundle.ts
var IAM_MP_PAGE_PATHS = {
  contextSelection: "pages/context-selection/index",
  forgotPassword: "pages/forgot-password/index",
  login: "pages/login/index",
  oauthCallback: "pages/oauth-callback/index",
  organizationDirectory: "app-organization/pages/directory/index",
  register: "pages/register/index",
  tenantOverview: "app-tenant/pages/overview/index"
};
var IAM_MP_IMPLEMENTED_ROUTE_IDS = [
  "app.iam.auth.login",
  "app.iam.auth.register",
  "app.iam.auth.forgot-password",
  "app.iam.tenant.overview",
  "app.iam.organization.directory"
];
var MESSAGES = {
  "common.loading": { "en-US": "Loading", "zh-CN": "\u52A0\u8F7D\u4E2D" },
  "common.runtimeUnavailable": {
    "en-US": "The app could not start. Please reopen it.",
    "zh-CN": "\u5E94\u7528\u542F\u52A8\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u3002"
  },
  "common.back": { "en-US": "Back", "zh-CN": "\u8FD4\u56DE" },
  "login.title": { "en-US": "Sign in", "zh-CN": "\u767B\u5F55" },
  "login.account": { "en-US": "Phone or email", "zh-CN": "\u624B\u673A\u53F7\u6216\u90AE\u7BB1" },
  "login.password": { "en-US": "Password", "zh-CN": "\u5BC6\u7801" },
  "login.action": { "en-US": "Sign in", "zh-CN": "\u767B\u5F55" },
  "login.pending": { "en-US": "Signing in\u2026", "zh-CN": "\u767B\u5F55\u4E2D\u2026" },
  "login.toRegister": { "en-US": "Create an account", "zh-CN": "\u6CE8\u518C\u8D26\u53F7" },
  "login.toForgot": { "en-US": "Forgot password", "zh-CN": "\u627E\u56DE\u5BC6\u7801" },
  "register.title": { "en-US": "Create account", "zh-CN": "\u6CE8\u518C\u8D26\u53F7" },
  "register.account": { "en-US": "Phone or email", "zh-CN": "\u624B\u673A\u53F7\u6216\u90AE\u7BB1" },
  "register.code": { "en-US": "Verification code", "zh-CN": "\u9A8C\u8BC1\u7801" },
  "register.password": { "en-US": "Password", "zh-CN": "\u5BC6\u7801" },
  "register.confirm": { "en-US": "Confirm password", "zh-CN": "\u786E\u8BA4\u5BC6\u7801" },
  "register.sendCode": { "en-US": "Send code", "zh-CN": "\u83B7\u53D6\u9A8C\u8BC1\u7801" },
  "register.action": { "en-US": "Register", "zh-CN": "\u6CE8\u518C" },
  "register.pending": { "en-US": "Registering\u2026", "zh-CN": "\u6CE8\u518C\u4E2D\u2026" },
  "register.registerAgain": { "en-US": "Register again", "zh-CN": "\u518D\u6B21\u6CE8\u518C" },
  "register.done": { "en-US": "Account created. You can sign in now.", "zh-CN": "\u8D26\u53F7\u5DF2\u521B\u5EFA\uFF0C\u8BF7\u767B\u5F55\u3002" },
  "register.toLogin": { "en-US": "Back to sign in", "zh-CN": "\u8FD4\u56DE\u767B\u5F55" },
  "forgot.title": { "en-US": "Reset password", "zh-CN": "\u627E\u56DE\u5BC6\u7801" },
  "forgot.account": { "en-US": "Phone or email", "zh-CN": "\u624B\u673A\u53F7\u6216\u90AE\u7BB1" },
  "forgot.code": { "en-US": "Verification code", "zh-CN": "\u9A8C\u8BC1\u7801" },
  "forgot.newPassword": { "en-US": "New password", "zh-CN": "\u65B0\u5BC6\u7801" },
  "forgot.confirmPassword": { "en-US": "Confirm new password", "zh-CN": "\u786E\u8BA4\u65B0\u5BC6\u7801" },
  "forgot.sendCode": { "en-US": "Send code", "zh-CN": "\u83B7\u53D6\u9A8C\u8BC1\u7801" },
  "forgot.action": { "en-US": "Update password", "zh-CN": "\u66F4\u65B0\u5BC6\u7801" },
  "forgot.pending": { "en-US": "Updating\u2026", "zh-CN": "\u66F4\u65B0\u4E2D\u2026" },
  "forgot.done": { "en-US": "Password updated. Please sign in.", "zh-CN": "\u5BC6\u7801\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u767B\u5F55\u3002" },
  "forgot.toLogin": { "en-US": "Back to sign in", "zh-CN": "\u8FD4\u56DE\u767B\u5F55" },
  "error.passwordMismatch": { "en-US": "The two passwords do not match.", "zh-CN": "\u4E24\u6B21\u8F93\u5165\u7684\u5BC6\u7801\u4E0D\u4E00\u81F4\u3002" },
  "error.passwordTooShort": { "en-US": "Use at least 8 characters.", "zh-CN": "\u5BC6\u7801\u81F3\u5C11 8 \u4F4D\u3002" },
  "error.accountRequired": { "en-US": "Enter your account.", "zh-CN": "\u8BF7\u8F93\u5165\u8D26\u53F7\u3002" },
  "error.codeRequired": { "en-US": "Enter the verification code.", "zh-CN": "\u8BF7\u8F93\u5165\u9A8C\u8BC1\u7801\u3002" },
  "error.signInFailed": { "en-US": "Sign-in failed.", "zh-CN": "\u767B\u5F55\u5931\u8D25\u3002" },
  "error.registerFailed": { "en-US": "Registration failed.", "zh-CN": "\u6CE8\u518C\u5931\u8D25\u3002" },
  "error.resetFailed": { "en-US": "Password reset failed.", "zh-CN": "\u627E\u56DE\u5BC6\u7801\u5931\u8D25\u3002" },
  "error.sendCodeFailed": { "en-US": "Could not send the code.", "zh-CN": "\u9A8C\u8BC1\u7801\u53D1\u9001\u5931\u8D25\u3002" },
  "tenant.title": { "en-US": "Tenant", "zh-CN": "\u79DF\u6237" },
  "tenant.session": { "en-US": "Session", "zh-CN": "\u5F53\u524D\u4F1A\u8BDD" },
  "tenant.tenant": { "en-US": "Tenant", "zh-CN": "\u79DF\u6237" },
  "tenant.user": { "en-US": "User", "zh-CN": "\u7528\u6237" },
  "tenant.environment": { "en-US": "Environment", "zh-CN": "\u73AF\u5883" },
  "tenant.organizations": { "en-US": "Organizations", "zh-CN": "\u7EC4\u7EC7" },
  "tenant.memberships": { "en-US": "My memberships", "zh-CN": "\u6211\u7684\u6210\u5458\u5173\u7CFB" },
  "tenant.empty": { "en-US": "Nothing to show", "zh-CN": "\u6682\u65E0\u6570\u636E" },
  "tenant.notReported": { "en-US": "Not reported", "zh-CN": "\u672A\u63D0\u4F9B" },
  "tenant.loadFailed": { "en-US": "Could not load the tenant overview.", "zh-CN": "\u79DF\u6237\u6982\u89C8\u52A0\u8F7D\u5931\u8D25\u3002" },
  "tenant.signOut": { "en-US": "Sign out", "zh-CN": "\u9000\u51FA\u767B\u5F55" },
  "organization.title": { "en-US": "Organizations", "zh-CN": "\u7EC4\u7EC7" },
  "organization.searchPlaceholder": { "en-US": "Search organizations", "zh-CN": "\u641C\u7D22\u7EC4\u7EC7" },
  "organization.empty": { "en-US": "No organizations", "zh-CN": "\u6682\u65E0\u7EC4\u7EC7" },
  "organization.loadMore": { "en-US": "Load more", "zh-CN": "\u52A0\u8F7D\u66F4\u591A" },
  "organization.loadFailed": { "en-US": "Could not load organizations.", "zh-CN": "\u7EC4\u7EC7\u52A0\u8F7D\u5931\u8D25\u3002" },
  "organization.search": { "en-US": "Search", "zh-CN": "\u641C\u7D22" },
  "organization.loading": { "en-US": "Loading\u2026", "zh-CN": "\u52A0\u8F7D\u4E2D\u2026" },
  "organization.failed": { "en-US": "Could not load organizations.", "zh-CN": "\u7EC4\u7EC7\u52A0\u8F7D\u5931\u8D25\u3002" }
};
function resolveIamMpMessage(locale, key) {
  const entry = MESSAGES[key];
  if (!entry) return key;
  return /^zh/iu.test(locale ?? "") ? entry["zh-CN"] : entry["en-US"];
}
var runtime;
async function bootstrapIamMpApp(input) {
  const { runtimeEnv } = input;
  if (runtime) return runtime;
  const session = createIamMpSessionStore();
  const service = createIamMpRuntimeService({
    baseUrl: runtimeEnv.SDKWORK_APP_API_BASE_URL,
    ...session.get()?.accessToken ? { accessToken: session.get()?.accessToken } : {},
    clearSession: () => session.clear(),
    commitSession: (next) => {
      session.set(toSnapshot(next));
    }
  });
  const applySession = (snapshot) => {
    service.setAccessToken(snapshot?.accessToken);
  };
  applySession(session.get());
  session.subscribe(applySession);
  const locale = resolveLocale();
  runtime = {
    auth: createAuthPort(service, session),
    environment: runtimeEnv,
    locale,
    message: (key) => resolveIamMpMessage(locale, key),
    navigation: createNavigationPort(),
    organization: createOrganizationPort(service),
    service,
    session,
    tenant: createTenantPort(service)
  };
  return runtime;
}
function getIamMpRuntime() {
  if (!runtime) {
    throw new Error("IAM mini program runtime is not bootstrapped yet");
  }
  return runtime;
}
function composeIamMpAppJson() {
  const implemented = new Set(IAM_MP_IMPLEMENTED_ROUTE_IDS);
  const pages = [];
  const subPackages = /* @__PURE__ */ new Map();
  for (const route of IAMMP_ROUTE_CONTRIBUTIONS) {
    const placement = route.miniProgram;
    if (!placement || !implemented.has(route.id)) continue;
    if (!placement.subpackage) {
      pages.push(placement.pagePath);
      continue;
    }
    const bucket = subPackages.get(placement.subpackage) ?? [];
    bucket.push(placement.pagePath);
    subPackages.set(placement.subpackage, bucket);
  }
  return {
    pages,
    subPackages: [...subPackages.entries()].map(([root, subPages]) => ({ pages: subPages, root }))
  };
}
function createAuthPort(service, session) {
  return {
    isAuthenticated: () => session.get() !== void 0,
    async loginCode(input) {
      await service.service.auth.sessions.create({
        code: input.code.trim(),
        grantType: "phone_code",
        phone: input.phone.trim()
      });
    },
    async loginPassword(input) {
      await service.service.auth.sessions.create({
        grantType: "password",
        password: input.password,
        username: input.username.trim()
      });
    },
    async register(input) {
      await service.service.auth.registrations.create({
        password: input.password,
        username: input.username.trim(),
        verificationCode: input.verificationCode.trim()
      });
    },
    async requestVerificationCode(input) {
      await service.service.auth.verificationCodeRequests.create({
        account: input.account.trim(),
        scene: input.scene
      });
    },
    async resetPassword(input) {
      await service.service.auth.passwordResets.create({
        account: input.account.trim(),
        code: input.code.trim(),
        confirmPassword: input.confirmPassword,
        newPassword: input.newPassword
      });
    },
    signOut() {
      session.clear();
    }
  };
}
function createTenantPort(service) {
  return {
    async loadOverview() {
      const [runtime2, organizations, memberships] = await Promise.all([
        service.service.system.iam.runtime.retrieve(),
        service.service.iam.organizations.list({ page: 0, page_size: 20 }),
        service.service.iam.organizationMemberships.list({ page: 0, page_size: 20 })
      ]);
      const runtimeRecord = toRecord(runtime2);
      return {
        memberships: listItems(memberships).flatMap((item) => {
          const record = toRecord(item);
          const userId = readString(record.userId) ?? readString(record.user_id) ?? readString(record.id);
          if (!userId) return [];
          const display = readString(record.displayName) ?? readString(record.name) ?? userId;
          const organizationId = readString(record.organizationId) ?? readString(record.organization_id);
          return [
            {
              detail: [organizationId, userId].filter(Boolean).join(" \xB7 "),
              id: readString(record.id) ?? userId,
              title: display
            }
          ];
        }),
        organizations: listItems(organizations).flatMap((item) => {
          const record = toRecord(item);
          const organizationId = readString(record.organizationId) ?? readString(record.organization_id) ?? readString(record.id);
          if (!organizationId) return [];
          return [
            {
              detail: organizationId,
              id: readString(record.id) ?? organizationId,
              title: readString(record.name) ?? organizationId
            }
          ];
        }),
        runtime: {
          environment: readString(runtimeRecord.environment) ?? "",
          tenantId: readString(runtimeRecord.tenantId) ?? readString(runtimeRecord.tenant_id) ?? "",
          userId: readString(runtimeRecord.userId) ?? readString(runtimeRecord.user_id) ?? ""
        }
      };
    }
  };
}
function createOrganizationPort(service) {
  return {
    async fetchPage(input) {
      const q = input.q?.trim();
      const answer = toRecord(
        await service.service.iam.organizations.list({
          page: input.page,
          page_size: input.pageSize,
          ...q ? { q } : {}
        })
      );
      const pageInfo = toRecord(answer.pageInfo);
      const items = listItems(answer).flatMap((item) => {
        const record = toRecord(item);
        const organizationId = readString(record.organizationId) ?? readString(record.organization_id) ?? readString(record.id);
        if (!organizationId) return [];
        const parentId = readString(record.parentId) ?? readString(record.parent_id);
        return [
          {
            detail: parentId ? `${organizationId} \xB7 ${parentId}` : organizationId,
            id: readString(record.id) ?? organizationId,
            title: readString(record.name) ?? organizationId
          }
        ];
      });
      return { hasMore: pageInfo.hasMore === true, items };
    }
  };
}
function createNavigationPort() {
  return {
    back() {
      wx.navigateBack({ delta: 1 });
    },
    navigateTo(path) {
      wx.navigateTo({ url: `/${path}` });
    },
    reLaunch(path) {
      wx.reLaunch({ url: `/${path}` });
    }
  };
}
function resolveLocale() {
  try {
    const info = wx.getAppBaseInfo?.() ?? wx.getSystemInfoSync();
    const language = info.language;
    return /^zh/iu.test(language ?? "") ? "zh-CN" : "en-US";
  } catch {
    return "en-US";
  }
}
function listItems(value) {
  const record = toRecord(value);
  return Array.isArray(record.items) ? record.items : [];
}
function toRecord(value) {
  return value !== null && typeof value === "object" ? value : {};
}
function readString(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? void 0 : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return void 0;
}
function toSnapshot(session) {
  return {
    accessToken: session.accessToken,
    ...session.refreshToken ? { refreshToken: session.refreshToken } : {},
    ...session.sessionId ? { sessionId: session.sessionId } : {},
    ...session.context?.tenantId ? { tenantId: session.context.tenantId } : {},
    ...session.context?.organizationId ? { organizationId: session.context.organizationId } : {},
    ...session.user?.id ? { userId: session.user.id } : {}
  };
}
