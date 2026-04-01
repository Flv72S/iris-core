// ODA-2 — Deterministic replication report. Identical across replay.

import 'package:iris_flutter_app/core/distributed/replication/deterministic_sync_hasher.dart';

class ReplicationIntegrityReport {
  const ReplicationIntegrityReport({
    required this.peerId,
    required this.divergenceIndex,
    required this.eventsValidated,
    required this.eventsRejected,
    required this.forkDetected,
    required this.membershipMismatch,
    required this.finalSyncState,
    required this.ledgerHeadHash,
    required this.membershipHash,
  });

  final String peerId;
  final int divergenceIndex;
  final int eventsValidated;
  final int eventsRejected;
  final bool forkDetected;
  final bool membershipMismatch;
  final String finalSyncState;
  final String ledgerHeadHash;
  final String membershipHash;

  String get syncHash => DeterministicSyncHasher.computeSyncHash(
        ledgerHeadHash: ledgerHeadHash,
        divergenceIndex: divergenceIndex,
        membershipHash: membershipHash,
      );
}
