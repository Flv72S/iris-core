// ODA-10 — Captured external state. From proof artifacts only; no live query.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class ExternalStateSnapshot {
  const ExternalStateSnapshot({
    required this.snapshotId,
    required this.externalSystemId,
    required this.externalProofReferences,
    required this.snapshotHash,
    this.timestampFromArtifact,
  });

  final String snapshotId;
  final String externalSystemId;
  final List<String> externalProofReferences;
  final String snapshotHash;
  final String? timestampFromArtifact;
}

class ExternalStateSnapshotFactory {
  ExternalStateSnapshotFactory._();

  static ExternalStateSnapshot createExternalSnapshot({
    required String snapshotId,
    required String externalSystemId,
    required List<String> externalProofReferences,
    String? timestampFromArtifact,
  }) {
    final payload = <String, dynamic>{
      'snapshotId': snapshotId,
      'externalSystemId': externalSystemId,
      'externalProofReferences': (List<String>.from(externalProofReferences)..sort()),
      if (timestampFromArtifact != null) 'timestampFromArtifact': timestampFromArtifact,
    };
    final snapshotHash = CanonicalPayload.hash(payload);
    return ExternalStateSnapshot(
      snapshotId: snapshotId,
      externalSystemId: externalSystemId,
      externalProofReferences: externalProofReferences,
      snapshotHash: snapshotHash,
      timestampFromArtifact: timestampFromArtifact,
    );
  }

  static bool verifyExternalSnapshot(ExternalStateSnapshot snapshot) {
    final payload = <String, dynamic>{
      'snapshotId': snapshot.snapshotId,
      'externalSystemId': snapshot.externalSystemId,
      'externalProofReferences': (List<String>.from(snapshot.externalProofReferences)..sort()),
      if (snapshot.timestampFromArtifact != null) 'timestampFromArtifact': snapshot.timestampFromArtifact,
    };
    return CanonicalPayload.hash(payload) == snapshot.snapshotHash;
  }
}

enum ExternalSnapshotCompareResult { compatible, divergence }

class ExternalStateSnapshotComparator {
  ExternalStateSnapshotComparator._();

  static ExternalSnapshotCompareResult compareExternalSnapshot(
    ExternalStateSnapshot local,
    ExternalStateSnapshot remote,
  ) {
    if (local.snapshotHash != remote.snapshotHash) return ExternalSnapshotCompareResult.divergence;
    return ExternalSnapshotCompareResult.compatible;
  }
}
