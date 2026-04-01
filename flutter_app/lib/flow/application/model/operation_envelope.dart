// L1 — Operation envelope. Immutable application-level contract; no domain logic.

import 'package:iris_flutter_app/flow/infrastructure/port/signature/signed_payload.dart';

import 'package:iris_flutter_app/flow/application/model/operation_envelope_metadata.dart';

/// Immutable envelope for a signed operation. All ids and payload supplied externally.
/// Payload is stored as a defensive, unmodifiable copy.
class OperationEnvelope {
  OperationEnvelope({
    required String operationId,
    required String resourceId,
    required List<int> payload,
    required SignedPayload signature,
    required OperationEnvelopeMetadata metadata,
  })  : assert(operationId.trim().isNotEmpty, 'operationId must be non-empty'),
        assert(resourceId.trim().isNotEmpty, 'resourceId must be non-empty'),
        assert(payload.isNotEmpty, 'payload must be non-empty'),
        assert(signature.signatureBytes.isNotEmpty, 'signature.signatureBytes must be non-empty'),
        operationId = operationId,
        resourceId = resourceId,
        payload = List<int>.unmodifiable(List<int>.from(payload)),
        signature = signature,
        metadata = metadata;

  final String operationId;
  final String resourceId;
  final List<int> payload;
  final SignedPayload signature;
  final OperationEnvelopeMetadata metadata;

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    if (other is! OperationEnvelope) return false;
    return operationId == other.operationId &&
        resourceId == other.resourceId &&
        _listEquals(payload, other.payload) &&
        _listEquals(signature.signatureBytes, other.signature.signatureBytes) &&
        _attributesEquals(metadata.attributes, other.metadata.attributes);
  }

  @override
  int get hashCode {
    return Object.hash(
      operationId,
      resourceId,
      _listHash(payload),
      _listHash(signature.signatureBytes),
      _attributesHash(metadata.attributes),
    );
  }

  static bool _listEquals(List<int> a, List<int> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  static int _listHash(List<int> list) {
    var h = 0;
    for (var i = 0; i < list.length; i++) {
      h = Object.hash(h, list[i]);
    }
    return h;
  }

  static bool _attributesEquals(Map<String, String> a, Map<String, String> b) {
    if (a.length != b.length) return false;
    final aKeys = a.keys.toList()..sort();
    final bKeys = b.keys.toList()..sort();
    for (var i = 0; i < aKeys.length; i++) {
      if (aKeys[i] != bKeys[i]) return false;
      if (a[aKeys[i]] != b[bKeys[i]]) return false;
    }
    return true;
  }

  static int _attributesHash(Map<String, String> attrs) {
    final keys = attrs.keys.toList()..sort();
    var h = 0;
    for (final k in keys) {
      h = Object.hash(h, k, attrs[k]);
    }
    return h;
  }
}
