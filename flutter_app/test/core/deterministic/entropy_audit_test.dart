import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/entropy/entropy_sources.dart';
import 'package:iris_flutter_app/core/deterministic/entropy/entropy_violation.dart';

void main() {
  group('Entropy audit scan', () {
    test('No forbidden entropy usage in lib/core/deterministic', () {
      final dir = Directory('lib/core/deterministic');
      if (!dir.existsSync()) {
        fail('Directory lib/core/deterministic not found (run from project root)');
      }
      final violations = <String>[];
      for (final entity in dir.listSync(recursive: true)) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final pathNorm = entity.path.replaceAll('\\', '/');
        if (pathNorm.contains('/entropy/')) continue;
        final content = entity.readAsStringSync();
        final relativePath = pathNorm;
        for (final pattern in EntropySources.scanPatterns) {
          if (content.contains(pattern)) {
            violations.add('$relativePath: forbidden pattern "$pattern"');
          }
        }
      }
      if (violations.isNotEmpty) {
        throw EntropyViolation(
          'Entropy detected in deterministic core:\n${violations.join('\n')}',
        );
      }
    });

    test('Scan fails if DateTime.now present in deterministic folder', () {
      final dir = Directory('lib/core/deterministic');
      if (!dir.existsSync()) {
        return;
      }
      var found = false;
      for (final entity in dir.listSync(recursive: true)) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        if (entity.path.replaceAll('\\', '/').contains('/entropy/')) continue;
        if (entity.readAsStringSync().contains('DateTime.now')) {
          found = true;
          break;
        }
      }
      expect(found, false, reason: 'DateTime.now must not appear in deterministic core');
    });

    test('Scan fails if Random( present in deterministic folder', () {
      final dir = Directory('lib/core/deterministic');
      if (!dir.existsSync()) {
        return;
      }
      var found = false;
      for (final entity in dir.listSync(recursive: true)) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        if (entity.path.replaceAll('\\', '/').contains('/entropy/')) continue;
        if (entity.readAsStringSync().contains('Random(')) {
          found = true;
          break;
        }
      }
      expect(found, false, reason: 'Random( must not appear in deterministic core');
    });

    test('Scan fails if Platform. present in deterministic folder', () {
      final dir = Directory('lib/core/deterministic');
      if (!dir.existsSync()) {
        return;
      }
      var found = false;
      for (final entity in dir.listSync(recursive: true)) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        if (entity.path.replaceAll('\\', '/').contains('/entropy/')) continue;
        if (entity.readAsStringSync().contains('Platform.')) {
          found = true;
          break;
        }
      }
      expect(found, false, reason: 'Platform. must not appear in deterministic core');
    });
  });
}
