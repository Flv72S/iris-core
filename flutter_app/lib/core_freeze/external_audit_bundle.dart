// Phase 13.8 — External audit bundle. Immutable; deterministic; no runtime/sensitive data.

import 'binary_provenance_record.dart';
import 'reproducible_build_fingerprint.dart';

/// Immutable audit bundle for external verification. All fields non-empty; lists unmodifiable.
final class ExternalAuditBundle {
  const ExternalAuditBundle({
    required this.freezeVersion,
    required this.structuralHash,
    required this.freezeSealHash,
    required this.auditChainHashes,
    required this.buildFingerprint,
    required this.binaryProvenance,
    required this.capabilityCodes,
  });

  final String freezeVersion;
  final String structuralHash;
  final String freezeSealHash;
  final List<String> auditChainHashes;
  final ReproducibleBuildFingerprint buildFingerprint;
  final BinaryProvenanceRecord binaryProvenance;
  final List<String> capabilityCodes;

  /// JSON keys in alphabetical order.
  Map<String, Object> toJson() {
    return <String, Object>{
      'audit_chain_hashes': List<String>.from(auditChainHashes),
      'binary_provenance': binaryProvenance.toJson(),
      'build_fingerprint': buildFingerprint.toJson(),
      'capability_codes': List<String>.from(capabilityCodes),
      'freeze_seal_hash': freezeSealHash,
      'freeze_version': freezeVersion,
      'structural_hash': structuralHash,
    };
  }

  /// Parses and validates. Returns immutable lists.
  static ExternalAuditBundle fromJson(Map<Object?, Object?> json) {
    final v = json['freeze_version'] as String?;
    final s = json['structural_hash'] as String?;
    final f = json['freeze_seal_hash'] as String?;
    final a = json['audit_chain_hashes'];
    final bp = json['binary_provenance'];
    final bf = json['build_fingerprint'];
    final c = json['capability_codes'];
    if (v == null || v.isEmpty) throw ArgumentError('freeze_version required');
    if (s == null || s.isEmpty) throw ArgumentError('structural_hash required');
    if (f == null || f.isEmpty) throw ArgumentError('freeze_seal_hash required');
    if (a == null || a is! List<Object?>) throw ArgumentError('audit_chain_hashes required');
    if (bp == null || bp is! Map<Object?, Object?>) throw ArgumentError('binary_provenance required');
    if (bf == null || bf is! Map<Object?, Object?>) throw ArgumentError('build_fingerprint required');
    if (c == null || c is! List<Object?>) throw ArgumentError('capability_codes required');
    final auditList = List<String>.unmodifiable(
      a.map((e) => e as String),
    );
    final capList = List<String>.unmodifiable(
      c.map((e) => e as String),
    );
    return ExternalAuditBundle(
      freezeVersion: v,
      structuralHash: s,
      freezeSealHash: f,
      auditChainHashes: auditList,
      buildFingerprint: ReproducibleBuildFingerprint.fromJson(bf),
      binaryProvenance: BinaryProvenanceRecord.fromJson(bp),
      capabilityCodes: capList,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ExternalAuditBundle &&
          runtimeType == other.runtimeType &&
          freezeVersion == other.freezeVersion &&
          structuralHash == other.structuralHash &&
          freezeSealHash == other.freezeSealHash &&
          _listEq(auditChainHashes, other.auditChainHashes) &&
          buildFingerprint == other.buildFingerprint &&
          binaryProvenance == other.binaryProvenance &&
          _listEq(capabilityCodes, other.capabilityCodes);

  @override
  int get hashCode => Object.hash(
        freezeVersion,
        structuralHash,
        freezeSealHash,
        Object.hashAll(auditChainHashes),
        buildFingerprint,
        binaryProvenance,
        Object.hashAll(capabilityCodes),
      );

  static bool _listEq(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
