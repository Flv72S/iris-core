// H7 - Drift report. Immutable; deterministic equality; serializable.

import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

import 'governance_drift_type.dart';

class GovernanceDrift {
  const GovernanceDrift({
    required this.type,
    required this.description,
  });

  final GovernanceDriftType type;
  final String description;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GovernanceDrift &&
          type == other.type &&
          description == other.description);

  @override
  int get hashCode => Object.hash(type, description);

  Map<String, Object> toJson() => {
        'type': type.name,
        'description': description,
      };
}

class GovernanceDriftReport {
  GovernanceDriftReport({
    required this.currentVersion,
    required List<GovernanceDrift> drifts,
    required this.analyzedAt,
  }) : _drifts = List.unmodifiable(List.from(drifts));

  final GovernanceVersion currentVersion;
  final DateTime analyzedAt;
  final List<GovernanceDrift> _drifts;

  List<GovernanceDrift> get drifts => _drifts;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GovernanceDriftReport &&
          currentVersion == other.currentVersion &&
          analyzedAt == other.analyzedAt &&
          _listEq(drifts, other.drifts));

  static bool _listEq(List<GovernanceDrift> a, List<GovernanceDrift> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
    return true;
  }

  @override
  int get hashCode => Object.hash(
        currentVersion,
        analyzedAt,
        Object.hashAll(drifts),
      );

  Map<String, Object> toJson() => {
        'currentVersion': currentVersion.toString(),
        'analyzedAt': analyzedAt.toUtc().toIso8601String(),
        'drifts': _drifts.map((d) => d.toJson()).toList(),
        'driftCount': _drifts.length,
      };
}
