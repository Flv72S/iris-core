// M4 — Parallel deterministic composition. Order-invariant; canonical sort by hash then bytes.

import 'dart:typed_data';

import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/composition/composite_deterministic_contract.dart';

/// Composes [DeterministicExecutionContract] in order-invariant way: same set of DEC → same CDC regardless of input order.
/// Sorts deterministically by deterministicHash (asc) then by canonicalBytes (lexicographic). No deduplication.
class ParallelFlowComposer {
  ParallelFlowComposer();

  /// Builds a CDC from [contracts] after canonical ordering. List must not be empty; input is not modified.
  CompositeDeterministicContract compose(List<DeterministicExecutionContract> contracts) {
    if (contracts.isEmpty) {
      throw ArgumentError('contracts must not be empty');
    }
    final sorted = List<DeterministicExecutionContract>.from(contracts)
      ..sort(_compareDec);
    return CompositeDeterministicContract(sorted);
  }

  /// 1. deterministicHash ascending; 2. if equal, lexicographic on canonicalBytes. Deterministic, no runtime deps.
  static int _compareDec(DeterministicExecutionContract a, DeterministicExecutionContract b) {
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
