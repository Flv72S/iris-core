import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/domain/primitives/task_primitive.dart';

void main() {
  group('TaskStatus transition', () {
    test('open to inProgress valid', () {
      expect(TaskPrimitive.isValidTransition(TaskStatus.open, TaskStatus.inProgress), isTrue);
    });
    test('open to cancelled valid', () {
      expect(TaskPrimitive.isValidTransition(TaskStatus.open, TaskStatus.cancelled), isTrue);
    });
    test('inProgress to done valid', () {
      expect(TaskPrimitive.isValidTransition(TaskStatus.inProgress, TaskStatus.done), isTrue);
    });
    test('done to open invalid', () {
      expect(TaskPrimitive.isValidTransition(TaskStatus.done, TaskStatus.open), isFalse);
    });
    test('cancelled to open invalid', () {
      expect(TaskPrimitive.isValidTransition(TaskStatus.cancelled, TaskStatus.open), isFalse);
    });
    test('same status valid', () {
      expect(TaskPrimitive.isValidTransition(TaskStatus.open, TaskStatus.open), isTrue);
    });
  });

  group('TaskPrimitive createPayload', () {
    test('includes title and default status open', () {
      final p = TaskPrimitive.createPayload(title: 'Hello', atHeight: 1);
      expect(p['payload']['title'], 'Hello');
      expect(p['payload']['status'], TaskStatus.open.name);
    });
  });
}
