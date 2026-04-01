// L2 — Human-readable view for debug/logging only. NOT used for signature or hash.

import 'dart:convert';

import 'package:iris_flutter_app/flow/application/model/operation_envelope.dart';

/// Debug-only view of an envelope. Not canonical; do not use for signing or hashing.
class OperationEnvelopeView {
  OperationEnvelopeView({
    required this.operationId,
    required this.resourceId,
    required this.payload,
    required this.metadata,
    required this.signatureBase64,
  });

  final String operationId;
  final String resourceId;
  final List<int> payload;
  final Map<String, String> metadata;
  final String signatureBase64;
}

/// Builds a readable view of [envelope] for logging/debug. Not deterministic for hashing.
OperationEnvelopeView toView(OperationEnvelope envelope) {
  return OperationEnvelopeView(
    operationId: envelope.operationId,
    resourceId: envelope.resourceId,
    payload: List<int>.unmodifiable(List<int>.from(envelope.payload)),
    metadata: Map<String, String>.unmodifiable(Map<String, String>.from(envelope.metadata.attributes)),
    signatureBase64: base64Encode(envelope.signature.signatureBytes),
  );
}
