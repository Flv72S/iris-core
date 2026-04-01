import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_increment_event.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_state.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_transition.dart';
import 'package:iris_flutter_app/core/deterministic/base/event_source.dart';
import 'package:iris_flutter_app/core/deterministic/transition/deterministic_transition_executor.dart';

void main() {
  late DeterministicTransitionExecutor<ExampleState, IncrementCounterEvent> executor;

  setUp(() {
    executor = DeterministicTransitionExecutor<ExampleState, IncrementCounterEvent>(
      exampleIncrementTransition,
    );
  });

  group('DeterministicTransitionExecutor', () {
    test('valid transition increments version', () {
      final s0 = ExampleState(name: 'x', counter: 0, tags: [], stateVersion: 1);
      final e = IncrementCounterEvent(amount: 1, eventIndex: 0, source: EventSource.internal);
      final s1 = executor.apply(s0, e);
      expect(s1.stateVersion, 2);
      expect(s0.stateVersion, 1);
    });

    test('valid transition changes hash', () {
      final s0 = ExampleState(name: 'x', counter: 0, tags: [], stateVersion: 1);
      final e = IncrementCounterEvent(amount: 1, eventIndex: 0, source: EventSource.internal);
      final s1 = executor.apply(s0, e);
      expect(s1.deterministicHash, isNot(s0.deterministicHash));
    });

    test('returning same instance throws violation', () {
      ExampleState sameInstanceTransition(ExampleState state, IncrementCounterEvent event) =>
          state;
      final exec = DeterministicTransitionExecutor<ExampleState, IncrementCounterEvent>(
        sameInstanceTransition,
      );
      final s0 = ExampleState(name: 'x', counter: 0, tags: [], stateVersion: 1);
      final e = IncrementCounterEvent(amount: 1, eventIndex: 0, source: EventSource.internal);
      expect(
        () => exec.apply(s0, e),
        throwsA(isA<DeterministicViolation>().having(
          (x) => x.message,
          'message',
          'transition returned same instance',
        )),
      );
    });

    test('not incrementing version throws violation', () {
      ExampleState noVersionBump(ExampleState state, IncrementCounterEvent event) =>
          ExampleState(
            name: state.name,
            counter: state.counter + event.amount,
            tags: List<String>.from(state.tags),
            stateVersion: state.stateVersion,
          );
      final exec = DeterministicTransitionExecutor<ExampleState, IncrementCounterEvent>(
        noVersionBump,
      );
      final s0 = ExampleState(name: 'x', counter: 0, tags: [], stateVersion: 1);
      final e = IncrementCounterEvent(amount: 1, eventIndex: 0, source: EventSource.internal);
      expect(
        () => exec.apply(s0, e),
        throwsA(isA<DeterministicViolation>().having(
          (x) => x.message,
          'message',
          'State version must increment by 1',
        )),
      );
    });

    test('two identical transitions produce identical resulting hash', () {
      final s0 = ExampleState(name: 'a', counter: 0, tags: ['t'], stateVersion: 1);
      final e = IncrementCounterEvent(amount: 2, eventIndex: 0, source: EventSource.internal);
      final s1a = executor.apply(s0, e);
      final s1b = executor.apply(s0, e);
      expect(s1a.deterministicHash, s1b.deterministicHash);
    });

    test('replay same sequence produces same final hash', () {
      final s0 = ExampleState(name: 'n', counter: 0, tags: [], stateVersion: 1);
      final e1 = IncrementCounterEvent(amount: 1, eventIndex: 0, source: EventSource.internal);
      final e2 = IncrementCounterEvent(amount: 3, eventIndex: 1, source: EventSource.internal);
      final s1 = executor.apply(s0, e1);
      final s2 = executor.apply(s1, e2);
      final s0Replay = ExampleState(name: 'n', counter: 0, tags: [], stateVersion: 1);
      final s1Replay = executor.apply(s0Replay, e1);
      final s2Replay = executor.apply(s1Replay, e2);
      expect(s2.deterministicHash, s2Replay.deterministicHash);
    });
  });
}
