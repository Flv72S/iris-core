// Phase 14.9 — Deterministic seal generator. No filesystem; no clock; no network.

import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'package:iris_flutter_app/certification/public/public_certification_manifest.dart';
import 'package:iris_flutter_app/certification/reproducibility/external_audit_proof.dart';
import 'package:iris_flutter_app/certification/reproducibility/external_audit_proof_serializer.dart';
import 'package:iris_flutter_app/certification/transparency/public_trust_disclosure.dart';
import 'package:iris_flutter_app/certification/transparency/public_trust_disclosure_serializer.dart';

import 'public_certification_seal.dart';

/// Generates the public certification seal from deterministic inputs only.
PublicCertificationSeal generatePublicCertificationSeal({
  required PublicCertificationManifest manifest,
  required FreezeSeal seal,
  required BuildFingerprint fingerprint,
  required ExternalAuditReproducibilityProof reproducibilityProof,
  required PublicTrustDisclosure disclosure,
}) {
  final proofSerialized =
      serializeExternalAuditProofCanonical(reproducibilityProof);
  final reproducibilityProofHash =
      sha256.convert(utf8.encode(proofSerialized)).toString();

  final disclosureSerialized =
      serializePublicTrustDisclosureCanonical(disclosure);
  final trustDisclosureHash =
      sha256.convert(utf8.encode(disclosureSerialized)).toString();

  final evidenceFiles = List<String>.from(disclosure.publishedEvidenceFiles);

  return PublicCertificationSeal(
    irisCoreVersion: manifest.manifestVersion,
    structuralHash: manifest.coreStructuralHash,
    freezeSealHash: seal.hash,
    buildFingerprint: fingerprint.value,
    reproducibilityProofHash: reproducibilityProofHash,
    trustDisclosureHash: trustDisclosureHash,
    evidenceFiles: evidenceFiles,
  );
}
