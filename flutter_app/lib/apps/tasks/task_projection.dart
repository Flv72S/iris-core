// OX5 — Task projection. Group by status; order by ledger height.

import 'package:iris_flutter_app/core/domain/primitives/primitive_events.dart';
import 'package:iris_flutter_app/core/domain/primitives/task_primitive.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_definition.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/apps/tasks/task_state.dart';
import 'package:iris_flutter_app/apps/shared/primitive_event_applier.dart';

class TaskProjection extends ProjectionDefinition<TaskState> {
  TaskProjection({this.projectionId = 'tasks', this.version = 1});
  final String projectionId;
  final int version;

  @override
  String get id => projectionId;

  @override
  TaskState initialState() => const TaskState();

  @override
  TaskState applyEvent(TaskState state, DeterministicEvent event) {
    final data = getPrimitiveEventData(event);
    if (data == null) return state;
    final type = data.$2;
    final p = data.$1;

    if (type == PrimitiveEventType.objectCreated) {
      final t = p['type'] as String?;
      if (t != TaskPrimitive.taskType) return state;
      return _applyTaskCreated(state, p);
    }
    if (type == PrimitiveEventType.taskStatusChanged) {
      return _applyStatusChanged(state, p);
    }
    if (type == PrimitiveEventType.objectUpdated) {
      final existing = state.tasks.where((t) => t.id == p['objectId']).toList();
      if (existing.isEmpty) return state;
      return _applyTaskUpdated(state, p, existing.first);
    }
    return state;
  }

  TaskState _applyTaskCreated(TaskState state, Map<String, dynamic> p) {
    final id = p['objectId'] as String? ?? '';
    final payload = p['payload'] as Map<String, dynamic>? ?? p;
    final task = TaskPrimitive(
      id: id,
      type: TaskPrimitive.taskType,
      version: p['version'] as int? ?? 1,
      createdAtHeight: p['createdAtHeight'] as int? ?? 0,
      updatedAtHeight: p['updatedAtHeight'] as int? ?? 0,
      isDeleted: false,
      title: payload['title'] as String? ?? '',
      status: _parseStatus(payload['status'] as String?),
      priority: payload['priority'] as int? ?? 0,
      relatedObjects: List<String>.from(payload['relatedObjects'] as List? ?? []),
      ownerIdentityId: payload['ownerIdentityId'] as String?,
    );
    final tasks = List<TaskPrimitive>.from(state.tasks)..add(task);
    final order = List<String>.from(state.orderByLedgerHeight)..add(id);
    return TaskState(tasks: tasks, orderByLedgerHeight: order);
  }

  TaskState _applyStatusChanged(TaskState state, Map<String, dynamic> p) {
    final id = p['objectId'] as String? ?? '';
    final newStatus = _parseStatus(p['newStatus'] as String?);
    final idx = state.tasks.indexWhere((t) => t.id == id);
    if (idx < 0) return state;
    final old = state.tasks[idx];
    if (!TaskPrimitive.isValidTransition(old.status, newStatus)) return state;
    final task = TaskPrimitive(
      id: old.id,
      type: old.type,
      version: p['version'] as int? ?? old.version + 1,
      createdAtHeight: old.createdAtHeight,
      updatedAtHeight: p['updatedAtHeight'] as int? ?? old.updatedAtHeight,
      isDeleted: old.isDeleted,
      title: old.title,
      status: newStatus,
      priority: old.priority,
      relatedObjects: old.relatedObjects,
      ownerIdentityId: old.ownerIdentityId,
    );
    final tasks = List<TaskPrimitive>.from(state.tasks)..[idx] = task;
    return TaskState(tasks: tasks, orderByLedgerHeight: state.orderByLedgerHeight);
  }

  TaskState _applyTaskUpdated(TaskState state, Map<String, dynamic> p, TaskPrimitive existing) {
    final patch = p['patch'] as Map<String, dynamic>? ?? {};
    final title = patch['title'] as String? ?? existing.title;
    final priority = patch['priority'] as int? ?? existing.priority;
    final task = TaskPrimitive(
      id: existing.id,
      type: existing.type,
      version: p['version'] as int? ?? existing.version + 1,
      createdAtHeight: existing.createdAtHeight,
      updatedAtHeight: p['updatedAtHeight'] as int? ?? existing.updatedAtHeight,
      isDeleted: existing.isDeleted,
      title: title,
      status: existing.status,
      priority: priority,
      relatedObjects: existing.relatedObjects,
      ownerIdentityId: existing.ownerIdentityId,
    );
    final tasks = List<TaskPrimitive>.from(state.tasks);
    final i = tasks.indexWhere((t) => t.id == existing.id);
    if (i >= 0) tasks[i] = task;
    return TaskState(tasks: tasks, orderByLedgerHeight: state.orderByLedgerHeight);
  }

  TaskStatus _parseStatus(String? s) {
    if (s == null) return TaskStatus.open;
    switch (s) {
      case 'inProgress': return TaskStatus.inProgress;
      case 'done': return TaskStatus.done;
      case 'cancelled': return TaskStatus.cancelled;
      default: return TaskStatus.open;
    }
  }

  @override
  int getVersion() => version;

  @override
  Map<String, dynamic> stateToCanonicalMap(TaskState state) => <String, dynamic>{
        'taskCount': state.tasks.length,
        'order': state.orderByLedgerHeight,
      };
}
