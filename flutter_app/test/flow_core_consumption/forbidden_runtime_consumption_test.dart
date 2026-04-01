// F1 — Forbidden runtime usage scan. Consumption layer must not use time/random/IO/network.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

const _forbiddenTokens = [
  'DateTime.',
  'Random',
  'Timer',
  'Stopwatch',
  'dart:io',
  'Socket',
  'HttpClient',
  'File(',
  'Directory(',
];

void main() {
  group('Forbidden runtime usage', () {
    test('consumption layer has no DateTime/Random/Timer/Stopwatch/IO/network', () {
      final dir = Directory('lib/flow_core_consumption');
      expect(dir.existsSync(), isTrue);
      final files = dir
          .listSync(recursive: true)
          .whereType<File>()
          .where((f) => f.path.endsWith('.dart'))
          .toList();
      for (final file in files) {
        final content = file.readAsStringSync();
        for (final token in _forbiddenTokens) {
          expect(
            content.contains(token),
            isFalse,
            reason: '${file.path} must not contain $token',
          );
        }
      }
    });
  });
}
