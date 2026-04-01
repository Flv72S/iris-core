import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_state.dart';

void main() {
  group('ExampleState hash stability', () {
    test('identical instances produce identical canonicalBytes and deterministicHash', () {
      final a = ExampleState(
        name: 'x',
        counter: 0,
        tags: ['a', 'b'],
        stateVersion: 1,
      );
      final b = ExampleState(
        name: 'x',
        counter: 0,
        tags: ['a', 'b'],
        stateVersion: 1,
      );
      expect(a.canonicalBytes, b.canonicalBytes);
      expect(a.deterministicHash, b.deterministicHash);
      expect(a.stateVersion, 1);
      expect(b.stateVersion, 1);
    });

    test('stateVersion stored correctly', () {
      final s = ExampleState(
        name: 'n',
        counter: 2,
        tags: [],
        stateVersion: 5,
      );
      expect(s.stateVersion, 5);
    });

    test('different constructor field order does NOT change hash', () {
      final a = ExampleState(
        name: 'n',
        counter: 1,
        tags: ['t'],
        stateVersion: 1,
      );
      final b = ExampleState(
        stateVersion: 1,
        tags: ['t'],
        counter: 1,
        name: 'n',
      );
      expect(a.deterministicHash, b.deterministicHash);
      expect(a.canonicalBytes, b.canonicalBytes);
    });

    test('changing one field changes hash', () {
      final base = ExampleState(
        name: 'n',
        counter: 0,
        tags: ['a'],
        stateVersion: 1,
      );
      final nameDiff = ExampleState(
        name: 'm',
        counter: 0,
        tags: ['a'],
        stateVersion: 1,
      );
      final counterDiff = ExampleState(
        name: 'n',
        counter: 1,
        tags: ['a'],
        stateVersion: 1,
      );
      final tagsDiff = ExampleState(
        name: 'n',
        counter: 0,
        tags: ['a', 'b'],
        stateVersion: 1,
      );
      expect(base.deterministicHash, isNot(nameDiff.deterministicHash));
      expect(base.deterministicHash, isNot(counterDiff.deterministicHash));
      expect(base.deterministicHash, isNot(tagsDiff.deterministicHash));
    });
  });
}
