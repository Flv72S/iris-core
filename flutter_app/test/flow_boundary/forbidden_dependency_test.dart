// F0 — Forbidden dependency scan. Flow must not import Core directly.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_boundary/forbidden_core_operations.dart';

/// Directories that are considered Flow (must not import Core).
const _flowSourceDirs = ['lib/ui'];

void main() {
  group('Forbidden dependency scan', () {
    test('Flow code does not import core_freeze', () {
      final violations = _scanForPattern('core_freeze');
      expect(
        violations,
        isEmpty,
        reason: 'Flow must not import core_freeze: $violations',
      );
    });

    test('Flow code does not import forbidden certification paths', () {
      final violations = _scanForPattern('package:iris_flutter_app/certification/');
      expect(
        violations,
        isEmpty,
        reason: 'Flow must not import certification internals: $violations',
      );
    });

    test('No forbidden Core package URIs in Flow source', () {
      final files = _collectDartFilesUnder(_flowSourceDirs);
      final violations = <String>[];
      for (final path in files) {
        final content = File(path).readAsStringSync();
        for (final uri in forbiddenCorePackageUris) {
          if (content.contains(uri)) {
            violations.add('$path contains $uri');
          }
        }
      }
      expect(violations, isEmpty, reason: violations.join('\n'));
    });
  });
}

List<String> _scanForPattern(String pattern) {
  final violations = <String>[];
  final files = _collectDartFilesUnder(_flowSourceDirs);
  for (final path in files) {
    final content = File(path).readAsStringSync();
    if (content.contains(pattern)) {
      violations.add(path);
    }
  }
  return violations;
}

List<String> _collectDartFilesUnder(List<String> dirs) {
  final result = <String>[];
  for (final dir in dirs) {
    final directory = Directory(dir);
    if (!directory.existsSync()) continue;
    for (final entity in directory.listSync(recursive: true)) {
      if (entity is File && entity.path.endsWith('.dart')) {
        result.add(entity.path);
      }
    }
  }
  return result;
}
