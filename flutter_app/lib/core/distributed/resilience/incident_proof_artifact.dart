// ODA-9 — Machine-verifiable incident proof. Immutable; replay-verifiable.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class IncidentProofArtifact {
  const IncidentProofArtifact({
    required this.incidentId,
    required this.threatHash,
    required this.systemIntegrityHashAtDetection,
    required this.containmentHash,
    required this.recoveryHash,
    required this.signatures,
    required this.proofHash,
  });

  final String incidentId;
  final String threatHash;
  final String systemIntegrityHashAtDetection;
  final String containmentHash;
  final String recoveryHash;
  final List<String> signatures;
  final String proofHash;
}

class IncidentProofArtifactFactory {
  IncidentProofArtifactFactory._();

  static IncidentProofArtifact createIncidentProof({
    required String incidentId,
    required String threatHash,
    required String systemIntegrityHashAtDetection,
    required String containmentHash,
    required String recoveryHash,
    required List<String> signatures,
  }) {
    final payload = <String, dynamic>{
      'incidentId': incidentId,
      'threatHash': threatHash,
      'systemIntegrityHashAtDetection': systemIntegrityHashAtDetection,
      'containmentHash': containmentHash,
      'recoveryHash': recoveryHash,
    };
    final proofHash = CanonicalPayload.hash(payload);
    return IncidentProofArtifact(
      incidentId: incidentId,
      threatHash: threatHash,
      systemIntegrityHashAtDetection: systemIntegrityHashAtDetection,
      containmentHash: containmentHash,
      recoveryHash: recoveryHash,
      signatures: signatures,
      proofHash: proofHash,
    );
  }

  static bool verifyIncidentProof(
    IncidentProofArtifact proof,
    bool Function(String proofHash, List<String> signatures) verifySignatures,
  ) {
    final expected = CanonicalPayload.hash(<String, dynamic>{
      'incidentId': proof.incidentId,
      'threatHash': proof.threatHash,
      'systemIntegrityHashAtDetection': proof.systemIntegrityHashAtDetection,
      'containmentHash': proof.containmentHash,
      'recoveryHash': proof.recoveryHash,
    });
    if (proof.proofHash != expected) return false;
    return verifySignatures(proof.proofHash, proof.signatures);
  }

  static String getIncidentProofHash(IncidentProofArtifact proof) => proof.proofHash;
}
