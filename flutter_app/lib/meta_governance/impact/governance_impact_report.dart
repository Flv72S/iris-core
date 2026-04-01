// H3 - Impact report. Immutable.

import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_scope.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

import 'governance_impact_type.dart';

class GovernanceImpact {
  const GovernanceImpact({
    required this.type,
    required this.affectedScope,
    required this.description,
  });

  final GovernanceImpactType type;
  final GCPScope affectedScope;
  final String description;

  Map<String, Object> toJson() => {
        'type': type.name,
        'affectedScope': affectedScope.name,
        'description': description,
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GovernanceImpact &&
          type == other.type &&
          affectedScope == other.affectedScope &&
          description == other.description);

  @override
  int get hashCode => Object.hash(type, affectedScope, description);
}

class GovernanceImpactReport {
  const GovernanceImpactReport({
    required this.gcpId,
    required this.fromVersion,
    required this.toVersion,
    required this.impacts,
  });

  final GCPId gcpId;
  final GovernanceVersion fromVersion;
  final GovernanceVersion toVersion;
  final List<GovernanceImpact> impacts;

  Map<String, Object> toJson() => {
        'gcpId': gcpId.value,
        'fromVersion': fromVersion.toString(),
        'toVersion': toVersion.toString(),
        'impacts': impacts.map((i) => i.toJson()).toList(),
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GovernanceImpactReport &&
          gcpId == other.gcpId &&
          fromVersion == other.fromVersion &&
          toVersion == other.toVersion &&
          _listEq(impacts, other.impacts));

  static bool _listEq(List<GovernanceImpact> a, List<GovernanceImpact> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
    return true;
  }

  @override
  int get hashCode =>
      Object.hash(gcpId, fromVersion, toVersion, Object.hashAll(impacts));
}
