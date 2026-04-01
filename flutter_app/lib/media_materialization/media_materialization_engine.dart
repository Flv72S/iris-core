// Media Materialization — Engine. Translates lifecycle to physical operations.

import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_plan.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_state.dart';

import 'physical_operation.dart';
import 'physical_operation_plan.dart';
import 'physical_operation_type.dart';

/// Translates MediaLifecyclePlan into PhysicalOperationPlan.
/// Purely mechanical mapping; no autonomous decisions; no side effects.
class MediaMaterializationEngine {
  const MediaMaterializationEngine();

  /// Builds a physical operation plan from a lifecycle plan.
  /// The mediaId is required to identify the media asset in operations.
  PhysicalOperationPlan buildOperationPlan(
    MediaLifecyclePlan lifecyclePlan, {
    required String mediaId,
  }) {
    final operations = <PhysicalOperation>[];
    final generatedStates = <MediaLifecycleState>{};
    var sequenceOrder = 0;

    for (final transition in lifecyclePlan.transitions) {
      final targetState = transition.to;

      // Skip if we already generated an operation for this state
      if (generatedStates.contains(targetState)) continue;

      final operation = _mapStateToOperation(
        mediaId: mediaId,
        state: targetState,
        sequenceOrder: sequenceOrder,
      );

      if (operation != null) {
        operations.add(operation);
        generatedStates.add(targetState);
        sequenceOrder++;
      }
    }

    return PhysicalOperationPlan(operations: operations);
  }

  PhysicalOperation? _mapStateToOperation({
    required String mediaId,
    required MediaLifecycleState state,
    required int sequenceOrder,
  }) {
    switch (state) {
      case MediaLifecycleState.localOnly:
        return PhysicalOperation(
          mediaId: mediaId,
          type: PhysicalOperationType.storeLocal,
          targetTier: 'local',
          sequenceOrder: sequenceOrder,
        );

      case MediaLifecycleState.syncing:
        return PhysicalOperation(
          mediaId: mediaId,
          type: PhysicalOperationType.uploadCloud,
          targetTier: 'cloud',
          sequenceOrder: sequenceOrder,
        );

      case MediaLifecycleState.cloudStored:
        // cloudStored is reached via syncing; uploadCloud already generated
        return null;

      case MediaLifecycleState.coldArchived:
        return PhysicalOperation(
          mediaId: mediaId,
          type: PhysicalOperationType.archiveCold,
          targetTier: 'archive',
          sequenceOrder: sequenceOrder,
        );

      case MediaLifecycleState.pendingDeletion:
        // pendingDeletion is a logical state; delete happens at deleted
        return null;

      case MediaLifecycleState.deleted:
        return PhysicalOperation(
          mediaId: mediaId,
          type: PhysicalOperationType.delete,
          targetTier: 'none',
          sequenceOrder: sequenceOrder,
        );

      case MediaLifecycleState.captured:
        // captured is initial state; no physical operation
        return null;
    }
  }
}
