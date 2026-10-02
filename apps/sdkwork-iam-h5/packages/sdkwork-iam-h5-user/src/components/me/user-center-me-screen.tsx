import { createElement, useCallback, type ReactElement } from "react";

import type {
  SdkworkIamUserCenterMeController,
  SdkworkIamUserCenterMeMenuIntent,
  SdkworkIamUserCenterMeMenuItem,
} from "@sdkwork/iam-user-center-core";
import { SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS } from "@sdkwork/iam-user-center-core";
import type { SdkworkIamService } from "@sdkwork/iam-service";

import {
  mergeSdkworkIamH5UserCenterMeClassNames,
  mergeSdkworkIamH5UserCenterMeStyles,
  resolveSdkworkIamH5UserCenterMeAppearance,
  type SdkworkIamH5UserCenterMeAppearanceConfig,
  type SdkworkIamH5UserCenterMeContextRowView,
  type SdkworkIamH5UserCenterMeMenuSectionView,
} from "../../appearance/user-center-me-appearance";
import { useSdkworkIamH5UserCenterMeController } from "../../hooks/use-user-center-me-controller";
import {
  IAMH5USER_USERCENTER_I18N_FRAGMENTS,
  type iamH5UserUserCenterLocaleMessages,
} from "../../i18n/manifest";
import { useSdkworkIamH5UserCenterMeStyles } from "../../theme/use-user-center-me-styles";
import {
  SdkworkIamH5UserCenterMeAvatar,
  SdkworkIamH5UserCenterMeDefaultActions,
  SdkworkIamH5UserCenterMeDefaultContextCard,
  SdkworkIamH5UserCenterMeDefaultFooter,
  SdkworkIamH5UserCenterMeDefaultHeader,
  SdkworkIamH5UserCenterMeDefaultHero,
  SdkworkIamH5UserCenterMeDefaultMenu,
  SdkworkIamH5UserCenterMeDefaultMenuItem,
  SdkworkIamH5UserCenterMeDefaultPage,
  SdkworkIamH5UserCenterMeDefaultStates,
} from "./user-center-me-defaults";

export interface SdkworkIamH5UserCenterMeScreenProps {
  /** Slots, presets, token overrides, and per-region styles. */
  appearance?: SdkworkIamH5UserCenterMeAppearanceConfig;
  /** Prebuilt controller; wins over `service`. */
  controller?: SdkworkIamUserCenterMeController;
  /** Active-locale fragment; defaults to the package `en-US` fragment. */
  messages?: iamH5UserUserCenterLocaleMessages;
  /** Host navigation hook for `screen` menu intents. */
  onNavigate?: (screenId: string) => void;
  /** Host callback after a successful sign-out (redirect/refresh). */
  onSignedOut?: () => void;
  /** Injected service port used to build the controller. */
  service?: SdkworkIamService;
}

const DEFAULT_MESSAGES: iamH5UserUserCenterLocaleMessages =
  IAMH5USER_USERCENTER_I18N_FRAGMENTS["en-US"];

/**
 * The mobile "Me" page: hero, session context card, navigation menu, sign-out
 * action, and loading/error states. Every region resolves through an
 * appearance slot with a default renderer, so hosts re-skin or extend the page
 * without forking it. The component never builds SDK clients; it renders from
 * the headless controller state.
 */
