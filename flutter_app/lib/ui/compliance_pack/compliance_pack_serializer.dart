// Phase 11.7.1 — Canonical JSON, UTF-8, SHA-256. verifyPackHash.

import 'dart:convert';

import 'package:iris_flutter_app/bridge/mappers/hash_utils.dart';

import 'compliance_pack.dart';

/// Canonical serialization for CompliancePack. Deterministic key order.
class CompliancePackSerializer {
  /// Returns a map suitable for hash verification. Section keys sorted.
  static Map<String, dynamic> toCanonicalJson(CompliancePack pack) {
    final sectionKeys = pack.sections.keys.toList()..sort();
    final sectionsJson = <String, dynamic>{};
    for (final k in sectionKeys) {
      sectionsJson[k] = pack.sections[k]!.toJson();
    }
    return <String, dynamic>{
      'packVersion': pack.packVersion,
      'generatedFromBundleHash': pack.generatedFromBundleHash,
      'generatedAtLogicalTime': <String, dynamic>{
        'tick': pack.generatedAtLogicalTime.tick,
        'origin': pack.generatedAtLogicalTime.origin,
      },
      'sections': sectionsJson,
      'packHash': pack.packHash,
    };
  }

  /// Returns UTF-8 canonical JSON string. Deterministic byte-per-byte for same pack.
  static String toCanonicalJsonString(CompliancePack pack) {
    final map = toCanonicalJson(pack);
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

  /// Verifies packHash matches content. Returns true if valid.
  static bool verifyPackHash(CompliancePack pack) {
    final sectionKeys = pack.sections.keys.toList()..sort();
    final sectionsJson = <String, dynamic>{};
    for (final k in sectionKeys) {
      sectionsJson[k] = pack.sections[k]!.toJson();
    }
    final contentForHash = <String, dynamic>{
      'packVersion': pack.packVersion,
      'generatedFromBundleHash': pack.generatedFromBundleHash,
      'generatedAtLogicalTime': <String, dynamic>{
        'tick': pack.generatedAtLogicalTime.tick,
        'origin': pack.generatedAtLogicalTime.origin,
      },
      'sections': sectionsJson,
    };
    final computed = computeDeterministicHash(contentForHash);
    return computed == pack.packHash;
  }
}
