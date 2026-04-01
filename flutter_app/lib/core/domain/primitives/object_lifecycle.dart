/// OX3 — Deterministic lifecycle states and transitions. Append-only.

import 'package:iris_flutter_app/core/domain/primitives/primitive_events.dart';
import 'package:iris_flutter_app/core/deterministic/utils/canonical_serializer.dart';
import 'package:iris_flutter_app/core/deterministic/utils/deterministic_hash.dart';

enum ObjectLifecycleState { created, updated, archived, deleted }

/// Deterministic ID from type, ledger height, and canonical payload. No random UUID.
String deterministicObjectId(String type, int atHeight, Map<String, dynamic> canonicalPayload) {
  final envelope = <String, dynamic>{
    'type': type,
    'atHeight': atHeight,
    'payload': canonicalPayload,
  };
  final bytes = CanonicalSerializer.canonicalSerialize(envelope);
  final h = DeterministicHash.computeDeterministicHash(bytes);
  final unsigned = h >= 0 ? h : (h + 0x100000000) & 0xffffffff;
  return '${type}_${atHeight}_${unsigned.toRadixString(16)}';
}

/// Event payloads for lifecycle operations. Each validates preconditions; caller appends to ledger.
class ObjectLifecycleEvents {
  ObjectLifecycleEvents._();

  /// Payload for create. [atHeight] = ledger height at creation. ID computed via [deterministicObjectId].
  static Map<String, dynamic> createObject(String type, Map<String, dynamic> payload, int atHeight) {
    final id = deterministicObjectId(type, atHeight, payload);
    return <String, dynamic>{
      'eventType': PrimitiveEventType.objectCreated,
      'objectId': id,
      'type': type,
      'version': 1,
      'createdAtHeight': atHeight,
      'updatedAtHeight': atHeight,
      'isDeleted': false,
      'payload': Map<String, dynamic>.from(payload),
    };
  }

  /// Payload for update. [version] must be current + 1.
  static Map<String, dynamic> updateObject(
    String id,
    Map<String, dynamic> patch,
    int version,
    int atHeight,
  ) {
    return <String, dynamic>{
      'eventType': PrimitiveEventType.objectUpdated,
      'objectId': id,
      'version': version,
      'updatedAtHeight': atHeight,
      'patch': Map<String, dynamic>.from(patch),
    };
  }

  static Map<String, dynamic> archiveObject(String id, int version, int atHeight) {
    return <String, dynamic>{
      'eventType': PrimitiveEventType.objectArchived,
      'objectId': id,
      'version': version,
      'updatedAtHeight': atHeight,
    };
  }

  static Map<String, dynamic> deleteObject(String id, int version, int atHeight) {
    return <String, dynamic>{
      'eventType': PrimitiveEventType.objectDeleted,
      'objectId': id,
      'version': version,
      'updatedAtHeight': atHeight,
    };
  }
}
