/// OX2 — Persist projection state with deterministic hash verification.

import 'package:iris_flutter_app/core/deterministic/utils/canonical_serializer.dart';
import 'package:iris_flutter_app/core/deterministic/utils/deterministic_hash.dart';

/// Stored entry: state map (canonical), version, ledger height, hash.
class ProjectionStoreEntry {
  const ProjectionStoreEntry({
    required this.stateMap,
    required this.version,
    required this.ledgerHeight,
    required this.stateHash,
  });

  final Map<String, dynamic> stateMap;
  final int version;
  final int ledgerHeight;
  final int stateHash;
}

/// Persists projection state. On load, hash is verified; mismatch invalidates and forces rebuild.
class ProjectionStore {
  ProjectionStore();

  final Map<String, ProjectionStoreEntry> _store = <String, ProjectionStoreEntry>{};

  /// Saves projection state. [stateMap] must be canonical; [stateHash] must match hash of stateMap.
  void save(String id, Map<String, dynamic> stateMap, int version, int ledgerHeight) {
    final stateHash = _hashMap(stateMap);
    _store[id] = ProjectionStoreEntry(
      stateMap: Map<String, dynamic>.from(stateMap),
      version: version,
      ledgerHeight: ledgerHeight,
      stateHash: stateHash,
    );
  }

  /// Loads projection. Returns null if not found or hash mismatch (invalidated).
  ProjectionStoreEntry? load(String id) {
    final entry = _store[id];
    if (entry == null) return null;
    final recomputed = _hashMap(entry.stateMap);
    if (entry.stateHash != recomputed) return null;
    return entry;
  }

  void clear(String id) {
    _store.remove(id);
  }

  void clearAll() {
    _store.clear();
  }

  static int _hashMap(Map<String, dynamic> map) {
    final bytes = CanonicalSerializer.canonicalSerialize(map);
    return DeterministicHash.computeDeterministicHash(bytes);
  }
}
