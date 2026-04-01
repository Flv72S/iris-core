/// OX3 — Deterministic structured content. Canonical content; patch events.

import 'package:iris_flutter_app/core/domain/primitives/domain_object.dart';
import 'package:iris_flutter_app/core/domain/primitives/object_lifecycle.dart';
import 'package:iris_flutter_app/core/domain/primitives/primitive_events.dart';

/// Structured document primitive. Content must be canonicalized; no non-deterministic fields.
class StructuredDocument implements DomainObject {
  const StructuredDocument({
    required this.id,
    required this.type,
    required this.version,
    required this.createdAtHeight,
    required this.updatedAtHeight,
    this.isDeleted = false,
    required this.schemaVersion,
    required this.content,
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
  final int schemaVersion;
  final Map<String, dynamic> content;

  /// Event payload for creating a structured document.
  static Map<String, dynamic> createPayload({
    required String type,
    required int schemaVersion,
    required Map<String, dynamic> content,
    required int atHeight,
  }) {
    final payload = <String, dynamic>{
      'schemaVersion': schemaVersion,
      'content': Map<String, dynamic>.from(content),
    };
    return ObjectLifecycleEvents.createObject(type, payload, atHeight);
  }

  /// Event payload for partial update (patch).
  static Map<String, dynamic> patchPayload({
    required String id,
    required Map<String, dynamic> patch,
    required int version,
    required int atHeight,
  }) {
    return ObjectLifecycleEvents.updateObject(id, patch, version, atHeight);
  }
}
