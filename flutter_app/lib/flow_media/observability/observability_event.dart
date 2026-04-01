// I7 - Observability event. Immutable; hashable; serializable.

import 'package:iris_flutter_app/flow_media/failure_semantics/failure_result.dart';
import 'package:iris_flutter_app/flow_media/media_enforcement_decision.dart';
import 'package:iris_flutter_app/flow_media/media_reference.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';

/// Types of observability events in the media pipeline.
enum ObservabilityEventType {
  /// Enforcement decision was made
  enforcementDecision,

  /// Lifecycle transition occurred
  lifecycleTransition,

  /// Physical operation started
  operationStarted,

  /// Physical operation completed successfully
  operationCompleted,

  /// Physical operation failed
  operationFailed,

  /// Execution plan started
  executionStarted,

  /// Execution plan completed
  executionCompleted,
}

/// Immutable value object representing an observability event.
/// Contains all essential data for audit and replay.
class ObservabilityEvent {
  const ObservabilityEvent({
    required this.eventId,
    required this.eventType,
    required this.mediaRef,
    required this.tierBinding,
    required this.decision,
    required this.logicalStep,
    this.failure,
    this.metadata = const {},
  });

  /// Unique identifier for this event (deterministic).
  final String eventId;

  /// Type of the event.
  final ObservabilityEventType eventType;

  /// The media reference being processed.
  final MediaReference mediaRef;

  /// The user tier binding in effect.
  final UserTierBinding tierBinding;

  /// The enforcement decision applied.
  final MediaEnforcementDecision decision;

  /// Optional failure result if the event represents a failure.
  final FailureResult? failure;

  /// Logical step number (sequential, deterministic).
  final int logicalStep;

  /// Additional metadata for the event.
  final Map<String, dynamic> metadata;

  /// Returns true if this event represents a failure.
  bool get isFailure => failure != null;

  /// Returns true if this event represents a success.
  bool get isSuccess => failure == null;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ObservabilityEvent &&
          eventId == other.eventId &&
          eventType == other.eventType &&
          mediaRef == other.mediaRef &&
          tierBinding == other.tierBinding &&
          decision == other.decision &&
          failure == other.failure &&
          logicalStep == other.logicalStep &&
          _mapEquals(metadata, other.metadata));

  static bool _mapEquals(Map<String, dynamic> a, Map<String, dynamic> b) {
    if (a.length != b.length) return false;
    for (final key in a.keys) {
      if (!b.containsKey(key) || a[key] != b[key]) return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final sortedKeys = metadata.keys.toList()..sort();
    final metadataHash = Object.hashAll(
      sortedKeys.map((k) => Object.hash(k, metadata[k])),
    );
    return Object.hash(
      eventId,
      eventType,
      mediaRef,
      tierBinding,
      decision,
      failure,
      logicalStep,
      metadataHash,
    );
  }

  /// Serializes to JSON map.
  Map<String, dynamic> toJson() => {
        'eventId': eventId,
        'eventType': eventType.name,
        'mediaRef': mediaRef.toJson(),
        'tierBinding': tierBinding.toJson(),
        'decision': decision.toJson(),
        'failure': failure?.toJson(),
        'logicalStep': logicalStep,
        'metadata': metadata,
      };

  @override
  String toString() =>
      'ObservabilityEvent(id: $eventId, type: $eventType, step: $logicalStep, failure: ${failure != null})';
}
