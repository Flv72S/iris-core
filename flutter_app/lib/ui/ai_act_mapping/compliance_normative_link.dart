// Phase 11.9.2 — Declarative link section ↔ normative references. No interpretation.

import 'normative_reference.dart';

import 'compliance_section_id.dart';

/// Immutable declarative link: a compliance section is relevant to one or more normative references.
/// Does not assert compliance, satisfaction, or coverage.
class ComplianceNormativeLink {
  const ComplianceNormativeLink({
    required this.sectionId,
    required this.normativeReferences,
    this.note,
  });

  final ComplianceSectionId sectionId;
  final List<NormativeReference> normativeReferences;
  final String? note;

  /// Serialization with sorted keys; list in order. Optional note omitted when null.
  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'normativeReferences':
          normativeReferences.map((r) => r.toJson()).toList(),
      'sectionId': sectionId.toJson(),
    };
    if (note != null) map['note'] = note;
    final keys = map.keys.toList()..sort();
    return Map.fromEntries(keys.map((k) => MapEntry(k, map[k])));
  }

  factory ComplianceNormativeLink.fromJson(Map<String, dynamic> json) {
    final sectionIdJson = json['sectionId'] as Map<String, dynamic>?;
    if (sectionIdJson == null) {
      throw ArgumentError('sectionId is required');
    }
    final listJson = json['normativeReferences'] as List<dynamic>?;
    if (listJson == null || listJson.isEmpty) {
      throw ArgumentError(
          'normativeReferences is required and must be non-empty');
    }
    final refs = listJson
        .map((e) =>
            NormativeReference.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
    return ComplianceNormativeLink(
      sectionId: ComplianceSectionId.fromJson(
          Map<String, dynamic>.from(sectionIdJson)),
      normativeReferences: refs,
      note: json['note'] as String?,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ComplianceNormativeLink &&
          runtimeType == other.runtimeType &&
          sectionId == other.sectionId &&
          _listEqual(normativeReferences, other.normativeReferences) &&
          note == other.note;

  static bool _listEqual(
      List<NormativeReference> a, List<NormativeReference> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(
        sectionId,
        Object.hashAll(normativeReferences),
        note,
      );
}
