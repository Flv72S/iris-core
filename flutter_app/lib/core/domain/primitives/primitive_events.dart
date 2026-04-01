/// OX3 — Deterministic primitive event types. Replay-safe.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/deterministic/utils/canonical_serializer.dart';
import 'package:iris_flutter_app/core/deterministic/utils/deterministic_hash.dart';

class PrimitiveEventType {
  PrimitiveEventType._();
  static const String objectCreated = 'OBJECT_CREATED';
  static const String objectUpdated = 'OBJECT_UPDATED';
  static const String objectArchived = 'OBJECT_ARCHIVED';
  static const String objectDeleted = 'OBJECT_DELETED';
  static const String taskStatusChanged = 'TASK_STATUS_CHANGED';
  static const String decisionResolved = 'DECISION_RESOLVED';
  static const String agreementSigned = 'AGREEMENT_SIGNED';
  static const String agreementFinalized = 'AGREEMENT_FINALIZED';
  static const String relationshipAdded = 'RELATIONSHIP_ADDED';
  static const String relationshipRemoved = 'RELATIONSHIP_REMOVED';
  static const String metadataSet = 'METADATA_SET';
}

class PrimitiveEvent implements DeterministicEvent {
  PrimitiveEvent({
    required this.eventType,
    required this.payload,
    required this.eventIndex,
    this.source = 'primitive',
  });
  final String eventType;
  final Map<String, dynamic> payload;
  @override
  final int eventIndex;
  @override
  final String source;
  @override
  late final int deterministicHash = _computeHash();

  int _computeHash() {
    final envelope = <String, dynamic>{
      'eventType': eventType,
      'eventIndex': eventIndex,
      'source': source,
      ...payload,
    };
    final bytes = CanonicalSerializer.canonicalSerialize(envelope);
    return DeterministicHash.computeDeterministicHash(bytes);
  }
}
