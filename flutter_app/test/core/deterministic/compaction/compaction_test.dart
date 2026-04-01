import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/compatibility/protocol_version.dart';
import 'package:iris_flutter_app/core/deterministic/compaction/compaction_policy.dart';
import 'package:iris_flutter_app/core/deterministic/compaction/compaction_result.dart';
import 'package:iris_flutter_app/core/deterministic/compaction/in_memory_snapshot_store.dart';
import 'package:iris_flutter_app/core/deterministic/compaction/ledger_compactor.dart';
import 'package:iris_flutter_app/core/deterministic/compaction/mutable_ledger_compaction_backend.dart';
import 'package:iris_flutter_app/core/deterministic/compaction/snapshot_manager.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_increment_event.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_state.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_transition.dart';
import 'package:iris_flutter_app/core/deterministic/base/event_source.dart';
import 'package:iris_flutter_app/core/deterministic/replay/deterministic_replay_engine.dart';

ExampleState initial() => ExampleState(name: 'c', counter: 0, tags: [], stateVersion: 0);

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

  CompactionPolicy smallPolicy({
    int minEvents = 10,
    int preserveRecent = 3,
    int preserveFork = 5,
  }) =>
      CompactionPolicy(
        minEventsBeforeCompaction: minEvents,
        preserveRecentEvents: preserveRecent,
        preserveForkWindow: preserveFork,
      );

  group('SnapshotManager', () {
    test('createSnapshot and loadSnapshot', () {
      final store = InMemorySnapshotStore();
      final manager = SnapshotManager<ExampleState>(store: store);
      final ledger = engine.replay(events(5));
      final snap = ledger.getSnapshotAt(2)!;
      final meta = manager.createSnapshot(snap, 3, createdAt: '2025-01-01T00:00:00Z');
      expect(meta.ledgerHeight, 3);
      expect(meta.stateHash, snap.stateHash);
      expect(meta.snapshotHash, snap.chainHash.toRadixString(16));
      final loaded = manager.loadSnapshot();
      expect(loaded, isNotNull);
      expect(loaded!.snapshotHash, meta.snapshotHash);
    });

    test('validateSnapshot matches', () {
      final store = InMemorySnapshotStore();
      final manager = SnapshotManager<ExampleState>(store: store);
      final ledger = engine.replay(events(5));
      final snap = ledger.getSnapshotAt(2)!;
      manager.createSnapshot(snap, 3);
      final loaded = manager.loadSnapshot()!;
      expect(manager.validateSnapshot(loaded, snap), true);
    });
  });

  group('LedgerCompactor', () {
    test('compaction eligibility: below threshold', () {
      final ledger = engine.replay(events(5));
      final store = InMemorySnapshotStore();
      final manager = SnapshotManager<ExampleState>(store: store);
      final backend = MutableLedgerCompactionBackend(
        initialLedger: ledger,
        snapshotManager: manager,
      );
      final compactor = LedgerCompactor(backend: backend, snapshotManager: manager);
      final result = compactor.compact(smallPolicy(minEvents: 10));
      expect(result.success, false);
      expect(result.message, contains('below min'));
      expect(backend.ledger.length, 5);
    });

    test('compaction at threshold: ledger size decreases', () {
      final ledger = engine.replay(events(12));
      final store = InMemorySnapshotStore();
      final manager = SnapshotManager<ExampleState>(store: store);
      final backend = MutableLedgerCompactionBackend(
        initialLedger: ledger,
        snapshotManager: manager,
      );
      final compactor = LedgerCompactor(backend: backend, snapshotManager: manager);
      final result = compactor.compact(smallPolicy(minEvents: 10, preserveRecent: 3, preserveFork: 5));
      expect(result.success, true);
      expect(result.previousLedgerSize, 12);
      expect(result.newLedgerSize, 5);
      expect(result.prunedEventsCount, 7);
      expect(result.newSnapshotHash, isNotNull);
      expect(backend.ledger.length, 5);
    });

    test('snapshot hash equals pre-compaction state at cut', () {
      final ledger = engine.replay(events(12));
      final store = InMemorySnapshotStore();
      final manager = SnapshotManager<ExampleState>(store: store);
      final backend = MutableLedgerCompactionBackend(
        initialLedger: ledger,
        snapshotManager: manager,
      );
      final compactor = LedgerCompactor(backend: backend, snapshotManager: manager);
      final snapAt6 = ledger.getSnapshotAt(6)!;
      final expectedHash = snapAt6.chainHash.toRadixString(16);
      final result = compactor.compact(smallPolicy(minEvents: 10, preserveRecent: 3, preserveFork: 5));
      expect(result.success, true);
      expect(result.newSnapshotHash, expectedHash);
    });

    test('replay after compaction produces identical final state', () {
      final ledger = engine.replay(events(12));
      final finalStateBefore = ledger.latestSnapshot!.state;
      final store = InMemorySnapshotStore();
      final manager = SnapshotManager<ExampleState>(store: store);
      final backend = MutableLedgerCompactionBackend(
        initialLedger: ledger,
        snapshotManager: manager,
      );
      final compactor = LedgerCompactor(backend: backend, snapshotManager: manager);
      compactor.compact(smallPolicy(minEvents: 10, preserveRecent: 3, preserveFork: 5));
      final compactedLedger = backend.ledger;
      final finalStateAfter = compactedLedger.latestSnapshot!.state;
      expect(finalStateAfter.counter, finalStateBefore.counter);
      expect(finalStateAfter.stateVersion, finalStateBefore.stateVersion);
    });

    test('abort when fork in window', () {
      final ledger = engine.replay(events(12));
      final store = InMemorySnapshotStore();
      final manager = SnapshotManager<ExampleState>(store: store);
      final backend = MutableLedgerCompactionBackend(
        initialLedger: ledger,
        snapshotManager: manager,
        hasForkInWindow: true,
      );
      final compactor = LedgerCompactor(backend: backend, snapshotManager: manager);
      final result = compactor.compact(smallPolicy(minEvents: 10));
      expect(result.success, false);
      expect(result.message, contains('Fork'));
      expect(backend.ledger.length, 12);
    });

    test('compaction on empty ledger not attempted', () {
      final ledger = engine.replay(<IncrementCounterEvent>[]);
      expect(ledger.length, 0);
      final store = InMemorySnapshotStore();
      final manager = SnapshotManager<ExampleState>(store: store);
      final backend = MutableLedgerCompactionBackend(
        initialLedger: ledger,
        snapshotManager: manager,
      );
      final compactor = LedgerCompactor(backend: backend, snapshotManager: manager);
      final result = compactor.compact(smallPolicy(minEvents: 1));
      expect(result.success, false);
      expect(backend.ledger.length, 0);
    });

    test('exactly at threshold boundary', () {
      final ledger = engine.replay(events(10));
      final store = InMemorySnapshotStore();
      final manager = SnapshotManager<ExampleState>(store: store);
      final backend = MutableLedgerCompactionBackend(
        initialLedger: ledger,
        snapshotManager: manager,
      );
      final compactor = LedgerCompactor(backend: backend, snapshotManager: manager);
      final result = compactor.compact(smallPolicy(minEvents: 10, preserveRecent: 3, preserveFork: 5));
      expect(result.success, true);
      expect(result.previousLedgerSize, 10);
      expect(result.newLedgerSize, 5);
    });

    test('compacted ledger verifyFullChain passes', () {
      final ledger = engine.replay(events(12));
      final store = InMemorySnapshotStore();
      final manager = SnapshotManager<ExampleState>(store: store);
      final backend = MutableLedgerCompactionBackend(
        initialLedger: ledger,
        snapshotManager: manager,
      );
      final compactor = LedgerCompactor(backend: backend, snapshotManager: manager);
      compactor.compact(smallPolicy(minEvents: 10));
      expect(backend.ledger.verifyFullChain(), true);
    });
  });

  group('CompactionResult', () {
    test('failure result has message', () {
      final result = CompactionResult(
        success: false,
        message: 'test failure',
      );
      expect(result.success, false);
      expect(result.message, 'test failure');
      expect(result.previousLedgerSize, 0);
    });
  });
}
