// ODA-10 — Proof from external system. Immutable; independently verifiable.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class ExternalProofArtifact {
  const ExternalProofArtifact({
    required this.externalSystemId,
    required this.externalTransactionId,
    required this.payload,
    required this.proofMetadata,
    this.signatureOrVerificationRef,
    required this.artifactHash,
  });

  final String externalSystemId;
  final String externalTransactionId;
  final Map<String, dynamic> payload;
  final Map<String, dynamic> proofMetadata;
  final String? signatureOrVerificationRef;
  final String artifactHash;
}

class ExternalProofArtifactFactory {
  ExternalProofArtifactFactory._();

  static ExternalProofArtifact createExternalProofArtifact({
    required String externalSystemId,
    required String externalTransactionId,
    required Map<String, dynamic> payload,
    required Map<String, dynamic> proofMetadata,
    String? signatureOrVerificationRef,
  }) {
    final payloadForHash = <String, dynamic>{
      'externalSystemId': externalSystemId,
      'externalTransactionId': externalTransactionId,
      'payload': payload,
      'proofMetadata': proofMetadata,
    };
    final artifactHash = CanonicalPayload.hash(payloadForHash);
    return ExternalProofArtifact(
      externalSystemId: externalSystemId,
      externalTransactionId: externalTransactionId,
      payload: payload,
      proofMetadata: proofMetadata,
      signatureOrVerificationRef: signatureOrVerificationRef,
      artifactHash: artifactHash,
    );
  }

  static bool verifyExternalProofArtifact(
    ExternalProofArtifact artifact,
    bool Function(String artifactHash, String? signatureRef) verify,
  ) {
    final expected = CanonicalPayload.hash(<String, dynamic>{
      'externalSystemId': artifact.externalSystemId,
      'externalTransactionId': artifact.externalTransactionId,
      'payload': artifact.payload,
      'proofMetadata': artifact.proofMetadata,
    });
    if (artifact.artifactHash != expected) return false;
    return verify(artifact.artifactHash, artifact.signatureOrVerificationRef);
  }

  static String getExternalProofHash(ExternalProofArtifact artifact) => artifact.artifactHash;
}
