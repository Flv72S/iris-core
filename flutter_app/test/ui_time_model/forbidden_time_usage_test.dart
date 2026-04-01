// Phase 11.4.2 — Scan time_model for absence of DateTime, Stopwatch, Timer, external clock.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  final dir = Directory('lib/ui/time_model');

  test('time_model directory exists', () {
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

  test('no Stopwatch', () {
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        expect(
          f.readAsStringSync().contains('Stopwatch'),
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
          content.contains('Timer(') || content.contains('Timer.'),
          isFalse,
          reason: '${f.path} must not use Timer',
        );
      }
    }
  });

  test('no DateTime.now or system now', () {
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        final content = f.readAsStringSync();
        expect(content.contains('DateTime.now'), isFalse, reason: '${f.path} no DateTime.now');
      }
    }
  });
}
