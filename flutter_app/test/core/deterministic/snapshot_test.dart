import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_state.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';

void main() {
  group('StateSnapshot', () {
    late ExampleState exampleState;

    setUp(() {
      exampleState = ExampleState(
        name: 'test',
        counter: 42,
        tags: ['a', 'b'],
        stateVersion: 2,
      );
    });

    test('Snapshot captures correct stateHash', () {
      final snapshot = StateSnapshot<ExampleState>.fromState(
        state: exampleState,
        transitionIndex: 0,
        chainHash: 100,
      );
      expect(snapshot.stateHash, exampleState.deterministicHash);
    });

    test('Snapshot captures correct stateVersion', () {
      final snapshot = StateSnapshot<ExampleState>.fromState(
        state: exampleState,
        transitionIndex: 1,
        chainHash: 0,
      );
      expect(snapshot.stateVersion, exampleState.stateVersion);
      expect(snapshot.stateVersion, 2);
    });

    test('transitionIndex stored correctly', () {
      final snapshot = StateSnapshot<ExampleState>.fromState(
        state: exampleState,
        transitionIndex: 7,
        chainHash: 0,
      );
      expect(snapshot.transitionIndex, 7);
    });

    test('chainHash stored correctly', () {
      const chainHash = 12345;
      final snapshot = StateSnapshot<ExampleState>.fromState(
        state: exampleState,
        transitionIndex: 0,
        chainHash: chainHash,
      );
      expect(snapshot.chainHash, chainHash);
    });

    test('Integrity check passes for valid snapshot', () {
      final snapshot = StateSnapshot<ExampleState>.fromState(
        state: exampleState,
        transitionIndex: 0,
        chainHash: 0,
      );
      expect(() => snapshot.verifyIntegrity(), returnsNormally);
    });

    test('Integrity check fails if snapshot is inconsistent', () {
      final snapshot = StateSnapshot<ExampleState>(
        state: exampleState,
        stateHash: 999,
        stateVersion: exampleState.stateVersion,
        transitionIndex: 0,
        chainHash: 0,
      );
      expect(
        () => snapshot.verifyIntegrity(),
        throwsA(isA<DeterministicViolation>()),
      );
    });

    test('Two identical states produce equal snapshots', () {
      final state2 = ExampleState(
        name: 'test',
        counter: 42,
        tags: ['a', 'b'],
        stateVersion: 2,
      );
      final snapshot1 = StateSnapshot<ExampleState>.fromState(
        state: exampleState,
        transitionIndex: 3,
        chainHash: 77,
      );
      final snapshot2 = StateSnapshot<ExampleState>.fromState(
        state: state2,
        transitionIndex: 3,
        chainHash: 77,
      );
      expect(snapshot1, equals(snapshot2));
      expect(snapshot1.hashCode, snapshot2.hashCode);
    });
  });
}
