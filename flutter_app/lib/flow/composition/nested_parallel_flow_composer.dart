// M7 — Nested parallel composition. Order-invariant over ComposableDeterministicUnit; no modification to M3–M6.

import 'dart:typed_data';

import 'package:iris_flutter_app/flow/composition/composable_deterministic_unit.dart';
import 'package:iris_flutter_app/flow/composition/nested_composite_deterministic_contract.dart';

/// Composes [ComposableDeterministicUnit] (DEC, CDC, nested) in order-invariant order. Same semantics as M4 for units.
class NestedParallelFlowComposer {
  NestedParallelFlowComposer();

  /// 1. Validate non-empty. 2. Defensive copy. 3. Sort by deterministicHash asc, then canonicalBytes lex. 4. Build nested CDC.
  NestedCompositeDeterministicContract compose(List<ComposableDeterministicUnit> units) {
    if (units.isEmpty) {
      throw ArgumentError('units must not be empty');
    }
    final sorted = List<ComposableDeterministicUnit>.from(units)..sort(_compareUnit);
    return NestedCompositeDeterministicContract(sorted);
  }

  static int _compareUnit(ComposableDeterministicUnit a, ComposableDeterministicUnit b) {
    final hCompare = a.deterministicHash.compareTo(b.deterministicHash);
    if (hCompare != 0) return hCompare;
    return _compareBytes(a.canonicalBytes, b.canonicalBytes);
  }

  static int _compareBytes(Uint8List a, Uint8List b) {
    final len = a.length < b.length ? a.length : b.length;
    for (var i = 0; i < len; i++) {
      final ai = a[i] & 0xff;
      final bi = b[i] & 0xff;
      if (ai != bi) return ai.compareTo(bi);
    }
    return a.length.compareTo(b.length);
  }
}
