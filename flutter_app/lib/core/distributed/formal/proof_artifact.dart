// ODA-8 — Machine-verifiable proof. Immutable; hash-bound.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class ProofArtifact {
  const ProofArtifact({
    required this.proofId,
    required this.stateHash,
    required this.activeInvariantsHash,
    required this.activeComplianceRulesHash,
    required this.evaluationResult,
    required this.signature,
    required this.proofHash,
  });

  final String proofId;
  final String stateHash;
  final String activeInvariantsHash;
  final String activeComplianceRulesHash;
  final bool evaluationResult;
  final String signature;
  final String proofHash;
}

class ProofArtifactFactory {
  ProofArtifactFactory._();

  static ProofArtifact createProofArtifact({
    required String proofId,
    required String stateHash,
    required String activeInvariantsHash,
    required String activeComplianceRulesHash,
    required bool evaluationResult,
    required String signature,
  }) {
    final payload = <String, dynamic>{
      'proofId': proofId,
      'stateHash': stateHash,
      'activeInvariantsHash': activeInvariantsHash,
      'activeComplianceRulesHash': activeComplianceRulesHash,
      'evaluationResult': evaluationResult,
    };
    final proofHash = CanonicalPayload.hash(payload);
    return ProofArtifact(
      proofId: proofId,
      stateHash: stateHash,
      activeInvariantsHash: activeInvariantsHash,
      activeComplianceRulesHash: activeComplianceRulesHash,
      evaluationResult: evaluationResult,
      signature: signature,
      proofHash: proofHash,
    );
  }

  static bool verifyProofArtifact(
    ProofArtifact proof,
    bool Function(String proofHash, String signature) verifySignature,
  ) {
    final expected = CanonicalPayload.hash(<String, dynamic>{
      'proofId': proof.proofId,
      'stateHash': proof.stateHash,
      'activeInvariantsHash': proof.activeInvariantsHash,
      'activeComplianceRulesHash': proof.activeComplianceRulesHash,
      'evaluationResult': proof.evaluationResult,
    });
    if (proof.proofHash != expected) return false;
    return verifySignature(proof.proofHash, proof.signature);
  }

  static String getProofHash(ProofArtifact proof) => proof.proofHash;
}
