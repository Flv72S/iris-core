// Phase 11.6.1 — Canonical JSON and UTF-8. Deterministic key order, append order for records.

import 'dart:convert';

import 'package:iris_flutter_app/bridge/mappers/hash_utils.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';

import 'forensic_bundle.dart';

/// Canonical serialization for ForensicBundle. Deterministic key order; records in append order.
class ForensicBundleSerializer {
  /// Returns a map suitable for hash verification. Keys in sorted order when serialized.
  static Map<String, dynamic> toCanonicalJson(ForensicBundle bundle) {
    return <String, dynamic>{
      'bundleVersion': bundle.bundleVersion,
      'appVersion': bundle.appVersion,
      'exportedAtLogicalTime': <String, dynamic>{
        'tick': bundle.exportedAtLogicalTime.tick,
        'origin': bundle.exportedAtLogicalTime.origin,
      },
      'sessionId': bundle.sessionId,
      'records': bundle.records.map((r) => r.toJson()).toList(),
      'bundleHash': bundle.bundleHash,
    };
  }

  /// Returns UTF-8 canonical JSON string. Deterministic byte-per-byte for same bundle.
  static String toCanonicalJsonString(ForensicBundle bundle) {
    final map = toCanonicalJson(bundle);
    return _canonicalJson(map);
  }

  static String _canonicalJson(dynamic value) {
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

  /// Verifies bundleHash matches content. Returns true if valid.
  static bool verifyHash(ForensicBundle bundle) {
    final contentForHash = <String, dynamic>{
      'bundleVersion': bundle.bundleVersion,
      'appVersion': bundle.appVersion,
      'exportedAtLogicalTime': <String, dynamic>{
        'tick': bundle.exportedAtLogicalTime.tick,
        'origin': bundle.exportedAtLogicalTime.origin,
      },
      'sessionId': bundle.sessionId,
      'records': bundle.records.map((r) => r.toJson()).toList(),
    };
    final computed = computeDeterministicHash(contentForHash);
    return computed == bundle.bundleHash;
  }
}
