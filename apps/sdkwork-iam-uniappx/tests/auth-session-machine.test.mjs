import assert from 'node:assert/strict';
import test from 'node:test';

import { createIamContextStore } from '../packages/sdkwork-iam-uniappx-core/src/session/context-store.ts';
import { createIamTokenManager } from '../packages/sdkwork-iam-uniappx-core/src/session/token-manager.ts';
import { createIamAuthSessionMachine } from '../packages/sdkwork-iam-uniappx-auth/src/session/auth-session-machine.ts';
import {
  createIamLoginForm,
  validateIamLoginForm,
  IAM_LOGIN_FORM_ERROR_KEYS,
} from '../packages/sdkwork-iam-uniappx-auth/src/forms/login-form.ts';

function session(overrides = {}) {
  return {
    userId: '1001',
    displayName: 'Ada Lovelace',
    tenantId: '100001',
    organizationId: '200001',
    email: 'ada@example.com',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    ...overrides,
  };
}

function createHarness(overrides = {}) {
  const cleared = [];
  const tokenManager = createIamTokenManager();
  const contextStore = createIamContextStore();
  const gateway = {
    async login() {
      return session();
    },
    async refresh() {
      return session({ accessToken: 'refreshed-token' });
    },
    async logout() {
      return undefined;
    },
    async loadSession() {
      return null;
    },
    async switchTenant(input) {
      return session({ tenantId: input.tenantId, organizationId: input.organizationId });
    },
    async switchAccount() {
      return session({ userId: '1002', displayName: 'Grace Hopper' });
    },
    ...overrides,
  };
  const machine = createIamAuthSessionMachine({
    gateway,
    tokenManager,
    contextStore,
    onSensitiveStateCleared: (reason) => cleared.push(reason),
  });
  return { machine, tokenManager, contextStore, cleared };
}

test('login stores the session in the one global token manager and context store', async () => {
  const { machine, tokenManager, contextStore } = createHarness();
  const state = await machine.login({ identifier: 'ada@example.com', password: 'secret1' });

  assert.equal(state.status, 'authenticated');
  assert.equal(state.session?.userId, '1001');
  assert.equal(tokenManager.getSession()?.accessToken, 'access-token');
  assert.deepEqual(contextStore.get(), {
    userId: '1001',
    tenantId: '100001',
    organizationId: '200001',
    displayName: 'Ada Lovelace',
  });
});

test('failed login keeps the signed-out token state and exposes the error code', async () => {
  const { machine, tokenManager } = createHarness({
    async login() {
      throw Object.assign(new Error('bad credentials'), { code: 'invalid-credentials' });
    },
  });
  const state = await machine.login({ identifier: 'ada@example.com', password: 'wrong' });

  assert.equal(state.status, 'failed');
  assert.equal(state.error?.code, 'invalid-credentials');
  assert.equal(tokenManager.getSession(), null);
});

test('logout clears token, context, and sensitive state even when server logout fails', async () => {
  const { machine, tokenManager, contextStore, cleared } = createHarness({
    async logout() {
      throw new Error('network down');
    },
  });
  await machine.login({ identifier: 'ada@example.com', password: 'secret1' });
  const state = await machine.logout();

  assert.equal(state.status, 'signed-out');
  assert.equal(state.session, null);
  assert.equal(tokenManager.getSession(), null);
  assert.deepEqual(contextStore.get(), {});
  assert.deepEqual(cleared, ['logout']);
  assert.ok(state.generation >= 1);
});

test('refresh failure clears the session and records the refresh-failed reason', async () => {
  const { machine, tokenManager, cleared } = createHarness({
    async refresh() {
      throw Object.assign(new Error('expired'), { code: 'session-expired' });
    },
  });
  await machine.login({ identifier: 'ada@example.com', password: 'secret1' });
  const state = await machine.refresh();

  assert.equal(state.status, 'failed');
  assert.equal(tokenManager.getSession(), null);
  assert.deepEqual(cleared, ['refresh-failed']);
});

test('tenant switch clears the previous session before applying the new tenant session', async () => {
  const { machine, tokenManager, contextStore, cleared } = createHarness();
  await machine.login({ identifier: 'ada@example.com', password: 'secret1' });
  const state = await machine.switchTenant({ tenantId: '100002', organizationId: '200009' });

  assert.equal(state.status, 'authenticated');
  assert.equal(state.session?.tenantId, '100002');
  assert.equal(contextStore.get().tenantId, '100002');
  assert.equal(tokenManager.getSession()?.tenantId, '100002');
  assert.deepEqual(cleared, ['tenant-switch']);
});

test('account switch clears the previous session before applying the new account', async () => {
  const { machine, tokenManager, cleared } = createHarness();
  await machine.login({ identifier: 'ada@example.com', password: 'secret1' });
  const state = await machine.switchAccount({ identifier: 'grace@example.com', password: 'secret2' });

  assert.equal(state.status, 'authenticated');
  assert.equal(state.session?.userId, '1002');
  assert.equal(tokenManager.getSession()?.userId, '1002');
  assert.deepEqual(cleared, ['account-switch']);
});

test('restore without a stored session clears sensitive state as session-expired', async () => {
  const { machine, cleared } = createHarness();
  const state = await machine.restore();

  assert.equal(state.status, 'signed-out');
  assert.deepEqual(cleared, ['session-expired']);
});

test('login form validates identifiers and passwords without touching the network', () => {
  const empty = validateIamLoginForm({ identifier: '', password: '', tenantId: '', organizationId: '' });
  assert.equal(empty.identifier, IAM_LOGIN_FORM_ERROR_KEYS.identifierRequired);
  assert.equal(empty.password, IAM_LOGIN_FORM_ERROR_KEYS.passwordRequired);

  const short = validateIamLoginForm({ identifier: 'ada@example.com', password: '123', tenantId: '', organizationId: '' });
  assert.equal(short.password, IAM_LOGIN_FORM_ERROR_KEYS.passwordTooShort);

  const form = createIamLoginForm({ tenantId: '100001' });
  form.setValue('identifier', 'ada@example.com');
  const state = form.setValue('password', 'secret1');
  assert.equal(state.valid, true);
  assert.deepEqual(form.toLoginInput(), {
    identifier: 'ada@example.com',
    password: 'secret1',
    tenantId: '100001',
  });
});
