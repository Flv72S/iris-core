// H5 - Registry of activations. Updated only by engine; read-only API.
// GovernanceActivationEngine lives in this file to call _registerActivation.

import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

import 'governance_activation_exception.dart';
import 'governance_activation_snapshot.dart';

class GovernanceRegistry {
  GovernanceRegistry() : _history = [];

  final List<GovernanceActivationSnapshot> _history;

  /// Called by GovernanceActivationEngine only. Not part of public API.
  void _registerActivation(GovernanceActivationSnapshot snapshot) {
    _history.add(snapshot);
  }

  GovernanceActivationSnapshot? current() {
    if (_history.isEmpty) return null;
    return _history.last;
  }

  List<GovernanceActivationSnapshot> history() =>
      List.unmodifiable(_history);

  GovernanceVersion? getActiveGovernanceVersion() =>
      current()?.activeVersion;
}

/// H5 - Activation engine. Only APPROVED; no downgrade.
/// Single point of registration; registry cannot be updated otherwise.
class GovernanceActivationEngine {
  GovernanceActivationEngine._();

  static GovernanceActivationSnapshot activate({
    required GovernanceRatificationRecord ratification,
    required GovernanceRegistry registry,
  }) {
    if (ratification.decision.status != GovernanceDecisionStatus.approved) {
      throw InvalidRatificationException(
        'Only APPROVED ratification can be activated; got ${ratification.decision.status.name}',
      );
    }

    final current = registry.current();
    final currentVersion =
        current?.activeVersion ?? GovernanceVersion(major: 0, minor: 0, patch: 0);
    final newVersion = ratification.newVersion;

    if (GovernanceVersion.compare(newVersion, currentVersion) <= 0) {
      throw GovernanceDowngradeAttemptException(
        'Cannot activate $newVersion: current is $currentVersion (downgrade not allowed)',
      );
    }

    final snapshot = GovernanceActivationSnapshot(
      activeVersion: newVersion,
      activatedAt: ratification.ratifiedAt,
      source: ratification,
    );
    registry._registerActivation(snapshot);
    return snapshot;
  }
}
