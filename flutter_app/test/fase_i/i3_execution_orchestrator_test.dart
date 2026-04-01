// FASE I — I3 Execution Orchestrator integration test.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/media_execution/media_execution_orchestrator.dart';
import 'package:iris_flutter_app/media_execution/simulated_execution_adapter.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_plan.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_type.dart';

void main() {
  const orchestrator = MediaExecutionOrchestrator();

  group('I3 — Execution Orchestrator', () {
    test('same plan and port produce same trace', () async {
      final plan = PhysicalOperationPlan(operations: [
        const PhysicalOperation(
          mediaId: 'a',
          type: PhysicalOperationType.storeLocal,
          targetTier: 'local',
          sequenceOrder: 0,
        ),
        const PhysicalOperation(
          mediaId: 'a',
          type: PhysicalOperationType.uploadCloud,
          targetTier: 'cloud',
          sequenceOrder: 1,
        ),
      ]);
      const port = SimulatedExecutionAdapter.allSuccess();
      final t1 = await orchestrator.executePlan(plan, port);
      final t2 = await orchestrator.executePlan(plan, port);
      expect(t1.allSucceeded, true);
      expect(t2.allSucceeded, true);
      expect(t1.executedCount, t2.executedCount);
    });
    test('stop on first failure', () async {
      final plan = PhysicalOperationPlan(operations: [
        const PhysicalOperation(
          mediaId: 'c',
          type: PhysicalOperationType.storeLocal,
          targetTier: 'local',
          sequenceOrder: 0,
        ),
        const PhysicalOperation(
          mediaId: 'c',
          type: PhysicalOperationType.uploadCloud,
          targetTier: 'cloud',
          sequenceOrder: 1,
        ),
      ]);
      const port = SimulatedExecutionAdapter.failOnSequence({1});
      final trace = await orchestrator.executePlan(plan, port);
      expect(trace.hasFailed, true);
      expect(trace.firstFailure?.operation.sequenceOrder, 1);
    });
    test('trace results immutable', () async {
      final plan = PhysicalOperationPlan(operations: [
        const PhysicalOperation(
          mediaId: 'd',
          type: PhysicalOperationType.storeLocal,
          targetTier: 'local',
          sequenceOrder: 0,
        ),
      ]);
      const port = SimulatedExecutionAdapter.allSuccess();
      final trace = await orchestrator.executePlan(plan, port);
      expect(() => trace.results.add(trace.results.first), throwsUnsupportedError);
    });
  });
}
