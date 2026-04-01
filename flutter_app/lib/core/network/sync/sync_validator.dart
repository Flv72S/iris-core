/// O4 — Sync payload and structure validation. Replay verification is in PullSyncProtocol.

import 'package:iris_flutter_app/core/network/message/deterministic_message_envelope.dart';
import 'package:iris_flutter_app/core/network/message/message_types.dart';
import 'package:iris_flutter_app/core/network/message/message_envelope_validator.dart';
import 'package:iris_flutter_app/core/network/sync/sync_payload_codec.dart';
import 'package:iris_flutter_app/core/deterministic/compatibility/protocol_version.dart';

/// Result of sync validation. [success] true iff all checks passed.
class SyncValidationResult {
  const SyncValidationResult({required this.success, this.error});
  final bool success;
  final String? error;

  static const SyncValidationResult ok = SyncValidationResult(success: true);
  static SyncValidationResult fail(String message) =>
      SyncValidationResult(success: false, error: message);
}

class SyncValidator {
  SyncValidator._();

  /// Validate envelope (O2) and payload structure for sync types. Does not verify replay.
  static Future<SyncValidationResult> validateEnvelope(
    DeterministicMessageEnvelope envelope, {
    required String senderPublicKey,
    DeterministicProtocolVersion currentVersion = DeterministicProtocolVersion.initial,
  }) async {
    final envelopeResult = await MessageEnvelopeValidator.validateEnvelope(
      envelope,
      senderPublicKey: senderPublicKey,
      currentVersion: currentVersion,
    );
    if (!envelopeResult.valid) {
      return SyncValidationResult.fail(envelopeResult.error ?? 'Envelope invalid');
    }
    return validatePayloadStructure(envelope);
  }

  /// Validate payload has required keys for its payloadType.
  static SyncValidationResult validatePayloadStructure(DeterministicMessageEnvelope envelope) {
    Map<String, dynamic> map;
    try {
      map = SyncPayloadCodec.parsePayload(envelope.payload);
    } catch (e) {
      return SyncValidationResult.fail('Payload parse error: $e');
    }
    switch (envelope.payloadType) {
      case MessageTypes.snapshotRequest:
        if (!map.containsKey('targetNodeId')) return SyncValidationResult.fail('targetNodeId required');
        break;
      case MessageTypes.snapshotResponse:
        if (!map.containsKey('snapshotHash')) return SyncValidationResult.fail('snapshotHash required');
        if (!map.containsKey('snapshotData')) return SyncValidationResult.fail('snapshotData required');
        if (!map.containsKey('ledgerHeight')) return SyncValidationResult.fail('ledgerHeight required');
        if (map['ledgerHeight'] is! int) return SyncValidationResult.fail('ledgerHeight must be int');
        break;
      case MessageTypes.ledgerSegmentRequest:
        if (!map.containsKey('fromHeight')) return SyncValidationResult.fail('fromHeight required');
        if (map['fromHeight'] is! int) return SyncValidationResult.fail('fromHeight must be int');
        break;
      case MessageTypes.ledgerSegmentResponse:
        if (!map.containsKey('events')) return SyncValidationResult.fail('events required');
        if (!map.containsKey('segmentHash')) return SyncValidationResult.fail('segmentHash required');
        if (map['events'] is! List) return SyncValidationResult.fail('events must be array');
        break;
      default:
        return SyncValidationResult.fail('Unknown payloadType: ${envelope.payloadType}');
    }
    return SyncValidationResult.ok;
  }
}