export function SdkworkIamH5UserCenterMeScreen({
  appearance,
  controller: injectedController,
  messages = DEFAULT_MESSAGES,
  onNavigate,
  onSignedOut,
  service,
}: SdkworkIamH5UserCenterMeScreenProps): ReactElement | null {
  const resolvedAppearance = resolveSdkworkIamH5UserCenterMeAppearance(appearance);
  useSdkworkIamH5UserCenterMeStyles();

  const { controller, refresh, state } = useSdkworkIamH5UserCenterMeController({
    controller: injectedController,
    service,
  });

  const handleItemIntent = useCallback(
    (intent: SdkworkIamUserCenterMeMenuIntent) => {
      if (intent.kind === "screen") {
        onNavigate?.(intent.screenId);
        return;
      }
      if (intent.commandId === "sign-out") {
        void controller
          ?.signOut()
          .then(() => {
            onSignedOut?.();
          })
          .catch(() => undefined);
      }
    },
    [controller, onNavigate, onSignedOut],
  );

  const handleRetry = useCallback(() => {
    void refresh();
  }, [refresh]);

  if (controller === undefined || state === undefined) {
    return null;
  }

  const slots = resolvedAppearance.slots;
  const slotProps = resolvedAppearance.slotProps;
  const regions = resolvedAppearance.regions;
  const PageSlot = slots?.Page ?? SdkworkIamH5UserCenterMeDefaultPage;
  const HeaderSlot = slots?.Header ?? SdkworkIamH5UserCenterMeDefaultHeader;
  const HeroSlot = slots?.Hero ?? SdkworkIamH5UserCenterMeDefaultHero;
  const ContextCardSlot = slots?.ContextCard ?? SdkworkIamH5UserCenterMeDefaultContextCard;
  const MenuItemSlot = slots?.MenuItem ?? SdkworkIamH5UserCenterMeDefaultMenuItem;
  const ActionsSlot = slots?.Actions ?? SdkworkIamH5UserCenterMeDefaultActions;
  const StatesSlot = slots?.States ?? SdkworkIamH5UserCenterMeDefaultStates;
  const FooterSlot = slots?.Footer ?? SdkworkIamH5UserCenterMeDefaultFooter;

  const resolveMessage = (key: string): string => {
    const value: unknown = (messages as Record<string, unknown>)[key];
    return typeof value === "string" ? value : key;
  };

  const profile = state.profile;
  const context = state.context;
  const isReady = state.status === "ready" && profile !== undefined;

  const contextRows = buildContextRows(context, resolveMessage);
  const menuSections = buildMenuSectionViews(state.menu, resolveMessage, (item) =>
    handleItemIntent(item.intent),
  );

  const avatarNode = profile ? (
    <SdkworkIamH5UserCenterMeAvatar
      className={regions.heroAvatarClassName}
      style={regions.heroAvatarStyle}
      displayName={profile.displayName}
      url={profile.avatarUrl}
    />
  ) : null;

  const authLevelChip =
    context?.authLevel !== undefined ? (
      <span className="sdkwork-iam-user-center-me__chip">{context.authLevel}</span>
    ) : null;

  const headerElement = createElement(HeaderSlot, {
    title: resolveMessage(SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS.title),
    className: mergeSdkworkIamH5UserCenterMeClassNames(
      regions.headerClassName,
      slotProps?.header?.className,
    ),
    style: mergeSdkworkIamH5UserCenterMeStyles(regions.headerStyle, slotProps?.header?.style),
  });

  const statesElement = createElement(StatesSlot, {
    key: "states",
    status: state.status,
    loadingLabel: resolveMessage(SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS.loading),
    errorLabel:
      state.lastError ?? resolveMessage(SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS.loadError),
    retryLabel: resolveMessage(SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS.retry),
    onRetry: state.status === "error" ? handleRetry : undefined,
    className: slotProps?.states?.className,
    style: slotProps?.states?.style,
  });

  const heroElement = isReady && profile
    ? createElement(HeroSlot, {
        key: "hero",
        avatar: avatarNode,
        contextChips: authLevelChip,
        displayName: profile.displayName,
        username: profile.username,
        className: mergeSdkworkIamH5UserCenterMeClassNames(
          regions.heroClassName,
          slotProps?.hero?.className,
        ),
        style: mergeSdkworkIamH5UserCenterMeStyles(regions.heroStyle, slotProps?.hero?.style),
      })
    : null;

  const contextCardElement =
    isReady && contextRows.length > 0
      ? createElement(ContextCardSlot, {
          key: "context-card",
          rows: contextRows,
          className: mergeSdkworkIamH5UserCenterMeClassNames(
            regions.contextCardClassName,
            slotProps?.contextCard?.className,
          ),
          style: mergeSdkworkIamH5UserCenterMeStyles(
            regions.contextCardStyle,
            slotProps?.contextCard?.style,
          ),
        })
      : null;

  const menuProps = {
    sections: menuSections,
    className: mergeSdkworkIamH5UserCenterMeClassNames(
      regions.menuClassName,
      slotProps?.menu?.className,
    ),
    style: mergeSdkworkIamH5UserCenterMeStyles(regions.menuStyle, slotProps?.menu?.style),
  };
  // The default menu renders each row through the MenuItem slot so hosts can
  // replace list rows without replacing the list container.
  let menuElement: ReactElement | null = null;
  if (isReady && menuSections.length > 0) {
    menuElement =
      slots?.Menu === undefined
        ? createElement(SdkworkIamH5UserCenterMeDefaultMenu, {
            ...menuProps,
            renderItem: MenuItemSlot,
            key: "menu",
          })
        : createElement(slots.Menu, { ...menuProps, key: "menu" });
  }

  const actionsElement = isReady
    ? createElement(ActionsSlot, {
        key: "actions",
        onSignOut: () => handleItemIntent({ commandId: "sign-out", kind: "command" }),
        signOutDisabled: state.signingOut,
        signOutLabel: resolveMessage(SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS.signOut),
        signingOut: state.signingOut,
        className: mergeSdkworkIamH5UserCenterMeClassNames(
          regions.actionsClassName,
          slotProps?.actions?.className,
        ),
        style: mergeSdkworkIamH5UserCenterMeStyles(
          regions.actionsStyle,
          slotProps?.actions?.style,
        ),
      })
    : null;

  const footerElement = createElement(FooterSlot, {});

  return createElement(
    PageSlot,
    {
      className: mergeSdkworkIamH5UserCenterMeClassNames(
        resolvedAppearance.rootClassName,
        slotProps?.page?.className,
      ),
      style: mergeSdkworkIamH5UserCenterMeStyles(
        resolvedAppearance.rootStyle,
        slotProps?.page?.style,
      ),
    },
    headerElement,
    isReady
      ? [heroElement, contextCardElement, menuElement, actionsElement]
      : statesElement,
    footerElement,
  );
}

