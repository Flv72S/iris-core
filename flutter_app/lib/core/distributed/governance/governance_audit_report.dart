// ODA-6 — Deterministic governance report. Identical on replay.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';
import 'package:iris_flutter_app/core/distributed/governance/governance_registry.dart';

class GovernanceAuditReport {
  const GovernanceAuditReport({
    required this.activeGovernanceState,
    required this.activePolicies,
    required this.pendingProposals,
    required this.approvalStatus,
    required this.governanceSuspensionStatus,
    required this.governanceHash,
    required this.divergenceFlags,
  });
  final bool activeGovernanceState;
  final List<String> activePolicies;
  final List<String> pendingProposals;
  final Map<String, bool> approvalStatus;
  final bool governanceSuspensionStatus;
  final String governanceHash;
  final Map<String, bool> divergenceFlags;
}

class GovernanceAuditReportGenerator {
  GovernanceAuditReportGenerator._();

  static GovernanceAuditReport generateGovernanceAudit({
    required GovernanceRegistry registry,
    required String governanceHash,
    Map<String, bool> approvalStatus = const {},
    Map<String, bool> divergenceFlags = const {},
  }) {
    final state = registry.rebuildState();
    final active = state.activePolicies.toList()..sort();
    final pending = state.pendingProposals.toList()..sort();
    return GovernanceAuditReport(
      activeGovernanceState: active.isNotEmpty,
      activePolicies: active,
      pendingProposals: pending,
      approvalStatus: approvalStatus,
      governanceSuspensionStatus: state.governanceSuspended,
      governanceHash: governanceHash,
      divergenceFlags: divergenceFlags,
    );
  }
}
