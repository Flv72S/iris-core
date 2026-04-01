// OX7 — Canonical payload for signing. Sorted keys; deterministic hash.

import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:iris_flutter_app/core/deterministic/utils/canonical_serializer.dart';

/// Canonical serialization and hash for signature. Deterministic across nodes.
class CanonicalPayload {
  CanonicalPayload._();

  /// Serializes [payload] to canonical bytes (sorted keys, stable order). No undefined; no extra whitespace.
  static List<int> serialize(Map<String, dynamic> payload) {
    return CanonicalSerializer.canonicalSerialize(payload);
  }

  /// Deterministic hash of [payload] for signing. Same payload → same hash. Uses SHA-256.
  static String hash(Map<String, dynamic> payload) {
    final bytes = serialize(payload);
    final digest = sha256.convert(bytes);
    return _bytesToHex(digest.bytes);
  }

  /// Hash from pre-serialized bytes (e.g. when payload is already canonical).
  static String hashFromBytes(List<int> bytes) {
    final digest = sha256.convert(bytes);
    return _bytesToHex(digest.bytes);
  }

  static String _bytesToHex(List<int> bytes) {
    return bytes.map((b) => (b & 0xff).toRadixString(16).padLeft(2, '0')).join();
  }
}
