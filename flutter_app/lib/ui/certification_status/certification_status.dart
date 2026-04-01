// Microstep 12.1 — Static declarative status. Technical index only; no normative claim.

import 'certification_capability.dart';
import 'certification_evidence_ref.dart';

/// Immutable technical status descriptor. Lists capabilities and optional evidence refs; makes no legal claim.
class CertificationStatus {
  const CertificationStatus({
    required this.version,
    required this.capabilities,
    this.evidenceRefs = const [],
    required this.generatedBy,
    this.description,
  });

  final String version;
  final List<CertificationCapability> capabilities;
  final List<CertificationEvidenceRef> evidenceRefs;
  final String generatedBy;
  final String? description;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'capabilities': capabilities.map((c) => c.code).toList(),
      'evidenceRefs': evidenceRefs.map((e) => e.toJson()).toList(),
      'generatedBy': generatedBy,
      'version': version,
    };
    if (description != null) map['description'] = description;
    final keys = map.keys.toList()..sort();
    return Map.fromEntries(keys.map((k) => MapEntry(k, map[k])));
  }

  factory CertificationStatus.fromJson(Map<String, dynamic> json) {
    final versionVal = json['version'] as String?;
    if (versionVal == null || versionVal.isEmpty) {
      throw ArgumentError('version is required and non-empty');
    }
    final capList = json['capabilities'] as List<dynamic>?;
    if (capList == null || capList.isEmpty) {
      throw ArgumentError('capabilities is required and must be non-empty');
    }
    final caps = capList
        .map((e) => CertificationCapability.fromCode(e as String))
        .toList();
    final refsJson = json['evidenceRefs'] as List<dynamic>?;
    final refs = refsJson == null
        ? <CertificationEvidenceRef>[]
        : refsJson
            .map((e) => CertificationEvidenceRef.fromJson(
                Map<String, dynamic>.from(e as Map)))
            .toList();
    final generatedByVal = json['generatedBy'] as String?;
    if (generatedByVal == null || generatedByVal.isEmpty) {
      throw ArgumentError('generatedBy is required and non-empty');
    }
    return CertificationStatus(
      version: versionVal,
      capabilities: caps,
      evidenceRefs: refs,
      generatedBy: generatedByVal,
      description: json['description'] as String?,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CertificationStatus &&
          runtimeType == other.runtimeType &&
          version == other.version &&
          _capListEqual(capabilities, other.capabilities) &&
          _refListEqual(evidenceRefs, other.evidenceRefs) &&
          generatedBy == other.generatedBy &&
          description == other.description;

  static bool _capListEqual(
      List<CertificationCapability> a, List<CertificationCapability> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  static bool _refListEqual(
      List<CertificationEvidenceRef> a, List<CertificationEvidenceRef> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(
        version,
        Object.hashAll(capabilities),
        Object.hashAll(evidenceRefs),
        generatedBy,
        description,
      );

  /// Default technical status for this build. Index only; no regulatory claim.
  static const CertificationStatus defaultStatus = CertificationStatus(
    version: '12.1',
    generatedBy: 'IRIS Certification Runtime',
    description: 'Technical capability index for audit',
    capabilities: [
      CertificationCapability.deterministicReplay,
      CertificationCapability.immutablePersistence,
      CertificationCapability.offlineReplay,
      CertificationCapability.forensicExport,
      CertificationCapability.forensicImportVerification,
      CertificationCapability.complianceMappingPresent,
    ],
    evidenceRefs: [],
  );
}
