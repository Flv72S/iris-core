// ODA-6 — Evaluate policies during cross-cluster interaction. Deterministic.

import 'package:iris_flutter_app/core/distributed/governance/governance_registry.dart';
import 'package:iris_flutter_app/core/distributed/governance/governance_policy.dart';

class InterClusterEventContext {
  const InterClusterEventContext({
    required this.originClusterId,
    required this.targetClusterId,
    required this.domainId,
    required this.eventType,
    this.federationActive = true,
  });
  final String originClusterId;
  final String targetClusterId;
  final String domainId;
  final String eventType;
  final bool federationActive;
}

class PolicyEvaluationResult {
  const PolicyEvaluationResult({
    required this.allowed,
    this.governanceSuspended = false,
    this.federationInactive = false,
    this.policyNotApplicable = false,
    this.policyConditionsNotSatisfied = false,
  });
  final bool allowed;
  final bool governanceSuspended;
  final bool federationInactive;
  final bool policyNotApplicable;
  final bool policyConditionsNotSatisfied;
}

class InterClusterPolicyEvaluator {
  InterClusterPolicyEvaluator._();

  static PolicyEvaluationResult evaluateInterClusterEvent({
    required InterClusterEventContext eventContext,
    required GovernanceRegistry registry,
    required List<GovernancePolicy> activePolicies,
  }) {
    if (!eventContext.federationActive) {
      return const PolicyEvaluationResult(allowed: false, federationInactive: true);
    }
    if (registry.isGovernanceSuspended()) {
      return const PolicyEvaluationResult(allowed: false, governanceSuspended: true);
    }
    final applicable = activePolicies.where((p) {
      final ctx = <String, dynamic>{
        'domainId': eventContext.domainId,
        'clusterId': eventContext.originClusterId,
        'eventType': eventContext.eventType,
      };
      return GovernancePolicyFactory.evaluatePolicy(p, ctx);
    }).toList();
    if (applicable.isEmpty) {
      return const PolicyEvaluationResult(allowed: false, policyNotApplicable: true);
    }
    for (final p in applicable) {
      final ctx = <String, dynamic>{
        'domainId': eventContext.domainId,
        'clusterId': eventContext.originClusterId,
        'eventType': eventContext.eventType,
      };
      if (!GovernancePolicyFactory.evaluatePolicy(p, ctx)) {
        return const PolicyEvaluationResult(allowed: false, policyConditionsNotSatisfied: true);
      }
    }
    return const PolicyEvaluationResult(allowed: true);
  }
}
