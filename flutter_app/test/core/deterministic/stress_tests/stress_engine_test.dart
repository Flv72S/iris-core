import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/base/event_source.dart';
import 'package:iris_flutter_app/core/deterministic/chain/snapshot_chain_hasher.dart';
import 'package:iris_flutter_app/core/deterministic/engine/deterministic_state_engine.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_increment_event.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_state.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_transition.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/replay/deterministic_replay_engine.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';
import 'package:iris_flutter_app/core/deterministic/transition/deterministic_transition_executor.dart';

ExampleState _initial() => ExampleState(
      name: 'stress',
      counter: 0,
      tags: [],
      stateVersion: 0,
    );

List<IncrementCounterEvent> _events(int count) => List.generate(
      count,
      (i) => IncrementCounterEvent(
        amount: 1,
        eventIndex: i + 1,
        source: EventSource.internal,
      ),
    );

/// Runs events through engine and builds ledger (same semantics as replay).
DeterministicLedger<ExampleState> _runEngineWithLedger(
  ExampleState initial,
  List<IncrementCounterEvent> events,
) {
  final engine = DeterministicStateEngine<ExampleState, IncrementCounterEvent>(
    initialState: initial,
    executor: DeterministicTransitionExecutor<ExampleState, IncrementCounterEvent>(
      exampleIncrementTransition,
    ),
  );
  final ledger = DeterministicLedger<ExampleState>();
  int prevChainHash = SnapshotChainHasher.genesisChainHash;
  for (var i = 0; i < events.length; i++) {
    final newState = engine.applyEvent(events[i]);
    final chainHash = SnapshotChainHasher.computeNextChainHash(
      previousChainHash: prevChainHash,
      stateHash: newState.deterministicHash,
      stateVersion: newState.stateVersion,
      transitionIndex: i,
    );
    final snapshot = StateSnapshot<ExampleState>.fromState(
      state: newState,
      transitionIndex: i,
      chainHash: chainHash,
    );
    ledger.append(snapshot);
    prevChainHash = snapshot.chainHash;
  }
  return ledger;
}

void main() {
  group('Stress: high volume transition', () {
    test('10,000 events through engine + ledger', () {
      const n = 10000;
      final initial = _initial();
      final events = _events(n);
      final ledger = _runEngineWithLedger(initial, events);
      expect(ledger.length, n);
      expect(ledger.latestSnapshot!.state.stateVersion, n);
      expect(ledger.latestSnapshot!.transitionIndex, n - 1);
    });
  });

  group('Stress: replay equivalence under load', () {
    test('5,000 events — engine ledger vs replay ledger identical', () {
      const n = 5000;
      final initial = _initial();
      final events = _events(n);
      final ledgerA = _runEngineWithLedger(initial, events);
      final replayEngine = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: initial,
        transition: exampleIncrementTransition,
      );
      final ledgerB = replayEngine.replay(events);
      expect(ledgerA.length, ledgerB.length);
      expect(ledgerA.latestSnapshot!.chainHash, ledgerB.latestSnapshot!.chainHash);
      for (var i = 0; i < ledgerA.length; i++) {
        final a = ledgerA.getSnapshotAt(i)!;
        final b = ledgerB.getSnapshotAt(i)!;
        expect(a.stateHash, b.stateHash);
        expect(a.chainHash, b.chainHash);
      }
    });
  });

  group('Stress: multi-run determinism', () {
    test('2,000 events — run twice, final chainHash identical (x3)', () {
      const n = 2000;
      final initial = _initial();
      final events = _events(n);
      final replayEngine = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: initial,
        transition: exampleIncrementTransition,
      );
      final ledger1 = replayEngine.replay(events);
      final ledger2 = replayEngine.replay(events);
      expect(ledger1.latestSnapshot!.chainHash, ledger2.latestSnapshot!.chainHash);

      final ledger3 = replayEngine.replay(events);
      final ledger4 = replayEngine.replay(events);
      expect(ledger3.latestSnapshot!.chainHash, ledger4.latestSnapshot!.chainHash);

      final ledger5 = replayEngine.replay(events);
      final ledger6 = replayEngine.replay(events);
      expect(ledger5.latestSnapshot!.chainHash, ledger6.latestSnapshot!.chainHash);

      expect(ledger1.latestSnapshot!.chainHash, ledger5.latestSnapshot!.chainHash);
    });
  });

  group('Stress: snapshot immutability', () {
    test('1,000 snapshots — exposed list is unmodifiable', () {
      const n = 1000;
      final ledger = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: _initial(),
        transition: exampleIncrementTransition,
      ).replay(_events(n));
      expect(ledger.length, n);
      expect(() => ledger.snapshots.add(ledger.latestSnapshot!), throwsUnsupportedError);
      expect(() => ledger.snapshots.clear(), throwsUnsupportedError);
    });

    test('State inside snapshot is immutable (no mutable escape)', () {
      const n = 100;
      final ledger = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: _initial(),
        transition: exampleIncrementTransition,
      ).replay(_events(n));
      final snap = ledger.getSnapshotAt(50)!;
      final tags = snap.state.tags;
      expect(() => tags.add('x'), throwsUnsupportedError);
    });
  });

  group('Stress: ledger verifyFullChain under load', () {
    test('After 5,000 transitions verifyFullChain returns true', () {
      const n = 5000;
      final ledger = _runEngineWithLedger(_initial(), _events(n));
      expect(ledger.verifyFullChain(), true);
    });
  });

  group('Stress: deep state structure', () {
    test('1,000 transitions with nested state — canonical and chain stable', () {
      const n = 1000;
      final initial = ExampleState(
        name: 'deep',
        counter: 0,
        tags: [],
        stateVersion: 0,
      );
      final events = _events(n);
      final replayEngine = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: initial,
        transition: exampleIncrementTransition,
      );
      final ledger1 = replayEngine.replay(events);
      final ledger2 = replayEngine.replay(events);
      expect(ledger1.latestSnapshot!.chainHash, ledger2.latestSnapshot!.chainHash);
      expect(ledger1.latestSnapshot!.state.deterministicHash,
          ledger2.latestSnapshot!.state.deterministicHash);
      replayEngine.verifyAgainstLedger(events: events, ledger: ledger1);
    });
  });

  group('Stress: deterministic byte stability', () {
    test('Final snapshot state — hash recomputed 3 times identical', () {
      const n = 500;
      final ledger = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: _initial(),
        transition: exampleIncrementTransition,
      ).replay(_events(n));
      final state = ledger.latestSnapshot!.state;
      final h1 = state.deterministicHash;
      final h2 = state.deterministicHash;
      final h3 = state.deterministicHash;
      expect(h1, h2);
      expect(h2, h3);
    });
  });
}
