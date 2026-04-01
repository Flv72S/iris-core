// Phase 13.8 — Offline bundle verification. Pure; no IO, no network, no filesystem.

import 'core_structural_hash.dart';
import 'external_audit_bundle.dart';
import 'reproducible_build_fingerprint.dart';
import 'reproducible_build_verifier.dart';

/// Verifies the external audit bundle. All checks deterministic; no external access.
bool verifyExternalAuditBundle(ExternalAuditBundle bundle) {
  if (bundle.freezeVersion.isEmpty ||
      bundle.structuralHash.isEmpty ||
      bundle.freezeSealHash.isEmpty) {
    return false;
  }
  if (bundle.auditChainHashes.isEmpty) return false;
  if (!isValidStructuralHash(bundle.structuralHash)) return false;
  if (bundle.freezeSealHash != bundle.auditChainHashes.last) return false;
  final recomputed = _recomputeFingerprint(bundle);
  if (recomputed.fingerprintHash != bundle.buildFingerprint.fingerprintHash) return false;
  if (recomputed.buildConfigHash != bundle.buildFingerprint.buildConfigHash) return false;
  if (bundle.buildFingerprint.structuralHash != bundle.structuralHash) return false;
  if (bundle.buildFingerprint.freezeSealHash != bundle.freezeSealHash) return false;
  if (!verifyBinaryProvenance(bundle.binaryProvenance)) return false;
  if (bundle.binaryProvenance.fingerprint != bundle.buildFingerprint) return false;
  return true;
}

/// Recomputes build fingerprint from bundle's core fields for verification.
ReproducibleBuildFingerprint _recomputeFingerprint(ExternalAuditBundle bundle) {
  return computeBuildFingerprint(
    freezeVersion: bundle.freezeVersion,
    structuralHash: bundle.structuralHash,
    freezeSealHash: bundle.freezeSealHash,
  );
}
