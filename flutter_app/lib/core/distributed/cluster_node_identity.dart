// ODA-1 — Node identity in cluster. Deterministic node ID from public key; signed and verifiable.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';
import 'package:iris_flutter_app/core/crypto/signature_verifier.dart';
import 'package:iris_flutter_app/core/crypto/signed_event.dart';

/// Capability flags for a cluster node (deterministic bitmask or list).
class ClusterNodeIdentity {
  const ClusterNodeIdentity({
    required this.nodeId,
    required this.publicKey,
    required this.clusterId,
    required this.capabilityFlags,
    required this.signature,
  });

  final String nodeId;
  final String publicKey;
  final String clusterId;
  final List<String> capabilityFlags;
  final String signature;

  /// Payload that was signed (canonical map). Used for verification.
  Map<String, dynamic> get signedPayload => <String, dynamic>{
        'nodeId': nodeId,
        'publicKey': publicKey,
        'clusterId': clusterId,
        'capabilityFlags': List<String>.from(capabilityFlags)..sort(),
      };

  /// Deterministic node hash for cluster fingerprint. Reproducible.
  static String getNodeHash(ClusterNodeIdentity identity) {
    return CanonicalPayload.hash(identity.signedPayload);
  }
}

/// Creates and verifies node identity. Node ID derived deterministically from public key.
class ClusterNodeIdentityFactory {
  ClusterNodeIdentityFactory._();

  /// Deterministic node ID from public key. Same key → same ID.
  static String nodeIdFromPublicKey(String publicKey) {
    final envelope = <String, dynamic>{
      'type': 'cluster_node',
      'publicKey': publicKey,
    };
    final h = CanonicalPayload.hash(envelope);
    return 'node_${h.substring(0, 16)}';
  }

  /// Build identity payload for signing. Caller signs then attaches signature.
  static Map<String, dynamic> identityPayload({
    required String nodeId,
    required String publicKey,
    required String clusterId,
    required List<String> capabilityFlags,
  }) {
    final flags = List<String>.from(capabilityFlags)..sort();
    return <String, dynamic>{
      'nodeId': nodeId,
      'publicKey': publicKey,
      'clusterId': clusterId,
      'capabilityFlags': flags,
    };
  }

  /// Verify identity: signature valid and nodeId matches publicKey derivation.
  static Future<bool> verifyNodeIdentity(
    ClusterNodeIdentity identity,
    SignatureVerifier verifier,
  ) async {
    if (ClusterNodeIdentityFactory.nodeIdFromPublicKey(identity.publicKey) != identity.nodeId) {
      return false;
    }
    final signed = SignedEvent(
      eventId: 'cluster_identity_${identity.nodeId}',
      payload: identity.signedPayload,
      identityId: identity.nodeId,
      publicKey: identity.publicKey,
      signature: identity.signature,
    );
    return verifier.verify(signed);
  }
}
