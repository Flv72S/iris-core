/// O4 — Canonical JSON for sync payloads. Sorted keys, UTF-8, no extra whitespace.

import 'dart:convert';

class SyncPayloadCodec {
  SyncPayloadCodec._();

  /// Encode map to canonical JSON string (sorted keys). Deterministic.
  static String toCanonicalJsonString(Map<String, dynamic> map) {
    return _encodeValue(map);
  }

  static String _encodeValue(dynamic v) {
    if (v == null) return 'null';
    if (v is int) return v.toString();
    if (v is String) return _jsonString(v);
    if (v is bool) return v ? 'true' : 'false';
    if (v is List) {
      final sb = StringBuffer();
      sb.write('[');
      for (var i = 0; i < v.length; i++) {
        if (i > 0) sb.write(',');
        sb.write(_encodeValue(v[i]));
      }
      sb.write(']');
      return sb.toString();
    }
    if (v is Map<String, dynamic>) {
      final keys = v.keys.toList()..sort();
      final sb = StringBuffer();
      sb.write('{');
      for (var i = 0; i < keys.length; i++) {
        if (i > 0) sb.write(',');
        sb.write(_jsonString(keys[i]));
        sb.write(':');
        sb.write(_encodeValue(v[keys[i]]));
      }
      sb.write('}');
      return sb.toString();
    }
    throw ArgumentError('Unsupported type: ${v.runtimeType}');
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

  /// Parse JSON string to map. Does not enforce key order.
  static Map<String, dynamic> parsePayload(String json) {
    final decoded = jsonDecode(json);
    if (decoded is! Map) throw ArgumentError('Expected JSON object');
    return Map<String, dynamic>.from(decoded);
  }
}
