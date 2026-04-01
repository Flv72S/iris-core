import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('no DateTime.now', () {
    for (final f in Directory('lib/ui/trace_navigation').listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        expect(f.readAsStringSync().contains('DateTime.now()'), isFalse);
      }
    }
  });
  test('no Random', () {
    for (final f in Directory('lib/ui/trace_navigation').listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        expect(f.readAsStringSync().contains('Random()'), isFalse);
      }
    }
  });
  test('no Navigator.push', () {
    for (final f in Directory('lib/ui/trace_navigation').listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        expect(f.readAsStringSync().contains('Navigator.push('), isFalse);
      }
    }
  });
}
