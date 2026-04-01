// Phase 14.8 — External audit proof verification. Deterministic comparison only.

import 'package:iris_flutter_app/certification/public/public_certification_manifest.dart';
import 'package:iris_flutter_app/certification/transparency/public_trust_disclosure.dart';

import 'external_audit_proof.dart';

/// Result of verifying an external audit proof.
class ExternalAuditProofVerificationResult {
  const ExternalAuditProofVerificationResult({
    required this.structuralHashMatches,
    required this.freezeSealMatches,
    required this.fingerprintMatches,
    required this.fullyValid,
  });

  final bool structuralHashMatches;
  final bool freezeSealMatches;
  final bool fingerprintMatches;
  final bool fullyValid;
}

/// Verifies the proof against manifest, seal, and fingerprint. Pure equality.
ExternalAuditProofVerificationResult verifyExternalAuditProof(
  ExternalAuditReproducibilityProof proof,
  PublicCertificationManifest manifest,
  FreezeSeal seal,
  BuildFingerprint fingerprint,
) {
  final structuralHashMatches =
      proof.structuralHash == manifest.coreStructuralHash;
  final freezeSealMatches = proof.freezeSealHash == seal.hash;
  final fingerprintMatches = proof.buildFingerprint == fingerprint.value;
  final fullyValid =
      structuralHashMatches && freezeSealMatches && fingerprintMatches;

  return ExternalAuditProofVerificationResult(
    structuralHashMatches: structuralHashMatches,
    freezeSealMatches: freezeSealMatches,
    fingerprintMatches: fingerprintMatches,
    fullyValid: fullyValid,
  );
}
