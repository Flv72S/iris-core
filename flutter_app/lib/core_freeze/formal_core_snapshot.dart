// Phase 13.9 — Formal core certification snapshot. Immutable; no runtime data.

import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'audit_bundle_hash.dart';
import 'audit_bundle_serializer.dart';
import 'core_structural_hash.dart';
import 'external_audit_bundle.dart';

/// Immutable snapshot certifying Phase 13 closure. All hash fields 64 hex chars.
final class FormalCoreCertificationSnapshot {
  const FormalCoreCertificationSnapshot({
    required this.freezeVersion,
    required this.structuralHash,
    required this.freezeSealHash,
    required this.auditBundleHash,
    required this.buildFingerprintHash,
    required this.binaryProvenanceHash,
  });

  final String freezeVersion;
  final String structuralHash;
  final String freezeSealHash;
  final String auditBundleHash;
  final String buildFingerprintHash;
  final String binaryProvenanceHash;

  /// Builds the snapshot from a verified audit bundle. Pure; no IO.
  static FormalCoreCertificationSnapshot fromBundle(ExternalAuditBundle bundle) {
    final auditBundleHash = computeAuditBundleHash(bundle);
    final buildFingerprintHash = _hashMap(bundle.buildFingerprint.toJson());
    final binaryProvenanceHash = _hashMap(bundle.binaryProvenance.toJson());
    return FormalCoreCertificationSnapshot(
      freezeVersion: bundle.freezeVersion,
      structuralHash: bundle.structuralHash,
      freezeSealHash: bundle.freezeSealHash,
      auditBundleHash: auditBundleHash,
      buildFingerprintHash: buildFingerprintHash,
      binaryProvenanceHash: binaryProvenanceHash,
    );
  }

  static String _hashMap(Map<String, Object> map) {
    final canonical = serializeMapCanonically(map);
    final bytes = utf8.encode(canonical);
    return sha256.convert(bytes).toString();
  }

  /// Parses and validates. All hash fields must be 64 hex lowercase.
  static FormalCoreCertificationSnapshot fromJson(Map<Object?, Object?> json) {
    final v = json['freeze_version'] as String?;
    final s = json['structural_hash'] as String?;
    final f = json['freeze_seal_hash'] as String?;
    final a = json['audit_bundle_hash'] as String?;
    final b = json['build_fingerprint_hash'] as String?;
    final p = json['binary_provenance_hash'] as String?;
    if (v == null || v.isEmpty) throw ArgumentError('freeze_version required');
    if (s == null || s.isEmpty) throw ArgumentError('structural_hash required');
    if (f == null || f.isEmpty) throw ArgumentError('freeze_seal_hash required');
    if (a == null || a.isEmpty) throw ArgumentError('audit_bundle_hash required');
    if (b == null || b.isEmpty) throw ArgumentError('build_fingerprint_hash required');
    if (p == null || p.isEmpty) throw ArgumentError('binary_provenance_hash required');
    if (!isValidStructuralHash(a)) throw ArgumentError('audit_bundle_hash must be 64 hex chars');
    if (!isValidStructuralHash(b)) throw ArgumentError('build_fingerprint_hash must be 64 hex chars');
    if (!isValidStructuralHash(p)) throw ArgumentError('binary_provenance_hash must be 64 hex chars');
    return FormalCoreCertificationSnapshot(
      freezeVersion: v,
      structuralHash: s,
      freezeSealHash: f,
      auditBundleHash: a,
      buildFingerprintHash: b,
      binaryProvenanceHash: p,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FormalCoreCertificationSnapshot &&
          runtimeType == other.runtimeType &&
          freezeVersion == other.freezeVersion &&
          structuralHash == other.structuralHash &&
          freezeSealHash == other.freezeSealHash &&
          auditBundleHash == other.auditBundleHash &&
          buildFingerprintHash == other.buildFingerprintHash &&
          binaryProvenanceHash == other.binaryProvenanceHash;

  @override
  int get hashCode => Object.hash(
        freezeVersion,
        structuralHash,
        freezeSealHash,
        auditBundleHash,
        buildFingerprintHash,
        binaryProvenanceHash,
      );
}
