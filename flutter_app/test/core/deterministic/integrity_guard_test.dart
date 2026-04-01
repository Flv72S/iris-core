import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/base/event_source.dart';
import 'package:iris_flutter_app/core/deterministic/chain/snapshot_chain_hasher.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';
import 'package:iris_flutter_app/core/deterministic/engine/deterministic_state_engine.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_increment_event.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_state.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_transition.dart';
import 'package:iris_flutter_app/core/deterministic/integrity/deterministic_integrity_guard.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/replay/deterministic_replay_engine.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';
import 'package:iris_flutter_app/core/deterministic/transition/deterministic_transition_executor.dart';

void main() {
  ExampleState initial() => ExampleState(
        name: 'guard',
        counter: 0,
        tags: [],
        stateVersion: 0,
      );

  group('DeterministicIntegrityGuard normal execution', () {
    test('strictMode true: full flow passes', () {
      final guard = DeterministicIntegrityGuard<ExampleState, IncrementCounterEvent>(
        strictMode: true,
      );
      final init = initial();
      final ledger = DeterministicLedger<ExampleState>();
      final replayEngine = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: init,
        transition: exampleIncrementTransition,
      );
      final events = [
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
        IncrementCounterEvent(amount: 2, eventIndex: 2, source: EventSource.internal),
      ];
      final replayed = replayEngine.replay(events);
      for (var i = 0; i < replayed.length; i++) {
        final snap = replayed.getSnapshotAt(i)!;
        final prev = i == 0 ? null : replayed.getSnapshotAt(i - 1);
        guard.validateSnapshot(snapshot: snap, previousSnapshot: prev);
        ledger.append(snap);
      }
      guard.validateLedgerIntegrity(ledger);
      guard.validateStrictReplay(
        events: events,
        ledger: ledger,
        initialState: init,
        transition: exampleIncrementTransition,
      );
    });
  });

  group('DeterministicIntegrityGuard transition mutation', () {
    test('validateTransition throws when newState is same instance as previousState', () {
      final guard = DeterministicIntegrityGuard<ExampleState, IncrementCounterEvent>();
      final s = ExampleState(name: 'x', counter: 1, tags: [], stateVersion: 1);
      final e = IncrementCounterEvent(amount: 0, eventIndex: 1, source: EventSource.internal);
      expect(
        () => guard.validateTransition(previousState: s, event: e, newState: s),
        throwsA(isA<DeterministicViolation>()),
      );
    });

    test('validateTransition throws when newState has same deterministicHash as previousState', () {
      final guard = DeterministicIntegrityGuard<ExampleState, IncrementCounterEvent>();
      final prev = ExampleState(name: 'x', counter: 0, tags: [], stateVersion: 0);
      final same = ExampleState(name: 'x', counter: 0, tags: [], stateVersion: 0);
      final e = IncrementCounterEvent(amount: 0, eventIndex: 1, source: EventSource.internal);
      expect(
        () => guard.validateTransition(previousState: prev, event: e, newState: same),
        throwsA(isA<DeterministicViolation>()),
      );
    });
  });

  group('DeterministicIntegrityGuard chainHash corruption', () {
    test('validateSnapshot throws when snapshot has wrong chainHash', () {
      final guard = DeterministicIntegrityGuard<ExampleState, IncrementCounterEvent>();
      final state = ExampleState(name: 'x', counter: 1, tags: [], stateVersion: 1);
      final wrongChainHash = StateSnapshot<ExampleState>(
        state: state,
        stateHash: state.deterministicHash,
        stateVersion: state.stateVersion,
        transitionIndex: 0,
        chainHash: 999999,
      );
      expect(
        () => guard.validateSnapshot(snapshot: wrongChainHash, previousSnapshot: null),
        throwsA(isA<DeterministicViolation>()),
      );
    });
  });

  group('DeterministicIntegrityGuard ledger corruption', () {
    test('validateLedgerIntegrity throws for tampered ledger', () {
      final guard = DeterministicIntegrityGuard<ExampleState, IncrementCounterEvent>();
      final init = initial();
      final replayEngine = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: init,
        transition: exampleIncrementTransition,
      );
      final events = [
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
      ];
      final validLedger = replayEngine.replay(events);
      final snap0 = validLedger.getSnapshotAt(0)!;
      final tampered = StateSnapshot<ExampleState>(
        state: snap0.state,
        stateHash: snap0.stateHash,
        stateVersion: snap0.stateVersion,
        transitionIndex: snap0.transitionIndex,
        chainHash: 12345,
      );
      final tamperedLedger = DeterministicLedger<ExampleState>.fromSnapshotListForTest([tampered]);
      expect(
        () => guard.validateLedgerIntegrity(tamperedLedger),
        throwsA(isA<DeterministicViolation>()),
      );
    });
  });

  group('DeterministicIntegrityGuard strict mode replay divergence', () {
    test('validateStrictReplay throws when event sequence differs', () {
      final guard = DeterministicIntegrityGuard<ExampleState, IncrementCounterEvent>(
        strictMode: true,
      );
      final init = initial();
      final eventsA = [
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
        IncrementCounterEvent(amount: 2, eventIndex: 2, source: EventSource.internal),
      ];
      final eventsB = [
        IncrementCounterEvent(amount: 2, eventIndex: 2, source: EventSource.internal),
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
      ];
      final replayEngine = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: init,
        transition: exampleIncrementTransition,
      );
      final ledgerA = replayEngine.replay(eventsA);
      expect(
        () => guard.validateStrictReplay(
          events: eventsB,
          ledger: ledgerA,
          initialState: init,
          transition: exampleIncrementTransition,
        ),
        throwsA(isA<DeterministicViolation>()),
      );
    });
  });

  group('DeterministicIntegrityGuard strictMode false', () {
    test('Structural checks still enforced when strictMode false', () {
      final guard = DeterministicIntegrityGuard<ExampleState, IncrementCounterEvent>(
        strictMode: false,
      );
      final state = ExampleState(name: 'x', counter: 1, tags: [], stateVersion: 1);
      final badSnapshot = StateSnapshot<ExampleState>(
        state: state,
        stateHash: state.deterministicHash,
        stateVersion: state.stateVersion,
        transitionIndex: 0,
        chainHash: 999999,
      );
      expect(
        () => guard.validateSnapshot(snapshot: badSnapshot, previousSnapshot: null),
        throwsA(isA<DeterministicViolation>()),
      );
    });

    test('validateStrictReplay does nothing when strictMode false', () {
      final guard = DeterministicIntegrityGuard<ExampleState, IncrementCounterEvent>(
        strictMode: false,
      );
      final init = initial();
      final events = [
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
      ];
      final replayEngine = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: init,
        transition: exampleIncrementTransition,
      );
      final ledger = replayEngine.replay(events);
      final wrongEvents = [
        IncrementCounterEvent(amount: 99, eventIndex: 1, source: EventSource.internal),
      ];
      expect(
        () => guard.validateStrictReplay(
          events: wrongEvents,
          ledger: ledger,
          initialState: init,
          transition: exampleIncrementTransition,
        ),
        returnsNormally,
      );
    });
  });

  group('DeterministicStateEngine with integrityGuard', () {
    test('Engine with guard calls validateTransition', () {
      final guard = DeterministicIntegrityGuard<ExampleState, IncrementCounterEvent>();
      final engine = DeterministicStateEngine<ExampleState, IncrementCounterEvent>(
        initialState: initial(),
        executor: DeterministicTransitionExecutor<ExampleState, IncrementCounterEvent>(
          exampleIncrementTransition,
        ),
        integrityGuard: guard,
      );
      engine.applyEvent(
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
      );
      expect(engine.currentState.counter, 1);
    });

    test('Engine without guard still works', () {
      final engine = DeterministicStateEngine<ExampleState, IncrementCounterEvent>(
        initialState: initial(),
        executor: DeterministicTransitionExecutor<ExampleState, IncrementCounterEvent>(
          exampleIncrementTransition,
        ),
      );
      engine.applyEvent(
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
      );
      expect(engine.currentState.counter, 1);
    });
  });
}
