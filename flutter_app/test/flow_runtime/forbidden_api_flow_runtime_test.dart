// F2 — Forbidden API scan: no DateTime.now (except DefaultSystemClock), Timer, Random, IO, network.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

const _forbiddenTokens = [
  'Random',
  'Timer(',
  'Stopwatch',
  'dart:io',
  'Socket',
  'HttpClient',
  'File(',
  'Directory(',
];

void main() {
  group('Forbidden API in flow_runtime', () {
    test('no Random/Timer/Stopwatch/IO/network in any flow_runtime file', () {
      final dir = Directory('lib/flow_runtime');
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

    test('DateTime.now() only in flow_temporal_context.dart in DefaultSystemClock', () {
      final dir = Directory('lib/flow_runtime');
      final files = dir
          .listSync(recursive: true)
          .whereType<File>()
          .where((f) => f.path.endsWith('.dart'))
          .toList();
      for (final file in files) {
        final content = file.readAsStringSync();
        final path = file.path.replaceAll('\\', '/');
        final isTemporal = path.contains('flow_temporal_context.dart');
        // Exclude comment-only occurrences: require pattern that looks like call site
        final hasCallSite = content.contains('DateTime.now().');
        if (isTemporal) {
          expect(
            hasCallSite,
            isTrue,
            reason: 'DefaultSystemClock must call DateTime.now()',
          );
        } else {
          expect(
            hasCallSite,
            isFalse,
            reason: '${file.path} must not call DateTime.now()',
          );
        }
      }
    });
  });
}
