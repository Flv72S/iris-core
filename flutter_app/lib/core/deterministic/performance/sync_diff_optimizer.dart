/// O11 — Fast common ancestor from two ledger indexes.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/performance/ledger_index.dart';

class SyncDiffOptimizer {
  int? findCommonAncestor(
    LedgerIndex<DeterministicState> localIndex,
    LedgerIndex<DeterministicState> remoteIndex,
  ) {
    if (localIndex.length == 0 || remoteIndex.length == 0) return null;
    final minLen = localIndex.length < remoteIndex.length
        ? localIndex.length
        : remoteIndex.length;
    for (var h = 0; h < minLen; h++) {
      if (localIndex.chainHashAt(h) != remoteIndex.chainHashAt(h)) return h;
    }
    return minLen;
  }
}
