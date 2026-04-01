// Phase 11.8.2 — No DateTime, Timer, Random, storage, network in runtime_trust.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('runtime_trust source does not use DateTime', () {
    final dir = Directory('lib/ui/runtime_trust');
    if (!dir.existsSync()) return;
    for (final entity in dir.listSync(recursive: true)) {
      if (entity is File && entity.path.endsWith('.dart')) {
        final content = entity.readAsStringSync();
        expect(
          content.contains('DateTime.now') || content.contains('DateTime.'),
          isFalse,
          reason: '${entity.path} must not use DateTime',
        );
      }
    }
  });

  test('runtime_trust source does not use Timer', () {
    final dir = Directory('lib/ui/runtime_trust');
    if (!dir.existsSync()) return;
    for (final entity in dir.listSync(recursive: true)) {
      if (entity is File && entity.path.endsWith('.dart')) {
        final content = entity.readAsStringSync();
        expect(content.contains('Timer.'), isFalse,
            reason: '${entity.path} must not use Timer');
      }
    }
  });

  test('runtime_trust source does not use Random', () {
    final dir = Directory('lib/ui/runtime_trust');
    if (!dir.existsSync()) return;
    for (final entity in dir.listSync(recursive: true)) {
      if (entity is File && entity.path.endsWith('.dart')) {
        final content = entity.readAsStringSync();
        expect(content.contains('Random()'), isFalse,
            reason: '${entity.path} must not use Random()');
      }
    }
  });
}
