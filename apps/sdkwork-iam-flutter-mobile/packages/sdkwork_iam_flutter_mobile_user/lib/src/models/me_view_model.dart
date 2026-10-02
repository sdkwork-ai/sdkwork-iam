/// View models of the user-center "Me" page.
///
/// Cross-client parity with `@sdkwork/iam-user-center-core` (same canonical
/// screens, menu intents and `iam.userCenter.me.*` message keys); copy never
/// lives here — items carry locale keys the host resolves.

/// Canonical i18n message keys owned by the Me page.
class IamFlutterMobileUserMeMessageKeys {
  const IamFlutterMobileUserMeMessageKeys._();

  static const String title = 'iam.userCenter.me.title';
  static const String loading = 'iam.userCenter.me.state.loading';
  static const String loadError = 'iam.userCenter.me.state.loadError';
  static const String retry = 'iam.userCenter.me.state.retry';
  static const String sectionAccount = 'iam.userCenter.me.section.account';
  static const String sectionBindings = 'iam.userCenter.me.section.bindings';
  static const String menuProfile = 'iam.userCenter.me.menu.profile';
  static const String menuPassword = 'iam.userCenter.me.menu.password';
  static const String menuEmailBindings = 'iam.userCenter.me.menu.emailBindings';
  static const String menuPhoneBindings = 'iam.userCenter.me.menu.phoneBindings';
  static const String menuThirdPartyAccounts = 'iam.userCenter.me.menu.thirdPartyAccounts';
  static const String actionSignOut = 'iam.userCenter.me.actions.signOut';
  static const String contextTenant = 'iam.userCenter.me.context.tenant';
  static const String contextOrganization = 'iam.userCenter.me.context.organization';
  static const String contextAuthLevel = 'iam.userCenter.me.context.authLevel';
}

/// Snapshot of the signed-in profile rendered by the hero region.
class IamFlutterMobileUserMeProfile {
  const IamFlutterMobileUserMeProfile({
    required this.displayName,
    required this.userId,
    this.avatarUrl,
    this.email,
    this.phone,
    this.username,
  });

  final String displayName;
  final String userId;
  final String? avatarUrl;
  final String? email;
  final String? phone;
  final String? username;
}

/// Session context summary rendered by the context card region.
class IamFlutterMobileUserMeContextSummary {
  const IamFlutterMobileUserMeContextSummary({
    required this.userId,
    this.authLevel,
    this.organizationId,
    this.tenantId,
  });

  final String userId;
  final String? authLevel;
  final String? organizationId;
  final String? tenantId;
}

/// What pressing a menu item asks the host application to do.
class IamFlutterMobileUserMeMenuIntent {
  const IamFlutterMobileUserMeMenuIntent.screen(this.screenId)
      : commandId = null,
        isScreen = true;

  const IamFlutterMobileUserMeMenuIntent.command(this.commandId)
      : screenId = null,
        isScreen = false;

  final bool isScreen;
  final String? screenId;
  final String? commandId;
}

/// One menu row; `label` (already-resolved copy) wins over `messageKey`.
class IamFlutterMobileUserMeMenuItem {
  const IamFlutterMobileUserMeMenuItem({
    required this.id,
    required this.intent,
    required this.messageKey,
    this.danger = false,
    this.label,
    this.value,
  });

  final String id;
  final IamFlutterMobileUserMeMenuIntent intent;
  final String messageKey;
  final bool danger;
  final String? label;
  final String? value;
}

/// One grouped menu section.
class IamFlutterMobileUserMeMenuSection {
  const IamFlutterMobileUserMeMenuSection({
    required this.id,
    required this.items,
    this.titleMessageKey,
  });

  final String id;
  final List<IamFlutterMobileUserMeMenuItem> items;
  final String? titleMessageKey;
}

