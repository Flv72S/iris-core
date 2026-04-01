import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/base/event_source.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';
import 'package:iris_flutter_app/core/deterministic/engine/deterministic_state_engine.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_increment_event.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_state.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_transition.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/replay/deterministic_replay_engine.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';
import 'package:iris_flutter_app/core/deterministic/transition/deterministic_transition_executor.dart';

void main() {
  ExampleState initial() => ExampleState(
        name: 'replay',
        counter: 0,
        tags: [],
        stateVersion: 0,
      );

  List<IncrementCounterEvent> events(int count) => List.generate(
        count,
        (i) => IncrementCounterEvent(
          amount: 1,
          eventIndex: i + 1,
          source: EventSource.internal,
        ),
      );

  group('DeterministicReplayEngine basic replay', () {
    test('Replay then verifyAgainstLedger passes', () {
      final engine = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: initial(),
        transition: exampleIncrementTransition,
      );
      final evs = [
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
        IncrementCounterEvent(amount: 2, eventIndex: 2, source: EventSource.internal),
      ];
      final ledger = engine.replay(evs);
      expect(ledger.length, 2);
      expect(ledger.latestSnapshot!.state.counter, 3);
      expect(
        () => engine.verifyAgainstLedger(events: evs, ledger: ledger),
        returnsNormally,
      );
    });

    test('Ledger built via engine + manual snapshots matches replay ledger', () {
      final init = initial();
      final exec = DeterministicTransitionExecutor<ExampleState, IncrementCounterEvent>(
        exampleIncrementTransition,
      );
      final stateEngine = DeterministicStateEngine<ExampleState, IncrementCounterEvent>(
        initialState: init,
        executor: exec,
      );
      final evs = [
        IncrementCounterEvent(amount: 5, eventIndex: 1, source: EventSource.internal),
        IncrementCounterEvent(amount: 3, eventIndex: 2, source: EventSource.internal),
      ];
      for (final e in evs) {
        stateEngine.applyEvent(e);
      }
      final replayEngine = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: init,
        transition: exampleIncrementTransition,
      );
      final replayedLedger = replayEngine.replay(evs);
      expect(replayedLedger.length, 2);
      expect(replayedLedger.latestSnapshot!.state.counter, stateEngine.currentState.counter);
      expect(
        replayedLedger.latestSnapshot!.state.deterministicHash,
        stateEngine.currentState.deterministicHash,
      );
      replayEngine.verifyAgainstLedger(events: evs, ledger: replayedLedger);
    });
  });

  group('DeterministicReplayEngine determinism', () {
    test('Run replay twice, final chainHash identical', () {
      final engine = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: initial(),
        transition: exampleIncrementTransition,
      );
      final evs = events(5);
      final ledger1 = engine.replay(evs);
      final ledger2 = engine.replay(evs);
      expect(ledger1.length, ledger2.length);
      expect(ledger1.latestSnapshot!.chainHash, ledger2.latestSnapshot!.chainHash);
    });
  });

  group('DeterministicReplayEngine tamper detection', () {
    test('verifyAgainstLedger throws when ledger has tampered chainHash', () {
      final engine = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: initial(),
        transition: exampleIncrementTransition,
      );
      final evs = events(3);
      final validLedger = engine.replay(evs);
      final snap0 = validLedger.getSnapshotAt(0)!;
      final snap1 = validLedger.getSnapshotAt(1)!;
      final snap2 = validLedger.getSnapshotAt(2)!;
      final tamperedSnap1 = StateSnapshot<ExampleState>(
        state: snap1.state,
        stateHash: snap1.stateHash,
        stateVersion: snap1.stateVersion,
        transitionIndex: snap1.transitionIndex,
        chainHash: 999999,
      );
      final tamperedLedger = DeterministicLedger<ExampleState>.fromSnapshotListForTest(
        [snap0, tamperedSnap1, snap2],
      );
      expect(
        () => engine.verifyAgainstLedger(events: evs, ledger: tamperedLedger),
        throwsA(isA<DeterministicViolation>()),
      );
    });
  });

  group('DeterministicReplayEngine event order divergence', () {
    test('Swapped events produce different final chainHash', () {
      final engine = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: initial(),
        transition: exampleIncrementTransition,
      );
      final evs = [
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
        IncrementCounterEvent(amount: 2, eventIndex: 2, source: EventSource.internal),
      ];
      final ledgerOrig = engine.replay(evs);
      final swapped = [
        IncrementCounterEvent(amount: 2, eventIndex: 2, source: EventSource.internal),
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
      ];
      final ledgerSwapped = engine.replay(swapped);
      expect(ledgerOrig.latestSnapshot!.chainHash, isNot(ledgerSwapped.latestSnapshot!.chainHash));
    });

    test('verifyAgainstLedger fails when event order differs', () {
      final engine = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: initial(),
        transition: exampleIncrementTransition,
      );
      final evs = [
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
        IncrementCounterEvent(amount: 2, eventIndex: 2, source: EventSource.internal),
      ];
      final ledgerOrig = engine.replay(evs);
      final swapped = [
        IncrementCounterEvent(amount: 2, eventIndex: 2, source: EventSource.internal),
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
      ];
      expect(
        () => engine.verifyAgainstLedger(events: swapped, ledger: ledgerOrig),
        throwsA(isA<DeterministicViolation>()),
      );
    });
  });

  group('DeterministicReplayEngine partial sequence', () {
    test('Replay with last event removed does not match full ledger', () {
      final engine = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: initial(),
        transition: exampleIncrementTransition,
      );
      final fullEvs = events(4);
      final fullLedger = engine.replay(fullEvs);
      final partialEvs = fullEvs.sublist(0, 3);
      expect(
        () => engine.verifyAgainstLedger(events: partialEvs, ledger: fullLedger),
        throwsA(isA<DeterministicViolation>()),
      );
    });
  });

  group('DeterministicReplayEngine large sequence', () {
    test('100+ events replay remains stable', () {
      final engine = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: initial(),
        transition: exampleIncrementTransition,
      );
      final evs = events(110);
      final ledger1 = engine.replay(evs);
      final ledger2 = engine.replay(evs);
      expect(ledger1.length, 110);
      expect(ledger2.length, 110);
      expect(ledger1.latestSnapshot!.chainHash, ledger2.latestSnapshot!.chainHash);
      engine.verifyAgainstLedger(events: evs, ledger: ledger1);
    });
  });
}
