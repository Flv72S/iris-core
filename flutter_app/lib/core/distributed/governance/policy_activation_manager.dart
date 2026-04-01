// ODA-6 — Activate policy once approved. Replay-reconstructable.

import 'package:iris_flutter_app/core/distributed/governance/governance_registry.dart';
import 'package:iris_flutter_app/core/distributed/governance/policy_approval_engine.dart';
import 'package:iris_flutter_app/core/distributed/governance/governance_policy.dart';

class PolicyActivationManager {
  PolicyActivationManager._();

  static bool activatePolicy({
    required String policyId,
    required GovernanceRegistry registry,
    required List<PolicyApprovalRecord> approvals,
    required GovernancePolicy policy,
  }) {
    if (!PolicyApprovalEngine.validatePolicyApproval(
      policyId: policyId,
      policy: policy,
      approvals: approvals,
    )) {
      return false;
    }
    return true;
  }

  static bool deprecatePolicy({
    required String policyId,
    required GovernanceRegistry registry,
  }) {
    if (!registry.getActivePolicies().contains(policyId)) return false;
    return true;
  }
}
