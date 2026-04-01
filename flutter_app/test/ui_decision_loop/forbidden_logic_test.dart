// Phase 11.4.1 — Scan decision_loop for absence of forbidden patterns.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  final dir = Directory('lib/ui/decision_loop');
  if (!dir.existsSync()) {
    test('decision_loop dir exists', () => expect(dir.existsSync(), isTrue));
    return;
  }

  test('no DateTime.now', () {
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        expect(
          f.readAsStringSync().contains('DateTime.now'),
          isFalse,
          reason: '${f.path} must not use DateTime.now',
        );
      }
    }
  });

  test('no Random', () {
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        expect(
          f.readAsStringSync().contains('Random()'),
          isFalse,
          reason: '${f.path} must not use Random',
        );
      }
    }
  });

  test('no retry or fallback semantics', () {
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        final content = f.readAsStringSync();
        // Forbid retry/fallback as code (e.g. .retry, retry(), fallback). Allow in comments.
        expect(content.contains('.retry') || content.contains('retry()'), isFalse, reason: '${f.path} no retry');
        expect(content.contains('fallback(') || content.contains('Fallback'), isFalse, reason: '${f.path} no fallback');
      }
    }
  });

  test('no network or file access', () {
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        final content = f.readAsStringSync();
        expect(content.contains('HttpClient') || content.contains('http.'), isFalse,
            reason: '${f.path} no http');
        expect(content.contains('File(') && content.contains('readAsString'), isFalse,
            reason: '${f.path} no file read');
      }
    }
  });
}
