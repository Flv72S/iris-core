/// O5 — Basic Divergence Detection. Pure structural comparison; no replay, no merge, no mutation.

import 'package:iris_flutter_app/core/network/divergence/deterministic_state_metadata.dart';
import 'package:iris_flutter_app/core/network/divergence/divergence_report.dart';
import 'package:iris_flutter_app/core/network/divergence/divergence_types.dart';

/// Detects and classifies divergence between local and remote state.
/// Does not modify deterministic state; does not resolve conflicts.
class DivergenceDetector {
  DivergenceDetector();

  /// Compares [localState] and [remoteState] and returns a structured report.
  /// Step 1: Protocol mismatch → PROTOCOL_INCOMPATIBLE.
  /// Step 2: Same snapshotHash → compare heights → IN_SYNC | REMOTE_AHEAD | LOCAL_AHEAD.
  /// Step 3: Different snapshotHash → find common ancestor via chain hash history → FORK_DETECTED | SNAPSHOT_MISMATCH.
  DivergenceReport detect({
    required DeterministicStateMetadata localState,
    required DeterministicStateMetadata remoteState,
  }) {
    // Step 1: Protocol version
    if (localState.protocolVersion.major != remoteState.protocolVersion.major) {
      return DivergenceReport(
        type: DivergenceType.protocolIncompatible,
        localSnapshotHash: localState.snapshotHash,
        remoteSnapshotHash: remoteState.snapshotHash,
        localLedgerHeight: localState.ledgerHeight,
        remoteLedgerHeight: remoteState.ledgerHeight,
        details: 'Protocol major mismatch: local ${localState.protocolVersion} vs remote ${remoteState.protocolVersion}',
      );
    }

    // Step 2: Same snapshot hash → compare heights
    if (localState.snapshotHash == remoteState.snapshotHash) {
      if (localState.ledgerHeight == remoteState.ledgerHeight) {
        return DivergenceReport(
          type: DivergenceType.inSync,
          localSnapshotHash: localState.snapshotHash,
          remoteSnapshotHash: remoteState.snapshotHash,
          localLedgerHeight: localState.ledgerHeight,
          remoteLedgerHeight: remoteState.ledgerHeight,
        );
      }
      if (remoteState.ledgerHeight > localState.ledgerHeight) {
        return DivergenceReport(
          type: DivergenceType.remoteAhead,
          localSnapshotHash: localState.snapshotHash,
          remoteSnapshotHash: remoteState.snapshotHash,
          localLedgerHeight: localState.ledgerHeight,
          remoteLedgerHeight: remoteState.ledgerHeight,
        );
      }
      return DivergenceReport(
        type: DivergenceType.localAhead,
        localSnapshotHash: localState.snapshotHash,
        remoteSnapshotHash: remoteState.snapshotHash,
        localLedgerHeight: localState.ledgerHeight,
        remoteLedgerHeight: remoteState.ledgerHeight,
      );
    }

    // Step 3: Different snapshot hash → try to find common ancestor
    final commonAncestorHeight = _findCommonAncestorHeight(
      localState.chainHashHistory,
      remoteState.chainHashHistory,
    );
    if (commonAncestorHeight != null && commonAncestorHeight >= 1) {
      return DivergenceReport(
        type: DivergenceType.forkDetected,
        localSnapshotHash: localState.snapshotHash,
        remoteSnapshotHash: remoteState.snapshotHash,
        localLedgerHeight: localState.ledgerHeight,
        remoteLedgerHeight: remoteState.ledgerHeight,
        commonAncestorHeight: commonAncestorHeight,
        details: 'Fork after height $commonAncestorHeight',
      );
    }

    return DivergenceReport(
      type: DivergenceType.snapshotMismatch,
      localSnapshotHash: localState.snapshotHash,
      remoteSnapshotHash: remoteState.snapshotHash,
      localLedgerHeight: localState.ledgerHeight,
      remoteLedgerHeight: remoteState.ledgerHeight,
      details: 'No common ancestor in chain hash history',
    );
  }

  /// Returns the ledger height at which both histories last agreed (1-based count of matching snapshots).
  /// Returns null if no common ancestor (empty or no match).
  int? _findCommonAncestorHeight(List<int> local, List<int> remote) {
    if (local.isEmpty || remote.isEmpty) return null;
    final minLen = local.length < remote.length ? local.length : remote.length;
    for (var i = 0; i < minLen; i++) {
      if (local[i] != remote[i]) {
        return i; // last agreed through index i-1, so height = i
      }
    }
    return minLen; // agreed through full overlap
  }
}
