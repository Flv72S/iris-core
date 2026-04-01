// ODA-4 — Explicit authorization for cross-domain events. Deterministic; no implicit trust.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

/// Authorization contract for cross-domain event. Multi-signature if required.
class CrossDomainAuthorization {
  const CrossDomainAuthorization({
    required this.originDomainId,
    required this.targetDomainId,
    required this.authorizationProof,
    required this.contractHash,
    this.originSignature,
    this.targetSignature,
  });
  final String originDomainId;
  final String targetDomainId;
  final String authorizationProof;
  final String contractHash;
  final String? originSignature;
  final String? targetSignature;

  /// Create cross-domain authorization. Contract hash is deterministic from (origin, target, proof).
  static CrossDomainAuthorization createCrossDomainAuthorization({
    required String originDomainId,
    required String targetDomainId,
    required String authorizationProof,
    String? originSignature,
    String? targetSignature,
  }) {
    final contractHash = CanonicalPayload.hash(<String, dynamic>{
      'originDomainId': originDomainId,
      'targetDomainId': targetDomainId,
      'authorizationProof': authorizationProof,
    });
    return CrossDomainAuthorization(
      originDomainId: originDomainId,
      targetDomainId: targetDomainId,
      authorizationProof: authorizationProof,
      contractHash: contractHash,
      originSignature: originSignature,
      targetSignature: targetSignature,
    );
  }

  /// Verify: contract hash matches; [requireBothSignatures] then both signatures must be valid.
  static bool verifyCrossDomainAuthorization(
    CrossDomainAuthorization auth,
    bool Function(String domainId, String payloadHash, String? signature) verifySignature, {
    bool requireBothSignatures = false,
  }) {
    final expectedHash = CanonicalPayload.hash(<String, dynamic>{
      'originDomainId': auth.originDomainId,
      'targetDomainId': auth.targetDomainId,
      'authorizationProof': auth.authorizationProof,
    });
    if (auth.contractHash != expectedHash) return false;
    if (requireBothSignatures) {
      if (auth.originSignature == null || auth.targetSignature == null) return false;
      if (!verifySignature(auth.originDomainId, auth.contractHash, auth.originSignature)) return false;
      if (!verifySignature(auth.targetDomainId, auth.contractHash, auth.targetSignature)) return false;
    }
    return true;
  }
}
