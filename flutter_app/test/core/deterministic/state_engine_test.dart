import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';
import 'package:iris_flutter_app/core/deterministic/engine/deterministic_state_engine.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_increment_event.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_state.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_transition.dart';
import 'package:iris_flutter_app/core/deterministic/base/event_source.dart';
import 'package:iris_flutter_app/core/deterministic/transition/deterministic_transition_executor.dart';

void main() {
  late DeterministicStateEngine<ExampleState, IncrementCounterEvent> engine;

  ExampleState _initialState() => ExampleState(
        name: 'x',
        counter: 0,
        tags: [],
        stateVersion: 0,
      );

  setUp(() {
    engine = DeterministicStateEngine<ExampleState, IncrementCounterEvent>(
      initialState: _initialState(),
      executor: DeterministicTransitionExecutor<ExampleState, IncrementCounterEvent>(
        exampleIncrementTransition,
      ),
    );
  });

  group('DeterministicStateEngine', () {
    test('valid sequential events applied correctly', () {
      expect(engine.currentEventIndex, 0);
      expect(engine.currentState.counter, 0);

      final s1 = engine.applyEvent(
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
      );
      expect(s1.counter, 1);
      expect(engine.currentEventIndex, 1);
      expect(engine.currentState.counter, 1);

      final s2 = engine.applyEvent(
        IncrementCounterEvent(amount: 2, eventIndex: 2, source: EventSource.internal),
      );
      expect(s2.counter, 3);
      expect(engine.currentEventIndex, 2);
      expect(engine.currentState.counter, 3);
    });

    test('eventIndex mismatch throws DeterministicViolation', () {
      expect(
        () => engine.applyEvent(
          IncrementCounterEvent(amount: 1, eventIndex: 2, source: EventSource.internal),
        ),
        throwsA(isA<DeterministicViolation>()),
      );
      expect(engine.currentEventIndex, 0);
      expect(engine.currentState.counter, 0);
    });

    test('duplicate eventIndex throws', () {
      engine.applyEvent(
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
      );
      expect(
        () => engine.applyEvent(
          IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
        ),
        throwsA(isA<DeterministicViolation>()),
      );
      expect(engine.currentEventIndex, 1);
      expect(engine.currentState.counter, 1);
    });

    test('skipped eventIndex throws', () {
      engine.applyEvent(
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
      );
      expect(
        () => engine.applyEvent(
          IncrementCounterEvent(amount: 1, eventIndex: 3, source: EventSource.internal),
        ),
        throwsA(isA<DeterministicViolation>()),
      );
      expect(engine.currentEventIndex, 1);
    });

    test('state evolves deterministically', () {
      engine.applyEvent(
        IncrementCounterEvent(amount: 5, eventIndex: 1, source: EventSource.internal),
      );
      engine.applyEvent(
        IncrementCounterEvent(amount: 3, eventIndex: 2, source: EventSource.internal),
      );
      expect(engine.currentState.stateVersion, 2);
      expect(engine.currentState.counter, 8);
      expect(engine.currentState.deterministicHash, isNotNull);
    });

    test('two engines with same initial state + same events produce identical final hash', () {
      final init = ExampleState(name: 'n', counter: 0, tags: [], stateVersion: 0);
      final exec = DeterministicTransitionExecutor<ExampleState, IncrementCounterEvent>(
        exampleIncrementTransition,
      );

      final engineA = DeterministicStateEngine<ExampleState, IncrementCounterEvent>(
        initialState: init,
        executor: exec,
      );
      engineA.applyEvent(
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
      );
      engineA.applyEvent(
        IncrementCounterEvent(amount: 2, eventIndex: 2, source: EventSource.internal),
      );

      final engineB = DeterministicStateEngine<ExampleState, IncrementCounterEvent>(
        initialState: init,
        executor: exec,
      );
      engineB.applyEvent(
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
      );
      engineB.applyEvent(
        IncrementCounterEvent(amount: 2, eventIndex: 2, source: EventSource.internal),
      );

      expect(engineA.currentState.deterministicHash, engineB.currentState.deterministicHash);
      expect(engineA.currentState.stateVersion, engineB.currentState.stateVersion);
    });

    test('engine does NOT allow manual state mutation', () {
      final before = engine.currentState;
      final beforeHash = before.deterministicHash;
      engine.applyEvent(
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
      );
      final after = engine.currentState;
      expect(after.deterministicHash, isNot(beforeHash));
      expect(identical(before, after), false);
      expect(after.counter, 1);
    });

    test('initialState.stateVersion < 0 throws DeterministicViolation', () {
      final badState = ExampleState(
        name: 'x',
        counter: 0,
        tags: [],
        stateVersion: -1,
      );
      expect(
        () => DeterministicStateEngine<ExampleState, IncrementCounterEvent>(
          initialState: badState,
          executor: DeterministicTransitionExecutor<ExampleState, IncrementCounterEvent>(
            exampleIncrementTransition,
          ),
        ),
        throwsA(isA<DeterministicViolation>()),
      );
    });
  });
}
