import { describe, expect, it, vi } from 'vitest';

import type { SdkworkIamService } from '@sdkwork/iam-service';

import {
  createDefaultSdkworkIamUserCenterMeMenuSections,
  createSdkworkIamUserCenterMeController,
  createSdkworkIamUserCenterMeThemeCss,
  createSdkworkIamUserCenterMeTokenStyleOverrides,
  SDKWORK_IAM_USER_CENTER_ME_TOKEN_VARIABLES,
  type SdkworkIamUserCenterMeMenuSection,
} from '../src/index';

interface ServiceFixture {
  deleteSession: ReturnType<typeof vi.fn>;
  retrieveSession: ReturnType<typeof vi.fn>;
  retrieveUser: ReturnType<typeof vi.fn>;
}

function createServiceFixture(overrides?: Partial<ServiceFixture>): ServiceFixture & { service: SdkworkIamService } {
  const fixture: ServiceFixture = {
    deleteSession: vi.fn().mockResolvedValue(undefined),
    retrieveSession: vi.fn().mockResolvedValue({
      accessToken: 'access-token',
      authToken: 'auth-token',
      context: {
        appId: 'app',
        authLevel: 'standard',
        organizationId: 'org-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
      },
    }),
    retrieveUser: vi.fn().mockResolvedValue({
      avatar: { publicUrl: 'https://cdn.example.com/a.png' },
      displayName: 'Alice',
      email: 'alice@example.com',
      id: 'user-1',
      username: 'alice',
    }),
    ...overrides,
  };
  const service = {
    auth: {
      sessions: {
        current: {
          delete: fixture.deleteSession,
          retrieve: fixture.retrieveSession,
        },
      },
    },
    iam: {
      users: {
        current: {
          retrieve: fixture.retrieveUser,
        },
      },
    },
  };
  // Test boundary: the fake only implements the subset the controller uses.
  return { ...fixture, service: service as unknown as SdkworkIamService };
}

