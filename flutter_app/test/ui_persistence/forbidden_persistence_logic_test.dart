// Phase 11.5.1 — No DateTime.now, Random, selective update/delete, semantic branching.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  final dir = Directory('lib/ui/persistence');

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

  test('no selective update or delete', () {
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        final content = f.readAsStringSync();
        expect(
          content.contains('update(') || content.contains('.update('),
          isFalse,
          reason: '${f.path} no update',
        );
        expect(
          content.contains('delete(') || content.contains('remove('),
          isFalse,
          reason: '${f.path} no delete/remove',
        );
      }
    }
  });
}
