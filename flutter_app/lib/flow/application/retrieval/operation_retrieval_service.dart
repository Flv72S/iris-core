// L5 — Read path: retrieve persisted bytes, rebuild envelope, verify signature.

import 'dart:convert';
import 'dart:typed_data';

import 'package:iris_flutter_app/flow/application/model/operation_envelope.dart';
import 'package:iris_flutter_app/flow/application/model/operation_envelope_metadata.dart';
import 'package:iris_flutter_app/flow/application/retrieval/retrieved_operation_result.dart';
import 'package:iris_flutter_app/flow/application/serialization/operation_envelope_canonical_serializer.dart';
import 'package:iris_flutter_app/flow/infrastructure/composition/infrastructure_orchestrator.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signed_payload.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_metadata.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_port.dart';

/// Read-only flow: retrieve canonical bytes from orchestrator, parse to envelope, re-serialize, verify signature.
class OperationRetrievalService {
  OperationRetrievalService({
    required this.orchestrator,
    required this.serializer,
    required this.signaturePort,
  });

  final InfrastructureOrchestrator orchestrator;
  final OperationEnvelopeCanonicalSerializer serializer;
  final SignaturePort signaturePort;

  /// Retrieves persisted payload for [resourceId], parses to envelope, re-serializes, verifies signature.
  /// If verification fails, returns result with signatureValid == false (no exception).
  Future<RetrievedOperationResult> retrieve({
    required String operationId,
    required String resourceId,
  }) async {
    final bytes = await orchestrator.retrievePersistedPayload(resourceId);
    if (bytes.isEmpty) {
      throw StateError('retrieve: empty payload for resourceId=$resourceId');
    }
    final envelope = _parseCanonical(Uint8List.fromList(bytes));
    final canonical = serializer.serialize(envelope);
    final verification = signaturePort.verify(
      payload: canonical.bytes.toList(),
      signature: envelope.signature,
    );
    return RetrievedOperationResult(
      envelope: envelope,
      signatureValid: verification.valid,
    );
  }

  /// Internal parser: symmetric to L2 layout. Not public API.
  OperationEnvelope _parseCanonical(Uint8List bytes) {
    var i = 0;
    int readU32() {
      final v = (bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3];
      i += 4;
      return v;
    }

    final opIdLen = readU32();
    final operationId = utf8.decode(bytes.sublist(i, i + opIdLen));
    i += opIdLen;

    final resIdLen = readU32();
    final resourceId = utf8.decode(bytes.sublist(i, i + resIdLen));
    i += resIdLen;

    final payloadLen = readU32();
    final payload = List<int>.unmodifiable(List<int>.from(bytes.sublist(i, i + payloadLen)));
    i += payloadLen;

    final sigLen = readU32();
    final sigBytes = List<int>.from(bytes.sublist(i, i + sigLen));
    i += sigLen;

    final attrCount = readU32();
    final attrs = <String, String>{};
    for (var n = 0; n < attrCount; n++) {
      final kLen = readU32();
      final k = utf8.decode(bytes.sublist(i, i + kLen));
      i += kLen;
      final vLen = readU32();
      final v = utf8.decode(bytes.sublist(i, i + vLen));
      i += vLen;
      attrs[k] = v;
    }

    return OperationEnvelope(
      operationId: operationId,
      resourceId: resourceId,
      payload: payload,
      signature: SignedPayload(
        signatureBytes: sigBytes,
        metadata: const SignatureMetadata(signerId: '', algorithm: 'HMAC-SHA256'),
      ),
      metadata: OperationEnvelopeMetadata(attributes: attrs),
    );
  }
}
