// Phase 14.9 — Guard against normative or legal claims in public certification seal.

import 'public_certification_seal.dart';

/// Forbidden phrases (case-insensitive). Presence causes [ArgumentError].
const List<String> forbiddenSealClaimPhrases = [
  'compliant',
  'legally compliant',
  'regulation approved',
  'law-conformant',
  'certified secure',
  'guaranteed compliant',
];

/// Validates that [seal] contains no forbidden normative or legal claims.
/// Throws [ArgumentError] if any forbidden phrase is found.
void validatePublicCertificationSealClaims(PublicCertificationSeal seal) {
  final texts = [
    seal.irisCoreVersion,
    seal.structuralHash,
    seal.freezeSealHash,
    seal.buildFingerprint,
    seal.reproducibilityProofHash,
    seal.trustDisclosureHash,
    ...seal.evidenceFiles,
  ];
  final lower = texts.map((s) => s.toLowerCase()).toList();
  for (final phrase in forbiddenSealClaimPhrases) {
    final p = phrase.toLowerCase();
    for (var i = 0; i < lower.length; i++) {
      if (lower[i].contains(p)) {
        throw ArgumentError(
          'Forbidden claim phrase in seal: "$phrase"',
        );
      }
    }
  }
}
