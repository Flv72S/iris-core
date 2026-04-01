/// OX3 — Deterministic key-value metadata. No overwrite without event.

import 'package:iris_flutter_app/core/domain/primitives/primitive_events.dart';

class MetadataPrimitive {
  const MetadataPrimitive({
    required this.targetId,
    required this.key,
    required this.value,
  });
  final String targetId;
  final String key;
  final String value;
}

/// Event payload for setting metadata. Deterministic ordering via ledger.
class MetadataPrimitiveEvents {
  MetadataPrimitiveEvents._();

  static Map<String, dynamic> setMetadata({
    required String targetId,
    required String key,
    required String value,
    required int atHeight,
  }) {
    return <String, dynamic>{
      'eventType': PrimitiveEventType.metadataSet,
      'targetId': targetId,
      'key': key,
      'value': value,
      'atHeight': atHeight,
    };
  }
}
