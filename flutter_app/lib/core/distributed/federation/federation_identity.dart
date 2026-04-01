// ODA-5 — Federated cluster identity. Signed, immutable, independently verifiable.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

/// Represents a federated cluster identity. Immutable.
class FederationIdentity {
  const FederationIdentity({
    required this.clusterId,
    required this.clusterPublicKey,
    required this.domainHash,
    required this.clusterHash,
    required this.federationSignature,
  });

  final String clusterId;
  final String clusterPublicKey;
  final String domainHash;
  final String clusterHash;
  final String federationSignature;

  Map<String, dynamic> get signedPayload => <String, dynamic>{
        'clusterId': clusterId,
        'clusterPublicKey': clusterPublicKey,
        'domainHash': domainHash,
        'clusterHash': clusterHash,
      };
}

class FederationIdentityFactory {
  FederationIdentityFactory._();

  static FederationIdentity createFederationIdentity({
    required String clusterId,
    required String clusterPublicKey,
    required String domainHash,
    required String clusterHash,
    required String federationSignature,
  }) {
    return FederationIdentity(
      clusterId: clusterId,
      clusterPublicKey: clusterPublicKey,
      domainHash: domainHash,
      clusterHash: clusterHash,
      federationSignature: federationSignature,
    );
  }

  static bool verifyFederationIdentity(
    FederationIdentity identity,
    bool Function(String clusterId, Map<String, dynamic> payload, String signature) verifySignature,
  ) {
    return verifySignature(identity.clusterId, identity.signedPayload, identity.federationSignature);
  }

  static String getFederationIdentityHash(FederationIdentity identity) {
    return CanonicalPayload.hash(<String, dynamic>{
      'clusterId': identity.clusterId,
      'domainHash': identity.domainHash,
      'clusterHash': identity.clusterHash,
    });
  }
}
