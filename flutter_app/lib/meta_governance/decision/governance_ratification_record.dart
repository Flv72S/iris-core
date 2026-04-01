// H4 - Ratification record. Immutable; newVersion only if APPROVED.

import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

import 'governance_decision.dart';

class GovernanceRatificationRecord {
  const GovernanceRatificationRecord({
    required this.decision,
    required this.previousVersion,
    required this.newVersion,
    required this.ratifiedAt,
  });

  final GovernanceDecision decision;
  final GovernanceVersion previousVersion;
  final GovernanceVersion newVersion;
  final DateTime ratifiedAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GovernanceRatificationRecord &&
          decision == other.decision &&
          previousVersion == other.previousVersion &&
          newVersion == other.newVersion &&
          ratifiedAt == other.ratifiedAt);

  @override
  int get hashCode =>
      Object.hash(decision, previousVersion, newVersion, ratifiedAt);
}
