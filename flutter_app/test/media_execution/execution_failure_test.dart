import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/media_execution/execution_failure.dart';

void main() {
  group('ExecutionFailure', () {
    test('equality and hashCode', () {
      const f1 = ExecutionFailure(code: 'ERR_001', message: 'Test error');
      const f2 = ExecutionFailure(code: 'ERR_001', message: 'Test error');
      const f3 = ExecutionFailure(code: 'ERR_002', message: 'Other error');

      expect(f1, equals(f2));
      expect(f1.hashCode, f2.hashCode);
      expect(f1, isNot(equals(f3)));
    });

    test('toJson produces correct map', () {
      const failure = ExecutionFailure(
        code: 'STORAGE_FULL',
        message: 'No space left on device',
      );
      final json = failure.toJson();

      expect(json['code'], 'STORAGE_FULL');
      expect(json['message'], 'No space left on device');
    });

    test('fromJson roundtrip', () {
      const original = ExecutionFailure(
        code: 'NETWORK_ERROR',
        message: 'Connection timeout',
      );
      final json = original.toJson();
      final restored = ExecutionFailure.fromJson(json);

      expect(restored, equals(original));
    });

    test('toString is readable', () {
      const failure = ExecutionFailure(
        code: 'AUTH_FAILED',
        message: 'Invalid credentials',
      );

      expect(failure.toString(), contains('AUTH_FAILED'));
      expect(failure.toString(), contains('Invalid credentials'));
    });

    test('different codes produce different hash', () {
      const f1 = ExecutionFailure(code: 'A', message: 'msg');
      const f2 = ExecutionFailure(code: 'B', message: 'msg');

      expect(f1.hashCode, isNot(equals(f2.hashCode)));
    });

    test('different messages produce different hash', () {
      const f1 = ExecutionFailure(code: 'ERR', message: 'msg1');
      const f2 = ExecutionFailure(code: 'ERR', message: 'msg2');

      expect(f1.hashCode, isNot(equals(f2.hashCode)));
    });
  });
}
