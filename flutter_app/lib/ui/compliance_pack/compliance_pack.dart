// Phase 11.7.1 — Immutable compliance pack DTO. Hashable, verifiable.

import 'package:iris_flutter_app/ui/time_model/logical_time.dart';

import 'compliance_section.dart';

/// Deterministic compliance pack built from VerifiedForensicBundle. Evidence only; no claims.
class CompliancePack {
  const CompliancePack({
    required this.packVersion,
    required this.generatedFromBundleHash,
    required this.generatedAtLogicalTime,
    required this.sections,
    required this.packHash,
  });

  final String packVersion;
  final String generatedFromBundleHash;
  final LogicalTime generatedAtLogicalTime;
  final Map<String, ComplianceSection> sections;
  final String packHash;

  Map<String, dynamic> toJson() => <String, dynamic>{
        'packVersion': packVersion,
        'generatedFromBundleHash': generatedFromBundleHash,
        'generatedAtLogicalTime': <String, dynamic>{
          'tick': generatedAtLogicalTime.tick,
          'origin': generatedAtLogicalTime.origin,
        },
        'sections': sections.map((k, v) => MapEntry(k, v.toJson())),
        'packHash': packHash,
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CompliancePack &&
          runtimeType == other.runtimeType &&
          packVersion == other.packVersion &&
          generatedFromBundleHash == other.generatedFromBundleHash &&
          generatedAtLogicalTime == other.generatedAtLogicalTime &&
          packHash == other.packHash &&
          _mapEqual(sections, other.sections);

  static bool _mapEqual(
      Map<String, ComplianceSection> a, Map<String, ComplianceSection> b) {
    if (a.length != b.length) return false;
    for (final k in a.keys) {
      if (!b.containsKey(k) || a[k] != b[k]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(
        packVersion,
        generatedFromBundleHash,
        generatedAtLogicalTime,
        packHash,
        Object.hashAll(sections.keys),
        Object.hashAll(sections.values),
      );
}
