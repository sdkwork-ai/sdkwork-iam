// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Locale fragment bundle loader.
 *
 * Reads a package's `.arb` fragment from the Flutter asset bundle and exposes it
 * as a flat key/value map. Fragments are the authored source
 * (FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC section 4); this loader is the single place
 * that knows how to read them.
 */

import 'dart:convert';

import 'package:flutter/services.dart';

/// Loads and caches one package's locale fragments.
class SdkworkArbBundle {
  SdkworkArbBundle({required this.assetPathBuilder, AssetBundle? bundle})
      : _bundle = bundle ?? rootBundle;

  /// Builds the asset path of one locale.
  final String Function(String locale) assetPathBuilder;

  final AssetBundle _bundle;
  final Map<String, Map<String, String>> _cache = <String, Map<String, String>>{};

  /// Decoded messages of [locale], with `@@locale` and `@key` metadata removed.
  Future<Map<String, String>> messages(String locale) async {
    final Map<String, String>? cached = _cache[locale];
    if (cached != null) return cached;
    final String raw = await _bundle.loadString(assetPathBuilder(locale));
    final Object? decoded = json.decode(raw);
    if (decoded is! Map<String, Object?>) {
      throw FormatException('locale fragment for ' + locale + ' is not a JSON object');
    }
    final Map<String, String> messages = <String, String>{
      for (final MapEntry<String, Object?> entry in decoded.entries)
        if (!entry.key.startsWith('@') && entry.value is String) entry.key: entry.value! as String,
    };
    _cache[locale] = messages;
    return messages;
  }

  /// Drops every cached fragment, for a locale switch or a test reset.
  void clear() {
    _cache.clear();
  }
}
