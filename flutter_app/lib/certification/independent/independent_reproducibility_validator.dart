// Phase 14.5 — Independent reproducibility verification. String comparison only; no IO.

import 'package:iris_flutter_app/certification/evidence/certification_evidence_index.dart';
import 'package:iris_flutter_app/certification/public/public_certification_manifest.dart';
import 'package:iris_flutter_app/certification/public/public_verification_package_builder.dart';

/// Keys expected in [verifyExpectedHashes]. Derived from frozen artifacts only.
const List<String> expectedReproducibilityHashKeys = [
  'STRUCTURAL_HASH',
  'PACKAGE_SHA256',
  'SCOPE_HASH',
  'EVIDENCE_INDEX_HASH',
  'AUDIT_CHAIN_ROOT',
];

/// Validates that provided hash values match the frozen expected values.
/// No hash recomputation; no IO; pure string comparison.
final class IndependentReproducibilityValidator {
  const IndependentReproducibilityValidator();

  /// Returns true only if every key in [expectedReproducibilityHashKeys]
  /// is present in [providedValues] and the value equals the frozen expected.
  bool verifyExpectedHashes(Map<String, String> providedValues) {
    final expected = getExpectedReproducibilityHashes();
    for (final key in expectedReproducibilityHashKeys) {
      final provided = providedValues[key];
      final exp = expected[key];
      if (provided == null || exp == null || provided != exp) {
        return false;
      }
    }
    return true;
  }
}

/// Expected hash values from frozen artifacts. For verification and protocol output.
Map<String, String> getExpectedReproducibilityHashes() {
  final manifest = publicCertificationManifest;
  final index = certificationEvidenceIndex;
  const builder = PublicVerificationPackageBuilder();
  final package = builder.buildPackageFiles();
  final auditRoot =
      index.entries.firstWhere((e) => e.id == 'audit_chain_root').sha256;

  return {
    'STRUCTURAL_HASH': manifest.coreStructuralHash,
    'PACKAGE_SHA256': package['PACKAGE_SHA256.txt']!,
    'SCOPE_HASH': manifest.certificationScopeHash,
    'EVIDENCE_INDEX_HASH': manifest.evidenceIndexHash,
    'AUDIT_CHAIN_ROOT': auditRoot,
  };
}