describe('@sdkwork/iam-user-center-core controller', () => {
  it('starts idle with the default menu and no sensitive data', () => {
    const { service } = createServiceFixture();
    const controller = createSdkworkIamUserCenterMeController({ service });
    const state = controller.getState();

    expect(state.status).toBe('idle');
    expect(state.profile).toBeUndefined();
    expect(state.context).toBeUndefined();
    expect(state.signedOut).toBe(false);
    expect(state.menu.map((section) => section.id)).toEqual(['account', 'bindings']);
  });

  it('loads profile, context and menu into ready', async () => {
    const { service } = createServiceFixture();
    const controller = createSdkworkIamUserCenterMeController({ service });

    await controller.refresh();

    const state = controller.getState();
    expect(state.status).toBe('ready');
    expect(state.profile).toMatchObject({
      avatarUrl: 'https://cdn.example.com/a.png',
      displayName: 'Alice',
      email: 'alice@example.com',
      userId: 'user-1',
      username: 'alice',
    });
    expect(state.context).toMatchObject({ organizationId: 'org-1', tenantId: 'tenant-1', userId: 'user-1' });
    const bindings = state.menu.find((section) => section.id === 'bindings');
    const emailItem = bindings?.items.find((item) => item.id === 'email-bindings');
    expect(emailItem?.value).toBe('alice@example.com');
  });

  it('notifies subscribers on every transition', async () => {
    const { service } = createServiceFixture();
    const controller = createSdkworkIamUserCenterMeController({ service });
    const statuses: string[] = [];
    const unsubscribe = controller.subscribe((state) => {
      statuses.push(state.status);
    });

    await controller.refresh();
    unsubscribe();
    await controller.refresh();

    expect(statuses).toEqual(['loading', 'ready']);
  });

  it('enters error state with a message when the service fails', async () => {
    const { service } = createServiceFixture({
      retrieveUser: vi.fn().mockRejectedValue(new Error('network down')),
    });
    const controller = createSdkworkIamUserCenterMeController({ service });

    await controller.refresh();

    const state = controller.getState();
    expect(state.status).toBe('error');
    expect(state.lastError).toBe('network down');
    expect(state.profile).toBeUndefined();
  });

  it('times out bounded requests into the error state', async () => {
    const { service } = createServiceFixture({
      retrieveUser: vi.fn().mockImplementation(() => new Promise(() => undefined)),
    });
    const controller = createSdkworkIamUserCenterMeController({ service, requestTimeoutMs: 10 });

    await controller.refresh();

    expect(controller.getState().status).toBe('error');
    expect(controller.getState().lastError).toContain('timed out');
  });

  it('signs out, clears sensitive state, and reports signedOut', async () => {
    const { service } = createServiceFixture();
    const controller = createSdkworkIamUserCenterMeController({ service });
    await controller.refresh();

    await controller.signOut();

    const state = controller.getState();
    expect(service.auth.sessions.current.delete).toHaveBeenCalled();
    expect(state.signedOut).toBe(true);
    expect(state.signingOut).toBe(false);
    expect(state.status).toBe('idle');
    expect(state.profile).toBeUndefined();
    expect(state.context).toBeUndefined();
  });

  it('surfaces sign-out failures and keeps the page usable', async () => {
    const { service } = createServiceFixture({
      deleteSession: vi.fn().mockRejectedValue(new Error('sign-out rejected')),
    });
    const controller = createSdkworkIamUserCenterMeController({ service });
    await controller.refresh();

    await expect(controller.signOut()).rejects.toThrow('sign-out rejected');
    const state = controller.getState();
    expect(state.signingOut).toBe(false);
    expect(state.lastError).toBe('sign-out rejected');
    expect(state.profile).toBeDefined();
  });

  it('supports host menu overrides with resolved labels', async () => {
    const { service } = createServiceFixture();
    const customMenu: SdkworkIamUserCenterMeMenuSection[] = [
      {
        id: 'custom',
        items: [
          {
            id: 'wallet',
            intent: { kind: 'screen', screenId: 'profile' },
            label: 'Wallet',
            messageKey: 'app.me.wallet',
          },
        ],
      },
    ];
    const controller = createSdkworkIamUserCenterMeController({
      menuSections: () => customMenu,
      service,
    });
    await controller.refresh();

    expect(controller.getState().menu).toEqual(customMenu);

    controller.setMenuSections(() => [
      {
        id: 'replacement',
        items: [
          {
            id: 'support',
            intent: { commandId: 'contact-support', kind: 'command' },
            label: 'Support',
            messageKey: 'app.me.support',
          },
        ],
      },
    ]);
    expect(controller.getState().menu[0]?.id).toBe('replacement');
  });

  it('skips state updates after the signal aborts', async () => {
    const { service } = createServiceFixture();
    const controller = createSdkworkIamUserCenterMeController({ service });
    const abortController = new AbortController();
    const promise = controller.refresh(abortController.signal);
    abortController.abort();
    await promise;

    const state = controller.getState();
    expect(state.status).toBe('loading');
  });
});

describe('@sdkwork/iam-user-center-core theme contract', () => {
  it('declares light and dark token blocks scoped to the page root', () => {
    const css = createSdkworkIamUserCenterMeThemeCss();
    expect(css).toContain('.sdkwork-iam-user-center-me{');
    expect(css).toContain("[data-sdk-color-mode='dark']");
    expect(css).toContain('--sdk-comp-iam-me-page-background:');
    expect(css).toContain('--sdk-color-surface-canvas');
  });

  it('maps explicit token overrides to CSS custom properties only', () => {
    const overrides = createSdkworkIamUserCenterMeTokenStyleOverrides({ accent: '#123456' });
    expect(overrides).toEqual({ [SDKWORK_IAM_USER_CENTER_ME_TOKEN_VARIABLES.accent]: '#123456' });
    expect(createSdkworkIamUserCenterMeTokenStyleOverrides()).toEqual({});
  });

  it('builds the default navigation menu with stable ids and screen intents', () => {
    const menu = createDefaultSdkworkIamUserCenterMeMenuSections({
      profile: { displayName: 'Alice', email: 'a@b.c', userId: '1' },
    });
    const flat = menu.flatMap((section) => section.items);
    expect(flat.map((item) => item.id)).toEqual([
      'profile',
      'password',
      'email-bindings',
      'phone-bindings',
      'third-party-accounts',
    ]);
    expect(flat[0]?.intent).toEqual({ kind: 'screen', screenId: 'profile' });
    expect(
      menu.find((section) => section.id === 'bindings')?.items.find((item) => item.id === 'email-bindings')?.value,
    ).toBe('a@b.c');
  });
});
