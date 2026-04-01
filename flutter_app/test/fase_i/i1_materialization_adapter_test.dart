// FASE I — I1 Materialization Adapter integration test.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/physical_location.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_event.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_plan.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_state.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_transition.dart';
import 'package:iris_flutter_app/media_materialization/media_materialization_engine.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_type.dart';

void main() {
  const engine = MediaMaterializationEngine();

  group('I1 — Materialization Adapter', () {
    test('localOnly produces storeLocal', () {
      final plan = MediaLifecyclePlan(
        initial: MediaLifecycleState.captured,
        transitions: [
          const MediaLifecycleTransition(
            from: MediaLifecycleState.captured,
            to: MediaLifecycleState.localOnly,
            event: MediaLifecycleEvent.captureCompleted,
          ),
        ],
      );
      final opPlan = engine.buildOperationPlan(plan, mediaId: 'm1');
      expect(opPlan.operations.length, 1);
      expect(opPlan.operations[0].type, PhysicalOperationType.storeLocal);
      expect(opPlan.operations[0].targetTier, 'local');
    });
    test('PhysicalLocation enum has localDevice cloud coldArchive', () {
      expect(PhysicalLocation.values, contains(PhysicalLocation.localDevice));
      expect(PhysicalLocation.values, contains(PhysicalLocation.cloud));
      expect(PhysicalLocation.values, contains(PhysicalLocation.coldArchive));
    });
    test('same input produces identical plan', () {
      final plan = MediaLifecyclePlan(
        initial: MediaLifecycleState.captured,
        transitions: [
          const MediaLifecycleTransition(
            from: MediaLifecycleState.captured,
            to: MediaLifecycleState.localOnly,
            event: MediaLifecycleEvent.captureCompleted,
          ),
        ],
      );
      final a = engine.buildOperationPlan(plan, mediaId: 'id');
      final b = engine.buildOperationPlan(plan, mediaId: 'id');
      expect(a, equals(b));
    });
  });
}
