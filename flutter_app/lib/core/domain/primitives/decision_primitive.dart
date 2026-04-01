/// OX3 — Deterministic decision record. Immutable after resolution.

import 'package:iris_flutter_app/core/domain/primitives/domain_object.dart';
import 'package:iris_flutter_app/core/domain/primitives/object_lifecycle.dart';
import 'package:iris_flutter_app/core/domain/primitives/primitive_events.dart';

class DecisionPrimitive implements DomainObject {
  const DecisionPrimitive({
    required this.id,
    required this.type,
    required this.version,
    required this.createdAtHeight,
    required this.updatedAtHeight,
    this.isDeleted = false,
    required this.topic,
    required this.options,
    this.chosenOption,
    this.resolvedAtHeight,
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
  final String topic;
  final List<String> options;
  final String? chosenOption;
  final int? resolvedAtHeight;

  static const String decisionType = 'decision';

  static Map<String, dynamic> createPayload({
    required String topic,
    required List<String> options,
    required int atHeight,
  }) {
    final payload = <String, dynamic>{
      'topic': topic,
      'options': List<String>.from(options),
    };
    return ObjectLifecycleEvents.createObject(decisionType, payload, atHeight);
  }

  static Map<String, dynamic> resolvePayload({
    required String id,
    required String chosenOption,
    required int version,
    required int atHeight,
  }) {
    return <String, dynamic>{
      'eventType': PrimitiveEventType.decisionResolved,
      'objectId': id,
      'version': version,
      'resolvedAtHeight': atHeight,
      'chosenOption': chosenOption,
    };
  }
}
