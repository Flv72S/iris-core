/// O11 — In-memory snapshot cache by height. Invalidate on fork resolution. Performance-only.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';

/// Cache of snapshots keyed by ledger height. Does not override canonical ledger.
/// Call [invalidate] after fork resolution.
class SnapshotCache<S extends DeterministicState> {
  final Map<int, StateSnapshot<S>> _cache = {};

  /// Get cached snapshot at [height], or null if miss or invalidated.
  StateSnapshot<S>? get(int height) => _cache[height];

  /// Put snapshot at [height]. Performance-only; does not mutate ledger.
  void put(int height, StateSnapshot<S> snapshot) {
    _cache[height] = snapshot;
  }

  /// Clear cache. Call after fork resolution.
  void invalidate() {
    _cache.clear();
  }

  int get size => _cache.length;
}
