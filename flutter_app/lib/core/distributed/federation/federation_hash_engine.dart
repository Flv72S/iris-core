// ODA-5 — Canonical federation fingerprint.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';
import 'package:iris_flutter_app/core/distributed/federation/federation_identity.dart';

class FederationHashEngine {
  FederationHashEngine._();

  static String computeFederationHash({
    required String federationRegistryHash,
    required String federationContractsHash,
    required String federationMembershipHash,
    required List<FederationIdentity> federatedClusterIdentities,
  }) {
    final orderedHashes = federatedClusterIdentities
        .map((id) => FederationIdentityFactory.getFederationIdentityHash(id))
        .toList()
      ..sort();
    return CanonicalPayload.hash(<String, dynamic>{
      'federationRegistryHash': federationRegistryHash,
      'federationContractsHash': federationContractsHash,
      'federationMembershipHash': federationMembershipHash,
      'federatedClusterIdentityHashes': orderedHashes,
    });
  }
}
