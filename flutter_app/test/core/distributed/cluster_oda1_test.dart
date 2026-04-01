// ODA-1 — Tests: node identity, membership replay, cluster hash, peer validation, handshake.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/distributed/cluster_node_identity.dart';
import 'package:iris_flutter_app/core/distributed/cluster_membership_ledger.dart';
import 'package:iris_flutter_app/core/distributed/deterministic_cluster_hasher.dart';
import 'package:iris_flutter_app/core/distributed/cluster_topology.dart';
import 'package:iris_flutter_app/core/distributed/cluster_state_snapshot.dart';
import 'package:iris_flutter_app/core/distributed/cluster_handshake.dart';
import 'package:iris_flutter_app/core/distributed/deterministic_peer_validator.dart';
import 'package:iris_flutter_app/core/crypto/signature_verifier.dart';

void main() {
  group('ODA-1 Node identity deterministic generation', () {
    test('same publicKey produces same nodeId', () {
      final id1 = ClusterNodeIdentityFactory.nodeIdFromPublicKey('pk1');
      final id2 = ClusterNodeIdentityFactory.nodeIdFromPublicKey('pk1');
      expect(id1, id2);
      expect(id1.startsWith('node_'), isTrue);
    });

    test('different publicKey produces different nodeId', () {
      final id1 = ClusterNodeIdentityFactory.nodeIdFromPublicKey('pk1');
      final id2 = ClusterNodeIdentityFactory.nodeIdFromPublicKey('pk2');
      expect(id1, isNot(id2));
    });

    test('getNodeHash is deterministic', () {
      const identity = ClusterNodeIdentity(
        nodeId: 'node_abc',
        publicKey: 'pk',
        clusterId: 'c1',
        capabilityFlags: ['sync'],
        signature: 'sig',
      );
      expect(ClusterNodeIdentity.getNodeHash(identity), ClusterNodeIdentity.getNodeHash(identity));
    });
  });

  group('ODA-1 Membership ledger replay', () {
    test('rebuildState produces same active nodes after same events', () {
      final ledger = ClusterMembershipLedger(clusterId: 'c1');
      ledger.appendMembershipEvent(MembershipEvent(
        eventType: MembershipEventType.nodeAdmitted,
        payload: {'nodeId': 'n1'},
        eventIndex: 0,
        signature: 's0',
      ));
      ledger.appendMembershipEvent(MembershipEvent(
        eventType: MembershipEventType.nodeAdmitted,
        payload: {'nodeId': 'n2'},
        eventIndex: 1,
        signature: 's1',
      ));
      final state1 = ledger.rebuildState();
      final state2 = ledger.rebuildState();
      expect(state1.activeNodeIds, state2.activeNodeIds);
      expect(state1.activeNodeIds.contains('n1'), isTrue);
      expect(state1.activeNodeIds.contains('n2'), isTrue);
    });

    test('NODE_REMOVED removes from active', () {
      final ledger = ClusterMembershipLedger(clusterId: 'c1');
      ledger.appendMembershipEvent(MembershipEvent(
        eventType: MembershipEventType.nodeAdmitted,
        payload: {'nodeId': 'n1'},
        eventIndex: 0,
        signature: 's0',
      ));
      ledger.appendMembershipEvent(MembershipEvent(
        eventType: MembershipEventType.nodeRemoved,
        payload: {'nodeId': 'n1'},
        eventIndex: 1,
        signature: 's1',
      ));
      expect(ledger.getActiveNodes().contains('n1'), isFalse);
    });
  });

  group('ODA-1 Cluster hash stability', () {
    test('same membership and node order produce same cluster hash', () {
      final h1 = DeterministicClusterHasher.clusterHash(
        membershipLedgerHash: 'mh1',
        nodeIds: ['n1', 'n2'],
        clusterId: 'c1',
      );
      final h2 = DeterministicClusterHasher.clusterHash(
        membershipLedgerHash: 'mh1',
        nodeIds: ['n2', 'n1'],
        clusterId: 'c1',
      );
      expect(h1, h2);
    });

    test('different clusterId produces different hash', () {
      final h1 = DeterministicClusterHasher.clusterHash(
        membershipLedgerHash: 'mh',
        nodeIds: ['n1'],
        clusterId: 'c1',
      );
      final h2 = DeterministicClusterHasher.clusterHash(
        membershipLedgerHash: 'mh',
        nodeIds: ['n1'],
        clusterId: 'c2',
      );
      expect(h1, isNot(h2));
    });
  });

  group('ODA-1 ClusterTopology', () {
    test('getClusterNodes and isNodeActive derived from ledger', () {
      final ledger = ClusterMembershipLedger(clusterId: 'c1');
      ledger.appendMembershipEvent(MembershipEvent(
        eventType: MembershipEventType.nodeAdmitted,
        payload: {'nodeId': 'n1'},
        eventIndex: 0,
        signature: 's0',
      ));
      final topology = ClusterTopology(membershipLedger: ledger);
      expect(topology.getClusterNodes().contains('n1'), isTrue);
      expect(topology.isNodeActive('n1'), isTrue);
      expect(topology.isNodeActive('n2'), isFalse);
    });
  });

  group('ODA-1 ClusterStateSnapshot', () {
    test('createSnapshot and verifySnapshot deterministic', () {
      final ledger = ClusterMembershipLedger(clusterId: 'c1');
      ledger.appendMembershipEvent(MembershipEvent(
        eventType: MembershipEventType.nodeAdmitted,
        payload: {'nodeId': 'n1'},
        eventIndex: 0,
        signature: 's0',
      ));
      final snap = ClusterStateSnapshotFactory.createSnapshot(
        membershipLedger: ledger,
        ledgerHeadHash: 'lh1',
        projectionHash: 'ph1',
      );
      expect(snap.activeNodeCount, 1);
      expect(ClusterStateSnapshotFactory.verifySnapshot(snap, ledger), isTrue);
    });
  });

  group('ODA-1 Handshake', () {
    test('respondToHandshake rejects on cluster hash mismatch', () async {
      final ledger = ClusterMembershipLedger(clusterId: 'c1');
      final verifier = SignatureVerifier();
      final validator = DeterministicPeerValidator(
        membershipLedger: ledger,
        signatureVerifier: verifier,
      );
      final handshake = ClusterHandshake(
        validator: validator,
        ourLedgerHeadHash: 'lh1',
        ourClusterHash: 'ch_our',
      );
      final peerPayload = HandshakePayload(
        nodeIdentity: ClusterNodeIdentity(
          nodeId: 'node_x',
          publicKey: 'pk',
          clusterId: 'c1',
          capabilityFlags: [],
          signature: 'sig',
        ),
        membershipLedgerHash: ledger.getMembershipLedgerHash(),
        ledgerHeadHash: 'lh0',
        clusterHash: 'ch_other',
      );
      final outcome = await handshake.respondToHandshake(peerPayload);
      expect(outcome, HandshakeOutcome.reject);
    });
  });
}
