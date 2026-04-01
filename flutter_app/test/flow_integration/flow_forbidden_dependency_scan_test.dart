// FT — Forbidden dependency and normative logic scan (F1–F4).

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

const _flowLibDirs = [
  'lib/flow_boundary',
  'lib/flow_core_consumption',
  'lib/flow_runtime',
  'lib/flow_steps',
  'lib/flow_orchestration',
];

const _forbiddenTokens = [
  'Timer(',
  'Random',
  'Stopwatch',
  'dart:io',
  'HttpClient',
  'Socket',
  'File(',
  'Directory(',
  'http.',
];

const _normativeUsagePatterns = [
  'isValid(',
  'isCertified(',
  '.evaluate(',
  '.verify(',
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
    test('no Timer Random Stopwatch IO http file system in flow layers', () {
      for (final dirPath in _flowLibDirs) {
        final dir = Directory(dirPath);
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
      }
    });

    test('DateTime.now() only in flow_temporal_context.dart (DefaultSystemClock)', () {
      const dateTimeNow = 'DateTime.now()';
      for (final dirPath in _flowLibDirs) {
        final dir = Directory(dirPath);
        for (final file in _dartFiles(dir)) {
          final content = file.readAsStringSync();
          final path = file.path.replaceAll('\\', '/');
          final isTemporal = path.contains('flow_temporal_context.dart');
          final hasCall = content.contains('DateTime.now().');
          if (isTemporal) {
            expect(hasCall, isTrue, reason: 'DefaultSystemClock must use DateTime.now()');
          } else {
            expect(hasCall, isFalse, reason: '${file.path} must not use DateTime.now()');
          }
        }
      }
    });

    test('no uncontrolled async in flow layers', () {
      for (final dirPath in _flowLibDirs) {
        final dir = Directory(dirPath);
        for (final file in _dartFiles(dir)) {
          final content = file.readAsStringSync();
          expect(
            content.contains('async '),
            isFalse,
            reason: '${file.path} must not use async',
          );
        }
      }
    });
  });

  group('Zero normative logic', () {
    test('flow layers have no normative method usage', () {
      for (final dirPath in _flowLibDirs) {
        final dir = Directory(dirPath);
        for (final file in _dartFiles(dir)) {
          final content = file.readAsStringSync();
          for (final pattern in _normativeUsagePatterns) {
            expect(
              content.contains(pattern),
              isFalse,
              reason: '${file.path} must not contain normative $pattern',
            );
          }
        }
      }
    });
  });
}
