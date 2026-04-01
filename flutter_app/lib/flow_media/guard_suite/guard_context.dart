// I8 - Guard context. Immutable context for architectural validation.

import 'package:iris_flutter_app/flow_media/media_enforcement_decision.dart';
import 'package:iris_flutter_app/flow_media/media_reference.dart';
import 'package:iris_flutter_app/flow_media/observability/observability_logger.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_plan.dart';

/// Immutable context for architectural guard validation.
/// Contains all information needed to verify architectural compliance.
class GuardContext {
  const GuardContext({
    required this.contextId,
    required this.snapshot,
    this.mediaRef,
    this.tierBinding,
    this.decision,
    this.lifecyclePlan,
    this.observabilityLog,
    this.sourceFiles = const [],
    this.metadata = const {},
  });

  /// Unique identifier for this validation context.
  final String contextId;

  /// The governance snapshot being validated.
  final GovernanceSnapshot snapshot;

  /// Optional media reference.
  final MediaReference? mediaRef;

  /// Optional tier binding.
  final UserTierBinding? tierBinding;

  /// Optional enforcement decision.
  final MediaEnforcementDecision? decision;

  /// Optional lifecycle plan.
  final MediaLifecyclePlan? lifecyclePlan;

  /// Optional observability log for event verification.
  final ObservabilityLog? observabilityLog;

  /// List of source file paths to check for forbidden patterns.
  final List<String> sourceFiles;

  /// Additional metadata for validation.
  final Map<String, dynamic> metadata;

  /// Returns true if media context is present.
  bool get hasMediaContext =>
      mediaRef != null && tierBinding != null && decision != null;

  /// Returns true if lifecycle plan is present.
  bool get hasLifecyclePlan => lifecyclePlan != null;

  /// Returns true if observability log is present.
  bool get hasObservabilityLog => observabilityLog != null;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GuardContext &&
          contextId == other.contextId &&
          snapshot == other.snapshot &&
          mediaRef == other.mediaRef &&
          tierBinding == other.tierBinding &&
          decision == other.decision &&
          lifecyclePlan == other.lifecyclePlan);

  @override
  int get hashCode => Object.hash(
        contextId,
        snapshot,
        mediaRef,
        tierBinding,
        decision,
        lifecyclePlan,
      );

  Map<String, dynamic> toJson() => {
        'contextId': contextId,
        'snapshotVersion': snapshot.version.toString(),
        'hasMediaContext': hasMediaContext,
        'hasLifecyclePlan': hasLifecyclePlan,
        'hasObservabilityLog': hasObservabilityLog,
        'sourceFileCount': sourceFiles.length,
        'metadata': metadata,
      };

  @override
  String toString() =>
      'GuardContext($contextId, snapshot: ${snapshot.version})';
}

/// Builder for creating GuardContext instances.
class GuardContextBuilder {
  GuardContextBuilder({
    required this.contextId,
    required this.snapshot,
  });

  final String contextId;
  final GovernanceSnapshot snapshot;

  MediaReference? _mediaRef;
  UserTierBinding? _tierBinding;
  MediaEnforcementDecision? _decision;
  MediaLifecyclePlan? _lifecyclePlan;
  ObservabilityLog? _observabilityLog;
  List<String> _sourceFiles = [];
  Map<String, dynamic> _metadata = {};

  /// Sets the media reference.
  GuardContextBuilder withMediaRef(MediaReference ref) {
    _mediaRef = ref;
    return this;
  }

  /// Sets the tier binding.
  GuardContextBuilder withTierBinding(UserTierBinding binding) {
    _tierBinding = binding;
    return this;
  }

  /// Sets the enforcement decision.
  GuardContextBuilder withDecision(MediaEnforcementDecision decision) {
    _decision = decision;
    return this;
  }

  /// Sets the lifecycle plan.
  GuardContextBuilder withLifecyclePlan(MediaLifecyclePlan plan) {
    _lifecyclePlan = plan;
    return this;
  }

  /// Sets the observability log.
  GuardContextBuilder withObservabilityLog(ObservabilityLog log) {
    _observabilityLog = log;
    return this;
  }

  /// Sets the source files to check.
  GuardContextBuilder withSourceFiles(List<String> files) {
    _sourceFiles = List.from(files);
    return this;
  }

  /// Sets additional metadata.
  GuardContextBuilder withMetadata(Map<String, dynamic> metadata) {
    _metadata = Map.from(metadata);
    return this;
  }

  /// Builds the immutable GuardContext.
  GuardContext build() => GuardContext(
        contextId: contextId,
        snapshot: snapshot,
        mediaRef: _mediaRef,
        tierBinding: _tierBinding,
        decision: _decision,
        lifecyclePlan: _lifecyclePlan,
        observabilityLog: _observabilityLog,
        sourceFiles: List.unmodifiable(_sourceFiles),
        metadata: Map.unmodifiable(_metadata),
      );
}
