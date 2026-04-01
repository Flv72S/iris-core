// Phase 11.2.1 — Deterministic hash. No time, no salt, stable key order.

import 'dart:convert';

import 'package:crypto/crypto.dart';

/// Same logical JSON content (any key order) yields the same SHA-256 hex string.
String computeDeterministicHash(Map<String, dynamic> json) {
  final canonical = _canonicalJson(json);
  final bytes = utf8.encode(canonical);
  final digest = sha256.convert(bytes);
  return digest.toString();
}

String _canonicalJson(dynamic value) {
  if (value == null) return 'null';
  if (value is bool) return value.toString();
  if (value is num) return value.toString();
  if (value is String) return jsonEncode(value);
  if (value is List) {
    final parts = value.map((e) => _canonicalJson(e)).toList();
    return '[${parts.join(',')}]';
  }
  if (value is Map) {
    final keys = value.keys.map((e) => e.toString()).toList()..sort();
    final parts = <String>[];
    for (final k in keys) {
      parts.add('${jsonEncode(k)}:${_canonicalJson(value[k])}');
    }
    return '{${parts.join(',')}}';
  }
  return jsonEncode(value).toString();
}
