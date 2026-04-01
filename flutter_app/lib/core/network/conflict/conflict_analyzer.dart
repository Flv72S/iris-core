/// OX1 — Analyze divergent branches at object state level. No mutation.

import 'package:iris_flutter_app/core/network/conflict/conflict_analysis.dart';
import 'package:iris_flutter_app/core/network/conflict/conflict_type.dart';

/// Compares ancestor, local, and remote state maps. Classifies conflict; does not modify state.
class ConflictAnalyzer {
  ConflictAnalyzer();

  /// Analyze using canonical maps. [ancestor], [local], [remote] must not be mutated.
  ConflictAnalysis analyze({
    required Map<String, dynamic> ancestorState,
    required Map<String, dynamic> localState,
    required Map<String, dynamic> remoteState,
  }) {
    final ancestor = Map<String, dynamic>.from(ancestorState);
    final local = Map<String, dynamic>.from(localState);
    final remote = Map<String, dynamic>.from(remoteState);

    if (_mapsEqual(local, remote)) {
      return ConflictAnalysis(
        conflictType: ConflictType.noConflict,
        conflictingPaths: [],
        mergeable: true,
      );
    }

    final allKeys = <String>{...ancestor.keys, ...local.keys, ...remote.keys};
    final conflictingPaths = <String>[];
    ConflictType type = ConflictType.noConflict;
    bool nonOverlapping = true;

    for (final key in allKeys) {
      final a = ancestor[key];
      final l = local[key];
      final r = remote[key];
      final localChanged = !_valuesEqual(l, a);
      final remoteChanged = !_valuesEqual(r, a);

      if (localChanged && remoteChanged) {
        if (_valuesEqual(l, r)) continue;
        conflictingPaths.add(key);
        if (!_keyPresent(a) && _keyPresent(l) && _keyPresent(r)) {
          type = ConflictType.structuralConflict; // both added same key, different values
        } else if (_keyPresent(a) && (!_keyPresent(l) || !_keyPresent(r))) {
          type = ConflictType.objectDeletionConflict;
          nonOverlapping = false;
          break;
        } else {
          type = ConflictType.fieldLevelConflict;
        }
        nonOverlapping = false;
      } else if (_keyPresent(a) != _keyPresent(l) || _keyPresent(a) != _keyPresent(r)) {
        // Deletion only when ancestor had the key and one side removed it.
        if (_keyPresent(a) && (!_keyPresent(l) || !_keyPresent(r))) {
          type = ConflictType.objectDeletionConflict;
          conflictingPaths.add(key);
          nonOverlapping = false;
          break;
        }
        // Ancestor lacked key and one side added it: addition, not conflict (non-overlapping).
        if (!_keyPresent(a)) continue;
        type = ConflictType.structuralConflict;
        conflictingPaths.add(key);
        nonOverlapping = false;
      }
    }

    if (type == ConflictType.noConflict && nonOverlapping && conflictingPaths.isEmpty) {
      type = ConflictType.nonOverlappingChanges;
    }

    if (conflictingPaths.isNotEmpty && type == ConflictType.noConflict) {
      type = ConflictType.fieldLevelConflict;
    }

    final mergeable = type == ConflictType.noConflict ||
        type == ConflictType.nonOverlappingChanges;

    return ConflictAnalysis(
      conflictType: type,
      conflictingPaths: conflictingPaths,
      mergeable: mergeable,
    );
  }

  bool _mapsEqual(Map<String, dynamic> a, Map<String, dynamic> b) {
    if (a.length != b.length) return false;
    for (final k in a.keys) {
      if (!b.containsKey(k) || !_valuesEqual(a[k], b[k])) return false;
    }
    return true;
  }

  bool _valuesEqual(dynamic a, dynamic b) {
    if (a == b) return true;
    if (a is Map && b is Map) return _mapsEqual(Map<String, dynamic>.from(a), Map<String, dynamic>.from(b));
    if (a is List && b is List) {
      if (a.length != b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (!_valuesEqual(a[i], b[i])) return false;
      }
      return true;
    }
    return false;
  }

  bool _keyPresent(dynamic v) => v != null;
}
