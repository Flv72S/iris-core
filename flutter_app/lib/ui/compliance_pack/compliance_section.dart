// Phase 11.7.1 — Immutable compliance section. Evidence list only.

import 'compliance_evidence.dart';

/// One section of a compliance pack (e.g. Determinism, Explainability).
class ComplianceSection {
  const ComplianceSection({
    required this.sectionId,
    required this.title,
    required this.description,
    required this.evidence,
  });

  final String sectionId;
  final String title;
  final String description;
  final List<ComplianceEvidence> evidence;

  Map<String, dynamic> toJson() => <String, dynamic>{
        'sectionId': sectionId,
        'title': title,
        'description': description,
        'evidence': evidence.map((e) => e.toJson()).toList(),
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ComplianceSection &&
          runtimeType == other.runtimeType &&
          sectionId == other.sectionId &&
          title == other.title &&
          description == other.description &&
          _listEqual(evidence, other.evidence);

  static bool _listEqual(List<ComplianceEvidence> a, List<ComplianceEvidence> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(sectionId, title, description, Object.hashAll(evidence));
}
