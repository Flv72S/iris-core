// H2 - GCP descriptor. Immutable DTO.

import 'package:iris_flutter_app/meta_governance/meta_governance_role.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

import 'gcp_id.dart';
import 'gcp_scope.dart';

class GCPDescriptor {
  const GCPDescriptor({
    required this.id,
    required this.title,
    required this.proposerRole,
    required this.fromVersion,
    required this.toVersion,
    required this.scope,
    required this.rationale,
    required this.riskAssessment,
    required this.rollbackStrategy,
  });

  final GCPId id;
  final String title;
  final MetaGovernanceRole proposerRole;
  final GovernanceVersion fromVersion;
  final GovernanceVersion toVersion;
  final GCPScope scope;
  final String rationale;
  final String riskAssessment;
  final String rollbackStrategy;

  Map<String, Object> toJson() => {
        'id': id.value,
        'title': title,
        'proposerRole': proposerRole.name,
        'fromVersion': fromVersion.toString(),
        'toVersion': toVersion.toString(),
        'scope': scope.name,
        'rationale': rationale,
        'riskAssessment': riskAssessment,
        'rollbackStrategy': rollbackStrategy,
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GCPDescriptor &&
          id == other.id &&
          title == other.title &&
          proposerRole == other.proposerRole &&
          fromVersion == other.fromVersion &&
          toVersion == other.toVersion &&
          scope == other.scope &&
          rationale == other.rationale &&
          riskAssessment == other.riskAssessment &&
          rollbackStrategy == other.rollbackStrategy);

  @override
  int get hashCode => Object.hash(id, title, proposerRole, fromVersion,
      toVersion, scope, rationale, riskAssessment, rollbackStrategy);
}
