import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/media_execution/media_execution_port.dart';
import 'package:iris_flutter_app/media_execution/simulated_execution_adapter.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_type.dart';

void main() {
  const op0 = PhysicalOperation(
    mediaId: 'media-1',
    type: PhysicalOperationType.storeLocal,
    targetTier: 'local',
    sequenceOrder: 0,
  );
  const op1 = PhysicalOperation(
    mediaId: 'media-1',
    type: PhysicalOperationType.uploadCloud,
    targetTier: 'cloud',
    sequenceOrder: 1,
  );
  const op2 = PhysicalOperation(
    mediaId: 'media-1',
    type: PhysicalOperationType.archiveCold,
    targetTier: 'archive',
    sequenceOrder: 2,
  );
  const op3 = PhysicalOperation(
    mediaId: 'media-1',
    type: PhysicalOperationType.delete,
    targetTier: 'none',
    sequenceOrder: 3,
  );

  group('SimulatedExecutionAdapter - Success mode', () {
    test('default adapter succeeds for all operations', () async {
      const adapter = SimulatedExecutionAdapter();

      final r0 = await adapter.execute(op0);
      final r1 = await adapter.execute(op1);
      final r2 = await adapter.execute(op2);
      final r3 = await adapter.execute(op3);

      expect(r0.isSuccess, isTrue);
      expect(r1.isSuccess, isTrue);
      expect(r2.isSuccess, isTrue);
      expect(r3.isSuccess, isTrue);
    });

    test('allSuccess factory succeeds for all', () async {
      const adapter = SimulatedExecutionAdapter.allSuccess();

      final r0 = await adapter.execute(op0);
      final r1 = await adapter.execute(op1);

      expect(r0.isSuccess, isTrue);
      expect(r1.isSuccess, isTrue);
    });

    test('success result has null failure', () async {
      const adapter = SimulatedExecutionAdapter();

      final result = await adapter.execute(op0);

      expect(result.failure, isNull);
      expect(result.operation, equals(op0));
    });
  });

  group('SimulatedExecutionAdapter - Failure by sequenceOrder', () {
    test('fails only on specified sequence order', () async {
      const adapter = SimulatedExecutionAdapter(failOnSequenceOrders: {2});

      final r0 = await adapter.execute(op0);
      final r1 = await adapter.execute(op1);
      final r2 = await adapter.execute(op2);
      final r3 = await adapter.execute(op3);

      expect(r0.isSuccess, isTrue);
      expect(r1.isSuccess, isTrue);
      expect(r2.isFailure, isTrue);
      expect(r3.isSuccess, isTrue);
    });

    test('failOnSequence factory works correctly', () async {
      const adapter = SimulatedExecutionAdapter.failOnSequence({0, 2});

      final r0 = await adapter.execute(op0);
      final r1 = await adapter.execute(op1);
      final r2 = await adapter.execute(op2);

      expect(r0.isFailure, isTrue);
      expect(r1.isSuccess, isTrue);
      expect(r2.isFailure, isTrue);
    });

    test('failure has correct code and message', () async {
      const adapter = SimulatedExecutionAdapter(failOnSequenceOrders: {1});

      final result = await adapter.execute(op1);

      expect(result.failure, isNotNull);
      expect(result.failure!.code, 'SIMULATED_FAILURE');
      expect(result.failure!.message, contains('seq:1'));
    });
  });

  group('SimulatedExecutionAdapter - Failure by type', () {
    test('fails only on specified type', () async {
      const adapter = SimulatedExecutionAdapter(
        failOnTypes: {PhysicalOperationType.uploadCloud},
      );

      final r0 = await adapter.execute(op0);
      final r1 = await adapter.execute(op1);
      final r2 = await adapter.execute(op2);

      expect(r0.isSuccess, isTrue);
      expect(r1.isFailure, isTrue);
      expect(r2.isSuccess, isTrue);
    });

    test('failOnType factory works correctly', () async {
      const adapter = SimulatedExecutionAdapter.failOnType({
        PhysicalOperationType.storeLocal,
        PhysicalOperationType.delete,
      });

      final r0 = await adapter.execute(op0);
      final r1 = await adapter.execute(op1);
      final r3 = await adapter.execute(op3);

      expect(r0.isFailure, isTrue);
      expect(r1.isSuccess, isTrue);
      expect(r3.isFailure, isTrue);
    });

    test('failure message includes type name', () async {
      const adapter = SimulatedExecutionAdapter(
        failOnTypes: {PhysicalOperationType.archiveCold},
      );

      final result = await adapter.execute(op2);

      expect(result.failure!.message, contains('type:archiveCold'));
    });
  });

  group('SimulatedExecutionAdapter - Combined failures', () {
    test('sequence failure takes precedence', () async {
      const adapter = SimulatedExecutionAdapter(
        failOnSequenceOrders: {1},
        failOnTypes: {PhysicalOperationType.uploadCloud},
      );

      final result = await adapter.execute(op1);

      expect(result.isFailure, isTrue);
      expect(result.failure!.message, contains('seq:1'));
    });

    test('type failure when sequence not matched', () async {
      const adapter = SimulatedExecutionAdapter(
        failOnSequenceOrders: {99},
        failOnTypes: {PhysicalOperationType.uploadCloud},
      );

      final result = await adapter.execute(op1);

      expect(result.isFailure, isTrue);
      expect(result.failure!.message, contains('type:uploadCloud'));
    });
  });

  group('SimulatedExecutionAdapter - Determinism', () {
    test('same config same operation same result', () async {
      const adapter = SimulatedExecutionAdapter(failOnSequenceOrders: {1});

      final r1 = await adapter.execute(op1);
      final r2 = await adapter.execute(op1);

      expect(r1, equals(r2));
      expect(r1.hashCode, r2.hashCode);
    });

    test('multiple calls produce identical results', () async {
      const adapter = SimulatedExecutionAdapter.allSuccess();

      final results = <bool>[];
      for (var i = 0; i < 10; i++) {
        final r = await adapter.execute(op0);
        results.add(r.isSuccess);
      }

      expect(results.every((r) => r == true), isTrue);
    });
  });

  group('SimulatedExecutionAdapter - No state leakage', () {
    test('adapter has no mutable state', () async {
      const adapter = SimulatedExecutionAdapter(failOnSequenceOrders: {1});

      await adapter.execute(op0);
      await adapter.execute(op1);
      await adapter.execute(op0);

      final result = await adapter.execute(op1);

      expect(result.isFailure, isTrue);
    });

    test('separate adapters are independent', () async {
      const adapter1 = SimulatedExecutionAdapter(failOnSequenceOrders: {0});
      const adapter2 = SimulatedExecutionAdapter.allSuccess();

      final r1 = await adapter1.execute(op0);
      final r2 = await adapter2.execute(op0);

      expect(r1.isFailure, isTrue);
      expect(r2.isSuccess, isTrue);
    });
  });

  group('SimulatedExecutionAdapter - Contract compliance', () {
    test('implements MediaExecutionPort', () {
      const adapter = SimulatedExecutionAdapter();
      expect(adapter, isA<MediaExecutionPort>());
    });

    test('never throws exceptions', () async {
      final adapter = SimulatedExecutionAdapter(
        failOnSequenceOrders: const {0, 1, 2, 3},
        failOnTypes: PhysicalOperationType.values.toSet(),
      );

      expect(() async => await adapter.execute(op0), returnsNormally);
      expect(() async => await adapter.execute(op1), returnsNormally);
    });
  });
}
