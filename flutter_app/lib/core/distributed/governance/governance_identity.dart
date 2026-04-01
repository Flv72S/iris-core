// ODA-6 — Governance authority within federation. Signed by all participating clusters.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

/// Governance identity. Immutable once created; signed by all participating clusters.
class GovernanceIdentity {
  const GovernanceIdentity({
    required this.federationId,
    required this.participatingClusterIds,
    required this.governancePublicKeys,
    required this.creationHash,
    required this.governanceSignatureSet,
  });

  final String federationId;
  final List<String> participatingClusterIds;
  final Map<String, String> governancePublicKeys;
  final String creationHash;
  final List<String> governanceSignatureSet;

  Map<String, dynamic> get signedPayload => <String, dynamic>{
        'federationId': federationId,
        'participatingClusterIds': (List<String>.from(participatingClusterIds)..sort()),
        'governancePublicKeys': governancePublicKeys,
      };
}

class GovernanceIdentityFactory {
  GovernanceIdentityFactory._();

  static GovernanceIdentity createGovernanceIdentity({
    required String federationId,
    required List<String> participatingClusterIds,
    required Map<String, String> governancePublicKeys,
    required List<String> governanceSignatureSet,
  }) {
    final payload = <String, dynamic>{
      'federationId': federationId,
      'participatingClusterIds': (List<String>.from(participatingClusterIds)..sort()),
      'governancePublicKeys': governancePublicKeys,
    };
    final creationHash = CanonicalPayload.hash(payload);
    return GovernanceIdentity(
      federationId: federationId,
      participatingClusterIds: participatingClusterIds,
      governancePublicKeys: governancePublicKeys,
      creationHash: creationHash,
      governanceSignatureSet: governanceSignatureSet,
    );
  }

  static bool verifyGovernanceIdentity(
    GovernanceIdentity identity,
    bool Function(String clusterId, String payloadHash, String signature) verifySignature,
  ) {
    final expectedHash = CanonicalPayload.hash(identity.signedPayload);
    if (identity.creationHash != expectedHash) return false;
    for (final clusterId in identity.participatingClusterIds) {
      final sig = identity.governanceSignatureSet.isNotEmpty ? identity.governanceSignatureSet.first : '';
      if (!verifySignature(clusterId, identity.creationHash, sig)) return false;
    }
    return true;
  }

  static String getGovernanceHash(GovernanceIdentity identity) {
    return CanonicalPayload.hash(<String, dynamic>{
      'federationId': identity.federationId,
      'creationHash': identity.creationHash,
    });
  }
}
