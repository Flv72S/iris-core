// ODA-3 — Delta calculation respecting scope. Global indices only; no gap in tracking.

import 'package:iris_flutter_app/core/distributed/replication/deterministic_delta_calculator.dart';
import 'package:iris_flutter_app/core/distributed/replication/filtering/filtered_ledger_view.dart';

/// Local state for a scoped node: global height awareness and filtered view.
class LocalScopeState {
  const LocalScopeState({
    required this.globalHeight,
    required this.globalHeadHash,
    required this.filteredView,
  });
  final int globalHeight;
  final String globalHeadHash;
  final FilteredLedgerView filteredView;
}

/// Snapshot from peer (full or filtered). Same shape as ODA-2 snapshot plus optional scope.
class PeerSnapshotForScope {
  const PeerSnapshotForScope({
    required this.globalLedgerHeadHash,
    required this.globalHeight,
    this.scopeHash,
    this.filteredHeadHash,
  });
  final String globalLedgerHeadHash;
  final int globalHeight;
  final String? scopeHash;
  final String? filteredHeadHash;
}

/// Delta range for scoped replication. Still global indices; node may request only relevant events.
class ScopedDeltaResult {
  const ScopedDeltaResult({
    required this.globalRange,
    required this.divergenceIndex,
    required this.needSync,
  });
  final DeltaRange globalRange;
  final int divergenceIndex;
  final bool needSync;
}

class ScopedDeltaCalculator {
  ScopedDeltaCalculator._();

  /// Calculates delta for scoped node. Global index continuity required; no skip.
  /// [localScopeState] = local filtered node state; [peerSnapshot] = peer (full or filtered).
  static ScopedDeltaResult calculateScopedDelta(
    LocalScopeState localScopeState,
    PeerSnapshotForScope peerSnapshot,
    int divergenceIndex,
  ) {
    final localHeight = localScopeState.globalHeight;
    final peerHeight = peerSnapshot.globalHeight;
    if (divergenceIndex < 0) {
      return ScopedDeltaResult(
        globalRange: const DeltaRange(startIndex: 0, endIndex: -1),
        divergenceIndex: -1,
        needSync: false,
      );
    }
    final range = DeterministicDeltaCalculator.calculateIncomingDelta(
      localHeight,
      peerHeight,
      divergenceIndex,
    );
    return ScopedDeltaResult(
      globalRange: range,
      divergenceIndex: divergenceIndex,
      needSync: range.count > 0,
    );
  }
}
