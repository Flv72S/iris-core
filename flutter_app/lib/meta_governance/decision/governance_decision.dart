// H4 - Decision entity. Immutable; audit trail.

import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';

import 'governance_vote.dart';

enum GovernanceDecisionStatus {
  pending,
  approved,
  rejected,
}

class GovernanceDecision {
  const GovernanceDecision({
    required this.gcpId,
    required this.status,
    required this.votes,
    required this.impactReport,
    required this.decidedAt,
  });

  final GCPId gcpId;
  final GovernanceDecisionStatus status;
  final List<GovernanceVote> votes;
  final GovernanceImpactReport impactReport;
  final DateTime decidedAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GovernanceDecision &&
          gcpId == other.gcpId &&
          status == other.status &&
          _listEq(votes, other.votes) &&
          impactReport == other.impactReport &&
          decidedAt == other.decidedAt);

  static bool _listEq(List<GovernanceVote> a, List<GovernanceVote> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
    return true;
  }

  @override
  int get hashCode =>
      Object.hash(gcpId, status, Object.hashAll(votes), impactReport, decidedAt);
}
