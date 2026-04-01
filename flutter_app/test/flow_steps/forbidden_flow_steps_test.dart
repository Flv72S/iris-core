// F3 — Forbidden: no flow_runtime, core_consumption, DateTime/Timer/Random, UI.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

const _forbiddenImports = [
  'flow_runtime',
  'core_consumption',
  'flow_core_consumption',
];

const _forbiddenTokens = [
  'DateTime.',
  'Timer',
  'Random',
  'Stopwatch',
];

void main() {
  group('Flow steps forbidden dependencies', () {
    test('flow_steps does not import flow_runtime or core_consumption', () {
      final dir = Directory('lib/flow_steps');
      expect(dir.existsSync(), isTrue);
      final files = dir
          .listSync(recursive: true)
          .whereType<File>()
          .where((f) => f.path.endsWith('.dart'))
          .toList();
      for (final file in files) {
        final content = file.readAsStringSync();
        for (final token in _forbiddenImports) {
          expect(
            content.contains(token),
            isFalse,
            reason: '${file.path} must not import $token',
          );
        }
      }
    });

    test('flow_steps has no DateTime/Timer/Random/Stopwatch', () {
      final dir = Directory('lib/flow_steps');
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
