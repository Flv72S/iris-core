// ODA-3 — Snapshot for scoped nodes. Global head, scope hash, filtered head, membership, cluster.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

/// Snapshot for filtered/scoped node. Enables snapshot comparison without full ledger.
class FilteredSnapshot {
  const FilteredSnapshot({
    required this.globalLedgerHeadHash,
    required this.scopeHash,
    required this.filteredHeadHash,
    required this.membershipHash,
    required this.clusterHash,
    this.globalHeight = 0,
  });
  final String globalLedgerHeadHash;
  final String scopeHash;
  final String filteredHeadHash;
  final String membershipHash;
  final String clusterHash;
  final int globalHeight;

  /// Creates snapshot for a scoped node. Same inputs → same snapshot.
  static FilteredSnapshot createFilteredSnapshot({
    required String globalLedgerHeadHash,
    required String scopeHash,
    required String filteredHeadHash,
    required String membershipHash,
    required String clusterHash,
    int globalHeight = 0,
  }) {
    return FilteredSnapshot(
      globalLedgerHeadHash: globalLedgerHeadHash,
      scopeHash: scopeHash,
      filteredHeadHash: filteredHeadHash,
      membershipHash: membershipHash,
      clusterHash: clusterHash,
      globalHeight: globalHeight,
    );
  }

  /// Validates snapshot: required fields present and consistent.
  static bool validateFilteredSnapshot(FilteredSnapshot snapshot) {
    if (snapshot.globalLedgerHeadHash.isEmpty) return false;
    if (snapshot.scopeHash.isEmpty) return false;
    if (snapshot.filteredHeadHash.isEmpty) return false;
    if (snapshot.membershipHash.isEmpty) return false;
    if (snapshot.clusterHash.isEmpty) return false;
    return true;
  }
}

/// Result of comparing two filtered snapshots (e.g. scope mismatch, divergent filter).
enum FilteredSnapshotCompareResult {
  compatible,
  scopeMismatch,
  divergentFilter,
  incompatibleFilteredState,
  clusterMismatch,
}

class FilteredSnapshotComparator {
  FilteredSnapshotComparator._();

  static FilteredSnapshotCompareResult compare(
    FilteredSnapshot local,
    FilteredSnapshot peer,
  ) {
    if (local.clusterHash != peer.clusterHash) {
      return FilteredSnapshotCompareResult.clusterMismatch;
    }
    if (local.scopeHash != peer.scopeHash) {
      return FilteredSnapshotCompareResult.scopeMismatch;
    }
    if (local.globalLedgerHeadHash != peer.globalLedgerHeadHash) {
      return FilteredSnapshotCompareResult.divergentFilter;
    }
    if (local.filteredHeadHash != peer.filteredHeadHash) {
      return FilteredSnapshotCompareResult.incompatibleFilteredState;
    }
    return FilteredSnapshotCompareResult.compatible;
  }
}
