/// O11 — O(1) access to snapshots by height or chain hash. Performance-only; does not override canonical ledger.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';

/// Index over a ledger for fast lookup. Verify snapshot hash when using for comparison.
/// Invalidate (rebuild) on fork resolution.
class LedgerIndex<S extends DeterministicState> {
  LedgerIndex(DeterministicLedger<S> ledger) {
    _build(ledger);
  }

  final List<StateSnapshot<S>?> _byHeight = [];
  final Map<String, StateSnapshot<S>> _byHash = {};

  void _build(DeterministicLedger<S> ledger) {
    _byHeight.clear();
    _byHash.clear();
    for (var i = 0; i < ledger.length; i++) {
      final snap = ledger.getSnapshotAt(i);
      _byHeight.add(snap);
      if (snap != null) {
        _byHash[snap.chainHash.toRadixString(16)] = snap;
      }
    }
  }

  /// Rebuild index from [ledger]. Call after ledger replace (e.g. fork resolution).
  void rebuild(DeterministicLedger<S> ledger) {
    _build(ledger);
  }

  int get length => _byHeight.length;

  /// Snapshot at [height]. Returns null if out of range. Cache is keyed by height.
  StateSnapshot<S>? getByHeight(int height) {
    if (height < 0 || height >= _byHeight.length) return null;
    return _byHeight[height];
  }

  /// Snapshot with given chain hash (hex). Returns null if not found.
  StateSnapshot<S>? getByHash(String chainHashHex) {
    return _byHash[chainHashHex];
  }

  /// Snapshots from [start] (inclusive) to [end] (exclusive). Returns empty if range invalid.
  List<StateSnapshot<S>> getRange(int start, int end) {
    if (start < 0 || end > _byHeight.length || start >= end) return [];
    final list = <StateSnapshot<S>>[];
    for (var i = start; i < end; i++) {
      final snap = _byHeight[i];
      if (snap != null) list.add(snap);
    }
    return list;
  }

  /// Chain hash at [height] for comparison. Returns null if out of range.
  int? chainHashAt(int height) {
    final snap = getByHeight(height);
    return snap?.chainHash;
  }
}
