/// O1 — Canonical serialization for node identity. Sorted keys, UTF-8, no dynamic ordering.

import 'dart:convert';

import 'package:iris_flutter_app/core/network/identity/deterministic_node_identity.dart';

class NodeIdentitySerializer {
  NodeIdentitySerializer._();

  /// Canonical JSON keys order (alphabetical).
  static const List<String> _canonicalKeys = [
    'createdAt',
    'nodeId',
    'protocolVersion',
    'publicKey',
  ];

  /// Serialize identity to canonical JSON bytes (UTF-8).
  /// Sorted keys, no undefined fields, no locale-dependent formatting.
  static List<int> toCanonicalBytes(DeterministicNodeIdentity identity) {
    final map = toCanonicalMap(identity);
    final json = _canonicalEncode(map);
    return utf8.encode(json);
  }

  /// Serialize to canonical map (sorted key order).
  static Map<String, String> toCanonicalMap(DeterministicNodeIdentity identity) {
    return {
      'createdAt': identity.createdAt,
      'nodeId': identity.nodeId,
      'protocolVersion': identity.protocolVersion,
      'publicKey': identity.publicKey,
    };
  }

  static String _canonicalEncode(Map<String, String> map) {
    final sb = StringBuffer();
    sb.write('{');
    for (var i = 0; i < _canonicalKeys.length; i++) {
      final k = _canonicalKeys[i];
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
        .replaceAll('\\', '\\\\')
        .replaceAll('"', '\\"')
        .replaceAll('\n', '\\n')
        .replaceAll('\r', '\\r')
        .replaceAll('\t', '\\t');
    return '"$escaped"';
  }

  /// Deserialize from canonical JSON bytes. Throws on invalid format.
  static DeterministicNodeIdentity fromCanonicalBytes(List<int> bytes) {
    final json = utf8.decode(bytes);
    final map = jsonDecode(json) as Map<String, dynamic>;
    return fromMap(Map.fromEntries(
      map.entries.map((e) => MapEntry(e.key, e.value as String)),
    ));
  }

  /// Deserialize from map (keys may be in any order).
  static DeterministicNodeIdentity fromMap(Map<String, String> map) {
    return DeterministicNodeIdentity(
      createdAt: map['createdAt']!,
      nodeId: map['nodeId']!,
      protocolVersion: map['protocolVersion']!,
      publicKey: map['publicKey']!,
    );
  }
}
