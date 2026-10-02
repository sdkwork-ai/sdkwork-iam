// Authored extension (pre-existing package): route-level UI of the
// user-center "Me" page. Screens render state and forward intents; they hold
// no transport, no runtime configuration and no platform-channel call.
// Colors come exclusively from the platform-native Material ColorScheme
// (THEME_DARKMODE_SPEC.md section 11: map onto platform-native mode
// primitives); spacing and radius come from SdkworkDesignTokens.
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/me_controller.dart';
import '../models/me_view_model.dart';
import '../state/me_state.dart';

/// Entry screen of the user-center "Me" capability.
///
/// Hosts inject the three collaborators (profile retriever, session retriever,
/// sign-out) so the screen never constructs clients, plus `onNavigate` for
/// screen intents and `onSignedOut` after a completed sign-out.
class IamFlutterMobileUserMeScreen extends StatefulWidget {
  const IamFlutterMobileUserMeScreen({
    super.key,
    required this.retrieveProfile,
    required this.retrieveSession,
    required this.signOut,
    this.onNavigate,
    this.onSignedOut,
  });

  final IamFlutterMobileUserMeProfileRetriever retrieveProfile;
  final IamFlutterMobileUserMeSessionRetriever retrieveSession;
  final IamFlutterMobileUserMeSignOut signOut;
  final void Function(String screenId)? onNavigate;
  final void Function()? onSignedOut;

  @override
  State<IamFlutterMobileUserMeScreen> createState() =>
      _IamFlutterMobileUserMeScreenState();
}

class _IamFlutterMobileUserMeScreenState extends State<IamFlutterMobileUserMeScreen> {
  late final IamFlutterMobileUserMeController _controller;
  late final void Function() _unsubscribe;
  late IamFlutterMobileUserMeState _state;

  @override
  void initState() {
    super.initState();
    _controller = IamFlutterMobileUserMeController(
      retrieveProfile: widget.retrieveProfile,
      retrieveSession: widget.retrieveSession,
      signOut: widget.signOut,
    );
    _state = _controller.state;
    _unsubscribe = _controller.addListener((IamFlutterMobileUserMeState next) {
      if (!mounted) {
        return;
      }
      setState(() => _state = next);
    });
    if (_state.status == IamFlutterMobileUserMeStatus.idle) {
      scheduleMicrotask(() {
        _controller.refresh();
      });
    }
  }

  @override
  void dispose() {
    _unsubscribe();
    _controller.dispose();
    super.dispose();
  }

  void _handleMenuItem(IamFlutterMobileUserMeMenuItem item) {
    if (item.intent.isScreen) {
      widget.onNavigate?.call(item.intent.screenId!);
      return;
    }
    if (item.intent.commandId == 'sign-out') {
      _performSignOut();
    }
  }

  Future<void> _performSignOut() async {
    try {
      await _controller.performSignOut();
      widget.onSignedOut?.call();
    } on Exception {
      // The controller already surfaced the failure in state.
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_state.status == IamFlutterMobileUserMeStatus.loading) {
      return const SdkworkScaffold(
        titleKey: IamFlutterMobileUserMeMessageKeys.title,
        body: SdkworkLoadingView(),
      );
    }
    if (_state.status == IamFlutterMobileUserMeStatus.error) {
      return SdkworkScaffold(
        titleKey: IamFlutterMobileUserMeMessageKeys.title,
        body: SdkworkErrorView(
          message: _state.lastError ?? IamFlutterMobileUserMeMessageKeys.loadError,
          retryLabel: IamFlutterMobileUserMeMessageKeys.retry,
          onRetry: () {
            _controller.refresh();
          },
        ),
      );
    }
    if (_state.signedOut || _state.status == IamFlutterMobileUserMeStatus.idle) {
      return const SdkworkScaffold(
        titleKey: IamFlutterMobileUserMeMessageKeys.title,
        body: SizedBox.shrink(),
      );
    }
    return SdkworkScaffold(
      titleKey: IamFlutterMobileUserMeMessageKeys.title,
      body: ListView(
        padding: EdgeInsets.only(
          bottom: MediaQuery.paddingOf(context).bottom + SdkworkDesignTokens.spaceMd,
        ),
        children: <Widget>[
          if (_state.profile != null)
            _MeHeroCard(profile: _state.profile!, contextSummary: _state.contextSummary),
          for (final IamFlutterMobileUserMeMenuSection section in _state.menu)
            _MeMenuSectionCard(
              section: section,
              onItemTap: _handleMenuItem,
            ),
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: SdkworkDesignTokens.spaceMd,
              vertical: SdkworkDesignTokens.spaceLg,
            ),
            child: FilledButton.tonalIcon(
              style: FilledButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.error,
                minimumSize: const Size.fromHeight(48),
              ),
              onPressed: _state.signingOut ? null : _performSignOut,
              icon: const Icon(Icons.logout),
              label: const Text(IamFlutterMobileUserMeMessageKeys.actionSignOut),
            ),
          ),
        ],
      ),
    );
  }
}

