// Phase 14.7 — Deterministic trust disclosure generator. No clock; no IO.

import 'package:iris_flutter_app/certification/public/public_certification_manifest.dart';

import 'public_trust_disclosure.dart';

/// Generates [PublicTrustDisclosure] from manifest, seal, fingerprint, and package.
/// Deterministic; all values from inputs only.
PublicTrustDisclosure generatePublicTrustDisclosure({
  required PublicCertificationManifest manifest,
  required FreezeSeal seal,
  required BuildFingerprint fingerprint,
  required Map<String, String> verificationPackage,
}) {
  final fileNames = verificationPackage.keys.toList()..sort();
  return PublicTrustDisclosure(
    irisCoreVersion: manifest.manifestVersion,
    structuralHash: manifest.coreStructuralHash,
    freezeSealHash: seal.hash,
    buildFingerprint: fingerprint.value,
    publishedEvidenceFiles: fileNames,
    verificationSteps: _verificationSteps,
    declaredLimitations: _declaredLimitations,
  );
}

const List<String> _verificationSteps = [
  'Extract package',
  'Compute SHA-256',
  'Compare expected hashes',
  'Confirm deterministic match',
];

const List<String> _declaredLimitations = [
  'Does not produce certifications',
  'Does not evaluate conformity or sufficiency',
  'Verifies only deterministic technical coherence',
];
