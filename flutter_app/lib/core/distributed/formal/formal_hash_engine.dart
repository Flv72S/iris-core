// ODA-8 — Canonical formal verification fingerprint.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class FormalHashEngine {
  FormalHashEngine._();

  static String computeFormalVerificationHash({
    required String invariantRegistryHash,
    required String complianceRegistryHash,
    required String evaluationResultHash,
    required List<String> proofArtifactHashes,
  }) {
    final sorted = List<String>.from(proofArtifactHashes)..sort();
    return CanonicalPayload.hash(<String, dynamic>{
      'invariantRegistryHash': invariantRegistryHash,
      'complianceRegistryHash': complianceRegistryHash,
      'evaluationResultHash': evaluationResultHash,
      'proofArtifactHashes': sorted,
    });
  }
}
