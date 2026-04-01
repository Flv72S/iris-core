// Phase 11.9.2 — Immutable identifier for a Compliance Pack section.

/// Immutable ID for a compliance pack section. Deterministic; no interpretation.
class ComplianceSectionId {
  const ComplianceSectionId(this.value);

  final String value;

  Map<String, dynamic> toJson() => <String, dynamic>{'value': value};

  factory ComplianceSectionId.fromJson(Map<String, dynamic> json) {
    final v = json['value'] as String?;
    if (v == null || v.trim().isEmpty) {
      throw ArgumentError('value is required and must be non-empty after trim');
    }
    return ComplianceSectionId(v);
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ComplianceSectionId &&
          runtimeType == other.runtimeType &&
          value == other.value;

  @override
  int get hashCode => value.hashCode;
}
