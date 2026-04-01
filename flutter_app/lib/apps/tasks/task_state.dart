// OX5 — Task board state. Deterministic ordering by ledger.

import 'package:iris_flutter_app/core/domain/primitives/task_primitive.dart';

class TaskState {
  const TaskState({this.tasks = const [], this.orderByLedgerHeight = const []});

  final List<TaskPrimitive> tasks;
  final List<String> orderByLedgerHeight;

  List<TaskPrimitive> get byStatusOpen =>
      tasks.where((t) => t.status == TaskStatus.open).toList();
  List<TaskPrimitive> get byStatusInProgress =>
      tasks.where((t) => t.status == TaskStatus.inProgress).toList();
  List<TaskPrimitive> get byStatusDone =>
      tasks.where((t) => t.status == TaskStatus.done).toList();
  List<TaskPrimitive> get byStatusCancelled =>
      tasks.where((t) => t.status == TaskStatus.cancelled).toList();
}
