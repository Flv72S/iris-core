// F5 — Forbidden: no value-based if, no DateTime/Timer/Random, no normative.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

const _flowContextBindingDir = 'lib/flow_context_binding';
const _forbiddenTokens = [
  'DateTime.now',
  'Timer(',
  'Random',
  'Stopwatch',
];

List<File> _dartFiles(Directory dir) {
  if (!dir.existsSync()) return [];
  return dir
      .listSync(recursive: true)
      .whereType<File>()
      .where((f) => f.path.endsWith('.dart'))
      .toList();
}

void main() {
  group('Forbidden dependency scan', () {
    test('flow_context_binding has no DateTime.now Timer Random Stopwatch', () {
      final dir = Directory(_flowContextBindingDir);
      for (final file in _dartFiles(dir)) {
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

    test('flow_context_binding does not import flow_orchestration', () {
      final dir = Directory(_flowContextBindingDir);
      for (final file in _dartFiles(dir)) {
        final content = file.readAsStringSync();
        expect(
          content.contains('flow_orchestration'),
          isFalse,
          reason: '${file.path} must not import flow_orchestration',
        );
      }
    });
  });
}
