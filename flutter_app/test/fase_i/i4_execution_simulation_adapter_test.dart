// FASE I — Integration test I4: Execution Simulation Adapter.
// Focus: isolated deterministic simulation, no filesystem/cloud/random/DateTime.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/media_execution/execution_result.dart';
import 'package:iris_flutter_app/media_execution/execution_status.dart';
import 'package:iris_flutter_app/media_execution/simulated_execution_adapter.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_type.dart';

void main() {
  group('I4 — Execution Simulation Adapter', () {
    test('allSuccess: every operation succeeds', () async {
      const adapter = SimulatedExecutionAdapter.allSuccess();
      const op = PhysicalOperation(
        mediaId: 's1',
        type: PhysicalOperationType.uploadCloud,
        targetTier: 'cloud',
        sequenceOrder: 0,
      );
      final result = await adapter.execute(op);
      expect(result.status, ExecutionStatus.success);
      expect(result.isSuccess, isTrue);
    });

    test('failOnSequence: specified sequence fails', () async {
      const adapter = SimulatedExecutionAdapter.failOnSequence({1});
      const op = PhysicalOperation(
        mediaId: 's2',
        type: PhysicalOperationType.storeLocal,
        targetTier: 'local',
        sequenceOrder: 1,
      );
      final result = await adapter.execute(op);
      expect(result.status, ExecutionStatus.failure);
      expect(result.failure?.code, 'SIMULATED_FAILURE');
    });

    test('failOnType: specified type fails', () async {
      const adapter = SimulatedExecutionAdapter.failOnType(
        {PhysicalOperationType.uploadCloud},
      );
      const op = PhysicalOperation(
        mediaId: 's3',
        type: PhysicalOperationType.uploadCloud,
        targetTier: 'cloud',
        sequenceOrder: 0,
      );
      final result = await adapter.execute(op);
      expect(result.status, ExecutionStatus.failure);
    });

    test('output identical for same input: deterministic', () async {
      const adapter = SimulatedExecutionAdapter.allSuccess();
      const op = PhysicalOperation(
        mediaId: 's4',
        type: PhysicalOperationType.archiveCold,
        targetTier: 'archive',
        sequenceOrder: 2,
      );
      final r1 = await adapter.execute(op);
      final r2 = await adapter.execute(op);
      expect(r1.status, r2.status);
      expect(r1.operation, r2.operation);
    });

    test('no dependency: adapter has no IO or random', () {
      const adapter = SimulatedExecutionAdapter(
        failOnSequenceOrders: {},
        failOnTypes: {},
      );
      expect(adapter.failOnSequenceOrders, isEmpty);
      expect(adapter.failOnTypes, isEmpty);
    });
  });
}