class _MeHeroCard extends StatelessWidget {
  const _MeHeroCard({required this.profile, this.contextSummary});

  final IamFlutterMobileUserMeProfile profile;
  final IamFlutterMobileUserMeContextSummary? contextSummary;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    final String initials = profile.displayName.trim().isEmpty
        ? '?'
        : profile.displayName.trim().substring(0, 1).toUpperCase();
    return Card(
      margin: const EdgeInsets.fromLTRB(
        SdkworkDesignTokens.spaceMd,
        SdkworkDesignTokens.spaceSm,
        SdkworkDesignTokens.spaceMd,
        0,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(SdkworkDesignTokens.radiusLg),
      ),
      child: Padding(
        padding: const EdgeInsets.all(SdkworkDesignTokens.spaceMd),
        child: Row(
          children: <Widget>[
            CircleAvatar(
              radius: SdkworkDesignTokens.spaceLg,
              backgroundImage:
                  profile.avatarUrl != null ? NetworkImage(profile.avatarUrl!) : null,
              child: profile.avatarUrl == null ? Text(initials) : null,
            ),
            const SizedBox(width: SdkworkDesignTokens.spaceMd),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    profile.displayName,
                    style: Theme.of(context).textTheme.titleMedium,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (profile.username != null)
                    Text(
                      profile.username!,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: colors.onSurfaceVariant,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  if (contextSummary?.authLevel != null)
                    Padding(
                      padding: const EdgeInsets.only(top: SdkworkDesignTokens.spaceXs),
                      child: Chip(
                        visualDensity: VisualDensity.compact,
                        labelPadding: EdgeInsets.zero,
                        padding: EdgeInsets.zero,
                        labelStyle: Theme.of(context).textTheme.labelSmall,
                        label: Text(contextSummary!.authLevel!),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MeMenuSectionCard extends StatelessWidget {
  const _MeMenuSectionCard({required this.section, required this.onItemTap});

  final IamFlutterMobileUserMeMenuSection section;
  final void Function(IamFlutterMobileUserMeMenuItem item) onItemTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.fromLTRB(
        SdkworkDesignTokens.spaceMd,
        SdkworkDesignTokens.spaceMd,
        SdkworkDesignTokens.spaceMd,
        0,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(SdkworkDesignTokens.radiusLg),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          if (section.titleMessageKey != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(
                SdkworkDesignTokens.spaceMd,
                SdkworkDesignTokens.spaceMd,
                SdkworkDesignTokens.spaceMd,
                SdkworkDesignTokens.spaceXs,
              ),
              child: Text(
                section.titleMessageKey!,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ),
          for (final IamFlutterMobileUserMeMenuItem item in section.items)
            ListTile(
              key: ValueKey<String>(item.id),
              enabled: !item.danger,
              title: Text(
                item.label ?? item.messageKey,
                style: item.danger
                    ? TextStyle(color: Theme.of(context).colorScheme.error)
                    : null,
              ),
              subtitle: item.value != null ? Text(item.value!) : null,
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                onItemTap(item);
              },
            ),
        ],
      ),
    );
  }
}
