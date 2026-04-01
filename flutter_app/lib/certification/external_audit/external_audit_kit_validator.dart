// Phase 14.6 — External audit kit validation. String comparison only; no IO.

import 'package:iris_flutter_app/certification/evidence/certification_evidence_index.dart';
import 'package:iris_flutter_app/certification/public/public_certification_manifest.dart';
import 'package:iris_flutter_app/certification/public/public_verification_package_builder.dart';

/// Keys expected in [verifyExpectedResults]. Derived from frozen artifacts only.
const List<String> expectedAuditKitHashKeys = [
  'STRUCTURAL_HASH',
  'PACKAGE_SHA256',
  'SCOPE_HASH',
  'EVIDENCE_INDEX_HASH',
  'AUDIT_CHAIN_ROOT',
  'BUILD_FINGERPRINT',
];

/// Validates that provided hash values match the frozen expected values.
/// No hash recomputation; no IO; pure deterministic comparison.
final class ExternalAuditKitValidator {
  const ExternalAuditKitValidator();

  /// Returns true only if every key in [expectedAuditKitHashKeys]
  /// is present in [providedHashes] and the value equals the frozen expected.
  bool verifyExpectedResults(Map<String, String> providedHashes) {
    final expected = getExpectedAuditKitHashes();
    for (final key in expectedAuditKitHashKeys) {
      final provided = providedHashes[key];
      final exp = expected[key];
      if (provided == null || exp == null || provided != exp) {
        return false;
      }
    }
    return true;
  }
}

/// Expected hash values for the external audit kit. From frozen artifacts only.
Map<String, String> getExpectedAuditKitHashes() {
  final manifest = publicCertificationManifest;
  final index = certificationEvidenceIndex;
  const builder = PublicVerificationPackageBuilder();
  final package = builder.buildPackageFiles();
  final auditRoot =
      index.entries.firstWhere((e) => e.id == 'audit_chain_root').sha256;
  final buildFingerprint = index.entries
      .firstWhere((e) => e.id == 'reproducible_build_fingerprint')
      .sha256;

  return {
    'STRUCTURAL_HASH': manifest.coreStructuralHash,
    'PACKAGE_SHA256': package['PACKAGE_SHA256.txt']!,
    'SCOPE_HASH': manifest.certificationScopeHash,
    'EVIDENCE_INDEX_HASH': manifest.evidenceIndexHash,
    'AUDIT_CHAIN_ROOT': auditRoot,
    'BUILD_FINGERPRINT': buildFingerprint,
  };
}
