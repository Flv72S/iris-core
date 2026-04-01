// ODA-6 — Deterministic policy. Pure evaluation; no time-based rules.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

/// Policy definition. Version immutable once activated; evaluation must be pure.
class GovernancePolicy {
  const GovernancePolicy({
    required this.policyId,
    required this.version,
    required this.scopeDomains,
    required this.scopeClusters,
    required this.scopeEventTypes,
    required this.requiredApprovalClusterIds,
    required this.policyHash,
  });

  final String policyId;
  final int version;
  final List<String> scopeDomains;
  final List<String> scopeClusters;
  final List<String> scopeEventTypes;
  final List<String> requiredApprovalClusterIds;
  final String policyHash;

  Map<String, dynamic> get policyPayload => <String, dynamic>{
        'policyId': policyId,
        'version': version,
        'scopeDomains': (List<String>.from(scopeDomains)..sort()),
        'scopeClusters': (List<String>.from(scopeClusters)..sort()),
        'scopeEventTypes': (List<String>.from(scopeEventTypes)..sort()),
        'requiredApprovalClusterIds': (List<String>.from(requiredApprovalClusterIds)..sort()),
      };
}

class GovernancePolicyFactory {
  GovernancePolicyFactory._();

  static GovernancePolicy createPolicy({
    required String policyId,
    required int version,
    required List<String> scopeDomains,
    required List<String> scopeClusters,
    required List<String> scopeEventTypes,
    required List<String> requiredApprovalClusterIds,
  }) {
    final payload = <String, dynamic>{
      'policyId': policyId,
      'version': version,
      'scopeDomains': (List<String>.from(scopeDomains)..sort()),
      'scopeClusters': (List<String>.from(scopeClusters)..sort()),
      'scopeEventTypes': (List<String>.from(scopeEventTypes)..sort()),
      'requiredApprovalClusterIds': (List<String>.from(requiredApprovalClusterIds)..sort()),
    };
    final policyHash = CanonicalPayload.hash(payload);
    return GovernancePolicy(
      policyId: policyId,
      version: version,
      scopeDomains: scopeDomains,
      scopeClusters: scopeClusters,
      scopeEventTypes: scopeEventTypes,
      requiredApprovalClusterIds: requiredApprovalClusterIds,
      policyHash: policyHash,
    );
  }

  static bool verifyPolicy(GovernancePolicy policy) {
    final expected = CanonicalPayload.hash(policy.policyPayload);
    return policy.policyHash == expected;
  }

  /// Pure deterministic evaluation. [context] must be serializable; no time/external state.
  static bool evaluatePolicy(GovernancePolicy policy, Map<String, dynamic> context) {
    final domain = context['domainId'] as String?;
    final cluster = context['clusterId'] as String?;
    final eventType = context['eventType'] as String?;
    if (policy.scopeDomains.isNotEmpty && (domain == null || !policy.scopeDomains.contains(domain))) {
      return false;
    }
    if (policy.scopeClusters.isNotEmpty && (cluster == null || !policy.scopeClusters.contains(cluster))) {
      return false;
    }
    if (policy.scopeEventTypes.isNotEmpty && (eventType == null || !policy.scopeEventTypes.contains(eventType))) {
      return false;
    }
    return true;
  }

  static String getPolicyHash(GovernancePolicy policy) => policy.policyHash;
}
