import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_event.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_plan.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_state.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_transition.dart';
import 'package:iris_flutter_app/media_materialization/media_materialization_snapshot.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_plan.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_type.dart';

void main() {
  group('MediaMaterializationSnapshot', () {
    test('equality and hashCode', () {
      final lifecycle = MediaLifecyclePlan(
        initial: MediaLifecycleState.captured,
        transitions: const [
          MediaLifecycleTransition(
            from: MediaLifecycleState.captured,
            to: MediaLifecycleState.localOnly,
            event: MediaLifecycleEvent.localPersisted,
          ),
        ],
      );
      final operations = PhysicalOperationPlan(
        operations: const [
          PhysicalOperation(
            mediaId: 'media-1',
            type: PhysicalOperationType.storeLocal,
            targetTier: 'local',
            sequenceOrder: 0,
          ),
        ],
      );

      final snap1 = MediaMaterializationSnapshot(lifecycle: lifecycle, operations: operations);
      final snap2 = MediaMaterializationSnapshot(lifecycle: lifecycle, operations: operations);

      expect(snap1, equals(snap2));
      expect(snap1.hashCode, snap2.hashCode);
    });

    test('toJson produces correct structure', () {
      final lifecycle = MediaLifecyclePlan(
        initial: MediaLifecycleState.captured,
        transitions: const [],
      );
      final operations = PhysicalOperationPlan(operations: const []);
      final snapshot = MediaMaterializationSnapshot(lifecycle: lifecycle, operations: operations);
      final json = snapshot.toJson();

      expect(json['lifecycle'], isA<Map>());
      expect(json['operations'], isA<Map>());
    });
  });
}
