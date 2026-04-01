/// OX3 — Deterministic relationship graph. Rebuildable from ledger.

import 'package:iris_flutter_app/core/domain/primitives/primitive_events.dart';

class RelationshipEdge {
  const RelationshipEdge({
    required this.from,
    required this.to,
    required this.type,
  });
  final String from;
  final String to;
  final String type;
}

class RelationshipGraphEvents {
  RelationshipGraphEvents._();

  static Map<String, dynamic> addEdge({
    required String from,
    required String to,
    required String type,
    required int atHeight,
  }) {
    return <String, dynamic>{
      'eventType': PrimitiveEventType.relationshipAdded,
      'from': from,
      'to': to,
      'type': type,
      'atHeight': atHeight,
    };
  }

  static Map<String, dynamic> removeEdge({
    required String from,
    required String to,
    required String type,
    required int atHeight,
  }) {
    return <String, dynamic>{
      'eventType': PrimitiveEventType.relationshipRemoved,
      'from': from,
      'to': to,
      'type': type,
      'atHeight': atHeight,
    };
  }
}
