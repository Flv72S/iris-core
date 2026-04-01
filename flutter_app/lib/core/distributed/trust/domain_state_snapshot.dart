// ODA-4 — Snapshot including domain registry, membership, activity, cross-domain state.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class DomainStateSnapshot {
  const DomainStateSnapshot({
    required this.domainRegistryHash,
    required this.domainMembershipHash,
    required this.domainActivityStatus,
    required this.crossDomainAuthorizationState,
  });
  final String domainRegistryHash;
  final String domainMembershipHash;
  final String domainActivityStatus;
  final String crossDomainAuthorizationState;

  static DomainStateSnapshot createDomainSnapshot({
    required String domainRegistryHash,
    required String domainMembershipHash,
    required String domainActivityStatus,
    required String crossDomainAuthorizationState,
  }) {
    return DomainStateSnapshot(
      domainRegistryHash: domainRegistryHash,
      domainMembershipHash: domainMembershipHash,
      domainActivityStatus: domainActivityStatus,
      crossDomainAuthorizationState: crossDomainAuthorizationState,
    );
  }

  static bool validateDomainSnapshot(DomainStateSnapshot snapshot) {
    if (snapshot.domainRegistryHash.isEmpty) return false;
    if (snapshot.domainMembershipHash.isEmpty) return false;
    return true;
  }
}

/// Result of comparing two domain snapshots (domain mismatch, membership divergence, etc.).
enum DomainSnapshotCompareResult {
  compatible,
  domainMismatch,
  membershipDivergence,
  suspendedDomainEvents,
}

class DomainSnapshotComparator {
  DomainSnapshotComparator._();

  static DomainSnapshotCompareResult compare(DomainStateSnapshot local, DomainStateSnapshot peer) {
    if (local.domainRegistryHash != peer.domainRegistryHash) {
      return DomainSnapshotCompareResult.domainMismatch;
    }
    if (local.domainMembershipHash != peer.domainMembershipHash) {
      return DomainSnapshotCompareResult.membershipDivergence;
    }
    if (local.domainActivityStatus != peer.domainActivityStatus) {
      return DomainSnapshotCompareResult.suspendedDomainEvents;
    }
    return DomainSnapshotCompareResult.compatible;
  }
}
