// H7 - Extract current governance state for drift analysis. Read-only; no side effects.

import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision_registry.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_registry.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_descriptor.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_registry.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

/// Immutable structural view of current governance (version, policies, decisions, GCPs).
class GovernanceStructuralState {
  GovernanceStructuralState({
    required this.currentVersion,
    required List<GCPDescriptor> activeProposals,
    required List<GovernanceDecision> activeDecisions,
    required Map<String, String> activePolicies,
  })  : activeProposals = List.unmodifiable(List.from(activeProposals)),
        activeDecisions = List.unmodifiable(List.from(activeDecisions)),
        activePolicies = Map.unmodifiable(Map<String, String>.from(activePolicies));

  final GovernanceVersion? currentVersion;
  final List<GCPDescriptor> activeProposals;
  final List<GovernanceDecision> activeDecisions;
  final Map<String, String> activePolicies;
}

class GovernanceStateExtractor {
  GovernanceStateExtractor._();

  /// Extracts current structural state from activation registry and registries.
  /// Read-only; does not modify any registry.
  static GovernanceStructuralState extractCurrentState({
    required GovernanceRegistry activationRegistry,
    required GCPRegistry gcpRegistry,
    required GovernanceDecisionRegistry decisionRegistry,
    required Map<String, String> activePolicies,
  }) {
    return GovernanceStructuralState(
      currentVersion: activationRegistry.getActiveGovernanceVersion(),
      activeProposals: gcpRegistry.listAll(),
      activeDecisions: decisionRegistry.listAll(),
      activePolicies: activePolicies,
    );
  }
}
