import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/base/event_source.dart';
import 'package:iris_flutter_app/core/deterministic/chain/snapshot_chain_hasher.dart';
import 'package:iris_flutter_app/core/deterministic/compatibility/protocol_version.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_increment_event.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_state.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_transition.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/replay/deterministic_replay_engine.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';
import 'package:iris_flutter_app/core/storage/local/ledger_persistence.dart';
import 'package:iris_flutter_app/core/storage/storage_adapter.dart';

class InMemoryStorage implements StorageAdapter {
  final Map<String, List<int>> _store = {};

  @override
  void saveBytes(String key, List<int> bytes) {
    _store[key] = List.from(bytes);
  }

  @override
  List<int>? loadBytes(String key) => _store[key] != null ? List.from(_store[key]!) : null;

  @override
  void delete(String key) {
    _store.remove(key);
  }
}

ExampleState _stateFromMap(Map<String, dynamic> map) => ExampleState(
      name: map['name'] as String,
      counter: map['counter'] as int,
      tags: List<String>.from(map['tags'] as List),
      stateVersion: map['stateVersion'] as int,
    );

void main() {
  group('Protocol compatibility', () {
    test('Same version load passes', () {
      final storage = InMemoryStorage();
      final persistence = LedgerPersistence<ExampleState>(storage);
      final engine = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: ExampleState(name: 'v', counter: 0, tags: [], stateVersion: 0),
        transition: exampleIncrementTransition,
        protocolVersion: DeterministicProtocolVersion.initial,
      );
      final events = [
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
      ];
      final ledger = engine.replay(events);
      persistence.saveLedger('same', ledger);
      final loaded = persistence.loadLedger('same', _stateFromMap);
      expect(loaded.length, 1);
      expect(loaded.latestSnapshot!.protocolVersion.major, 1);
      expect(loaded.latestSnapshot!.protocolVersion.minor, 0);
    });

    test('Loading older minor (1.0 loading 1.0) allowed', () {
      const current = DeterministicProtocolVersion.initial;
      const snapshot = DeterministicProtocolVersion.initial;
      expect(current.isCompatibleWith(snapshot), true);
    });

    test('Loading newer minor (1.0 loading 1.1) throws CompatibilityViolation', () {
      const current = DeterministicProtocolVersion(major: 1, minor: 0);
      const snapshot = DeterministicProtocolVersion(major: 1, minor: 1);
      expect(
        () => current.isCompatibleWith(snapshot),
        throwsA(isA<CompatibilityViolation>()),
      );
    });

    test('Major version mismatch (1.x vs 2.0) incompatible', () {
      const current = DeterministicProtocolVersion(major: 1, minor: 0);
      const snapshot = DeterministicProtocolVersion(major: 2, minor: 0);
      expect(current.isCompatibleWith(snapshot), false);
    });

    test('Snapshot serialization includes protocolVersion — changing version changes chainHash', () {
      const v1 = DeterministicProtocolVersion.initial;
      const v2 = DeterministicProtocolVersion(major: 1, minor: 1);
      final h1 = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: SnapshotChainHasher.genesisChainHash,
        stateHash: 100,
        stateVersion: 1,
        transitionIndex: 0,
        protocolVersion: v1,
      );
      final h2 = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: SnapshotChainHasher.genesisChainHash,
        stateHash: 100,
        stateVersion: 1,
        transitionIndex: 0,
        protocolVersion: v2,
      );
      expect(h1, isNot(h2));
    });

    test('Replay blocked on incompatible version — loading snapshot with newer minor throws', () {
      final storage = InMemoryStorage();
      final persistence = LedgerPersistence<ExampleState>(storage);
      final engineV11 = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: ExampleState(name: 'v', counter: 0, tags: [], stateVersion: 0),
        transition: exampleIncrementTransition,
        protocolVersion: DeterministicProtocolVersion(major: 1, minor: 1),
      );
      final events = [
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
      ];
      final ledger = engineV11.replay(events);
      persistence.saveLedger('newer', ledger);
      expect(
        () => persistence.loadLedger('newer', _stateFromMap, currentVersion: DeterministicProtocolVersion.initial),
        throwsA(isA<CompatibilityViolation>()),
      );
    });

    test('Replay blocked on incompatible version — verifyAgainstLedger throws when ledger has newer minor', () {
      final engineV11 = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: ExampleState(name: 'v', counter: 0, tags: [], stateVersion: 0),
        transition: exampleIncrementTransition,
        protocolVersion: DeterministicProtocolVersion(major: 1, minor: 1),
      );
      final engineV10 = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: ExampleState(name: 'v', counter: 0, tags: [], stateVersion: 0),
        transition: exampleIncrementTransition,
        protocolVersion: DeterministicProtocolVersion.initial,
      );
      final events = [
        IncrementCounterEvent(amount: 1, eventIndex: 1, source: EventSource.internal),
      ];
      final ledgerV11 = engineV11.replay(events);
      expect(
        () => engineV10.verifyAgainstLedger(events: events, ledger: ledgerV11),
        throwsA(isA<CompatibilityViolation>()),
      );
    });

    test('SchemaGuard validates compatibility', () {
      DeterministicSchemaGuard.validateSchemaCompatibility(
        snapshotVersion: DeterministicProtocolVersion.initial,
        currentVersion: DeterministicProtocolVersion.initial,
      );
      expect(
        () => DeterministicSchemaGuard.validateSchemaCompatibility(
          snapshotVersion: DeterministicProtocolVersion(major: 2, minor: 0),
          currentVersion: DeterministicProtocolVersion.initial,
        ),
        throwsA(isA<CompatibilityViolation>()),
      );
    });
  });
}
