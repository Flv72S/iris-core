// K Phase — Dependency boundary guard. No Core, no circular deps.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  group('K Phase — Dependency Boundary Audit', () {
    test('no import from iris.core in infrastructure', () {
      final dir = Directory('lib/flow/infrastructure');
      expect(dir.existsSync(), isTrue);
      for (final entity in dir.listSync(recursive: true)) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final content = File(entity.path).readAsStringSync();
        expect(
          content.contains('package:iris_flutter_app/core'),
          isFalse,
          reason: '${entity.path} must not import iris.core',
        );
      }
    });

    test('no import from persistence in infrastructure', () {
      final dir = Directory('lib/flow/infrastructure');
      for (final entity in dir.listSync(recursive: true)) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final content = File(entity.path).readAsStringSync();
        expect(
          content.contains('package:iris_flutter_app/persistence'),
          isFalse,
          reason: '${entity.path} must not import persistence',
        );
      }
    });

    test('no import from replay in infrastructure', () {
      final dir = Directory('lib/flow/infrastructure');
      for (final entity in dir.listSync(recursive: true)) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final content = File(entity.path).readAsStringSync();
        expect(
          content.contains('replay'),
          isFalse,
          reason: '${entity.path} must not reference replay',
        );
      }
    });

    test('port layer does not import adapter layer', () {
      final portDir = Directory('lib/flow/infrastructure/port');
      if (!portDir.existsSync()) return;
      for (final entity in portDir.listSync(recursive: true)) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final content = File(entity.path).readAsStringSync();
        expect(
          content.contains('flow/infrastructure/adapter'),
          isFalse,
          reason: 'Port ${entity.path} must not import adapter',
        );
      }
    });
  });
}
