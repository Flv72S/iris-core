/// O4 — Build sync envelopes. Caller must sign before sending.

import 'package:iris_flutter_app/core/network/message/deterministic_message_envelope.dart';
import 'package:iris_flutter_app/core/network/message/message_envelope_serializer.dart';
import 'package:iris_flutter_app/core/network/message/message_types.dart';
import 'package:iris_flutter_app/core/network/sync/sync_payload_codec.dart';
import 'package:iris_flutter_app/core/network/sync/sync_types.dart';
import 'package:uuid/uuid.dart';

const _uuid = Uuid();

class SyncMessageFactory {
  SyncMessageFactory._();

  static String _payloadHash(String payload) =>
      MessageEnvelopeSerializer.computePayloadHash(payload);

  /// Build SNAPSHOT_REQUEST. Signature must be set by caller before send.
  static DeterministicMessageEnvelope snapshotRequest({
    required String senderNodeId,
    required String targetNodeId,
    String protocolVersion = '1.0',
    String? messageId,
  }) {
    final payloadMap = snapshotRequestPayload(targetNodeId);
    final payload = SyncPayloadCodec.toCanonicalJsonString(payloadMap);
    final mid = messageId ?? _uuid.v4();
    return DeterministicMessageEnvelope(
      messageId: mid,
      senderNodeId: senderNodeId,
      protocolVersion: protocolVersion,
      payloadType: MessageTypes.snapshotRequest,
      payloadHash: _payloadHash(payload),
      payload: payload,
      signature: '',
    );
  }

  /// Build SNAPSHOT_RESPONSE. Signature must be set by caller before send.
  static DeterministicMessageEnvelope snapshotResponse({
    required String senderNodeId,
    required String snapshotHash,
    required String snapshotData,
    required int ledgerHeight,
    String protocolVersion = '1.0',
    String? messageId,
  }) {
    final payloadMap = snapshotResponsePayload(
      snapshotHash: snapshotHash,
      snapshotData: snapshotData,
      ledgerHeight: ledgerHeight,
    );
    final payload = SyncPayloadCodec.toCanonicalJsonString(payloadMap);
    final mid = messageId ?? _uuid.v4();
    return DeterministicMessageEnvelope(
      messageId: mid,
      senderNodeId: senderNodeId,
      protocolVersion: protocolVersion,
      payloadType: MessageTypes.snapshotResponse,
      payloadHash: _payloadHash(payload),
      payload: payload,
      signature: '',
    );
  }

  /// Build LEDGER_SEGMENT_REQUEST. Signature must be set by caller before send.
  static DeterministicMessageEnvelope ledgerSegmentRequest({
    required String senderNodeId,
    required int fromHeight,
    String protocolVersion = '1.0',
    String? messageId,
  }) {
    final payloadMap = ledgerSegmentRequestPayload(fromHeight);
    final payload = SyncPayloadCodec.toCanonicalJsonString(payloadMap);
    final mid = messageId ?? _uuid.v4();
    return DeterministicMessageEnvelope(
      messageId: mid,
      senderNodeId: senderNodeId,
      protocolVersion: protocolVersion,
      payloadType: MessageTypes.ledgerSegmentRequest,
      payloadHash: _payloadHash(payload),
      payload: payload,
      signature: '',
    );
  }

  /// Build LEDGER_SEGMENT_RESPONSE. Signature must be set by caller before send.
  static DeterministicMessageEnvelope ledgerSegmentResponse({
    required String senderNodeId,
    required List<Map<String, dynamic>> events,
    required String segmentHash,
    String protocolVersion = '1.0',
    String? messageId,
  }) {
    final payloadMap = ledgerSegmentResponsePayload(
      events: events,
      segmentHash: segmentHash,
    );
    final payload = SyncPayloadCodec.toCanonicalJsonString(payloadMap);
    final mid = messageId ?? _uuid.v4();
    return DeterministicMessageEnvelope(
      messageId: mid,
      senderNodeId: senderNodeId,
      protocolVersion: protocolVersion,
      payloadType: MessageTypes.ledgerSegmentResponse,
      payloadHash: _payloadHash(payload),
      payload: payload,
      signature: '',
    );
  }
}
