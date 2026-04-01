/// O2 — Canonical serialization for message envelope. Sorted keys, UTF-8; signature excluded from signing input.

import 'dart:convert';

import 'package:iris_flutter_app/core/deterministic/utils/deterministic_hash.dart';
import 'package:iris_flutter_app/core/network/message/deterministic_message_envelope.dart';

class MessageEnvelopeSerializer {
  MessageEnvelopeSerializer._();

  /// All keys in canonical order (alphabetical). Signature last for full serialization.
  static const List<String> _allKeys = [
    'messageId',
    'payload',
    'payloadHash',
    'payloadType',
    'protocolVersion',
    'senderNodeId',
    'signature',
  ];

  /// Keys used when computing signature (envelope without signature field).
  static const List<String> _keysForSigning = [
    'messageId',
    'payload',
    'payloadHash',
    'payloadType',
    'protocolVersion',
    'senderNodeId',
  ];

  /// Canonical JSON bytes of full envelope (for wire/storage).
  static List<int> toCanonicalBytes(DeterministicMessageEnvelope envelope) {
    final map = {
      'messageId': envelope.messageId,
      'payload': envelope.payload,
      'payloadHash': envelope.payloadHash,
      'payloadType': envelope.payloadType,
      'protocolVersion': envelope.protocolVersion,
      'senderNodeId': envelope.senderNodeId,
      'signature': envelope.signature,
    };
    return utf8.encode(_canonicalEncode(map, _allKeys));
  }

  /// Canonical JSON bytes of envelope WITHOUT signature (input to sign/verify).
  static List<int> toCanonicalBytesForSigning(DeterministicMessageEnvelope envelope) {
    final map = {
      'messageId': envelope.messageId,
      'payload': envelope.payload,
      'payloadHash': envelope.payloadHash,
      'payloadType': envelope.payloadType,
      'protocolVersion': envelope.protocolVersion,
      'senderNodeId': envelope.senderNodeId,
    };
    return utf8.encode(_canonicalEncode(map, _keysForSigning));
  }

  static String _canonicalEncode(Map<String, String> map, List<String> keyOrder) {
    final sb = StringBuffer();
    sb.write('{');
    for (var i = 0; i < keyOrder.length; i++) {
      final k = keyOrder[i];
      if (!map.containsKey(k)) continue;
      if (i > 0) sb.write(',');
      sb.write(_jsonString(k));
      sb.write(':');
      sb.write(_jsonString(map[k]!));
    }
    sb.write('}');
    return sb.toString();
  }

  static String _jsonString(String s) {
    final escaped = s
        .replaceAll(r'\', r'\\')
        .replaceAll('"', r'\"')
        .replaceAll('\n', r'\n')
        .replaceAll('\r', r'\r')
        .replaceAll('\t', r'\t');
    return '"$escaped"';
  }

  /// Deserialize envelope from canonical JSON bytes.
  static DeterministicMessageEnvelope fromCanonicalBytes(List<int> bytes) {
    final json = utf8.decode(bytes);
    final map = jsonDecode(json) as Map<String, dynamic>;
    return DeterministicMessageEnvelope(
      messageId: map['messageId'] as String,
      senderNodeId: map['senderNodeId'] as String,
      protocolVersion: map['protocolVersion'] as String,
      payloadType: map['payloadType'] as String,
      payloadHash: map['payloadHash'] as String,
      payload: map['payload'] as String,
      signature: map['signature'] as String,
    );
  }

  /// Hash of canonical payload (UTF-8 bytes). FNV-1a; hex lowercase.
  static String computePayloadHash(String payload) {
    final bytes = utf8.encode(payload);
    final h = DeterministicHash.computeDeterministicHash(bytes);
    final unsigned = h >= 0 ? h : (h + 0x100000000) & 0xffffffff;
    return unsigned.toRadixString(16).padLeft(8, '0');
  }
}
