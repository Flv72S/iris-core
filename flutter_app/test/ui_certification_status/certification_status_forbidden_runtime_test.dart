// Microstep 12.1 — No DateTime, Random, Stopwatch, Timer in certification_status.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  final dir = Directory('lib/ui/certification_status');

  test('certification_status directory exists', () {
    expect(dir.existsSync(), isTrue);
  });

  test('no DateTime', () {
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        final content = f.readAsStringSync();
        expect(
          content.contains('DateTime'),
          isFalse,
          reason: '${f.path} must not use DateTime',
        );
      }
    }
  });

  test('no Random', () {
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        final content = f.readAsStringSync();
        expect(
          content.contains('Random'),
          isFalse,
          reason: '${f.path} must not use Random',
        );
      }
    }
  });

  test('no Stopwatch', () {
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        final content = f.readAsStringSync();
        expect(
          content.contains('Stopwatch'),
          isFalse,
          reason: '${f.path} must not use Stopwatch',
        );
      }
    }
  });

  test('no Timer', () {
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        final content = f.readAsStringSync();
        expect(
          content.contains('Timer'),
          isFalse,
          reason: '${f.path} must not use Timer',
        );
      }
    }
  });
}
