// K Phase — Global determinism guard. Scans infrastructure module for forbidden patterns.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  group('K Phase — Determinism Global Audit', () {
    test('no DateTime.now in infrastructure', () {
      _scanLib('DateTime.now', (path, content) {
        expect(content.contains('DateTime.now'), isFalse, reason: '$path must not use DateTime.now');
      });
    });

    test('no Random( in infrastructure', () {
      _scanLib('Random(', (path, content) {
        expect(content.contains('Random('), isFalse, reason: '$path must not use Random(');
      });
    });

    test('no Uuid in infrastructure', () {
      _scanLib('Uuid', (path, content) {
        expect(content.contains('Uuid'), isFalse, reason: '$path must not use Uuid');
      });
    });

    test('no uuid package or uuid() in infrastructure', () {
      _scanLib('uuid', (path, content) {
        expect(
          content.contains('package:uuid') || content.contains('uuid()'),
          isFalse,
          reason: '$path must not use uuid package or uuid()',
        );
      });
    });

    test('no Platform.pid in infrastructure', () {
      _scanLib('Platform.pid', (path, content) {
        expect(content.contains('Platform.pid'), isFalse, reason: '$path must not use Platform.pid');
      });
    });
  });
}

void _scanLib(String pattern, void Function(String path, String content) check) {
  final dir = Directory('lib/flow/infrastructure');
  expect(dir.existsSync(), isTrue);
  for (final entity in dir.listSync(recursive: true)) {
    if (entity is! File || !entity.path.endsWith('.dart')) continue;
    final content = File(entity.path).readAsStringSync();
    check(entity.path, content);
  }
}
