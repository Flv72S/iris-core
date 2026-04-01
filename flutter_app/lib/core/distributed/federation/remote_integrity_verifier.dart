// ODA-5 — Verify remote cluster integrity. No assumed trust.

import 'package:iris_flutter_app/core/distributed/federation/remote_cluster_snapshot.dart';

class RemoteIntegrityResult {
  const RemoteIntegrityResult({
    required this.valid,
    this.remoteClusterHashInvalid = false,
    this.remoteDomainHashInvalid = false,
    this.contractHashInvalid = false,
    this.proofOfInclusionInvalid = false,
  });
  final bool valid;
  final bool remoteClusterHashInvalid;
  final bool remoteDomainHashInvalid;
  final bool contractHashInvalid;
  final bool proofOfInclusionInvalid;
}

class RemoteIntegrityVerifier {
  RemoteIntegrityVerifier._();

  static RemoteIntegrityResult verifyRemoteIntegrity({
    required RemoteClusterSnapshot snapshot,
    required String expectedRemoteClusterHash,
    required String expectedRemoteDomainHash,
    required String expectedContractHash,
    bool Function(String proof)? verifyProofOfInclusion,
    String? proofOfInclusion,
  }) {
    if (!RemoteClusterSnapshot.validateRemoteSnapshot(snapshot)) {
      return const RemoteIntegrityResult(valid: false, remoteClusterHashInvalid: true);
    }
    if (snapshot.remoteClusterHash != expectedRemoteClusterHash) {
      return const RemoteIntegrityResult(valid: false, remoteClusterHashInvalid: true);
    }
    if (snapshot.remoteDomainHash != expectedRemoteDomainHash) {
      return const RemoteIntegrityResult(valid: false, remoteDomainHashInvalid: true);
    }
    if (snapshot.federationContractHash != expectedContractHash) {
      return const RemoteIntegrityResult(valid: false, contractHashInvalid: true);
    }
    if (verifyProofOfInclusion != null && proofOfInclusion != null) {
      if (!verifyProofOfInclusion(proofOfInclusion)) {
        return const RemoteIntegrityResult(valid: false, proofOfInclusionInvalid: true);
      }
    }
    return const RemoteIntegrityResult(valid: true);
  }
}
