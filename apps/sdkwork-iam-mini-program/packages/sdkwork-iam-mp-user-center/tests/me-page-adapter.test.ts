import { describe, expect, it, vi } from 'vitest';

import type { SdkworkIamService } from '@sdkwork/iam-service';

import {
  createIamMpUserCenterMePage,
  IAMMPUSERCENTER_I18N_FRAGMENTS,
} from '../src/index';

function createService(overrides?: {
  deleteSession?: ReturnType<typeof vi.fn>;
  retrieveSession?: ReturnType<typeof vi.fn>;
  retrieveUser?: ReturnType<typeof vi.fn>;
}): SdkworkIamService {
  const service = {
    auth: {
      sessions: {
        current: {
          delete: overrides?.deleteSession ?? vi.fn().mockResolvedValue(undefined),
          retrieve:
            overrides?.retrieveSession
            ?? vi.fn().mockResolvedValue({
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
        },
      },
    },
    iam: {
      users: {
        current: {
          retrieve:
            overrides?.retrieveUser
            ?? vi.fn().mockResolvedValue({
              displayName: 'Alice',
              email: 'alice@example.com',
              id: 'user-1',
              username: 'alice',
            }),
        },
      },
    },
  };
  return service as unknown as SdkworkIamService;
}

function collectSetData(): { calls: Array<Record<string, unknown>>; setData: (data: unknown) => void } {
  const calls: Array<Record<string, unknown>> = [];
  return {
    calls,
    setData: (data) => {
      calls.push(data as Record<string, unknown>);
    },
  };
}

describe('createIamMpUserCenterMePage', () => {
  it('maps controller state to WXML data with resolved zh-CN copy', async () => {
    const sink = collectSetData();
    const page = createIamMpUserCenterMePage({
      messages: IAMMPUSERCENTER_I18N_FRAGMENTS['zh-CN'],
      service: createService(),
      setData: sink.setData,
    });

    expect(page.data.title).toBe('我的');
    page.onLoad();
    await vi.waitFor(() => {
      expect(sink.calls.length).toBeGreaterThan(0);
      const last = sink.calls.at(-1) as { signedOut: boolean; title: string } & {
        profile: { displayName: string; initials: string } | null;
      };
      expect(last.profile?.displayName).toBe('Alice');
      expect(last.profile?.initials).toBe('A');
      expect(last.signedOut).toBe(false);
      expect(last.title).toBe('我的');
    });
  });

  it('dispatches screen intents to onNavigate through the tap dataset', async () => {
    const sink = collectSetData();
    const onNavigate = vi.fn();
    const page = createIamMpUserCenterMePage({
      messages: IAMMPUSERCENTER_I18N_FRAGMENTS['en-US'],
      onNavigate,
      service: createService(),
      setData: sink.setData,
    });
    page.onLoad();
    await vi.waitFor(() => {
      expect((sink.calls.at(-1) as { profile: unknown }).profile).not.toBeNull();
    });

    page.onMenuItemTap({ currentTarget: { dataset: { itemId: 'profile' } } });
    expect(onNavigate).toHaveBeenCalledWith('profile');
  });

  it('signs out through the controller and clears profile data', async () => {
    const sink = collectSetData();
    const deleteSession = vi.fn().mockResolvedValue(undefined);
    const onSignedOut = vi.fn();
    const page = createIamMpUserCenterMePage({
      messages: IAMMPUSERCENTER_I18N_FRAGMENTS['en-US'],
      onSignedOut,
      service: createService({ deleteSession }),
      setData: sink.setData,
    });
    page.onLoad();
    await vi.waitFor(() => {
      expect((sink.calls.at(-1) as { profile: unknown }).profile).not.toBeNull();
    });

    page.onSignOutTap();
    await vi.waitFor(() => {
      expect(deleteSession).toHaveBeenCalled();
      expect(onSignedOut).toHaveBeenCalled();
    });
    const last = sink.calls.at(-1) as { profile: unknown; signedOut: boolean };
    expect(last.signedOut).toBe(true);
    expect(last.profile).toBeNull();
  });

  it('surfaces load failures and recovers through onRetryTap', async () => {
    const sink = collectSetData();
    const retrieveUser = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue({ displayName: 'Alice', id: 'user-1' });
    const page = createIamMpUserCenterMePage({
      messages: IAMMPUSERCENTER_I18N_FRAGMENTS['en-US'],
      service: createService({ retrieveUser }),
      setData: sink.setData,
    });
    page.onLoad();
    await vi.waitFor(() => {
      expect((sink.calls.at(-1) as { errorText: string }).errorText).toContain('network down');
    });

    page.onRetryTap();
    await vi.waitFor(() => {
      expect((sink.calls.at(-1) as { profile: { displayName: string } | null }).profile?.displayName).toBe('Alice');
    });
  });
});
