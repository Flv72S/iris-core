// ODA-6 — Deterministic approval validation. No timing dependency.

import 'package:iris_flutter_app/core/distributed/governance/governance_policy.dart';

class PolicyApprovalRecord {
  const PolicyApprovalRecord({
    required this.policyId,
    required this.clusterId,
    required this.signature,
  });
  final String policyId;
  final String clusterId;
  final String signature;
}

class PolicyApprovalEngine {
  PolicyApprovalEngine._();

  static bool approvePolicy({
    required String policyId,
    required String clusterId,
    required String signature,
    required List<PolicyApprovalRecord> existingApprovals,
    required GovernancePolicy policy,
    bool Function(String clusterId, String policyId, String signature)? validateSignature,
  }) {
    if (existingApprovals.any((a) => a.policyId == policyId && a.clusterId == clusterId)) {
      return false;
    }
    if (!policy.requiredApprovalClusterIds.contains(clusterId)) return false;
    if (validateSignature != null && !validateSignature(clusterId, policyId, signature)) {
      return false;
    }
    return true;
  }

  static bool validatePolicyApproval({
    required String policyId,
    required GovernancePolicy policy,
    required List<PolicyApprovalRecord> approvals,
  }) {
    final required = policy.requiredApprovalClusterIds.toSet();
    final approvedClusters = approvals.where((a) => a.policyId == policyId).map((a) => a.clusterId).toSet();
    if (approvedClusters.length != required.length) return false;
    for (final c in required) {
      if (!approvedClusters.contains(c)) return false;
    }
    return true;
  }
}
