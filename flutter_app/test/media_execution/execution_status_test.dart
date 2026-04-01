import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/media_execution/execution_status.dart';

void main() {
  group('ExecutionStatus', () {
    test('has all expected values', () {
      expect(ExecutionStatus.values.length, 3);
      expect(ExecutionStatus.success.name, 'success');
      expect(ExecutionStatus.failure.name, 'failure');
      expect(ExecutionStatus.skipped.name, 'skipped');
    });

    test('enum values are distinct', () {
      final set = ExecutionStatus.values.toSet();
      expect(set.length, ExecutionStatus.values.length);
    });

    test('can be used in switch', () {
      String describe(ExecutionStatus status) {
        switch (status) {
          case ExecutionStatus.success:
            return 'ok';
          case ExecutionStatus.failure:
            return 'error';
          case ExecutionStatus.skipped:
            return 'skip';
        }
      }

      expect(describe(ExecutionStatus.success), 'ok');
      expect(describe(ExecutionStatus.failure), 'error');
      expect(describe(ExecutionStatus.skipped), 'skip');
    });
  });
}
