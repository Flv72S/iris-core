// OX5 — Pure task state → view model.

import 'package:iris_flutter_app/core/ui/ui_projection_adapter.dart';
import 'package:iris_flutter_app/apps/tasks/task_state.dart';

class TaskItemViewModel {
  const TaskItemViewModel({
    required this.id,
    required this.title,
    required this.status,
    required this.priority,
    required this.orderIndex,
  });
  final String id;
  final String title;
  final String status;
  final int priority;
  final int orderIndex;
}

class TaskBoardViewModel {
  const TaskBoardViewModel({
    this.open = const [],
    this.inProgress = const [],
    this.done = const [],
    this.cancelled = const [],
  });
  final List<TaskItemViewModel> open;
  final List<TaskItemViewModel> inProgress;
  final List<TaskItemViewModel> done;
  final List<TaskItemViewModel> cancelled;
}

class TaskViewModelAdapter extends UIProjectionAdapter<TaskState, TaskBoardViewModel> {
  @override
  TaskBoardViewModel toViewModel(TaskState state) {
    final order = state.orderByLedgerHeight;
    int indexOf(String id) {
      final i = order.indexOf(id);
      return i >= 0 ? i : order.length;
    }
    final open = state.byStatusOpen..sort((a, b) => indexOf(a.id).compareTo(indexOf(b.id)));
    final inProgress = state.byStatusInProgress..sort((a, b) => indexOf(a.id).compareTo(indexOf(b.id)));
    final done = state.byStatusDone..sort((a, b) => indexOf(a.id).compareTo(indexOf(b.id)));
    final cancelled = state.byStatusCancelled..sort((a, b) => indexOf(a.id).compareTo(indexOf(b.id)));
    return TaskBoardViewModel(
      open: open.map((t) => TaskItemViewModel(id: t.id, title: t.title, status: t.status.name, priority: t.priority, orderIndex: indexOf(t.id))).toList(),
      inProgress: inProgress.map((t) => TaskItemViewModel(id: t.id, title: t.title, status: t.status.name, priority: t.priority, orderIndex: indexOf(t.id))).toList(),
      done: done.map((t) => TaskItemViewModel(id: t.id, title: t.title, status: t.status.name, priority: t.priority, orderIndex: indexOf(t.id))).toList(),
      cancelled: cancelled.map((t) => TaskItemViewModel(id: t.id, title: t.title, status: t.status.name, priority: t.priority, orderIndex: indexOf(t.id))).toList(),
    );
  }
}
