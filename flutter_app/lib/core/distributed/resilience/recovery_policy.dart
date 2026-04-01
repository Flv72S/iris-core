// ODA-9 — Governance-defined recovery rules. Deterministic.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class RecoveryPolicy {
  const RecoveryPolicy({
    required this.policyId,
    required this.eligibleEntities,
    required this.requiredApprovals,
    required this.recoveryPreconditions,
    required this.requiredInvariantRecheck,
    required this.postRecoveryVerificationSteps,
    required this.recoveryPolicyHash,
  });

  final String policyId;
  final List<String> eligibleEntities;
  final List<String> requiredApprovals;
  final List<String> recoveryPreconditions;
  final bool requiredInvariantRecheck;
  final List<String> postRecoveryVerificationSteps;
  final String recoveryPolicyHash;
}

class RecoveryPolicyFactory {
  RecoveryPolicyFactory._();

  static RecoveryPolicy createRecoveryPolicy({
    required String policyId,
    required List<String> eligibleEntities,
    required List<String> requiredApprovals,
    required List<String> recoveryPreconditions,
    required bool requiredInvariantRecheck,
    required List<String> postRecoveryVerificationSteps,
  }) {
    final payload = <String, dynamic>{
      'policyId': policyId,
      'eligibleEntities': (List<String>.from(eligibleEntities)..sort()),
      'requiredApprovals': (List<String>.from(requiredApprovals)..sort()),
      'recoveryPreconditions': recoveryPreconditions,
      'requiredInvariantRecheck': requiredInvariantRecheck,
      'postRecoveryVerificationSteps': postRecoveryVerificationSteps,
    };
    final hash = CanonicalPayload.hash(payload);
    return RecoveryPolicy(
      policyId: policyId,
      eligibleEntities: eligibleEntities,
      requiredApprovals: requiredApprovals,
      recoveryPreconditions: recoveryPreconditions,
      requiredInvariantRecheck: requiredInvariantRecheck,
      postRecoveryVerificationSteps: postRecoveryVerificationSteps,
      recoveryPolicyHash: hash,
    );
  }

  static bool verifyRecoveryPolicy(RecoveryPolicy policy) {
    final payload = <String, dynamic>{
      'policyId': policy.policyId,
      'eligibleEntities': (List<String>.from(policy.eligibleEntities)..sort()),
      'requiredApprovals': (List<String>.from(policy.requiredApprovals)..sort()),
      'recoveryPreconditions': policy.recoveryPreconditions,
      'requiredInvariantRecheck': policy.requiredInvariantRecheck,
      'postRecoveryVerificationSteps': policy.postRecoveryVerificationSteps,
    };
    return CanonicalPayload.hash(payload) == policy.recoveryPolicyHash;
  }

  static bool evaluateRecoveryEligibility(
    RecoveryPolicy policy,
    String entityId,
    List<String> approvalsReceived,
  ) {
    if (!policy.eligibleEntities.contains(entityId)) return false;
    for (final a in policy.requiredApprovals) {
      if (!approvalsReceived.contains(a)) return false;
    }
    return true;
  }
}
