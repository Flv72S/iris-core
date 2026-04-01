// Phase 11.9.3 — Static immutable registry of compliance–normative links. No interpretation.

import 'compliance_normative_link.dart';
import 'compliance_section_id.dart';
import 'normative_reference.dart';

/// Static, immutable registry of declared ComplianceNormativeLink entries. Audit index only; no compliance claim.
class ComplianceMapRegistry {
  const ComplianceMapRegistry({
    required this.version,
    required this.links,
    this.description,
  });

  final String version;
  final List<ComplianceNormativeLink> links;
  final String? description;

  /// Serialization with sorted keys; links in stable order. Optional description omitted when null.
  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'links': links.map((l) => l.toJson()).toList(),
      'version': version,
    };
    if (description != null) map['description'] = description;
    final keys = map.keys.toList()..sort();
    return Map.fromEntries(keys.map((k) => MapEntry(k, map[k])));
  }

  factory ComplianceMapRegistry.fromJson(Map<String, dynamic> json) {
    final versionVal = json['version'] as String?;
    if (versionVal == null || versionVal.isEmpty) {
      throw ArgumentError('version is required and non-empty');
    }
    final listJson = json['links'] as List<dynamic>?;
    if (listJson == null || listJson.isEmpty) {
      throw ArgumentError('links is required and must be non-empty');
    }
    final linkList = listJson
        .map((e) => ComplianceNormativeLink.fromJson(
            Map<String, dynamic>.from(e as Map)))
        .toList();
    return ComplianceMapRegistry(
      version: versionVal,
      links: linkList,
      description: json['description'] as String?,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ComplianceMapRegistry &&
          runtimeType == other.runtimeType &&
          version == other.version &&
          _listEqual(links, other.links) &&
          description == other.description;

  static bool _listEqual(
      List<ComplianceNormativeLink> a, List<ComplianceNormativeLink> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode =>
      Object.hash(version, Object.hashAll(links), description);

  /// Declared mapping for this build. Index only; no compliance assertion.
  static const ComplianceMapRegistry defaultRegistry = ComplianceMapRegistry(
    version: '11.9.3',
    description: 'Declared section-to-normative links for audit',
    links: [
      ComplianceNormativeLink(
        sectionId: ComplianceSectionId('decision-loop'),
        normativeReferences: [
          NormativeReference(
            regulationId: 'EU-AI-ACT',
            article: 'Art. 13',
            title: 'Transparency obligations for AI systems',
          ),
        ],
        note: 'Relevant for transparency obligations',
      ),
      ComplianceNormativeLink(
        sectionId: ComplianceSectionId('replay-store'),
        normativeReferences: [
          NormativeReference(
            regulationId: 'EU-AI-ACT',
            article: 'Art. 9',
            title: 'Risk management system',
          ),
        ],
      ),
    ],
  );
}
