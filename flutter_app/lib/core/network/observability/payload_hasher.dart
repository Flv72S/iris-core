/// O9 — Deterministic payload hash for audit. No decision logic.

import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:iris_flutter_app/core/network/sync/sync_payload_codec.dart';

class PayloadHasher {
  PayloadHasher._();

  /// Deterministic SHA-256 hex (lowercase) of canonical JSON of [payload].
  static String hashPayload(Map<String, dynamic> payload) {
    final canonical = SyncPayloadCodec.toCanonicalJsonString(payload);
    final bytes = utf8.encode(canonical);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }
}
