// H4 - Decision rules. Static; validated at construction.

class GovernanceDecisionRulesException implements Exception {
  GovernanceDecisionRulesException(this.message);
  final String message;
  @override
  String toString() => 'GovernanceDecisionRulesException: $message';
}

class GovernanceDecisionRules {
  GovernanceDecisionRules({
    required this.requiredApprovals,
    required this.requiredRejectionsToBlock,
    this.requireImpactReport = true,
  }) {
    if (requiredApprovals < 1) {
      throw GovernanceDecisionRulesException('requiredApprovals must be >= 1');
    }
    if (requiredRejectionsToBlock < 1) {
      throw GovernanceDecisionRulesException(
          'requiredRejectionsToBlock must be >= 1');
    }
  }

  final int requiredApprovals;
  final int requiredRejectionsToBlock;
  final bool requireImpactReport;
}
