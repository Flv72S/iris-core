/// OX3 — Deterministic multi-party agreement. Signatures deterministic; threshold finalization.

import 'package:iris_flutter_app/core/domain/primitives/domain_object.dart';
import 'package:iris_flutter_app/core/domain/primitives/object_lifecycle.dart';
import 'package:iris_flutter_app/core/domain/primitives/primitive_events.dart';

/// Agreement primitive. Finalization requires threshold; cannot finalize twice.
class AgreementPrimitive implements DomainObject {
  const AgreementPrimitive({
    required this.id,
    required this.type,
    required this.version,
    required this.createdAtHeight,
    required this.updatedAtHeight,
    this.isDeleted = false,
    required this.participants,
    required this.signatures,
    this.isFinalized = false,
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
  /// OX6 — Identity IDs. Signature validation should check identity active status.
  final List<String> participants;
  final Map<String, String> signatures;
  final bool isFinalized;

  static const String agreementType = 'agreement';

  static Map<String, dynamic> createPayload({
    required List<String> participants,
    required int atHeight,
  }) {
    final payload = <String, dynamic>{
      'participants': List<String>.from(participants),
      'signatures': <String, dynamic>{},
      'isFinalized': false,
    };
    return ObjectLifecycleEvents.createObject(agreementType, payload, atHeight);
  }

  static Map<String, dynamic> signPayload({
    required String id,
    required String nodeId,
    required String signature,
    required int version,
    required int atHeight,
  }) {
    return <String, dynamic>{
      'eventType': PrimitiveEventType.agreementSigned,
      'objectId': id,
      'version': version,
      'updatedAtHeight': atHeight,
      'nodeId': nodeId,
      'signature': signature,
    };
  }

  static Map<String, dynamic> finalizePayload({
    required String id,
    required int version,
    required int atHeight,
  }) {
    return <String, dynamic>{
      'eventType': PrimitiveEventType.agreementFinalized,
      'objectId': id,
      'version': version,
      'updatedAtHeight': atHeight,
    };
  }

  /// Returns true if [signatureCount] >= [threshold]. Fork invalidates incomplete agreement.
  static bool meetsThreshold(int signatureCount, int threshold) {
    return signatureCount >= threshold;
  }
}
