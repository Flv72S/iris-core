import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_type.dart';

void main() {
  group('PhysicalOperation', () {
    test('equality and hashCode', () {
      const op1 = PhysicalOperation(
        mediaId: 'media-123',
        type: PhysicalOperationType.storeLocal,
        targetTier: 'local',
        sequenceOrder: 0,
      );
      const op2 = PhysicalOperation(
        mediaId: 'media-123',
        type: PhysicalOperationType.storeLocal,
        targetTier: 'local',
        sequenceOrder: 0,
      );
      const op3 = PhysicalOperation(
        mediaId: 'media-456',
        type: PhysicalOperationType.uploadCloud,
        targetTier: 'cloud',
        sequenceOrder: 1,
      );

      expect(op1, equals(op2));
      expect(op1.hashCode, op2.hashCode);
      expect(op1, isNot(equals(op3)));
    });

    test('toJson produces correct map', () {
      const op = PhysicalOperation(
        mediaId: 'media-abc',
        type: PhysicalOperationType.archiveCold,
        targetTier: 'archive',
        sequenceOrder: 2,
      );
      final json = op.toJson();

      expect(json['mediaId'], 'media-abc');
      expect(json['type'], 'archiveCold');
      expect(json['targetTier'], 'archive');
      expect(json['sequenceOrder'], 2);
    });

    test('fromJson roundtrip', () {
      const original = PhysicalOperation(
        mediaId: 'media-xyz',
        type: PhysicalOperationType.delete,
        targetTier: 'none',
        sequenceOrder: 3,
      );
      final json = original.toJson();
      final restored = PhysicalOperation.fromJson(json);

      expect(restored, equals(original));
    });

    test('toString is readable', () {
      const op = PhysicalOperation(
        mediaId: 'media-test',
        type: PhysicalOperationType.uploadCloud,
        targetTier: 'cloud',
        sequenceOrder: 1,
      );

      expect(op.toString(), contains('media-test'));
      expect(op.toString(), contains('uploadCloud'));
      expect(op.toString(), contains('cloud'));
    });
  });

  group('PhysicalOperationType', () {
    test('has all expected values', () {
      expect(PhysicalOperationType.values.length, 4);
      expect(PhysicalOperationType.storeLocal.name, 'storeLocal');
      expect(PhysicalOperationType.uploadCloud.name, 'uploadCloud');
      expect(PhysicalOperationType.archiveCold.name, 'archiveCold');
      expect(PhysicalOperationType.delete.name, 'delete');
    });
  });
}
