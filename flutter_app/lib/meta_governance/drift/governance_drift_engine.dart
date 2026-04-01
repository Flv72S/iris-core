// H7 - Drift detection. Pure analysis; no side effects; no automatic correction.

import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_descriptor.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot_registry.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

import 'governance_drift_report.dart';
import 'governance_drift_type.dart';
import 'governance_state_extractor.dart';

class GovernanceDriftEngine {
  GovernanceDriftEngine._();

  /// Analyzes current state against registered snapshots. Returns a drift report.
  /// No side effects; no modifications.
  static GovernanceDriftReport analyze({
    required GovernanceStructuralState currentState,
    required GovernanceSnapshotRegistry snapshotRegistry,
    DateTime? analyzedAt,
  }) {
    final at = analyzedAt ?? DateTime.now().toUtc();
    final version = currentState.currentVersion ??
        GovernanceVersion(major: 0, minor: 0, patch: 0);
    final drifts = <GovernanceDrift>[];

    if (currentState.currentVersion == null) {
      drifts.add(GovernanceDrift(
        type: GovernanceDriftType.unauthorizedChange,
        description: 'No active governance version',
      ));
      return GovernanceDriftReport(
        currentVersion: version,
        drifts: drifts,
        analyzedAt: at,
      );
    }

    final snapshot = snapshotRegistry.getByVersion(version);
    if (snapshot == null) {
      drifts.add(GovernanceDrift(
        type: GovernanceDriftType.missingSnapshot,
        description: 'No snapshot registered for version $version',
      ));
      return GovernanceDriftReport(
        currentVersion: version,
        drifts: drifts,
        analyzedAt: at,
      );
    }

    if (snapshot.version != version) {
      drifts.add(GovernanceDrift(
        type: GovernanceDriftType.versionMismatch,
        description: 'Snapshot version ${snapshot.version} != current $version',
      ));
    }

    if (!_mapEquals(currentState.activePolicies, snapshot.activePolicies)) {
      drifts.add(GovernanceDrift(
        type: GovernanceDriftType.policyMismatch,
        description: 'Active policies differ from snapshot for version $version',
      ));
    }

    if (!_listEqDecision(currentState.activeDecisions, snapshot.activeDecisions)) {
      drifts.add(GovernanceDrift(
        type: GovernanceDriftType.structuralInconsistency,
        description: 'Active decisions differ from snapshot for version $version',
      ));
    }

    if (!_listEqGcp(currentState.activeProposals, snapshot.activeProposals)) {
      drifts.add(GovernanceDrift(
        type: GovernanceDriftType.structuralInconsistency,
        description: 'Active GCPs differ from snapshot for version $version',
      ));
    }

    return GovernanceDriftReport(
      currentVersion: version,
      drifts: drifts,
      analyzedAt: at,
    );
  }

  static bool _mapEquals(Map<String, String> a, Map<String, String> b) {
    if (a.length != b.length) return false;
    for (final k in a.keys) {
      if (a[k] != b[k]) return false;
    }
    return true;
  }

  static bool _listEqDecision(List<GovernanceDecision> a, List<GovernanceDecision> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
    return true;
  }

  static bool _listEqGcp(List<GCPDescriptor> a, List<GCPDescriptor> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
    return true;
  }
}
