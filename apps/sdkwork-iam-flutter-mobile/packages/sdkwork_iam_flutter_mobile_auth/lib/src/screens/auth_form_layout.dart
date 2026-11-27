import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

/// Full-bleed auth body: the scaffold adds no shared page gutter. Only the form
/// column is inset and constrained, so backgrounds reach both device edges.
class IamAuthFormLayout extends StatelessWidget {
  const IamAuthFormLayout({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: LayoutBuilder(
        builder: (BuildContext context, BoxConstraints constraints) => Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: BoxConstraints(
                maxWidth: constraints.maxWidth < 640 ? double.infinity : 640),
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                SdkworkDesignTokens.spaceLg,
                SdkworkDesignTokens.spaceLg,
                SdkworkDesignTokens.spaceLg,
                SdkworkDesignTokens.spaceLg +
                    MediaQuery.viewInsetsOf(context).bottom,
              ),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}

/// Error text announced once when its message changes.
class IamAuthErrorText extends StatelessWidget {
  const IamAuthErrorText({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: Text(message,
          style: TextStyle(color: Theme.of(context).colorScheme.error)),
    );
  }
}