/// Builds the canonical navigation menu for a loaded profile.
List<IamFlutterMobileUserMeMenuSection> iamFlutterMobileUserMeDefaultMenuSections({
  IamFlutterMobileUserMeProfile? profile,
}) {
  return <IamFlutterMobileUserMeMenuSection>[
    IamFlutterMobileUserMeMenuSection(
      id: 'account',
      titleMessageKey: IamFlutterMobileUserMeMessageKeys.sectionAccount,
      items: <IamFlutterMobileUserMeMenuItem>[
        const IamFlutterMobileUserMeMenuItem(
          id: 'profile',
          intent: IamFlutterMobileUserMeMenuIntent.screen('profile'),
          messageKey: IamFlutterMobileUserMeMessageKeys.menuProfile,
        ),
        const IamFlutterMobileUserMeMenuItem(
          id: 'password',
          intent: IamFlutterMobileUserMeMenuIntent.screen('password'),
          messageKey: IamFlutterMobileUserMeMessageKeys.menuPassword,
        ),
      ],
    ),
    IamFlutterMobileUserMeMenuSection(
      id: 'bindings',
      titleMessageKey: IamFlutterMobileUserMeMessageKeys.sectionBindings,
      items: <IamFlutterMobileUserMeMenuItem>[
        IamFlutterMobileUserMeMenuItem(
          id: 'email-bindings',
          intent: const IamFlutterMobileUserMeMenuIntent.screen('email-bindings'),
          messageKey: IamFlutterMobileUserMeMessageKeys.menuEmailBindings,
          value: profile?.email,
        ),
        IamFlutterMobileUserMeMenuItem(
          id: 'phone-bindings',
          intent: const IamFlutterMobileUserMeMenuIntent.screen('phone-bindings'),
          messageKey: IamFlutterMobileUserMeMessageKeys.menuPhoneBindings,
          value: profile?.phone,
        ),
        const IamFlutterMobileUserMeMenuItem(
          id: 'third-party-accounts',
          intent: IamFlutterMobileUserMeMenuIntent.screen('third-party-accounts'),
          messageKey: IamFlutterMobileUserMeMessageKeys.menuThirdPartyAccounts,
        ),
      ],
    ),
  ];
}

/// Unbounded awaits are forbidden; collaborators wrap their own timeouts, and
/// the controller maps every failure into the state machine.
typedef IamFlutterMobileUserMeProfileRetriever = Future<Map<String, dynamic>> Function();

typedef IamFlutterMobileUserMeSessionRetriever = Future<Map<String, dynamic>?> Function();

typedef IamFlutterMobileUserMeSignOut = Future<void> Function();

/// Mutable read helpers shared by the controller mapping layer.
IamFlutterMobileUserMeProfile? iamFlutterMobileUserMeProfileFromPayload(
  Map<String, dynamic> payload,
) {
  final String? userId = _readText(payload['userId'] ?? payload['user_id'] ?? payload['id']);
  if (userId == null) {
    return null;
  }
  final Object? avatar = payload['avatar'];
  String? avatarUrl;
  if (avatar is Map) {
    avatarUrl = _readText(avatar['publicUrl'] ?? avatar['url']);
  }
  return IamFlutterMobileUserMeProfile(
    displayName: _readText(payload['displayName'] ?? payload['display_name']) ?? userId,
    userId: userId,
    avatarUrl: avatarUrl,
    email: _readText(payload['email']),
    phone: _readText(payload['phone'] ?? payload['phone_number']),
    username: _readText(payload['username']),
  );
}

IamFlutterMobileUserMeContextSummary? iamFlutterMobileUserMeContextFromPayload(
  Map<String, dynamic>? payload,
) {
  if (payload == null) {
    return null;
  }
  final Object? context = payload['context'];
  if (context is! Map) {
    return null;
  }
  return IamFlutterMobileUserMeContextSummary(
    userId: _readText(context['userId'] ?? context['user_id']) ?? '',
    authLevel: _readText(context['authLevel'] ?? context['auth_level']),
    organizationId: _readText(context['organizationId'] ?? context['organization_id']),
    tenantId: _readText(context['tenantId'] ?? context['tenant_id']),
  );
}

String? _readText(Object? value) {
  if (value == null) {
    return null;
  }
  final String normalized = value.toString().trim();
  return normalized.isEmpty ? null : normalized;
}

/// Bounded await helper: every external call site times out the same way
/// (parity with the TS controller; no unbounded awaits).
Future<T> iamFlutterMobileUserMeAwaitWithTimeout<T>(
  Future<T> future,
  Duration timeout,
  String label,
) {
  return future.timeout(timeout, onTimeout: () {
    throw StateError('Request timed out after ${timeout.inMilliseconds}ms: $label');
  });
}
