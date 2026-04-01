// H4 - Decision engine. Deterministic; no side effects.

import 'package:iris_flutter_app/meta_governance/gcp/gcp_descriptor.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_validator.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

import 'governance_decision.dart';
import 'governance_decision_rules.dart';
import 'governance_ratification_record.dart';
import 'governance_vote.dart';

class GovernanceDecisionEngineException implements Exception {
  GovernanceDecisionEngineException(this.message);
  final String message;
  @override
  String toString() => 'GovernanceDecisionEngineException: $message';
}

class GovernanceDecisionEngine {
  GovernanceDecisionEngine._();

  static GovernanceRatificationRecord evaluate({
    required GCPDescriptor gcp,
    required GovernanceImpactReport? impact,
    required List<GovernanceVote> votes,
    required GovernanceVersion currentVersion,
    required GovernanceDecisionRules rules,
    Set<GovernanceAuthorityId>? validAuthorities,
  }) {
    GCPValidator.validateGCP(gcp);

    if (rules.requireImpactReport && impact == null) {
      throw GovernanceDecisionEngineException(
          'Impact report required but not provided');
    }
    if (impact != null &&
        (impact.gcpId != gcp.id ||
            impact.fromVersion != gcp.fromVersion ||
            impact.toVersion != gcp.toVersion)) {
      throw GovernanceDecisionEngineException(
          'Impact report does not match GCP');
    }
    final effectiveImpact = impact ??
        GovernanceImpactReport(
            gcpId: gcp.id,
            fromVersion: gcp.fromVersion,
            toVersion: gcp.toVersion,
            impacts: const []);

    final filteredVotes = validAuthorities == null
        ? votes
        : votes.where((v) => validAuthorities.contains(v.authorityId)).toList();

    var approvals = 0;
    var rejections = 0;
    for (final v in filteredVotes) {
      if (v.vote == GovernanceVoteType.approve) approvals++;
      if (v.vote == GovernanceVoteType.reject) rejections++;
    }

    GovernanceDecisionStatus status;
    if (rejections >= rules.requiredRejectionsToBlock) {
      status = GovernanceDecisionStatus.rejected;
    } else if (approvals >= rules.requiredApprovals) {
      status = GovernanceDecisionStatus.approved;
    } else {
      status = GovernanceDecisionStatus.pending;
    }

    final decidedAt = filteredVotes.isEmpty
        ? DateTime.utc(1970, 1, 1)
        : filteredVotes
            .map((v) => v.timestamp)
            .reduce((a, b) => a.isAfter(b) ? a : b);

    final decision = GovernanceDecision(
      gcpId: gcp.id,
      status: status,
      votes: List.unmodifiable(filteredVotes),
      impactReport: effectiveImpact,
      decidedAt: decidedAt,
    );

    final newVersion = status == GovernanceDecisionStatus.approved
        ? gcp.toVersion
        : currentVersion;

    return GovernanceRatificationRecord(
      decision: decision,
      previousVersion: currentVersion,
      newVersion: newVersion,
      ratifiedAt: decidedAt,
    );
  }
}
