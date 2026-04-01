// I7 - Observability context. Read-only execution context.

import 'package:iris_flutter_app/flow_media/media_enforcement_decision.dart';
import 'package:iris_flutter_app/flow_media/media_reference.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot.dart';

/// Immutable context for an execution being observed.
/// Provides read-only access to the current execution state.
class ObservabilityContext {
  const ObservabilityContext({
    required this.executionId,
    required this.mediaRef,
    required this.tierBinding,
    required this.decision,
    required this.snapshot,
    required this.startStep,
  });

  /// Unique identifier for this execution context.
  final String executionId;

  /// The media reference being processed.
  final MediaReference mediaRef;

  /// The user tier binding in effect.
  final UserTierBinding tierBinding;

  /// The enforcement decision applied.
  final MediaEnforcementDecision decision;

  /// The governance snapshot at the time of execution.
  final GovernanceSnapshot snapshot;

  /// The starting logical step number.
  final int startStep;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ObservabilityContext &&
          executionId == other.executionId &&
          mediaRef == other.mediaRef &&
          tierBinding == other.tierBinding &&
          decision == other.decision &&
          snapshot == other.snapshot &&
          startStep == other.startStep);

  @override
  int get hashCode => Object.hash(
        executionId,
        mediaRef,
        tierBinding,
        decision,
        snapshot,
        startStep,
      );

  /// Serializes to JSON map.
  Map<String, dynamic> toJson() => {
        'executionId': executionId,
        'mediaRef': mediaRef.toJson(),
        'tierBinding': tierBinding.toJson(),
        'decision': decision.toJson(),
        'snapshotVersion': snapshot.version.toString(),
        'startStep': startStep,
      };

  @override
  String toString() =>
      'ObservabilityContext(executionId: $executionId, startStep: $startStep)';
}

/// Builder for creating ObservabilityContext with step tracking.
class ObservabilityContextBuilder {
  ObservabilityContextBuilder({
    required this.executionId,
    required this.mediaRef,
    required this.tierBinding,
    required this.decision,
    required this.snapshot,
    int startStep = 0,
  }) : _currentStep = startStep;

  final String executionId;
  final MediaReference mediaRef;
  final UserTierBinding tierBinding;
  final MediaEnforcementDecision decision;
  final GovernanceSnapshot snapshot;

  int _currentStep;

  /// Returns the current logical step.
  int get currentStep => _currentStep;

  /// Advances to the next step and returns the new step number.
  int nextStep() => ++_currentStep;

  /// Builds an immutable context snapshot.
  ObservabilityContext build() => ObservabilityContext(
        executionId: executionId,
        mediaRef: mediaRef,
        tierBinding: tierBinding,
        decision: decision,
        snapshot: snapshot,
        startStep: _currentStep,
      );
}
