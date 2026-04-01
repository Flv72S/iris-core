// H5 - Active state snapshot. Immutable.

import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

class GovernanceActivationSnapshot {
  const GovernanceActivationSnapshot({
    required this.activeVersion,
    required this.activatedAt,
    required this.source,
  });

  final GovernanceVersion activeVersion;
  final DateTime activatedAt;
  final GovernanceRatificationRecord source;

  Map<String, Object> toJson() => {
        'activeVersion': activeVersion.toString(),
        'activatedAt': activatedAt.toIso8601String(),
        'sourceDecisionStatus': source.decision.status.name,
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GovernanceActivationSnapshot &&
          activeVersion == other.activeVersion &&
          activatedAt == other.activatedAt &&
          source == other.source);

  @override
  int get hashCode => Object.hash(activeVersion, activatedAt, source);
}
