// Phase 14.4 — Public verification package builder. Deterministic assembly; no IO.
// Derives only from Phase 13, 14.1, 14.2, 14.3, 14.7, 14.9. No filesystem; no clock or RNG.

import 'package:iris_flutter_app/certification/evidence/certification_evidence_index.dart';
import 'package:iris_flutter_app/certification/public/public_certification_manifest.dart';
import 'package:iris_flutter_app/certification/public/public_certification_manifest_serializer.dart';
import 'package:iris_flutter_app/certification/public/public_verification_package_hash.dart';
import 'package:iris_flutter_app/certification/reproducibility/external_audit_proof.dart';
import 'package:iris_flutter_app/certification/reproducibility/external_audit_proof_generator.dart';
import 'package:iris_flutter_app/certification/seal/public_certification_claims_guard.dart';
import 'package:iris_flutter_app/certification/seal/public_certification_seal.dart';
import 'package:iris_flutter_app/certification/seal/public_certification_seal_generator.dart';
import 'package:iris_flutter_app/certification/seal/public_certification_seal_serializer.dart';
import 'package:iris_flutter_app/certification/transparency/public_trust_disclosure.dart';
import 'package:iris_flutter_app/certification/transparency/public_trust_disclosure_generator.dart';
import 'package:iris_flutter_app/certification/transparency/public_trust_disclosure_serializer.dart';

/// Builds the public verification package as a map of filename → content.
/// No real filesystem access; pure deterministic assembly.
final class PublicVerificationPackageBuilder {
  const PublicVerificationPackageBuilder();

  /// Returns map of filename → UTF-8-safe content (LF newlines). Deterministic.
  Map<String, String> buildPackageFiles() {
    final manifest = publicCertificationManifest;
    final index = certificationEvidenceIndex;

    final files = <String, String>{};

    files['public_certification_manifest.json'] =
        serializePublicCertificationManifest(manifest);

    files['core_structural_hash.txt'] = manifest.coreStructuralHash;
    files['certification_scope_hash.txt'] = manifest.certificationScopeHash;
    files['evidence_index_hash.txt'] = manifest.evidenceIndexHash;
    files['evidence_entry_ids.txt'] = manifest.evidenceEntryIds.join('\n');

    files['freeze_seal.txt'] =
        _sha256ForId(index, 'cryptographic_freeze_seal');
    files['audit_chain_root.txt'] = _sha256ForId(index, 'audit_chain_root');
    files['reproducible_build_fingerprint.txt'] =
        _sha256ForId(index, 'reproducible_build_fingerprint');
    files['binary_provenance.txt'] = _sha256ForId(index, 'binary_provenance');
    files['external_audit_bundle_reference.txt'] =
        _sha256ForId(index, 'external_audit_bundle');
    files['core_certification_snapshot.txt'] =
        _sha256ForId(index, 'core_certification_snapshot');

    final seal = FreezeSeal(hash: files['freeze_seal.txt']!);
    final fingerprint = BuildFingerprint(
      value: files['reproducible_build_fingerprint.txt']!,
    );
    final disclosure = generatePublicTrustDisclosure(
      manifest: manifest,
      seal: seal,
      fingerprint: fingerprint,
      verificationPackage: Map.from(files),
    );
    files['public_trust_disclosure.json'] =
        serializePublicTrustDisclosureCanonical(disclosure);

    const environment = AuditorEnvironmentSnapshot(
      mode: 'offline',
      components: [],
    );
    final proof = generateExternalAuditProof(
      manifest: manifest,
      recomputedHash: StructuralHashResult(value: manifest.coreStructuralHash),
      seal: seal,
      fingerprint: fingerprint,
      environment: environment,
    );
    final certificationSeal = generatePublicCertificationSeal(
      manifest: manifest,
      seal: seal,
      fingerprint: fingerprint,
      reproducibilityProof: proof,
      disclosure: disclosure,
    );
    validatePublicCertificationSealClaims(certificationSeal);
    files['public_certification_seal.json'] =
        serializePublicCertificationSealCanonical(certificationSeal);

    final packageHash =
        computePublicVerificationPackageSha256(Map.from(files));
    files['PACKAGE_SHA256.txt'] = packageHash;

    return files;
  }
}

String _sha256ForId(CertificationEvidenceIndex index, String id) {
  return index.entries.firstWhere((e) => e.id == id).sha256;
}
