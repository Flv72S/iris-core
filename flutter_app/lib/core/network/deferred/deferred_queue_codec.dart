/// O6 — Canonical serialization for deferred queue. No undefined fields; fail fast.

import 'dart:convert';

import 'package:iris_flutter_app/core/network/deferred/deferred_operation.dart';
import 'package:iris_flutter_app/core/network/sync/sync_payload_codec.dart';

class DeferredQueueCodec {
  DeferredQueueCodec._();

  static const String _keyId = 'id';
  static const String _keyType = 'type';
  static const String _keyPayload = 'payload';
  static const String _keyCreatedAt = 'createdAt';
  static const String _keyRetryCount = 'retryCount';

  /// Encode queue to canonical JSON string. Deterministic (sorted keys).
  static String toCanonicalJson(List<DeferredOperation> operations) {
    final list = operations.map(_operationToMap).toList();
    return _encodeList(list);
  }

  static Map<String, dynamic> _operationToMap(DeferredOperation op) {
    return {
      _keyId: op.id,
      _keyType: DeferredOperation.typeToString(op.type),
      _keyPayload: Map<String, dynamic>.from(op.payload),
      _keyCreatedAt: op.createdAt,
      _keyRetryCount: op.retryCount,
    };
  }

  static String _encodeList(List<Map<String, dynamic>> list) {
    final sb = StringBuffer();
    sb.write('[');
    for (var i = 0; i < list.length; i++) {
      if (i > 0) sb.write(',');
      sb.write(SyncPayloadCodec.toCanonicalJsonString(list[i]));
    }
    sb.write(']');
    return sb.toString();
  }

  /// Decode queue from JSON. Throws on invalid or corrupted data (fail fast).
  static List<DeferredOperation> fromCanonicalJson(String json) {
    final decoded = jsonDecode(json);
    if (decoded is! List) {
      throw FormatException('Deferred queue JSON must be an array');
    }
    final result = <DeferredOperation>[];
    for (var i = 0; i < decoded.length; i++) {
      final item = decoded[i];
      if (item is! Map) {
        throw FormatException('Queue item at index $i must be an object');
      }
      result.add(_mapToOperation(Map<String, dynamic>.from(item)));
    }
    return result;
  }

  static DeferredOperation _mapToOperation(Map<String, dynamic> map) {
    final id = map[_keyId];
    final typeStr = map[_keyType];
    final payload = map[_keyPayload];
    final createdAt = map[_keyCreatedAt];
    final retryCount = map[_keyRetryCount];

    if (id is! String || id.isEmpty) {
      throw FormatException('Operation id must be non-empty string');
    }
    if (typeStr is! String) {
      throw FormatException('Operation type must be string');
    }
    if (payload is! Map) {
      throw FormatException('Operation payload must be object');
    }
    if (createdAt is! String) {
      throw FormatException('Operation createdAt must be string');
    }
    final retryInt = retryCount is int ? retryCount : (retryCount is num ? retryCount.toInt() : null);
    if (retryInt == null || retryInt < 0) {
      throw FormatException('Operation retryCount must be non-negative int');
    }

    return DeferredOperation(
      id: id,
      type: DeferredOperation.typeFromString(typeStr),
      payload: Map<String, dynamic>.from(payload),
      createdAt: createdAt,
      retryCount: retryInt,
    );
  }
}
