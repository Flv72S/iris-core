// Phase 13.2 — Deterministic canonical serialization. Pure functions; no IO, no runtime deps.

import 'core_surface_manifest.dart';

/// Encodes a single entry as a map with keys in fixed order: path, type.
Map<String, Object> _encodeEntry(CoreSurfaceEntry entry) {
  return <String, Object>{
    'path': entry.path,
    'type': entry.type,
  };
}

/// Encodes the manifest as a map with entries sorted by path. Keys: entries (list of encoded entries).
Map<String, Object> _encodeManifest(CoreSurfaceManifest manifest) {
  final sorted = List<CoreSurfaceEntry>.from(manifest.entries)
    ..sort((a, b) => a.path.compareTo(b.path));
  return <String, Object>{
    'entries': sorted.map(_encodeEntry).toList(),
  };
}

/// Produces a canonical JSON string: entries sorted by path, keys alphabetical, compact, UTF-8, single trailing \n.
String serializeCoreCanonically(CoreSurfaceManifest manifest) {
  final map = _encodeManifest(manifest);
  final buffer = StringBuffer();
  buffer.write('{"entries":[');
  final entries = map['entries'] as List<Map<String, Object>>;
  for (var i = 0; i < entries.length; i++) {
    if (i > 0) buffer.write(',');
    final e = entries[i];
    buffer.write('{"path":');
    _escapeJson(buffer, e['path']! as String);
    buffer.write(',"type":');
    _escapeJson(buffer, e['type']! as String);
    buffer.write('}');
  }
  buffer.write(']}\n');
  return buffer.toString();
}

void _escapeJson(StringBuffer out, String s) {
  out.write('"');
  for (var i = 0; i < s.length; i++) {
    final c = s[i];
    switch (c) {
      case '\\':
        out.write(r'\\');
        break;
      case '"':
        out.write(r'\"');
        break;
      case '\n':
        out.write(r'\n');
        break;
      case '\r':
        out.write(r'\r');
        break;
      case '\t':
        out.write(r'\t');
        break;
      default:
        if (c.codeUnitAt(0) < 32) {
          out.write('\\u');
          out.write(c.codeUnitAt(0).toRadixString(16).padLeft(4, '0'));
        } else {
          out.write(c);
        }
    }
  }
  out.write('"');
}

/// Returns true iff two serializations of the same manifest produce identical strings.
bool isCanonicalSerializationStable(CoreSurfaceManifest manifest) {
  final a = serializeCoreCanonically(manifest);
  final b = serializeCoreCanonically(manifest);
  return a == b;
}
