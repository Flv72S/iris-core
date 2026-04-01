// Phase 13.1 — Deterministic JSON serialization. No IO, no timestamp, UTF-8.

import 'core_surface_manifest.dart';

/// Serializes the manifest to a deterministic JSON string.
/// Keys sorted; no extra whitespace; single trailing newline; UTF-8.
String serializeCoreSurfaceManifest(CoreSurfaceManifest manifest) {
  final buffer = StringBuffer();
  buffer.write('{"entries":[');
  for (var i = 0; i < manifest.entries.length; i++) {
    if (i > 0) buffer.write(',');
    final e = manifest.entries[i];
    buffer.write('{"path":');
    _escapeJsonString(buffer, e.path);
    buffer.write(',"type":');
    _escapeJsonString(buffer, e.type);
    buffer.write('}');
  }
  buffer.write(']}\n');
  return buffer.toString();
}

void _escapeJsonString(StringBuffer out, String s) {
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
