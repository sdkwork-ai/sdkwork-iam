// Authored extension (pre-existing package): mini-program binding of the
// cross-architecture headless Me-page core
// (`@sdkwork/iam-user-center-core`). The adapter maps controller state to
// plain WXML-bindable data and dispatches tap intents; it never touches
// `wx.*` globals (platform APIs stay behind the host page that injects
// `setData`) and never constructs SDK clients.
import type { SdkworkIamService } from '@sdkwork/iam-service';
import {
  createSdkworkIamUserCenterMeController,
  SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS,
  type SdkworkIamUserCenterMeController,
  type SdkworkIamUserCenterMeMenuIntent,
  type SdkworkIamUserCenterMeMenuItem,
  type SdkworkIamUserCenterMeState,
} from '@sdkwork/iam-user-center-core';

/** Resolved strings for one locale; the app injects the active fragment. */
export type IamMpUserCenterMeMessages = Record<string, string>;

/** Plain data shape a WeChat page `setData`s into its WXML. */
export interface IamMpUserCenterMePageData {
  errorText: string;
  loading: boolean;
  profile: {
    avatarUrl?: string;
    displayName: string;
    initials: string;
    username?: string;
  } | null;
  sections: Array<{
    id: string;
    items: Array<{
      danger: boolean;
      id: string;
      label: string;
      value?: string;
    }>;
    title?: string;
  }>;
  signedOut: boolean;
  signingOut: boolean;
  title: string;
}

export interface CreateIamMpUserCenterMePageInput {
  /** Injected service port; the adapter never builds clients. */
  service: SdkworkIamService;
  /** Active-locale messages used to resolve `iam.userCenter.me.*` keys. */
  messages: IamMpUserCenterMeMessages;
  /** Host page `setData` (or any state sink, e.g. a test double). */
  setData: (data: Partial<IamMpUserCenterMePageData>) => void;
  /** Host navigation for `screen` menu intents. */
  onNavigate?: (screenId: string) => void;
  /** Host callback after a completed sign-out. */
  onSignedOut?: () => void;
  requestTimeoutMs?: number;
}

export interface IamMpUserCenterMePageBinding {
  /** Initial data for `Page({ data })`. */
  data: IamMpUserCenterMePageData;
  /** Page `onLoad`: performs the first bounded load. */
  onLoad(): void;
  /** Page `onUnload`: stops listening. */
  onUnload(): void;
  /** Bound to the retry button of the error state. */
  onRetryTap(): void;
  /** Bound to every menu cell via `data-item-id`. */
  onMenuItemTap(event: { currentTarget: { dataset: { itemId?: string } } }): void;
  /** Bound to the sign-out action. */
  onSignOutTap(): void;
}

export function createIamMpUserCenterMePage(
  input: CreateIamMpUserCenterMePageInput,
): IamMpUserCenterMePageBinding {
  const { messages, onNavigate, onSignedOut, setData } = input;
  const controller: SdkworkIamUserCenterMeController =
    createSdkworkIamUserCenterMeController({
      menuSections: undefined,
      requestTimeoutMs: input.requestTimeoutMs,
      service: input.service,
    });

  const resolveMessage = (key: string): string => {
    const value = messages[key];
    return typeof value === 'string' ? value : key;
  };

  let currentItems = new Map<string, SdkworkIamUserCenterMeMenuItem>();

  const toPageData = (state: SdkworkIamUserCenterMeState): IamMpUserCenterMePageData => {
    currentItems = new Map<string, SdkworkIamUserCenterMeMenuItem>();
    const sections = state.menu.map((section) => ({
      id: section.id,
      items: section.items.map((item) => {
        currentItems.set(item.id, item);
        return {
          danger: item.tone === 'danger',
          id: item.id,
          label: item.label ?? resolveMessage(item.messageKey),
          value: item.value,
        };
      }),
      title:
        section.title ??
        (section.titleMessageKey ? resolveMessage(section.titleMessageKey) : undefined),
    }));
    return {
      errorText: state.lastError ?? resolveMessage(SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS.loadError),
      loading: state.status === 'loading',
      profile: state.profile
        ? {
            avatarUrl: state.profile.avatarUrl,
            displayName: state.profile.displayName,
            initials: readInitials(state.profile.displayName),
            username: state.profile.username,
          }
        : null,
      sections,
      signedOut: state.signedOut,
      signingOut: state.signingOut,
      title: resolveMessage(SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS.title),
    };
  };

  const unsubscribe = controller.subscribe((state) => {
    setData(toPageData(state));
  });

  const runIntent = (intent: SdkworkIamUserCenterMeMenuIntent): void => {
    if (intent.kind === 'screen') {
      onNavigate?.(intent.screenId);
      return;
    }
    if (intent.commandId === 'sign-out') {
      void controller
        .signOut()
        .then(() => {
          onSignedOut?.();
        })
        .catch(() => undefined);
    }
  };

  const data = toPageData(controller.getState());

  return {
    data,
    onLoad() {
      void controller.refresh();
    },
    onUnload() {
      unsubscribe();
    },
    onMenuItemTap(event) {
      const itemId = event.currentTarget.dataset.itemId;
      if (itemId === undefined) {
        return;
      }
      const item = currentItems.get(itemId);
      if (item !== undefined) {
        runIntent(item.intent);
      }
    },
    onRetryTap() {
      void controller.refresh();
    },
    onSignOutTap() {
      runIntent({ commandId: 'sign-out', kind: 'command' });
    },
  };
}

function readInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return Array.from(parts[0]).slice(0, 1).join('').toUpperCase();
  }
  const first = Array.from(parts[0])[0] ?? '';
  const second = Array.from(parts[1])[0] ?? '';
  return `${first}${second}`.toUpperCase();
}
