import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/explainability_screen/deterministic_explainability_screen.dart';

void main() {
  test('screen has no bridge import', () {
    final screen = File('lib/ui/explainability_screen/deterministic_explainability_screen.dart');
    final content = screen.readAsStringSync();
    expect(content.contains('bridge/'), isFalse);
  });

  test('screen has no replay_store import', () {
    final screen = File('lib/ui/explainability_screen/deterministic_explainability_screen.dart');
    final content = screen.readAsStringSync();
    expect(content.contains('replay_store'), isFalse);
  });

  test('screen has no intent import', () {
    final screen = File('lib/ui/explainability_screen/deterministic_explainability_screen.dart');
    final content = screen.readAsStringSync();
    expect(content.contains('intents/'), isFalse);
  });

  test('screen uses contract explainability_contract', () {
    final screen = File('lib/ui/explainability_screen/deterministic_explainability_screen.dart');
    final content = screen.readAsStringSync();
    expect(content.contains('explainability_contract'), isTrue);
  });
}