function buildContextRows(
  context:
    | {
        authLevel?: string;
        organizationId?: string;
        tenantId?: string;
      }
    | undefined,
  resolveMessage: (key: string) => string,
): SdkworkIamH5UserCenterMeContextRowView[] {
  if (!context) {
    return [];
  }
  const rows: SdkworkIamH5UserCenterMeContextRowView[] = [];
  if (context.tenantId !== undefined) {
    rows.push({
      id: "tenant",
      label: resolveMessage(SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS.tenant),
      value: context.tenantId,
    });
  }
  if (context.organizationId !== undefined) {
    rows.push({
      id: "organization",
      label: resolveMessage(SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS.organization),
      value: context.organizationId,
    });
  }
  if (context.authLevel !== undefined) {
    rows.push({
      id: "auth-level",
      label: resolveMessage(SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS.authLevel),
      value: context.authLevel,
    });
  }
  return rows;
}

function buildMenuSectionViews(
  sections: readonly {
    id: string;
    items: readonly SdkworkIamUserCenterMeMenuItem[];
    title?: string;
    titleMessageKey?: string;
  }[],
  resolveMessage: (key: string) => string,
  onSelect: (item: SdkworkIamUserCenterMeMenuItem) => void,
): SdkworkIamH5UserCenterMeMenuSectionView[] {
  return sections.map((section) => ({
    id: section.id,
    title:
      section.title
      ?? (section.titleMessageKey ? resolveMessage(section.titleMessageKey) : undefined),
    items: section.items.map((item) => ({
      danger: item.tone === "danger",
      disabled: item.disabled === true,
      id: item.id,
      label: item.label ?? resolveMessage(item.messageKey),
      onSelect: () => onSelect(item),
      value: item.value,
    })),
  }));
}
