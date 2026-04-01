import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/base/event_source.dart';
import 'package:iris_flutter_app/core/deterministic/compatibility/protocol_version.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_increment_event.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_state.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_transition.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/performance/ledger_index.dart';
import 'package:iris_flutter_app/core/deterministic/performance/performance_profiler.dart';
import 'package:iris_flutter_app/core/deterministic/performance/replay_optimizer.dart';
import 'package:iris_flutter_app/core/deterministic/performance/snapshot_cache.dart';
import 'package:iris_flutter_app/core/deterministic/performance/sync_diff_optimizer.dart';
import 'package:iris_flutter_app/core/deterministic/replay/deterministic_replay_engine.dart';

ExampleState initial() => ExampleState(name: 'p', counter: 0, tags: [], stateVersion: 0);

List<IncrementCounterEvent> events(int n) => List.generate(
      n,
      (i) => IncrementCounterEvent(amount: 1, eventIndex: i, source: EventSource.internal),
    );

void main() {
  late DeterministicReplayEngine<ExampleState, IncrementCounterEvent> engine;

  setUp(() {
    engine = DeterministicReplayEngine(
      initialState: initial(),
      transition: exampleIncrementTransition,
      protocolVersion: DeterministicProtocolVersion.initial,
    );
  });

  group('ReplayOptimizer', () {
    test('output equality with baseline replay', () {
      final ledger = engine.replay(events(10));
      final snapshotAt3 = ledger.getSnapshotAt(3)!;
      final eventsAfter3 = events(10).sublist(4);
      final optimizer = ReplayOptimizer(engine: engine);
      final optimizedFinal = optimizer.replayFrom(snapshotAt3, eventsAfter3);
      final baselineLedger = engine.replay(events(10));
      final baselineFinal = baselineLedger.latestSnapshot!.state;
      expect(optimizedFinal.counter, baselineFinal.counter);
      expect(optimizedFinal.stateVersion, baselineFinal.stateVersion);
      expect(optimizedFinal.deterministicHash, baselineFinal.deterministicHash);
    });
  });

  group('LedgerIndex', () {
    test('getByHeight and getRange', () {
      final ledger = engine.replay(events(5));
      final index = LedgerIndex<ExampleState>(ledger);
      expect(index.length, 5);
      expect(index.getByHeight(0), isNotNull);
      expect(index.getByHeight(4), isNotNull);
      expect(index.getByHeight(5), isNull);
      final range = index.getRange(1, 4);
      expect(range.length, 3);
    });

    test('getByHash returns correct snapshot', () {
      final ledger = engine.replay(events(5));
      final index = LedgerIndex<ExampleState>(ledger);
      final snap = index.getByHeight(2)!;
      final byHash = index.getByHash(snap.chainHash.toRadixString(16));
      expect(byHash, isNotNull);
      expect(byHash!.chainHash, snap.chainHash);
    });

    test('rebuild determinism', () {
      final ledger = engine.replay(events(5));
      final index = LedgerIndex<ExampleState>(ledger);
      final hash0 = index.getByHeight(0)!.chainHash;
      index.rebuild(ledger);
      expect(index.getByHeight(0)!.chainHash, hash0);
    });
  });

  group('SnapshotCache', () {
    test('get and put', () {
      final ledger = engine.replay(events(3));
      final cache = SnapshotCache<ExampleState>();
      final snap = ledger.getSnapshotAt(1)!;
      cache.put(1, snap);
      expect(cache.get(1), same(snap));
      expect(cache.get(2), isNull);
    });

    test('invalidate after fork', () {
      final ledger = engine.replay(events(3));
      final cache = SnapshotCache<ExampleState>();
      cache.put(1, ledger.getSnapshotAt(1)!);
      expect(cache.size, 1);
      cache.invalidate();
      expect(cache.size, 0);
      expect(cache.get(1), isNull);
    });
  });

  group('SyncDiffOptimizer', () {
    test('findCommonAncestor correctness', () {
      final ledgerA = engine.replay(events(5));
      final ledgerB = engine.replay(events(5));
      final indexA = LedgerIndex<ExampleState>(ledgerA);
      final indexB = LedgerIndex<ExampleState>(ledgerB);
      final optimizer = SyncDiffOptimizer();
      final ancestor = optimizer.findCommonAncestor(indexA, indexB);
      expect(ancestor, 5);
    });

    test('findCommonAncestor with divergence', () {
      final ledgerA = engine.replay(events(5));
      final ledgerB = engine.replay(events(8));
      final indexA = LedgerIndex<ExampleState>(ledgerA);
      final indexB = LedgerIndex<ExampleState>(ledgerB);
      final optimizer = SyncDiffOptimizer();
      final ancestor = optimizer.findCommonAncestor(indexA, indexB);
      expect(ancestor, 5);
    });

    test('findCommonAncestor empty returns null', () {
      final ledger = engine.replay(events(2));
      final emptyLedger = DeterministicLedger<ExampleState>();
      final indexFull = LedgerIndex<ExampleState>(ledger);
      final indexEmpty = LedgerIndex<ExampleState>(emptyLedger);
      final optimizer = SyncDiffOptimizer();
      expect(optimizer.findCommonAncestor(indexFull, indexEmpty), isNull);
      expect(optimizer.findCommonAncestor(indexEmpty, indexFull), isNull);
    });
  });

  group('PerformanceProfiler', () {
    test('does not alter execution result', () {
      final profiler = PerformanceProfiler();
      profiler.start('replay');
      final ledger = engine.replay(events(5));
      profiler.end('replay');
      expect(ledger.length, 5);
      expect(ledger.latestSnapshot!.state.counter, 5);
      final m = profiler.getMetrics();
      expect(m['replay'], isNotNull);
    });

    test('getMetrics and reset', () {
      final profiler = PerformanceProfiler();
      profiler.start('a');
      profiler.end('a');
      expect(profiler.getMetrics()['a'], isNotNull);
      profiler.reset();
      expect(profiler.getMetrics(), isEmpty);
    });
  });
}
