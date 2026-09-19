// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Runtime document test.
 *
 * Section 9: every supported profile id has a checked-in
 * `env/sdkwork.<deploymentProfile>.<environment>.json`, and each document
 * declares the SDKWORK_* keys ENVIRONMENT_SPEC.md section 5.1 requires.
 */

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

const List<String> _requiredKeys = <String>[
  'SDKWORK_ENVIRONMENT',
  'SDKWORK_DEPLOYMENT_PROFILE',
  'SDKWORK_PROFILE_ID',
  'SDKWORK_RUNTIME_TARGET',
  'SDKWORK_APP_ID',
  'SDKWORK_API_BASE_URL',
  'SDKWORK_APP_API_BASE_URL',
  'SDKWORK_OPEN_API_BASE_URL',
  'SDKWORK_IAM_ISSUER',
];

void main() {
  test('every deployment profile has a runtime document', () {
    const List<String> profiles = <String>[
      'standalone.development',
      'standalone.test',
      'standalone.staging',
      'standalone.demo',
      'standalone.production',
      'cloud.development',
      'cloud.test',
      'cloud.staging',
      'cloud.demo',
      'cloud.production',
    ];
    for (final String profileId in profiles) {
      final File file = File('env/sdkwork.' + profileId + '.json');
      expect(file.existsSync(), isTrue, reason: 'missing ' + file.path);
    }
  });

  test('every runtime document declares the required keys and its own profile id', () {
    for (final FileSystemEntity entity in Directory('env').listSync()) {
      if (entity is! File || !entity.path.endsWith('.json')) continue;
      final Map<String, dynamic> document =
          json.decode(entity.readAsStringSync()) as Map<String, dynamic>;
      for (final String key in _requiredKeys) {
        expect(document.containsKey(key), isTrue, reason: entity.path + ' is missing ' + key);
      }
      final String profileId = document['SDKWORK_PROFILE_ID'] as String;
      expect(entity.path, endsWith('sdkwork.' + profileId + '.json'));
      expect(
        profileId,
        (document['SDKWORK_DEPLOYMENT_PROFILE'] as String) +
            '.' +
            (document['SDKWORK_ENVIRONMENT'] as String),
      );
    }
  });
}
