/// OX3 — Deterministic task unit. Status transitions validated.

import 'package:iris_flutter_app/core/domain/primitives/domain_object.dart';
import 'package:iris_flutter_app/core/domain/primitives/object_lifecycle.dart';
import 'package:iris_flutter_app/core/domain/primitives/primitive_events.dart';

enum TaskStatus { open, inProgress, done, cancelled }

/// Task primitive. Status transitions validated; DONE -> OPEN only via explicit event.
class TaskPrimitive implements DomainObject {
  const TaskPrimitive({
    required this.id,
    required this.type,
    required this.version,
    required this.createdAtHeight,
    required this.updatedAtHeight,
    this.isDeleted = false,
    required this.title,
    required this.status,
    required this.priority,
    required this.relatedObjects,
    this.ownerIdentityId,
  });

  @override
  final String id;
  @override
  final String type;
  @override
  final int version;
  @override
  final int createdAtHeight;
  @override
  final int updatedAtHeight;
  @override
  final bool isDeleted;
  final String title;
  final TaskStatus status;
  final int priority;
  final List<String> relatedObjects;
  /// OX6 — Optional owner identity. Used for permission-based status transitions.
  final String? ownerIdentityId;

  static const String taskType = 'task';

  static Map<String, dynamic> createPayload({
    required String title,
    int priority = 0,
    List<String> relatedObjects = const [],
    String? ownerIdentityId,
    required int atHeight,
  }) {
    final payload = <String, dynamic>{
      'title': title,
      'status': TaskStatus.open.name,
      'priority': priority,
      'relatedObjects': List<String>.from(relatedObjects),
      if (ownerIdentityId != null) 'ownerIdentityId': ownerIdentityId,
    };
    return ObjectLifecycleEvents.createObject(taskType, payload, atHeight);
  }

  static Map<String, dynamic> statusChangePayload({
    required String id,
    required String newStatus,
    required int version,
    required int atHeight,
  }) {
    return <String, dynamic>{
      'eventType': PrimitiveEventType.taskStatusChanged,
      'objectId': id,
      'version': version,
      'updatedAtHeight': atHeight,
      'newStatus': newStatus,
    };
  }

  static bool isValidTransition(TaskStatus from, TaskStatus to) {
    if (from == to) return true;
    switch (from) {
      case TaskStatus.open:
        return to == TaskStatus.inProgress || to == TaskStatus.cancelled;
      case TaskStatus.inProgress:
        return to == TaskStatus.done || to == TaskStatus.cancelled;
      case TaskStatus.done:
      case TaskStatus.cancelled:
        return false;
    }
  }
}
