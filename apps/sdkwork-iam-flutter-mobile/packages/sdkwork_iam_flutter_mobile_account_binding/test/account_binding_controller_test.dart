// SDKWORK-IAM-FLUTTER-ACCOUNT-BINDING: authored tests.
/**
 * Behaviour of the account-binding controller.
 *
 * The cases pin the two rules that matter for a security-relevant surface: the
 * unlink action exists only when the tenant grants it, and a row disappears only
 * after the server accepts the removal.
 */

import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_account_binding/sdkwork_iam_flutter_mobile_account_binding.dart';

class _FakeDataSource implements IamFlutterMobileAccountBindingDataSource {
  _FakeDataSource({
    this.links = const <IamFlutterMobileAccountLink>[],
    this.policy = const IamFlutterMobileAccountBindingPolicy(),
    this.unlinkError,
  });

  final List<IamFlutterMobileAccountLink> links;
  final IamFlutterMobileAccountBindingPolicy policy;
  final Object? unlinkError;
  final List<String> unlinked = <String>[];

  @override
  Future<IamFlutterMobileAccountBindingPolicy> loadPolicy() async => policy;

  @override
  Future<IamFlutterMobileAccountLinkPage> fetchLinksPage({
    required int page,
    required int pageSize,
  }) async {
    return IamFlutterMobileAccountLinkPage(items: links);
  }

  @override
  Future<void> unlink(String accountLinkId) async {
    if (unlinkError != null) throw unlinkError!;
    unlinked.add(accountLinkId);
  }
}

IamFlutterMobileAccountBindingController _controller(_FakeDataSource source) {
  return IamFlutterMobileAccountBindingController(
    service: IamFlutterMobileAccountBindingService(dataSource: source),
  );
}

void main() {
  test('loads the policy and the first page of links', () async {
    final _FakeDataSource source = _FakeDataSource(
      links: const <IamFlutterMobileAccountLink>[
        IamFlutterMobileAccountLink(accountLinkId: 'link-1', provider: 'github'),
      ],
      policy: const IamFlutterMobileAccountBindingPolicy(
        oauthEnabled: true,
        selfServiceUnlinkEnabled: true,
      ),
    );
    final IamFlutterMobileAccountBindingController controller = _controller(source);

    await controller.load();

    expect(controller.state.status, IamFlutterMobileAccountBindingStatus.ready);
    expect(controller.state.links.single.provider, 'github');
    expect(controller.state.policy.selfServiceUnlinkEnabled, isTrue);
    expect(controller.state.canUnlink, isTrue);
  });

  test('does not offer unlink when the tenant forbids it', () async {
    final _FakeDataSource source = _FakeDataSource(
      links: const <IamFlutterMobileAccountLink>[
        IamFlutterMobileAccountLink(accountLinkId: 'link-1', provider: 'github'),
      ],
    );
    final IamFlutterMobileAccountBindingController controller = _controller(source);

    await controller.load();

    expect(controller.state.canUnlink, isFalse);
  });

  test('drops the row only after the server accepts the removal', () async {
    final _FakeDataSource source = _FakeDataSource(
      links: const <IamFlutterMobileAccountLink>[
        IamFlutterMobileAccountLink(accountLinkId: 'link-1', provider: 'github'),
        IamFlutterMobileAccountLink(accountLinkId: 'link-2', provider: 'gitlab'),
      ],
      policy: const IamFlutterMobileAccountBindingPolicy(selfServiceUnlinkEnabled: true),
    );
    final IamFlutterMobileAccountBindingController controller = _controller(source);
    await controller.load();

    final bool removed = await controller.unlink('link-1');

    expect(removed, isTrue);
    expect(source.unlinked, <String>['link-1']);
    expect(controller.state.links.map((IamFlutterMobileAccountLink l) => l.accountLinkId), <String>['link-2']);
  });

  test('a failed removal keeps the row and reports the failure', () async {
    final _FakeDataSource source = _FakeDataSource(
      links: const <IamFlutterMobileAccountLink>[
        IamFlutterMobileAccountLink(accountLinkId: 'link-1', provider: 'github'),
      ],
      policy: const IamFlutterMobileAccountBindingPolicy(selfServiceUnlinkEnabled: true),
      unlinkError: StateError('still your only sign-in method'),
    );
    final IamFlutterMobileAccountBindingController controller = _controller(source);
    await controller.load();

    final bool removed = await controller.unlink('link-1');

    expect(removed, isFalse);
    expect(controller.state.links, hasLength(1));
    expect(controller.state.errorMessage, 'still your only sign-in method');
  });

  test('refuses an empty link id before reaching the data source', () async {
    final _FakeDataSource source = _FakeDataSource();
    final IamFlutterMobileAccountBindingController controller = _controller(source);
    await controller.load();

    final bool removed = await controller.unlink('   ');

    expect(removed, isFalse);
    expect(source.unlinked, isEmpty);
  });
}
