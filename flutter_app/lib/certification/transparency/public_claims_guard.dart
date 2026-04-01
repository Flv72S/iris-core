// Phase 14.7 — Guard against normative or legal claims in public disclosure.

import 'public_trust_disclosure.dart';

/// Forbidden phrases (case-insensitive). Presence causes [ArgumentError].
const List<String> forbiddenPublicClaimPhrases = [
  'compliant',
  'certified compliant',
  'regulation approved',
  'legally valid',
  'meets law',
  'guaranteed secure',
];

/// Validates that [disclosure] contains no forbidden normative or legal claims.
/// Throws [ArgumentError] if any forbidden phrase is found.
void validatePublicDisclosureClaims(PublicTrustDisclosure disclosure) {
  final texts = [
    disclosure.irisCoreVersion,
    disclosure.structuralHash,
    disclosure.freezeSealHash,
    disclosure.buildFingerprint,
    ...disclosure.publishedEvidenceFiles,
    ...disclosure.verificationSteps,
    ...disclosure.declaredLimitations,
  ];
  final lower = texts.map((s) => s.toLowerCase()).toList();
  for (final phrase in forbiddenPublicClaimPhrases) {
    final p = phrase.toLowerCase();
    for (var i = 0; i < lower.length; i++) {
      if (lower[i].contains(p)) {
        throw ArgumentError(
          'Forbidden claim phrase in disclosure: "$phrase"',
        );
      }
    }
  }
}
