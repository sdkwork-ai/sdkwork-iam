// SDKWORK-IAM-FLUTTER-ADMIN-PERMISSION: authored shared catalog list.
/**
 * The chrome every permission-family catalog shares: a search row, the four states, a paged
 * list and a "load more" action.
 *
 * The three catalogs (permissions, roles, policies) differ only in what a row shows, so the
 * chrome lives here once and each screen supplies `buildRow`.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../state/admin_paged_state.dart';

/// Paged catalog chrome shared by the permission-family screens.
class IamFlutterMobileAdminCatalogList<T> extends StatefulWidget {
  const IamFlutterMobileAdminCatalogList({
    super.key,
    required this.buildRow,
    required this.messages,
    required this.onLoadMore,
    required this.onRetry,
    required this.onSearch,
    required this.state,
    this.searchController,
  });

  /// Locale fragment of the capability.
  final Map<String, String> messages;

  /// Current paged state.
  final IamFlutterMobileAdminPagedState<T> state;

  /// Called when the operator submits a term.
  final void Function(String search) onSearch;

  /// Called to append the next page.
  final void Function() onLoadMore;

  /// Called to retry the first page.
  final void Function() onRetry;

  /// Builds one row.
  final Widget Function(BuildContext context, T item) buildRow;

  /// Optional external search controller.
  final TextEditingController? searchController;

  @override
  State<IamFlutterMobileAdminCatalogList<T>> createState() =>
      _IamFlutterMobileAdminCatalogListState<T>();
}

class _IamFlutterMobileAdminCatalogListState<T>
    extends State<IamFlutterMobileAdminCatalogList<T>> {
  late final TextEditingController _search = widget.searchController ?? TextEditingController();

  @override
  void dispose() {
    if (widget.searchController == null) _search.dispose();
    super.dispose();
  }

  String _message(String key) => widget.messages[key] ?? key;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text(_message('subtitle'), style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: SdkworkDesignTokens.spaceSm),
        Row(
          children: <Widget>[
            Expanded(
              child: TextField(
                autocorrect: false,
                controller: _search,
                decoration: InputDecoration(hintText: _message('searchPlaceholder')),
                onSubmitted: widget.onSearch,
                textInputAction: TextInputAction.search,
              ),
            ),
            const SizedBox(width: SdkworkDesignTokens.spaceSm),
            FilledButton(
              onPressed: () => widget.onSearch(_search.text),
              child: Text(_message('searchAction')),
            ),
          ],
        ),
        const SizedBox(height: SdkworkDesignTokens.spaceSm),
        Expanded(child: _buildBody(context)),
      ],
    );
  }

  Widget _buildBody(BuildContext context) {
    final IamFlutterMobileAdminPagedState<T> state = widget.state;
    if (state.status == IamFlutterMobileAdminPagedStatus.loading ||
        state.status == IamFlutterMobileAdminPagedStatus.idle) {
      return const SdkworkLoadingView();
    }
    if (state.status == IamFlutterMobileAdminPagedStatus.error) {
      return SdkworkErrorView(
        message: state.errorMessage ?? _message('loadError'),
        onRetry: widget.onRetry,
        retryLabel: _message('retry'),
      );
    }
    if (state.items.isEmpty) {
      return Center(
        child: Text(state.search.isEmpty ? _message('empty') : _message('emptySearch')),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (state.errorMessage != null)
          Text(
            state.errorMessage!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        Expanded(
          child: ListView.builder(
            itemCount: state.items.length,
            itemBuilder: (BuildContext context, int index) => widget.buildRow(
              context,
              state.items[index],
            ),
          ),
        ),
        if (state.hasMore)
          FilledButton.tonal(
            onPressed: state.loadingMore ? null : widget.onLoadMore,
            child: state.loadingMore
                ? const SizedBox(
                    height: 16,
                    width: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(_message('loadMore')),
          ),
      ],
    );
  }
}
