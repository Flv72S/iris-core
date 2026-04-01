// ODA-1 — Known peers for a node. Derived from membership; validate on registration.

import 'package:iris_flutter_app/core/distributed/cluster_membership_ledger.dart';
import 'package:iris_flutter_app/core/distributed/cluster_node_identity.dart';
import 'package:iris_flutter_app/core/distributed/deterministic_peer_validator.dart';

/// Registry of peers. Only nodes in membership ledger; identity validated on register.
class PeerRegistry {
  PeerRegistry({
    required ClusterMembershipLedger membershipLedger,
    required DeterministicPeerValidator validator,
  })  : _ledger = membershipLedger,
        _validator = validator;

  final ClusterMembershipLedger _ledger;
  final DeterministicPeerValidator _validator;
  final Map<String, ClusterNodeIdentity> _peers = {};

  /// Register peer only if in membership and validation passes.
  Future<bool> registerPeer(ClusterNodeIdentity nodeIdentity) async {
    if (!_ledger.getActiveNodes().contains(nodeIdentity.nodeId)) return false;
    final valid = await _validator.validatePeer(nodeIdentity);
    if (!valid) return false;
    _peers[nodeIdentity.nodeId] = nodeIdentity;
    return true;
  }

  void removePeer(String nodeId) {
    _peers.remove(nodeId);
  }

  List<ClusterNodeIdentity> getPeers() => _peers.values.toList();

  ClusterNodeIdentity? getPeer(String nodeId) => _peers[nodeId];
}
