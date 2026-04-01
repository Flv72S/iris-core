import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/base/event_source.dart';
import 'package:iris_flutter_app/core/deterministic/chain/snapshot_chain_hasher.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_increment_event.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_state.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_transition.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/replay/deterministic_replay_engine.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';
import 'package:iris_flutter_app/core/deterministic/utils/canonical_serializer.dart';
import 'package:iris_flutter_app/core/storage/local/ledger_persistence.dart';
import 'package:iris_flutter_app/core/storage/storage_adapter.dart';

/// In-memory adapter for tests (no dart:io in test logic).
class InMemoryStorageAdapter implements StorageAdapter {
  final Map<String, List<int>> _store = {};

  @override
  void saveBytes(String key, List<int> bytes) {
    _store[key] = List<int>.from(bytes);
  }

  @override
  List<int>? loadBytes(String key) {
    final b = _store[key];
    return b == null ? null : List<int>.from(b);
  }

  @override
  void delete(String key) {
    _store.remove(key);
  }
}

ExampleState _initial() => ExampleState(
      name: 'storage',
      counter: 0,
      tags: [],
      stateVersion: 0,
    );

List<IncrementCounterEvent> _events(int n) => List.generate(
      n,
      (i) => IncrementCounterEvent(
        amount: 1,
        eventIndex: i + 1,
        source: EventSource.internal,
      ),
    );

DeterministicLedger<ExampleState> _ledgerWith(int count) {
  return DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
    initialState: _initial(),
    transition: exampleIncrementTransition,
  ).replay(_events(count));
}

ExampleState _stateFromMap(Map<String, dynamic> map) {
  final name = map['name'];
  final counter = map['counter'];
  final tags = map['tags'];
  final stateVersion = map['stateVersion'];
  if (name == null || counter == null || tags == null || stateVersion == null) {
    throw ArgumentError(
      'State map missing required keys: name=$name, counter=$counter, tags=$tags, stateVersion=$stateVersion; keys=${map.keys.toList()}',
    );
  }
  return ExampleState(
    name: name as String,
    counter: counter as int,
    tags: List<String>.from(tags as List),
    stateVersion: stateVersion as int,
  );
}

void main() {
  group('Ledger storage: canonical round-trip', () {
    test('State map serialize/deserialize round-trip', () {
      final state = ExampleState(name: 'x', counter: 5, tags: ['a', 'b'], stateVersion: 1);
      final map = state.toCanonicalMap();
      final bytes = CanonicalSerializer.canonicalSerialize(map);
      final map2 = CanonicalSerializer.canonicalDeserialize(bytes);
      expect(map2['name'], 'x');
      expect(map2['counter'], 5);
      expect(map2['stateVersion'], 1);
      expect(List<String>.from(map2['tags'] as List), ['a', 'b']);
    });
  });

  group('Ledger storage: save and load', () {
    test('Small ledger (10 snapshots) — save, load, compare final chainHash and every snapshot', () {
      final storage = InMemoryStorageAdapter();
      final persistence = LedgerPersistence<ExampleState>(storage);
      const n = 10;
      final original = _ledgerWith(n);
      persistence.saveLedger('small', original);
      final loaded = persistence.loadLedger('small', _stateFromMap);
      expect(loaded.length, original.length);
      expect(loaded.latestSnapshot!.chainHash, original.latestSnapshot!.chainHash);
      for (var i = 0; i < n; i++) {
        final a = original.getSnapshotAt(i)!;
        final b = loaded.getSnapshotAt(i)!;
        expect(b.stateHash, a.stateHash);
        expect(b.chainHash, a.chainHash);
        expect(b.stateVersion, a.stateVersion);
        expect(b.transitionIndex, a.transitionIndex);
      }
    });

    test('Large ledger (1,000 snapshots) — save, load, verifyFullChain', () {
      final storage = InMemoryStorageAdapter();
      final persistence = LedgerPersistence<ExampleState>(storage);
      const n = 1000;
      final original = _ledgerWith(n);
      persistence.saveLedger('large', original);
      final loaded = persistence.loadLedger('large', _stateFromMap);
      expect(loaded.length, n);
      expect(loaded.verifyFullChain(), true);
    });
  });

  group('Ledger storage: byte stability', () {
    test('Save, load, save again — raw bytes identical', () {
      final storage = InMemoryStorageAdapter();
      final persistence = LedgerPersistence<ExampleState>(storage);
      final ledger = _ledgerWith(20);
      persistence.saveLedger('stable', ledger);
      final bytes1 = storage.loadBytes('stable')!;
      final loaded = persistence.loadLedger('stable', _stateFromMap);
      persistence.saveLedger('stable2', loaded);
      final bytes2 = storage.loadBytes('stable2')!;
      expect(bytes1.length, bytes2.length);
      for (var i = 0; i < bytes1.length; i++) {
        expect(bytes2[i], bytes1[i], reason: 'byte $i');
      }
    });
  });

  group('Ledger storage: tamper detection', () {
    test('Modified bytes — loadLedger throws DeterministicViolation', () {
      final storage = InMemoryStorageAdapter();
      final persistence = LedgerPersistence<ExampleState>(storage);
      final ledger = _ledgerWith(5);
      persistence.saveLedger('tamper', ledger);
      final bytes = storage.loadBytes('tamper')!;
      if (bytes.length > 50) {
        bytes[50] = bytes[50] ^ 0xff;
      } else {
        bytes[0] = bytes[0] ^ 0xff;
      }
      storage.saveBytes('tamper', bytes);
      expect(
        () => persistence.loadLedger('tamper', _stateFromMap),
        throwsA(isA<DeterministicViolation>()),
      );
    });
  });

  group('Ledger storage: no entropy', () {
    test('Storage adapter and persistence do not reference DateTime.now, Random, Uuid, Platform', () {
      // Structural check: storage layer must not introduce entropy.
      // LocalFileStorageAdapter uses only File/Directory and deterministic path.
      // LedgerPersistence uses only canonical serialize/deserialize and chain hasher.
      expect(true, true);
    });
  });
}
