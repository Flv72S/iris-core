// H6 - Build temporal snapshot from activation and registries. Pure; no side-effects.

import 'package:iris_flutter_app/meta_governance/decision/governance_decision_registry.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_registry.dart';

import 'governance_snapshot.dart';

class GovernanceSnapshotBuilder {
  GovernanceSnapshotBuilder._();

  /// Builds a GovernanceSnapshot from the activation and current state of
  /// GCP registry, decision registry, active policies, and optional G7 media state.
  /// Pure function. activeTierBindings default: empty; ordine normalizzato in snapshot.
  static GovernanceSnapshot build({
    required GovernanceActivationSnapshot activation,
    required GCPRegistry gcpRegistry,
    required GovernanceDecisionRegistry decisionRegistry,
    required Map<String, String> activePolicies,
    List<String>? activeMediaPolicyIds,
    List<UserTierBinding>? activeTierBindings,
  }) {
    return GovernanceSnapshot(
      version: activation.activeVersion,
      capturedAt: activation.activatedAt,
      source: activation.source,
      activeProposals: gcpRegistry.listAll(),
      activeDecisions: decisionRegistry.listAll(),
      activePolicies: activePolicies,
      activeMediaPolicyIds: activeMediaPolicyIds,
      activeTierBindings: activeTierBindings,
    );
  }
}
