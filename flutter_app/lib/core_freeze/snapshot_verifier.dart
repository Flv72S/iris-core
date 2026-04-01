// Phase 13.9 — Offline snapshot verification. Pure; no IO, no network, no filesystem.

import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'audit_bundle_hash.dart';
import 'audit_bundle_serializer.dart';
import 'audit_bundle_verifier.dart';
import 'core_structural_hash.dart';
import 'external_audit_bundle.dart';
import 'formal_core_snapshot.dart';
import 'snapshot_hash.dart';

/// Verifies that the snapshot is coherent with the audit bundle and all hashes are recomputable.
bool verifyFormalCoreCertificationSnapshot(
  FormalCoreCertificationSnapshot snapshot,
  ExternalAuditBundle bundle,
) {
  if (snapshot.freezeVersion != bundle.freezeVersion) return false;
  if (snapshot.structuralHash != bundle.structuralHash) return false;
  if (snapshot.freezeSealHash != bundle.freezeSealHash) return false;
  if (!isValidStructuralHash(snapshot.auditBundleHash)) return false;
  if (!isValidStructuralHash(snapshot.buildFingerprintHash)) return false;
  if (!isValidStructuralHash(snapshot.binaryProvenanceHash)) return false;
  if (computeAuditBundleHash(bundle) != snapshot.auditBundleHash) return false;
  if (_hashMap(bundle.buildFingerprint.toJson()) != snapshot.buildFingerprintHash) return false;
  if (_hashMap(bundle.binaryProvenance.toJson()) != snapshot.binaryProvenanceHash) return false;
  if (!verifyExternalAuditBundle(bundle)) return false;
  computeFormalCoreSnapshotHash(snapshot);
  return true;
}

String _hashMap(Map<String, Object> map) {
  final canonical = serializeMapCanonically(map);
  final bytes = utf8.encode(canonical);
  return sha256.convert(bytes).toString();
}
