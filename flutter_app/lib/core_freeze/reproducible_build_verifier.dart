// Phase 13.7 — Provenance verification. Pure; no IO, no filesystem, no network.

import 'binary_provenance_record.dart';
import 'reproducible_build_fingerprint.dart';

/// Verifies that the record's fingerprint is recomputable and coherent.
bool verifyBinaryProvenance(BinaryProvenanceRecord record) {
  if (record.artifactName.isEmpty || record.artifactHash.isEmpty) return false;
  final fp = record.fingerprint;
  if (fp.freezeVersion.isEmpty ||
      fp.structuralHash.isEmpty ||
      fp.freezeSealHash.isEmpty ||
      fp.buildConfigHash.isEmpty ||
      fp.fingerprintHash.isEmpty) {
    return false;
  }
  final recomputed = computeBuildFingerprint(
    freezeVersion: fp.freezeVersion,
    structuralHash: fp.structuralHash,
    freezeSealHash: fp.freezeSealHash,
  );
  if (recomputed.buildConfigHash != fp.buildConfigHash) return false;
  if (recomputed.fingerprintHash != fp.fingerprintHash) return false;
  return true;
}
