// ODA-1 — Formal handshake. Deterministic outcome; no random resolution.

import 'package:iris_flutter_app/core/distributed/cluster_node_identity.dart';
import 'package:iris_flutter_app/core/distributed/deterministic_peer_validator.dart';

/// Handshake payload exchanged between nodes.
class HandshakePayload {
  const HandshakePayload({
    required this.nodeIdentity,
    required this.membershipLedgerHash,
    required this.ledgerHeadHash,
    required this.clusterHash,
  });
  final ClusterNodeIdentity nodeIdentity;
  final String membershipLedgerHash;
  final String ledgerHeadHash;
  final String clusterHash;
}

/// Outcome: sync direction by deterministic rule (e.g. higher ledger height wins).
enum HandshakeOutcome { acceptSyncFromPeer, peerSyncsFromUs, reject }

/// Steps: exchange identity, validate, exchange hashes, compare cluster, decide sync.
class ClusterHandshake {
  ClusterHandshake({
    required DeterministicPeerValidator validator,
    required String ourLedgerHeadHash,
    required String ourClusterHash,
  })  : _validator = validator,
        _ourLedgerHeadHash = ourLedgerHeadHash,
        _ourClusterHash = ourClusterHash;

  final DeterministicPeerValidator _validator;
  final String _ourLedgerHeadHash;
  final String _ourClusterHash;

  /// Build payload for initiating handshake. Caller fills nodeIdentity.
  HandshakePayload buildOurPayload(ClusterNodeIdentity ourIdentity, String membershipHash) {
    return HandshakePayload(
      nodeIdentity: ourIdentity,
      membershipLedgerHash: membershipHash,
      ledgerHeadHash: _ourLedgerHeadHash,
      clusterHash: _ourClusterHash,
    );
  }

  /// Respond to peer handshake. Deterministic: same inputs → same outcome.
  Future<HandshakeOutcome> respondToHandshake(HandshakePayload peerPayload) async {
    final valid = await _validator.validatePeer(peerPayload.nodeIdentity);
    if (!valid) return HandshakeOutcome.reject;
    if (!_validator.validatePeerLedgerHash(peerPayload.membershipLedgerHash)) {
      return HandshakeOutcome.reject;
    }
    if (peerPayload.clusterHash != _ourClusterHash) return HandshakeOutcome.reject;
    final ourHead = _ourLedgerHeadHash.compareTo(peerPayload.ledgerHeadHash);
    if (ourHead < 0) return HandshakeOutcome.acceptSyncFromPeer;
    if (ourHead > 0) return HandshakeOutcome.peerSyncsFromUs;
    return HandshakeOutcome.acceptSyncFromPeer;
  }
}
