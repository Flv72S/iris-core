// ODA-1 — Validate peer: signature, cluster ID, membership, ledger continuity.

import 'package:iris_flutter_app/core/distributed/cluster_membership_ledger.dart';
import 'package:iris_flutter_app/core/distributed/cluster_node_identity.dart';
import 'package:iris_flutter_app/core/crypto/signature_verifier.dart';

/// Rejects: mismatched cluster ID, unsigned identity, unknown membership, divergent history.
class DeterministicPeerValidator {
  DeterministicPeerValidator({
    required ClusterMembershipLedger membershipLedger,
    required SignatureVerifier signatureVerifier,
  })  : _ledger = membershipLedger,
        _verifier = signatureVerifier;

  final ClusterMembershipLedger _ledger;
  final SignatureVerifier _verifier;

  Future<bool> validatePeer(ClusterNodeIdentity nodeIdentity) async {
    if (nodeIdentity.clusterId != _ledger.clusterId) return false;
    final ok = await ClusterNodeIdentityFactory.verifyNodeIdentity(nodeIdentity, _verifier);
    if (!ok) return false;
    if (!_ledger.getActiveNodes().contains(nodeIdentity.nodeId)) return false;
    return true;
  }

  /// Validate peer's ledger hash matches our continuity expectation (same membership head).
  bool validatePeerLedgerHash(String peerMembershipLedgerHash) {
    return peerMembershipLedgerHash == _ledger.getMembershipLedgerHash();
  }
}
