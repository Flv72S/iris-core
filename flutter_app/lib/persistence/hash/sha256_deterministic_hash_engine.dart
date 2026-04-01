// J3 — Sha256DeterministicHashEngine. Deterministic; canonical serialization.

import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'deterministic_hash_engine.dart';

/// SHA-256 deterministic hash engine. Hex lowercase output.
/// Canonical serialization before hashing; no JSON, no reflection.
class Sha256DeterministicHashEngine implements DeterministicHashEngine {
  const Sha256DeterministicHashEngine();

  @override
  String hash(Map<String, Object?> input) {
    final canonical = _canonicalize(input);
    return _sha256Hex(canonical);
  }

  @override
  String hashList(List<Object?> input) {
    final canonical = _canonicalize(input);
    return _sha256Hex(canonical);
  }

  @override
  String hashString(String input) {
    final canonical = _canonicalize(input);
    return _sha256Hex(canonical);
  }

  @override
  String toCanonicalString(Object? value) => _canonicalize(value);

  /// Canonical string representation for deterministic hashing.
  String _canonicalize(Object? value) {
    if (value == null) return 'null';
    if (value is bool) return value ? 'true' : 'false';
    if (value is int || value is double) return value.toString();
    if (value is String) return _escapeString(value);
    if (value is List) {
      final sb = StringBuffer();
      for (var i = 0; i < value.length; i++) {
        sb.write('[');
        sb.write(i);
        sb.write(']=');
        sb.write(_canonicalize(value[i]));
        sb.write(';');
      }
      return sb.toString();
    }
    if (value is Map) {
      final keys = value.keys.cast<String>().toList()..sort();
      final sb = StringBuffer();
      for (final k in keys) {
        sb.write(_escapeString(k));
        sb.write('=');
        sb.write(_canonicalize(value[k]));
        sb.write(';');
      }
      return sb.toString();
    }
    return value.toString();
  }

  static String _escapeString(String s) {
    final sb = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      final c = s[i];
      switch (c) {
        case '\\':
          sb.write(r'\\');
          break;
        case '\n':
          sb.write(r'\n');
          break;
        case '=':
          sb.write(r'\=');
          break;
        case ';':
          sb.write(r'\;');
          break;
        case '|':
          sb.write(r'\|');
          break;
        default:
          sb.write(c);
      }
    }
    return sb.toString();
  }

  static String _sha256Hex(String input) {
    final bytes = utf8.encode(input);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }
}
