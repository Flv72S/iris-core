import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_plan.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_type.dart';

void main() {
  group('PhysicalOperationPlan', () {
    test('operations list is immutable', () {
      final plan = PhysicalOperationPlan(
        operations: const [
          PhysicalOperation(
            mediaId: 'media-1',
            type: PhysicalOperationType.storeLocal,
            targetTier: 'local',
            sequenceOrder: 0,
          ),
        ],
      );

      expect(
        () => plan.operations.add(
          const PhysicalOperation(
            mediaId: 'media-2',
            type: PhysicalOperationType.delete,
            targetTier: 'none',
            sequenceOrder: 1,
          ),
        ),
        throwsUnsupportedError,
      );
    });

    test('operations are sorted by sequenceOrder', () {
      final plan = PhysicalOperationPlan(
        operations: const [
          PhysicalOperation(
            mediaId: 'media-1',
            type: PhysicalOperationType.delete,
            targetTier: 'none',
            sequenceOrder: 2,
          ),
          PhysicalOperation(
            mediaId: 'media-1',
            type: PhysicalOperationType.storeLocal,
            targetTier: 'local',
            sequenceOrder: 0,
          ),
          PhysicalOperation(
            mediaId: 'media-1',
            type: PhysicalOperationType.uploadCloud,
            targetTier: 'cloud',
            sequenceOrder: 1,
          ),
        ],
      );

      expect(plan.operations[0].sequenceOrder, 0);
      expect(plan.operations[1].sequenceOrder, 1);
      expect(plan.operations[2].sequenceOrder, 2);
    });

    test('equality and hashCode', () {
      final plan1 = PhysicalOperationPlan(
        operations: const [
          PhysicalOperation(
            mediaId: 'media-1',
            type: PhysicalOperationType.storeLocal,
            targetTier: 'local',
            sequenceOrder: 0,
          ),
        ],
      );
      final plan2 = PhysicalOperationPlan(
        operations: const [
          PhysicalOperation(
            mediaId: 'media-1',
            type: PhysicalOperationType.storeLocal,
            targetTier: 'local',
            sequenceOrder: 0,
          ),
        ],
      );

      expect(plan1, equals(plan2));
      expect(plan1.hashCode, plan2.hashCode);
    });

    test('hasCloudOperations returns correct value', () {
      final withCloud = PhysicalOperationPlan(
        operations: const [
          PhysicalOperation(
            mediaId: 'media-1',
            type: PhysicalOperationType.uploadCloud,
            targetTier: 'cloud',
            sequenceOrder: 0,
          ),
        ],
      );
      final withoutCloud = PhysicalOperationPlan(
        operations: const [
          PhysicalOperation(
            mediaId: 'media-1',
            type: PhysicalOperationType.storeLocal,
            targetTier: 'local',
            sequenceOrder: 0,
          ),
        ],
      );

      expect(withCloud.hasCloudOperations, isTrue);
      expect(withoutCloud.hasCloudOperations, isFalse);
    });

    test('hasArchiveOperations returns correct value', () {
      final withArchive = PhysicalOperationPlan(
        operations: const [
          PhysicalOperation(
            mediaId: 'media-1',
            type: PhysicalOperationType.archiveCold,
            targetTier: 'archive',
            sequenceOrder: 0,
          ),
        ],
      );
      final withoutArchive = PhysicalOperationPlan(
        operations: const [
          PhysicalOperation(
            mediaId: 'media-1',
            type: PhysicalOperationType.storeLocal,
            targetTier: 'local',
            sequenceOrder: 0,
          ),
        ],
      );

      expect(withArchive.hasArchiveOperations, isTrue);
      expect(withoutArchive.hasArchiveOperations, isFalse);
    });

    test('hasDeleteOperations returns correct value', () {
      final withDelete = PhysicalOperationPlan(
        operations: const [
          PhysicalOperation(
            mediaId: 'media-1',
            type: PhysicalOperationType.delete,
            targetTier: 'none',
            sequenceOrder: 0,
          ),
        ],
      );
      final withoutDelete = PhysicalOperationPlan(
        operations: const [
          PhysicalOperation(
            mediaId: 'media-1',
            type: PhysicalOperationType.storeLocal,
            targetTier: 'local',
            sequenceOrder: 0,
          ),
        ],
      );

      expect(withDelete.hasDeleteOperations, isTrue);
      expect(withoutDelete.hasDeleteOperations, isFalse);
    });

    test('toJson produces correct structure', () {
      final plan = PhysicalOperationPlan(
        operations: const [
          PhysicalOperation(
            mediaId: 'media-1',
            type: PhysicalOperationType.storeLocal,
            targetTier: 'local',
            sequenceOrder: 0,
          ),
        ],
      );
      final json = plan.toJson();

      expect(json['operations'], isA<List>());
      expect((json['operations'] as List).length, 1);
    });
  });
}
